const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeEnums } = require("../middleware/enumNormalizer");
const {
  validateApplicationIdParam,
  validateVerifyPayment,
} = require("../validators/paymentValidators");

router.get(
  "/config",
  authMiddleware.authenticateToken,
  PaymentController.getPaymentConfig
);

router.post(
  "/applications/:applicationId",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(["BRAND_OWNER", "ADMIN"]),
  validateApplicationIdParam,
  PaymentController.createApplicationPaymentOrder
);

router.post(
  "/verify",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(["BRAND_OWNER", "ADMIN"]),
  normalizeEnums,
  validateVerifyPayment,
  PaymentController.verifyPayment
);

router.post(
  "/applications/:applicationId/release",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  validateApplicationIdParam,
  PaymentController.releasePayout
);

router.get(
  "/applications/:applicationId",
  authMiddleware.authenticateToken,
  validateApplicationIdParam,
  PaymentController.getApplicationPayments
);

module.exports = router;
