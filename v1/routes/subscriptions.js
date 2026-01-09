const express = require("express");
const router = express.Router();

const SubscriptionController = require("../controllers/subscriptionController");
const authMiddleware = require("../middleware/authMiddleware");
const { validateCreateSubscription } = require(
  "../validators/subscriptionValidators"
);

// Create a new subscription (Brand owner only)
router.post(
  "/create",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  validateCreateSubscription,
  SubscriptionController.createSubscription
);

// Get subscription status for current user (Brand owner only)
router.get(
  "/status",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  SubscriptionController.getSubscriptionStatus
);

module.exports = router;
