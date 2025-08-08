const { supabaseAdmin } = require('../supabase/client');
const { body, validationResult } = require('express-validator');

class MessageController {
    /**
     * Create a new conversation (when influencer connects to campaign/bid)
     */
    async createConversation(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { campaign_id, bid_id } = req.body;
            const influencerId = req.user.id;

            // Validate that either campaign_id or bid_id is provided, not both
            if (!campaign_id && !bid_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Either campaign_id or bid_id is required'
                });
            }

            if (campaign_id && bid_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot create conversation for both campaign and bid simultaneously'
                });
            }

            let brandOwnerId, sourceId, sourceType;

            if (campaign_id) {
                // Get campaign details
                const { data: campaign, error: campaignError } = await supabaseAdmin
                    .from('campaigns')
                    .select('created_by')
                    .eq('id', campaign_id)
                    .single();

                if (campaignError || !campaign) {
                    return res.status(404).json({
                        success: false,
                        message: 'Campaign not found'
                    });
                }

                brandOwnerId = campaign.created_by;
                sourceId = campaign_id;
                sourceType = 'campaign';
            } else {
                // Get bid details
                const { data: bid, error: bidError } = await supabaseAdmin
                    .from('bids')
                    .select('created_by')
                    .eq('id', bid_id)
                    .single();

                if (bidError || !bid) {
                    return res.status(404).json({
                        success: false,
                        message: 'Bid not found'
                    });
                }

                brandOwnerId = bid.created_by;
                sourceId = bid_id;
                sourceType = 'bid';
            }

            // Check if conversation already exists
            const { data: existingConversation, error: existingError } = await supabaseAdmin
                .from('conversations')
                .select('id')
                .eq(sourceType === 'campaign' ? 'campaign_id' : 'bid_id', sourceId)
                .eq('brand_owner_id', brandOwnerId)
                .eq('influencer_id', influencerId)
                .single();

            if (existingConversation) {
                return res.status(400).json({
                    success: false,
                    message: 'Conversation already exists'
                });
            }

            // Create conversation
            const conversationData = {
                brand_owner_id: brandOwnerId,
                influencer_id: influencerId
            };

            if (sourceType === 'campaign') {
                conversationData.campaign_id = sourceId;
            } else {
                conversationData.bid_id = sourceId;
            }

            const { data: conversation, error } = await supabaseAdmin
                .from('conversations')
                .insert(conversationData)
                .select()
                .single();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create conversation'
                });
            }

            res.status(201).json({
                success: true,
                conversation: conversation,
                message: 'Conversation created successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get conversations for a user
     */
    async getConversations(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            // Get conversations where user is involved
            const { data: conversations, error, count } = await supabaseAdmin
                .from('conversations')
                .select(`
                    *,
                    campaigns (
                        id,
                        title,
                        budget,
                        status,
                        created_by_user:users!campaigns_created_by_fkey (
                            id,
                            phone,
                            email,
                            role
                        )
                    ),
                    bids (
                        id,
                        title,
                        budget,
                        status,
                        created_by_user:users!bids_created_by_fkey (
                            id,
                            phone,
                            email,
                            role
                        )
                    ),
                    brand_owner:users!conversations_brand_owner_id_fkey (
                        id,
                        phone,
                        email,
                        role
                    ),
                    influencer:users!conversations_influencer_id_fkey (
                        id,
                        phone,
                        email,
                        role
                    ),
                    messages (
                        id,
                        sender_id,
                        receiver_id,
                        message,
                        media_url,
                        seen,
                        created_at
                    )
                `)
                .or(`brand_owner_id.eq.${userId},influencer_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch conversations'
                });
            }

            // Format conversations with last message and unread count
            const formattedConversations = conversations.map(conversation => {
                const messages = conversation.messages || [];
                const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                const unreadCount = messages.filter(msg => 
                    msg.receiver_id === userId && !msg.seen
                ).length;

                // Determine the source (campaign or bid)
                const source = conversation.campaigns || conversation.bids;
                const sourceType = conversation.campaigns ? 'campaign' : 'bid';

                return {
                    ...conversation,
                    source: source,
                    source_type: sourceType,
                    last_message: lastMessage,
                    unread_count: unreadCount,
                    messages: undefined // Remove messages from response to reduce payload
                };
            });

            res.json({
                success: true,
                conversations: formattedConversations,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get messages for a specific conversation
     */
    async getMessages(req, res) {
        try {
            const { conversation_id } = req.params;
            const userId = req.user.id;
            const { page = 1, limit = 50 } = req.query;
            const offset = (page - 1) * limit;

            // Check if user has access to this conversation
            const { data: conversation, error: conversationError } = await supabaseAdmin
                .from('conversations')
                .select(`
                    *,
                    requests (
                        influencer_id,
                        campaigns (
                            created_by
                        )
                    )
                `)
                .eq('id', conversation_id)
                .single();

            if (conversationError || !conversation) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found'
                });
            }

            // Check access permissions
            const request = conversation.requests;
            const isInfluencer = request.influencer_id === userId;
            const isBrandOwner = request.campaigns.created_by === userId;

            if (!isInfluencer && !isBrandOwner && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Get messages
            const { data: messages, error, count } = await supabaseAdmin
                .from('messages')
                .select(`
                    *,
                    sender:users!messages_sender_id_fkey (
                        id,
                        phone,
                        email,
                        role
                    ),
                    receiver:users!messages_receiver_id_fkey (
                        id,
                        phone,
                        email,
                        role
                    )
                `)
                .eq('conversation_id', conversation_id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch messages'
                });
            }

            // Mark messages as seen if user is the receiver
            const unreadMessages = messages.filter(msg => 
                msg.receiver_id === userId && !msg.seen
            );

            if (unreadMessages.length > 0) {
                const messageIds = unreadMessages.map(msg => msg.id);
                await supabaseAdmin
                    .from('messages')
                    .update({ seen: true })
                    .in('id', messageIds);
            }

            res.json({
                success: true,
                messages: messages.reverse(), // Return in chronological order
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Send a message
     */
    async sendMessage(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const userId = req.user.id;
            const { conversation_id, message, media_url } = req.body;

            // Check if conversation exists and user has access
            const { data: conversation, error: conversationError } = await supabaseAdmin
                .from('conversations')
                .select(`
                    *,
                    requests (
                        influencer_id,
                        status,
                        campaigns (
                            created_by,
                            status
                        )
                    )
                `)
                .eq('id', conversation_id)
                .single();

            if (conversationError || !conversation) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found'
                });
            }

            // Check access permissions
            const request = conversation.requests;
            const isInfluencer = request.influencer_id === userId;
            const isBrandOwner = request.campaigns.created_by === userId;

            if (!isInfluencer && !isBrandOwner && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Check if conversation is active (request is approved or in progress)
            if (!['approved', 'in_progress'].includes(request.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot send messages in this conversation'
                });
            }

            // Determine receiver
            const receiverId = isInfluencer 
                ? request.campaigns.created_by 
                : request.influencer_id;

            // Create message
            const { data: newMessage, error } = await supabaseAdmin
                .from('messages')
                .insert({
                    conversation_id: conversation_id,
                    sender_id: userId,
                    receiver_id: receiverId,
                    message: message,
                    media_url: media_url
                })
                .select(`
                    *,
                    sender:users!messages_sender_id_fkey (
                        id,
                        phone,
                        email,
                        role
                    ),
                    receiver:users!messages_receiver_id_fkey (
                        id,
                        phone,
                        email,
                        role
                    )
                `)
                .single();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send message'
                });
            }

            res.status(201).json({
                success: true,
                message: newMessage,
                message: 'Message sent successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Mark messages as seen
     */
    async markMessagesAsSeen(req, res) {
        try {
            const { conversation_id } = req.params;
            const userId = req.user.id;

            // Check if user has access to this conversation
            const { data: conversation, error: conversationError } = await supabaseAdmin
                .from('conversations')
                .select(`
                    *,
                    requests (
                        influencer_id,
                        campaigns (
                            created_by
                        )
                    )
                `)
                .eq('id', conversation_id)
                .single();

            if (conversationError || !conversation) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found'
                });
            }

            // Check access permissions
            const request = conversation.requests;
            const isInfluencer = request.influencer_id === userId;
            const isBrandOwner = request.campaigns.created_by === userId;

            if (!isInfluencer && !isBrandOwner && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Mark all unread messages as seen
            const { error } = await supabaseAdmin
                .from('messages')
                .update({ seen: true })
                .eq('conversation_id', conversation_id)
                .eq('receiver_id', userId)
                .eq('seen', false);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to mark messages as seen'
                });
            }

            res.json({
                success: true,
                message: 'Messages marked as seen'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Delete a message
     */
    async deleteMessage(req, res) {
        try {
            const { message_id } = req.params;
            const userId = req.user.id;

            // Check if message exists and user is the sender
            const { data: message, error: messageError } = await supabaseAdmin
                .from('messages')
                .select('sender_id, created_at')
                .eq('id', message_id)
                .single();

            if (messageError || !message) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }

            if (message.sender_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Check if message is recent (within 5 minutes)
            const messageTime = new Date(message.created_at);
            const currentTime = new Date();
            const timeDiff = (currentTime - messageTime) / 1000 / 60; // minutes

            if (timeDiff > 5 && req.user.role !== 'admin') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete messages older than 5 minutes'
                });
            }

            // Delete the message
            const { error } = await supabaseAdmin
                .from('messages')
                .delete()
                .eq('id', message_id);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete message'
                });
            }

            res.json({
                success: true,
                message: 'Message deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get unread message count
     */
    async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;

            const { data: conversations, error: conversationsError } = await supabaseAdmin
                .from('conversations')
                .select(`
                    id,
                    requests (
                        influencer_id,
                        campaigns (
                            created_by
                        )
                    )
                `)
                .or(`requests.influencer_id.eq.${userId},requests.campaigns.created_by.eq.${userId}`);

            if (conversationsError) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch conversations'
                });
            }

            let totalUnread = 0;
            const conversationIds = conversations.map(c => c.id);

            if (conversationIds.length > 0) {
                const { data: unreadMessages, error: messagesError } = await supabaseAdmin
                    .from('messages')
                    .select('conversation_id')
                    .in('conversation_id', conversationIds)
                    .eq('receiver_id', userId)
                    .eq('seen', false);

                if (!messagesError) {
                    totalUnread = unreadMessages.length;
                }
            }

            res.json({
                success: true,
                unread_count: totalUnread
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

// Validation middleware
const validateSendMessage = [
    body('conversation_id')
        .isUUID()
        .withMessage('Invalid conversation ID'),
    body('message')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
    body('media_url')
        .optional()
        .isURL()
        .withMessage('Invalid media URL')
];

module.exports = {
    MessageController: new MessageController(),
    validateSendMessage
}; 