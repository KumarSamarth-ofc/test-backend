const express = require("express");
const router = express.Router();

const { AuthController } = require("../controllers/authController");
const {
  validateSendOTP,
  validateVerifyOTP,
  validateBrandRegister,
  validateBrandLogin,
  validateEmailVerification,
  validateResendEmailVerification,
  validateForgotPassword,
  validateResetPassword,
} = require("../validators");
const AuthService = require("../services/authService");
const { normalizeEnums } = require("../middleware/enumNormalizer");

// OTP authentication routes
router.post("/send-otp", normalizeEnums, validateSendOTP, AuthController.sendOTP);
router.post(
  "/send-registration-otp",
  validateSendOTP,
  AuthController.sendRegistrationOTP
);
router.post("/verify-otp", validateVerifyOTP, AuthController.verifyOTP);
router.post("/refresh-token", AuthController.refreshToken);

// WhatsApp status check
router.get("/whatsapp-status", (req, res) => {
  const status = AuthService.getWhatsAppStatus();
  res.json({ success: true, whatsapp: status });
});

// Brand owner authentication routes
router.post(
  "/brand/register",
  validateBrandRegister,
  AuthController.registerBrandOwner
);
router.post("/brand/login", validateBrandLogin, AuthController.loginBrandOwner);

// Email verification routes
router.post(
  "/brand/verify-email",
  validateEmailVerification,
  AuthController.verifyEmail
);
router.post(
  "/brand/resend-verification",
  validateResendEmailVerification,
  AuthController.resendEmailVerification
);

// Password reset routes
router.post(
  "/brand/forgot-password",
  validateForgotPassword,
  AuthController.forgotPassword
);
router.post(
  "/brand/reset-password",
  validateResetPassword,
  AuthController.resetPassword
);

module.exports = router;
