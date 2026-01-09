const express = require("express");
const router = express.Router();
const UserController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/me",
  authMiddleware.authenticateToken,
  UserController.getUser
);

router.get(
  "/influencers/all",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  UserController.getInfluencers
);

module.exports = router;

