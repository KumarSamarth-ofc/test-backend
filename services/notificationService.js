const { supabaseAdmin } = require("../supabase/client");

class NotificationService {
  /**
   * Store a notification in the database
   */
  async storeNotification(notificationData) {
    try {
      const {
        user_id,
        type,
        title,
        message,
        data = {},
        action_url = null,
        expires_at = null,
        priority = 'medium'
      } = notificationData;

      const { data: notification, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id,
          type,
          priority,
          status: 'pending',
          title,
          message,
          data,
          action_url,
          expires_at
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error storing notification:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Notification stored successfully:', notification.id);
      return { success: true, notification };
    } catch (error) {
      console.error('❌ Error in storeNotification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        type = null,
        unread_only = false
      } = options;

      let query = supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      
      if (type) {
        query = query.eq('type', type);
      }
      
      if (unread_only) {
        query = query.is('read_at', null);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data: notifications, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        notifications: notifications || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error in getUserNotifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({
          status: 'delivered',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true, notification: data };
    } catch (error) {
      console.error('❌ Error in markAsRead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({
          status: 'delivered',
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        console.error('❌ Error marking all notifications as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error in markAllAsRead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        console.error('❌ Error getting unread count:', error);
        return { success: false, error: error.message };
      }

      return { success: true, count: count || 0 };
    } catch (error) {
      console.error('❌ Error in getUnreadCount:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications() {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ Error cleaning up expired notifications:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error in cleanupExpiredNotifications:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();
