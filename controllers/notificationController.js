const { supabaseAdmin } = require('../supabase/client');
const { body, validationResult } = require('express-validator');

class NotificationController {
  constructor() {
    this.io = null;
  }

  setSocket(io) {
    this.io = io;
  }

  /**
   * Create and send notification
   */
  async createNotification(notificationData) {
    try {
      const {
        user_id,
        type,
        title,
        message,
        data = {},
        priority = 'medium',
        expires_at = null,
        action_url = null,
        send_realtime = true,
        send_push = true
      } = notificationData;

      // Create notification in database
      const { data: notification, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id,
          type,
          title,
          message,
          data,
          priority,
          action_url,
          expires_at,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create notification: ${error.message}`);
      }

      // Send real-time notification if user is online
      if (send_realtime && this.io) {
        const isOnline = this.isUserOnline(user_id);
        if (isOnline) {
        this.io.to(`user_${user_id}`).emit('notification', {
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
          await this.markNotificationAsDelivered(notification.id);
        }
      }

      // Send push notification if enabled
      if (send_push) {
        await this.sendPushNotification(notification);
      }

      return {
        success: true,
        notification
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status = 'all' } = req.query;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
        .limit(limit);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: notifications, error, count } = await query;

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch notifications'
        });
      }

      res.json({
        success: true,
        notifications: notifications || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0
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
   * Mark notification as read
   */
  async markAsRead(req, res) {
    try {
      const { notification_id } = req.params;
      const userId = req.user.id;

      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', notification_id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to mark notification as read'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to mark notifications as read'
        });
      }

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const { data: count, error } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to get unread count'
        });
      }

      res.json({
        success: true,
        unread_count: count || 0
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(req, res) {
    try {
      const { notification_id } = req.params;
      const userId = req.user.id;

      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notification_id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete notification'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const { preferences } = req.body;

      const { error } = await supabaseAdmin
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          preferences: preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update preferences'
        });
      }

      res.json({
        success: true,
        message: 'Preferences updated'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;

      const { data: preferences, error } = await supabaseAdmin
        .from('user_notification_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch preferences'
        });
      }

      res.json({
        success: true,
        preferences: preferences?.preferences || {
          messages: true,
          campaigns: true,
          payments: true,
          system: true,
          push: true,
          email: false
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
   * Register device token for push notifications
   */
  async registerDeviceToken(req, res) {
    try {
      const userId = req.user.id;
      const { device_token, platform } = req.body;

      const { error } = await supabaseAdmin
        .from('user_device_tokens')
        .upsert({
          user_id: userId,
          device_token: device_token,
          platform: platform,
          updated_at: new Date().toISOString()
        });

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to register device token'
        });
      }

      res.json({
        success: true,
        message: 'Device token registered'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Process pending notifications (background job)
   */
  async processPendingNotifications() {
    try {
      // Get pending notifications
      const { data: notifications, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('status', 'pending')
        .lt('created_at', new Date(Date.now() - 60000).toISOString()) // 1 minute ago
        .limit(100);

      if (error) {
        console.error('Error fetching pending notifications:', error);
        return { success: false, error: error.message };
      }

      if (!notifications || notifications.length === 0) {
        return { success: true, processed: 0 };
      }

      let processed = 0;
      for (const notification of notifications) {
        try {
          // Check if user is online
          const isOnline = this.isUserOnline(notification.user_id);
          
          if (isOnline && this.io) {
            // Send real-time notification
            this.io.to(`user_${notification.user_id}`).emit('notification', {
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
            await this.markNotificationAsDelivered(notification.id);
            processed++;
          } else {
            // Send push notification
            await this.sendPushNotification(notification);
            processed++;
          }
        } catch (error) {
          console.error(`Error processing notification ${notification.id}:`, error);
          // Mark as failed after 3 attempts
          if (notification.retry_count >= 3) {
            await this.markNotificationAsFailed(notification.id);
          } else {
            await this.incrementRetryCount(notification.id);
          }
        }
      }

      return { success: true, processed };
    } catch (error) {
      console.error('Error processing pending notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(notification) {
    try {
      // Get user's device tokens
      const { data: deviceTokens, error } = await supabaseAdmin
        .from('user_device_tokens')
        .select('device_token, platform')
        .eq('user_id', notification.user_id);

      if (error || !deviceTokens || deviceTokens.length === 0) {
        return { success: false, error: 'No device tokens found' };
      }

      // Send push notification to each device
      for (const device of deviceTokens) {
        try {
          // Here you would integrate with FCM/APNS
          // For now, we'll just log it
          console.log(`Sending push notification to ${device.platform}:`, {
            token: device.device_token,
            title: notification.title,
            message: notification.message,
            data: notification.data
          });

          // Mark as delivered
          await this.markNotificationAsDelivered(notification.id);
        } catch (error) {
          console.error(`Error sending push to device ${device.device_token}:`, error);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark notification as delivered
   */
  async markNotificationAsDelivered(notificationId) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as delivered:', error);
      }
    } catch (error) {
      console.error('Error marking notification as delivered:', error);
    }
  }

  /**
   * Mark notification as failed
   */
  async markNotificationAsFailed(notificationId) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as failed:', error);
      }
    } catch (error) {
      console.error('Error marking notification as failed:', error);
    }
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(notificationId) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({
          retry_count: supabaseAdmin.raw('retry_count + 1')
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error incrementing retry count:', error);
      }
    } catch (error) {
      console.error('Error incrementing retry count:', error);
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
   * Clean up old notifications
   */
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo)
        .eq('status', 'read');

      if (error) {
        console.error('Error cleaning up old notifications:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationController();
