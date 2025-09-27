const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const attachmentService = require('../utils/attachmentService');
const authService = require('../utils/auth');

// Middleware for different file types
const uploadImage = attachmentService.upload.single('image');
const uploadVideo = attachmentService.upload.single('video');
const uploadDocument = attachmentService.upload.single('document');
const uploadAudio = attachmentService.upload.single('audio');
const uploadAny = attachmentService.upload.single('attachment');

// Upload attachment for a conversation
router.post('/conversations/:conversation_id/upload', 
  authService.authenticateToken, 
  uploadAny, 
  attachmentController.uploadAttachment
);

// Send message with attachment
router.post('/conversations/:conversation_id/send-with-attachment',
  authService.authenticateToken,
  uploadAny,
  attachmentController.sendMessageWithAttachment
);

// Delete attachment
router.delete('/attachments/:attachment_id',
  authService.authenticateToken,
  attachmentController.deleteAttachment
);

// Get attachment info
router.get('/attachments/:attachment_id',
  authService.authenticateToken,
  attachmentController.getAttachmentInfo
);

// Get supported file types
router.get('/supported-types', (req, res) => {
  res.json({
    success: true,
    fileTypes: attachmentService.FILE_TYPES
  });
});

module.exports = router;
