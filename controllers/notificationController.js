const notificationService = require('../services/notificationService');

class NotificationController {
  /**
   * Get user notifications
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        status,
        type,
        unread_only = false
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        type,
        unread_only: unread_only === 'true'
      };

      const result = await notificationService.getUserNotifications(userId, options);

      if (result.success) {
        res.json({
          success: true,
          notifications: result.notifications,
          pagination: result.pagination
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to fetch notifications',
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error in getNotifications:', error);
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

      const result = await notificationService.getUnreadCount(userId);

      if (result.success) {
        res.json({
          success: true,
          count: result.count
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to get unread count',
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error in getUnreadCount:', error);
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
      const userId = req.user.id;
      const { notificationId } = req.params;

      const result = await notificationService.markAsRead(notificationId, userId);

      if (result.success) {
        res.json({
          success: true,
          message: 'Notification marked as read',
          notification: result.notification
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to mark notification as read',
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error in markAsRead:', error);
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

      const result = await notificationService.markAllAsRead(userId);

      if (result.success) {
        res.json({
          success: true,
          message: 'All notifications marked as read'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to mark all notifications as read',
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error in markAllAsRead:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Clean up expired notifications (admin only)
   */
  async cleanupExpired(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      const result = await notificationService.cleanupExpiredNotifications();

      if (result.success) {
        res.json({
          success: true,
          message: 'Expired notifications cleaned up successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to cleanup expired notifications',
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error in cleanupExpired:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new NotificationController();
