const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.get(
  '/:applicationId/history', 
  authMiddleware.authenticateToken,
  chatController.getHistory
);

router.post(
  '/:applicationId',
  authMiddleware.authenticateToken,
  chatController.createChat
);

router.get(
  '/:applicationId',
  authMiddleware.authenticateToken,
  chatController.getChat
);

module.exports = router;