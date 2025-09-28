const express = require('express');
const multer = require('multer');
const router = express.Router();
const directStorageController = require('../controllers/directStorageController');
const authService = require('../utils/auth');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max
  }
});

// Upload file and send message
router.post('/conversations/:conversation_id/upload',
  authService.authenticateToken,
  upload.single('file'),
  directStorageController.uploadAndSendMessage
);

// Delete file
router.delete('/files/:message_id',
  authService.authenticateToken,
  directStorageController.deleteFile
);

// Get file info
router.get('/files/:message_id',
  authService.authenticateToken,
  directStorageController.getFileInfo
);

// Get supported file types
router.get('/supported-types',
  directStorageController.getSupportedTypes
);


module.exports = router;
