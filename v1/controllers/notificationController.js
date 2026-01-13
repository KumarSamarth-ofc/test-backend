const NotificationService = require('../services/notificationService');
const { supabaseAdmin } = require('../db/config');

class NotificationController {
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      let query = supabaseAdmin
        .from('v1_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
      }

      res.json({
        success: true,
        data: data || [],
        pagination: { limit, offset, count: data?.length || 0 },
      });
    } catch (error) {
      console.error('[v1/NotificationController] getNotifications error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const { error } = await supabaseAdmin
        .from('v1_notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ success: false, message: 'Failed to mark as read', error: error.message });
      }

      res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      console.error('[v1/NotificationController] markAsRead error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getDeliveryStats(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const { data: notification, error: notifError } = await supabaseAdmin
        .from('v1_notifications')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (notifError || !notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      const statsResult = await NotificationService.getDeliveryStats(id);
      if (!statsResult.success) {
        return res
          .status(500)
          .json({ success: false, message: 'Failed to get delivery stats', error: statsResult.error });
      }

      res.json({ success: true, data: statsResult.stats });
    } catch (error) {
      console.error('[v1/NotificationController] getDeliveryStats error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async retryNotification(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const { data: notification, error: notifError } = await supabaseAdmin
        .from('v1_notifications')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (notifError || !notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      const retryResult = await NotificationService.retryNotification(id);
      if (!retryResult.success) {
        return res
          .status(400)
          .json({ success: false, message: 'Failed to retry notification', error: retryResult.error });
      }

      res.json({ success: true, message: 'Notification retry initiated', data: retryResult });
    } catch (error) {
      console.error('[v1/NotificationController] retryNotification error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new NotificationController();

