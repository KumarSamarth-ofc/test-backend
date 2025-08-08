const express = require('express');
const router = express.Router();
const authService = require('../utils/auth');
const {
    MessageController,
    validateSendMessage
} = require('../controllers/messageController');

// All routes require authentication
router.use(authService.authenticateToken);

// Conversation routes
router.post('/conversations', MessageController.createConversation);
router.get('/conversations', MessageController.getConversations);
router.get('/conversations/:conversation_id/messages', MessageController.getMessages);
router.post('/conversations/:conversation_id/messages', validateSendMessage, MessageController.sendMessage);
router.put('/conversations/:conversation_id/seen', MessageController.markMessagesAsSeen);
router.delete('/messages/:message_id', MessageController.deleteMessage);

// Utility routes
router.get('/unread-count', MessageController.getUnreadCount);

module.exports = router; 