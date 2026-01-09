const express = require("express");
const router = express.Router();
const SubscriptionController = require("../controllers/subscriptionController");
const authMiddleware = require("../middleware/authMiddleware");
const { validateCreateSubscription } = require("../validators/subscriptionValidators");

router.post(
  "/create",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  validateCreateSubscription,
  SubscriptionController.createSubscription
);

router.get(
  "/status",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  SubscriptionController.getSubscriptionStatus
);

module.exports = router;

