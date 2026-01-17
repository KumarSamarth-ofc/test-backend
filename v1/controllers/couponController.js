const { validationResult } = require("express-validator");
const CouponService = require("../services/couponService");

/**
 * Coupon Controller
 * Handles HTTP requests for coupon-related endpoints
 */
class CouponController {
  /**
   * Validate a coupon code
   * POST /api/v1/coupons/validate
   */
  async validateCoupon(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { coupon_code, order_amount } = req.body;

      const result = await CouponService.validateCoupon(
        coupon_code,
        userId,
        parseFloat(order_amount)
      );

      if (!result.success || !result.valid) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: result.message || "Invalid coupon",
        });
      }

      return res.status(200).json({
        success: true,
        valid: true,
        coupon: result.coupon,
        discount_amount: result.discount_amount,
        final_amount: result.final_amount,
        original_amount: result.original_amount,
        message: result.message,
      });
    } catch (err) {
      console.error("[v1/CouponController/validateCoupon] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  }
}

module.exports = new CouponController();

