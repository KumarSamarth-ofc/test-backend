const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");
const { authenticateToken } = require("../utils/auth");

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validate a coupon code
router.post("/validate", couponController.validateCoupon);

// Apply a coupon code
router.post("/apply", couponController.applyCoupon);

// Create subscription with coupon applied
router.post("/create-subscription", couponController.createSubscriptionWithCoupon);

// Get user's coupon usage history
router.get("/history", couponController.getCouponHistory);

// Admin routes
router.get("/admin/all", couponController.getAllCoupons);
router.post("/admin/create", couponController.createCoupon);
router.put("/admin/:couponId", couponController.updateCoupon);
router.delete("/admin/:couponId", couponController.deleteCoupon);
router.get("/admin/stats", couponController.getCouponStats);

module.exports = router;