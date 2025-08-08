const express = require('express');
const router = express.Router();
const authService = require('../utils/auth');
const {
    AuthController,
    validateSendOTP,
    validateVerifyOTP,
    validateUpdateProfile
} = require('../controllers/authController');

// Public routes
router.post('/send-otp', validateSendOTP, AuthController.sendOTP);
router.post('/verify-otp', validateVerifyOTP, AuthController.verifyOTP);
router.post('/refresh-token', AuthController.refreshToken);

// Protected routes
router.get('/profile', authService.authenticateToken, AuthController.getProfile);
router.put('/profile', authService.authenticateToken, validateUpdateProfile, AuthController.updateProfile);
router.post('/logout', authService.authenticateToken, AuthController.logout);
router.delete('/account', authService.authenticateToken, AuthController.deleteAccount);

module.exports = router; 