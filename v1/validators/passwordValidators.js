const { body } = require("express-validator");

// Password validation regex: at least one uppercase, one lowercase, and one number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const passwordErrorMessage =
  "Password must contain at least one uppercase letter, one lowercase letter, and one number";

// Validate brand owner registration
const validateBrandRegister = [
  body("email")
    .isEmail()
    .withMessage("Valid email address required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(passwordRegex)
    .withMessage(passwordErrorMessage),
  body("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim(),
];

// Validate brand owner login
const validateBrandLogin = [
  body("email")
    .isEmail()
    .withMessage("Valid email address required")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Validate email verification
const validateEmailVerification = [
  body("token").notEmpty().withMessage("Verification token is required"),
];

// Validate resend email verification
const validateResendEmailVerification = [
  body("email")
    .isEmail()
    .withMessage("Valid email address required")
    .normalizeEmail(),
];

// Validate forgot password
const validateForgotPassword = [
  body("email")
    .isEmail()
    .withMessage("Valid email address required")
    .normalizeEmail(),
];

// Validate reset password
const validateResetPassword = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("new_password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(passwordRegex)
    .withMessage(passwordErrorMessage),
];

module.exports = {
  validateBrandRegister,
  validateBrandLogin,
  validateEmailVerification,
  validateResendEmailVerification,
  validateForgotPassword,
  validateResetPassword,
};
