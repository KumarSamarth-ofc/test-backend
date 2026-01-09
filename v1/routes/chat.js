const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

// Get chat history for an application
router.get(
  "/:applicationId/history",
  authMiddleware.authenticateToken,
  chatController.getHistory
);

// Create a new chat for an application
router.post(
  "/:applicationId",
  authMiddleware.authenticateToken,
  chatController.createChat
);

// Get chat details for an application
router.get(
  "/:applicationId",
  authMiddleware.authenticateToken,
  chatController.getChat
);

module.exports = router;
