const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../utils/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Get user notifications
router.get('/', NotificationController.getUserNotifications.bind(NotificationController));

// Get unread count
router.get('/unread-count', NotificationController.getUnreadCount.bind(NotificationController));

// Mark as read
router.put('/:notification_id/read', NotificationController.markAsRead.bind(NotificationController));

// Mark all as read
router.put('/mark-all-read', NotificationController.markAllAsRead.bind(NotificationController));

// Delete notification
router.delete('/:notification_id', NotificationController.deleteNotification.bind(NotificationController));

// Get preferences
router.get('/preferences', NotificationController.getPreferences.bind(NotificationController));

// Update preferences
router.put('/preferences', NotificationController.updatePreferences.bind(NotificationController));

// Register device token
router.post('/register-device', NotificationController.registerDeviceToken.bind(NotificationController));

module.exports = router;
