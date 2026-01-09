const express = require("express");
const router = express.Router();

const UserController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// Get current user details
router.get(
  "/me",
  authMiddleware.authenticateToken,
  UserController.getUser
);

// Get all influencers (Brand owner only)
router.get(
  "/influencers/all",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  UserController.getInfluencers
);

module.exports = router;
