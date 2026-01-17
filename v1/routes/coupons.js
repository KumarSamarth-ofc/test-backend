const express = require("express");
const router = express.Router();
const CouponController = require("../controllers/couponController");
const authMiddleware = require("../middleware/authMiddleware");
const { validateCoupon } = require("../validators/couponValidators");

/**
 * Coupon Routes
 * All routes require authentication
 */

// Validate a coupon code (BRAND_OWNER only)
router.post(
  "/validate",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  validateCoupon,
  CouponController.validateCoupon
);

module.exports = router;

