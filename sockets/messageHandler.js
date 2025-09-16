const { supabaseAdmin } = require('../supabase/client');
const NotificationController = require('../controllers/notificationController');

class MessageHandler {
    constructor(io) {
        this.io = io;
        this.typingUsers = new Map(); // Map to track typing users
        this.onlineUsers = new Map(); // Map to track online users
        this.notificationController = NotificationController;
        this.notificationController.setSocket(io);
    }

    /**
     * Handle socket connection
     */
    handleConnection(socket) {
        console.log(`User connected: ${socket.id}`);

        // Join user to their personal room
        socket.on('join', (userId) => {
            socket.join(`user_${userId}`);
            socket.userId = userId; // Store userId on socket for easy access
            this.onlineUsers.set(socket.id, userId);
            console.log(`User ${userId} joined room: user_${userId}`);

            // Send pending notifications to user
            this.sendPendingNotifications(userId);
            
            // Update message statuses to delivered for this user (REAL-TIME)
            this.updateUserMessageStatuses(userId);
        });

        // Handle joining conversation room
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conversation_${conversationId}`);
            console.log(`User joined conversation: ${conversationId}`);
        });

        // Handle leaving conversation room
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conversation_${conversationId}`);
            console.log(`User left conversation: ${conversationId}`);
        });

        // Handle typing indicator
        socket.on('typing_start', (data) => {
            const { conversationId, userId } = data;
            this.typingUsers.set(`${conversationId}_${userId}`, true);
            socket.to(`conversation_${conversationId}`).emit('user_typing', {
                conversationId,
                userId,
                isTyping: true
            });
        });

        socket.on('typing_stop', (data) => {
            const { conversationId, userId } = data;
            this.typingUsers.delete(`${conversationId}_${userId}`);
            socket.to(`conversation_${conversationId}`).emit('user_typing', {
                conversationId,
                userId,
                isTyping: false
            });
        });

        // Handle sending message
        socket.on('send_message', async (data) => {
            try {
                const { conversationId, senderId, receiverId, message, mediaUrl } = data;

                // Save message to database
                const { data: savedMessage, error } = await supabaseAdmin
                    .from('messages')
                    .insert({
                        conversation_id: conversationId,
                        sender_id: senderId,
                        receiver_id: receiverId,
                        message: message,
                        media_url: mediaUrl,
                        status: 'sent'
                    })
                    .select()
                    .single();

                if (error) {
                    socket.emit('message_error', { error: 'Failed to save message' });
                    return;
                }

                // Emit message to conversation room
                this.io.to(`conversation_${conversationId}`).emit('new_message', {
                    message: savedMessage,
                    conversationId
                });

                // Create and send notification
                await this.notificationController.createNotification({
                    user_id: receiverId,
                    type: 'message',
                    title: 'New message',
                    message: message.length > 50 ? message.substring(0, 50) + '...' : message,
                    data: {
                        conversation_id: conversationId,
                        message_id: savedMessage.id,
                        sender_id: senderId
                    },
                    priority: 'high'
                });

                // Update message status to delivered if user is online (REAL-TIME)
                if (this.isUserOnline(receiverId)) {
                    await this.updateMessageStatus(savedMessage.id, 'delivered');
                    
                    // Emit delivery status to conversation (REAL-TIME)
                    this.io.to(`conversation_${conversationId}`).emit('message_status', {
                        messageId: savedMessage.id,
                        status: 'delivered',
                        timestamp: new Date().toISOString()
                    });
                }

                // Stop typing indicator
                this.typingUsers.delete(`${conversationId}_${senderId}`);
                socket.to(`conversation_${conversationId}`).emit('user_typing', {
                    conversationId,
                    userId: senderId,
                    isTyping: false
                });

            } catch (error) {
                socket.emit('message_error', { error: error.message });
            }
        });

        // Handle message status updates
        socket.on('message_status', async (data) => {
            try {
                const { messageId, status } = data;
                await this.updateMessageStatus(messageId, status);
                
                // Emit status update to conversation (REAL-TIME)
                const { data: message } = await supabaseAdmin
                    .from('messages')
                    .select('conversation_id')
                    .eq('id', messageId)
                    .single();
                
                if (message) {
                    this.io.to(`conversation_${message.conversation_id}`).emit('message_status', {
                        messageId,
                        status,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Error updating message status:', error);
            }
        });

        // Handle mark as read
        socket.on('mark_read', async (data) => {
            try {
                const { messageId, userId, conversationId } = data;
                await this.updateMessageStatus(messageId, 'read');
                
                // Emit read status to conversation (REAL-TIME)
                socket.to(`conversation_${conversationId}`).emit('message_read', {
                    messageId,
                    userId,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        });

        // Handle mark multiple messages as read
        socket.on('mark_messages_read', async (data) => {
            try {
                const { messageIds, userId, conversationId } = data;
                
                // Update all messages to read status
                await supabaseAdmin
                    .from('messages')
                    .update({ 
                        status: 'read',
                        updated_at: new Date().toISOString()
                    })
                    .in('id', messageIds)
                    .eq('receiver_id', userId);

                // Emit batch read status to conversation (REAL-TIME)
                socket.to(`conversation_${conversationId}`).emit('messages_read', {
                    messageIds,
                    userId,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        // Handle joining bid/campaign room for real-time updates
        socket.on('join_bid_room', (bidId) => {
            socket.join(`bid_${bidId}`);
            console.log(`User joined bid room: ${bidId}`);
        });

        socket.on('join_campaign_room', (campaignId) => {
            socket.join(`campaign_${campaignId}`);
            console.log(`User joined campaign room: ${campaignId}`);
        });

        socket.on('leave_bid_room', (bidId) => {
            socket.leave(`bid_${bidId}`);
            console.log(`User left bid room: ${bidId}`);
        });

        socket.on('leave_campaign_room', (campaignId) => {
            socket.leave(`campaign_${campaignId}`);
            console.log(`User left campaign room: ${campaignId}`);
        });

        // Handle message seen
        socket.on('mark_seen', async (data) => {
            try {
                const { messageId, userId } = data;

                // Update message seen status
                const { error } = await supabaseAdmin
                    .from('messages')
                    .update({ seen: true })
                    .eq('id', messageId);

                if (error) {
                    socket.emit('seen_error', { error: 'Failed to mark message as seen' });
                    return;
                }

                // Emit seen status to conversation (REAL-TIME)
                const { data: message } = await supabaseAdmin
                    .from('messages')
                    .select('conversation_id')
                    .eq('id', messageId)
                    .single();

                if (message) {
                    socket.to(`conversation_${message.conversation_id}`).emit('message_seen', {
                        messageId,
                        userId,
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (error) {
                socket.emit('seen_error', { error: error.message });
            }
        });

        // Handle user status
        socket.on('user_status', (data) => {
            const { userId, status } = data;
            socket.broadcast.emit('user_status_change', {
                userId,
                status
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            const userId = this.onlineUsers.get(socket.id);
            if (userId) {
                this.onlineUsers.delete(socket.id);
                socket.broadcast.emit('user_offline', { userId });
            }
            console.log(`User disconnected: ${socket.id}`);
        });
    }

    /**
     * Update message statuses to delivered when user comes online (REAL-TIME)
     */
    async updateUserMessageStatuses(userId) {
        try {
            // Get all sent messages for this user
            const { data: messages, error } = await supabaseAdmin
                .from('messages')
                .select('id, conversation_id, status')
                .eq('receiver_id', userId)
                .eq('status', 'sent');

            if (error || !messages || messages.length === 0) {
                return;
            }

            // Update all sent messages to delivered
            const messageIds = messages.map(msg => msg.id);
            await supabaseAdmin
                .from('messages')
                .update({ 
                    status: 'delivered',
                    updated_at: new Date().toISOString()
                })
                .in('id', messageIds);

            // Emit status updates to all affected conversations (REAL-TIME)
            const conversationIds = [...new Set(messages.map(msg => msg.conversation_id))];
            
            for (const conversationId of conversationIds) {
                const conversationMessages = messages.filter(msg => msg.conversation_id === conversationId);
                
                this.io.to(`conversation_${conversationId}`).emit('messages_delivered', {
                    messageIds: conversationMessages.map(msg => msg.id),
                    userId,
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`Updated ${messages.length} messages to delivered for user ${userId}`);
        } catch (error) {
            console.error('Error updating user message statuses:', error);
        }
    }

    /**
     * Send pending notifications to user when they come online
     */
    async sendPendingNotifications(userId) {
        try {
            const { data: notifications, error } = await supabaseAdmin
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(10);

            if (error || !notifications || notifications.length === 0) {
                return;
            }

            // Send notifications to user
            for (const notification of notifications) {
                this.io.to(`user_${userId}`).emit('notification', {
                    id: notification.id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    action_url: notification.action_url,
                    created_at: notification.created_at,
                    priority: notification.priority
                });

                // Mark as delivered
                await this.notificationController.markNotificationAsDelivered(notification.id);
            }
        } catch (error) {
            console.error('Error sending pending notifications:', error);
        }
    }

    /**
     * Update message status
     */
    async updateMessageStatus(messageId, status) {
        try {
            const { error } = await supabaseAdmin
                .from('messages')
                .update({ 
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', messageId);

            if (error) {
                console.error('Error updating message status:', error);
            }
        } catch (error) {
            console.error('Error updating message status:', error);
        }
    }

    /**
     * Check if user is online
     */
    isUserOnline(userId) {
        return Array.from(this.onlineUsers.values()).includes(userId);
    }

    /**
     * Send notification to user
     */
    async sendNotification(userId, notification) {
        return await this.notificationController.createNotification({
            user_id: userId,
            ...notification
        });
    }

    /**
     * Send notification to multiple users
     */
    async sendNotificationToUsers(userIds, notification) {
        const results = [];
        for (const userId of userIds) {
            const result = await this.sendNotification(userId, notification);
            results.push(result);
        }
        return results;
    }

    /**
     * Broadcast campaign update
     */
    broadcastCampaignUpdate(campaignId, update) {
        this.io.emit('campaign_update', {
            campaignId,
            update
        });
    }

    /**
     * Broadcast request update
     */
    broadcastRequestUpdate(requestId, update) {
        this.io.emit('request_update', {
            requestId,
            update
        });
    }

    /**
     * Get online users count
     */
    getOnlineUsersCount() {
        return this.onlineUsers.size;
    }
}

module.exports = MessageHandler;
