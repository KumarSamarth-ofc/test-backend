const { supabaseAdmin } = require('../supabase/client');
const attachmentService = require('../utils/attachmentService');

class AttachmentController {
  /**
   * Upload attachment for a conversation
   */
  async uploadAttachment(req, res) {
    try {
      const { conversation_id } = req.params;
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      // Verify conversation exists and user has access
      const { data: conversation, error: convError } = await supabaseAdmin
        .from('conversations')
        .select('id, brand_owner_id, influencer_id')
        .eq('id', conversation_id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (conversation.brand_owner_id !== userId && conversation.influencer_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Get file type from request (set by multer middleware)
      const fileType = req.fileType;
      if (!fileType) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type'
        });
      }

      // Validate file
      const validation = attachmentService.validateFile(req.file, fileType);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }

      // Upload attachment
      const result = await attachmentService.uploadAttachment(
        req.file.buffer,
        req.file.originalname,
        fileType,
        conversation_id,
        userId
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      // Get attachment preview
      const preview = attachmentService.getAttachmentPreview(result.attachment);

      res.json({
        success: true,
        attachment: result.attachment,
        preview: preview,
        message: 'Attachment uploaded successfully'
      });

    } catch (error) {
      console.error('Attachment upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Send message with attachment
   */
  async sendMessageWithAttachment(req, res) {
    try {
      const { conversation_id, message, message_type = 'user_input' } = req.body;
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No attachment provided'
        });
      }

      // Verify conversation exists and user has access
      const { data: conversation, error: convError } = await supabaseAdmin
        .from('conversations')
        .select('id, brand_owner_id, influencer_id')
        .eq('id', conversation_id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (conversation.brand_owner_id !== userId && conversation.influencer_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Determine receiver ID
      const receiverId = conversation.brand_owner_id === userId 
        ? conversation.influencer_id 
        : conversation.brand_owner_id;

      // Get file type and validate
      const fileType = req.fileType;
      if (!fileType) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type'
        });
      }

      const validation = attachmentService.validateFile(file, fileType);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }

      // Upload attachment
      const uploadResult = await attachmentService.uploadAttachment(
        file.buffer,
        file.originalname,
        fileType,
        conversation_id,
        userId
      );

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: uploadResult.error
        });
      }

      // Create message with attachment
      const { data: newMessage, error: msgError } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id,
          sender_id: userId,
          receiver_id: receiverId,
          message: message || `Sent a ${fileType}`,
          media_url: uploadResult.attachment.url,
          message_type: message_type,
          attachment_metadata: {
            fileName: uploadResult.attachment.fileName,
            fileType: uploadResult.attachment.fileType,
            mimeType: uploadResult.attachment.mimeType,
            size: uploadResult.attachment.size,
            preview: attachmentService.getAttachmentPreview(uploadResult.attachment)
          }
        })
        .select()
        .single();

      if (msgError) {
        // Clean up uploaded file if message creation fails
        await attachmentService.deleteAttachment(uploadResult.attachment.url);
        return res.status(500).json({
          success: false,
          message: 'Failed to create message'
        });
      }

      // Update conversation timestamp
      await supabaseAdmin
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation_id);

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        // Get conversation context
        const { data: conversationContext } = await supabaseAdmin
          .from('conversations')
          .select('id, chat_status, flow_state, awaiting_role, campaign_id, bid_id, automation_enabled, current_action_data')
          .eq('id', conversation_id)
          .single();

        const context = conversationContext ? {
          id: conversationContext.id,
          chat_status: conversationContext.chat_status,
          flow_state: conversationContext.flow_state,
          awaiting_role: conversationContext.awaiting_role,
          conversation_type: conversationContext.campaign_id ? 'campaign' : 
                            conversationContext.bid_id ? 'bid' : 'direct',
          automation_enabled: conversationContext.automation_enabled || false,
          current_action_data: conversationContext.current_action_data
        } : null;

        // Emit to conversation room
        io.to(`conversation_${conversation_id}`).emit('new_message', {
          conversation_id,
          message: newMessage,
          conversation_context: context
        });

        // Emit notification to receiver
        io.to(`user_${receiverId}`).emit('notification', {
          type: 'message',
          data: {
            id: newMessage.id,
            title: `${req.user.name} sent an attachment`,
            body: newMessage.message,
            created_at: newMessage.created_at,
            conversation_context: context,
            payload: { 
              conversation_id, 
              message_id: newMessage.id, 
              sender_id: userId 
            },
            conversation_id,
            message: newMessage,
            sender_id: userId,
            receiver_id: receiverId
          }
        });

        // Emit conversation list updates
        io.to(`user_${userId}`).emit('conversation_list_updated', {
          conversation_id,
          message: newMessage,
          conversation_context: context,
          action: 'message_sent',
          timestamp: new Date().toISOString()
        });
        
        io.to(`user_${receiverId}`).emit('conversation_list_updated', {
          conversation_id,
          message: newMessage,
          conversation_context: context,
          action: 'message_received',
          timestamp: new Date().toISOString()
        });

        // Emit unread count update
        io.to(`user_${receiverId}`).emit('unread_count_updated', {
          conversation_id,
          unread_count: 1,
          action: 'increment',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: newMessage,
        attachment: uploadResult.attachment,
        preview: attachmentService.getAttachmentPreview(uploadResult.attachment)
      });

    } catch (error) {
      console.error('Send message with attachment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(req, res) {
    try {
      const { attachment_id } = req.params;
      const userId = req.user.id;

      // Get attachment details
      const { data: message, error: msgError } = await supabaseAdmin
        .from('messages')
        .select('id, sender_id, media_url, conversation_id')
        .eq('id', attachment_id)
        .single();

      if (msgError || !message) {
        return res.status(404).json({
          success: false,
          message: 'Attachment not found'
        });
      }

      // Check if user can delete this attachment
      if (message.sender_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Can only delete your own attachments'
        });
      }

      // Delete from storage
      if (message.media_url) {
        const deleteResult = await attachmentService.deleteAttachment(message.media_url);
        if (!deleteResult.success) {
          console.error('Failed to delete attachment from storage:', deleteResult.error);
        }
      }

      // Update message to remove attachment
      const { error: updateError } = await supabaseAdmin
        .from('messages')
        .update({
          media_url: null,
          attachment_metadata: null
        })
        .eq('id', attachment_id);

      if (updateError) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete attachment'
        });
      }

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`conversation_${message.conversation_id}`).emit('attachment_deleted', {
          message_id: attachment_id,
          conversation_id: message.conversation_id,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Attachment deleted successfully'
      });

    } catch (error) {
      console.error('Delete attachment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get attachment info
   */
  async getAttachmentInfo(req, res) {
    try {
      const { attachment_id } = req.params;
      const userId = req.user.id;

      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .select(`
          id, media_url, attachment_metadata, conversation_id,
          conversations!inner(brand_owner_id, influencer_id)
        `)
        .eq('id', attachment_id)
        .single();

      if (error || !message) {
        return res.status(404).json({
          success: false,
          message: 'Attachment not found'
        });
      }

      // Check if user has access to this conversation
      if (message.conversations.brand_owner_id !== userId && 
          message.conversations.influencer_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (!message.media_url) {
        return res.status(404).json({
          success: false,
          message: 'No attachment found in this message'
        });
      }

      const attachmentInfo = {
        id: message.id,
        url: message.media_url,
        metadata: message.attachment_metadata,
        preview: message.attachment_metadata ? 
          attachmentService.getAttachmentPreview(message.attachment_metadata) : null
      };

      res.json({
        success: true,
        attachment: attachmentInfo
      });

    } catch (error) {
      console.error('Get attachment info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AttachmentController();
