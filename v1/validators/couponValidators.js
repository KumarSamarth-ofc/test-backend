const { body } = require("express-validator");

/**
 * Coupon Validators
 * Validation rules for coupon operations
 */

const validateCoupon = [
  body("coupon_code")
    .notEmpty()
    .withMessage("coupon_code is required")
    .isString()
    .withMessage("coupon_code must be a string")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("coupon_code must be between 1 and 50 characters"),

  body("order_amount")
    .notEmpty()
    .withMessage("order_amount is required")
    .isFloat({ min: 0 })
    .withMessage("order_amount must be a positive number"),
];

module.exports = {
  validateCoupon,
};

