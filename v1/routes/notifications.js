const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateRegisterToken, validateUnregisterToken } = require('../validators');

// Get notifications
router.get('/', authMiddleware.authenticateToken, notificationController.getNotifications.bind(notificationController));

// Mark as read
router.patch('/:id/read', authMiddleware.authenticateToken, notificationController.markAsRead.bind(notificationController));

// Delivery stats
router.get(
  '/:id/delivery-stats',
  authMiddleware.authenticateToken,
  notificationController.getDeliveryStats.bind(notificationController),
);

// Retry
router.post(
  '/:id/retry',
  authMiddleware.authenticateToken,
  notificationController.retryNotification.bind(notificationController),
);

// FCM Token Registration
router.post(
  '/fcm/register',
  authMiddleware.authenticateToken,
  validateRegisterToken,
  notificationController.registerFCMToken.bind(notificationController)
);

// FCM Token Unregistration
router.post(
  '/fcm/unregister',
  authMiddleware.authenticateToken,
  validateUnregisterToken,
  notificationController.unregisterFCMToken.bind(notificationController)
);

module.exports = router;

