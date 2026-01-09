const express = require("express");
const router = express.Router();

const PaymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeEnums } = require("../middleware/enumNormalizer");
const {
  validateApplicationIdParam,
  validateVerifyPayment,
} = require("../validators/paymentValidators");

// Get payment configuration
router.get(
  "/config",
  authMiddleware.authenticateToken,
  PaymentController.getPaymentConfig
);

// Create payment order for an application (Brand owner or Admin)
router.post(
  "/applications/:applicationId",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(["BRAND_OWNER", "ADMIN"]),
  validateApplicationIdParam,
  PaymentController.createApplicationPaymentOrder
);

// Verify payment (Brand owner or Admin)
router.post(
  "/verify",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(["BRAND_OWNER", "ADMIN"]),
  normalizeEnums,
  validateVerifyPayment,
  PaymentController.verifyPayment
);

// Release payout to influencer (Admin only)
router.post(
  "/applications/:applicationId/release",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  validateApplicationIdParam,
  PaymentController.releasePayout
);

// Get payment history for an application
router.get(
  "/applications/:applicationId",
  authMiddleware.authenticateToken,
  validateApplicationIdParam,
  PaymentController.getApplicationPayments
);

module.exports = router;
