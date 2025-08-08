const express = require('express');
const router = express.Router();
const authService = require('../utils/auth');
const { PaymentController } = require('../controllers/paymentController');

// Protected payment routes
router.use(authService.authenticateToken);

// Process payment from frontend
router.post('/process-payment', PaymentController.processPayment);

// Transaction management
router.get('/transactions', PaymentController.getTransactionHistory);
router.get('/wallet/balance', PaymentController.getWalletBalance);
router.get('/stats', PaymentController.getPaymentStats);

// Refund management
router.post('/refund', PaymentController.createRefund);

// Request payment details
router.get('/request/:request_id/payment-details', PaymentController.getRequestPaymentDetails);

module.exports = router; 