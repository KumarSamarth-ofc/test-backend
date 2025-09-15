const cron = require('node-cron');
const NotificationController = require('../controllers/notificationController');
const { supabaseAdmin } = require('../supabase/client');

class BackgroundJobService {
    constructor() {
        this.isRunning = false;
        this.io = null;
    }

    setSocket(io) {
        this.io = io;
        NotificationController.setSocket(io);
    }

    /**
     * Start background jobs
     */
    start() {
        if (this.isRunning) {
            console.log('Background jobs already running');
            return;
        }

        this.isRunning = true;
        console.log('Starting background jobs...');

        // Process pending notifications every minute
        cron.schedule('* * * * *', async () => {
            try {
                const result = await NotificationController.processPendingNotifications();
                if (result.success) {
                    console.log(`Processed ${result.processed} pending notifications`);
                } else {
                    console.error('Error processing pending notifications:', result.error);
                }
            } catch (error) {
                console.error('Error in notification processing job:', error);
            }
        });

        // Clean up old notifications daily at 2 AM
        cron.schedule('0 2 * * *', async () => {
            try {
                const result = await NotificationController.cleanupOldNotifications();
                if (result.success) {
                    console.log('Cleaned up old notifications');
                } else {
                    console.error('Error cleaning up old notifications:', result.error);
                }
            } catch (error) {
                console.error('Error in cleanup job:', error);
            }
        });

        // Process message status updates every 30 seconds
        cron.schedule('*/30 * * * * *', async () => {
            try {
                await this.processMessageStatusUpdates();
            } catch (error) {
                console.error('Error processing message status updates:', error);
            }
        });

        // Process campaign/bid notifications every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            try {
                await this.processCampaignNotifications();
            } catch (error) {
                console.error('Error processing campaign notifications:', error);
            }
        });

        console.log('Background jobs started successfully');
    }

    /**
     * Stop background jobs
     */
    stop() {
        if (!this.isRunning) {
            console.log('Background jobs not running');
            return;
        }

        this.isRunning = false;
        console.log('Background jobs stopped');
    }

    /**
     * Process message status updates
     */
    async processMessageStatusUpdates() {
        try {
            // Get messages that need status updates
            const { data: messages, error } = await supabaseAdmin
                .from('messages')
                .select('*')
                .eq('status', 'sent')
                .lt('created_at', new Date(Date.now() - 30000).toISOString()) // 30 seconds ago
                .limit(100);

            if (error || !messages || messages.length === 0) {
                return;
            }

            for (const message of messages) {
                try {
                    // Check if receiver is online
                    const isOnline = this.isUserOnline(message.receiver_id);
                    
                    if (isOnline) {
                        // Mark as delivered
                        await supabaseAdmin
                            .from('messages')
                            .update({ 
                                status: 'delivered',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', message.id);

                        // Emit delivery status to conversation
                        if (this.io) {
                            this.io.to(`conversation_${message.conversation_id}`).emit('message_status', {
                                messageId: message.id,
                                status: 'delivered',
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error processing message ${message.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error processing message status updates:', error);
        }
    }

    /**
     * Process campaign and bid related notifications
     */
    async processCampaignNotifications() {
        try {
            // Process campaign deadline reminders
            await this.processCampaignDeadlineReminders();
            
            // Process bid deadline reminders
            await this.processBidDeadlineReminders();
            
            // Process payment reminders
            await this.processPaymentReminders();
        } catch (error) {
            console.error('Error processing campaign notifications:', error);
        }
    }

    /**
     * Process campaign deadline reminders
     */
    async processCampaignDeadlineReminders() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const { data: campaigns, error } = await supabaseAdmin
                .from('campaigns')
                .select('id, title, created_by, deadline')
                .eq('status', 'active')
                .eq('deadline', tomorrow.toISOString().split('T')[0]);

            if (error || !campaigns || campaigns.length === 0) {
                return;
            }

            for (const campaign of campaigns) {
                // Notify brand owner about deadline
        await NotificationController.createNotification({
          user_id: campaign.created_by,
          type: 'campaign',
          title: 'Campaign Deadline Tomorrow',
          message: `Your campaign "${campaign.title}" deadline is tomorrow`,
          data: {
            campaign_id: campaign.id,
            type: 'deadline_reminder'
          },
          priority: 'high'
        });
            }
        } catch (error) {
            console.error('Error processing campaign deadline reminders:', error);
        }
    }

    /**
     * Process bid deadline reminders
     */
    async processBidDeadlineReminders() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const { data: bids, error } = await supabaseAdmin
                .from('bids')
                .select('id, title, created_by, deadline')
                .eq('status', 'active')
                .eq('deadline', tomorrow.toISOString().split('T')[0]);

            if (error || !bids || bids.length === 0) {
                return;
            }

            for (const bid of bids) {
                // Notify influencer about deadline
        await NotificationController.createNotification({
          user_id: bid.created_by,
          type: 'bid',
          title: 'Bid Deadline Tomorrow',
          message: `Your bid "${bid.title}" deadline is tomorrow`,
          data: {
            bid_id: bid.id,
            type: 'deadline_reminder'
          },
          priority: 'high'
        });
            }
        } catch (error) {
            console.error('Error processing bid deadline reminders:', error);
        }
    }

    /**
     * Process payment reminders
     */
    async processPaymentReminders() {
        try {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            // Get pending payment orders
            const { data: paymentOrders, error } = await supabaseAdmin
                .from('payment_orders')
                .select('id, conversation_id, amount_paise, currency, created_at, conversations(brand_owner_id, influencer_id)')
                .eq('status', 'created')
                .lt('created_at', threeDaysAgo.toISOString())
                .limit(50);

            if (error || !paymentOrders || paymentOrders.length === 0) {
                return;
            }

            for (const order of paymentOrders) {
                const amount = (order.amount_paise / 100).toFixed(2);
                
                // Notify brand owner about pending payment
        await NotificationController.createNotification({
          user_id: order.conversations.brand_owner_id,
          type: 'payment',
          title: 'Payment Pending',
          message: `You have a pending payment of ₹${amount} for 3 days`,
          data: {
            payment_order_id: order.id,
            conversation_id: order.conversation_id,
            amount: amount,
            type: 'payment_reminder'
          },
          priority: 'high'
        });
            }
        } catch (error) {
            console.error('Error processing payment reminders:', error);
        }
    }

    /**
     * Check if user is online
     */
    isUserOnline(userId) {
        if (!this.io) return false;
        
        // Get all connected sockets
        const sockets = this.io.sockets.sockets;
        for (const [socketId, socket] of sockets) {
            if (socket.userId === userId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Send notification to user
     */
    async sendNotification(userId, notification) {
        return await NotificationController.createNotification({
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
}

module.exports = new BackgroundJobService();
