const express = require('express');
const router = express.Router();
const enhancedWalletController = require('../controllers/enhancedWalletController');
const { authenticateToken } = require('../middleware/security');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route GET /api/enhanced-wallet/balance
 * @desc Get comprehensive wallet balance with all components
 * @access Private
 */
router.get('/balance', enhancedWalletController.getWalletBalance);

/**
 * @route POST /api/enhanced-wallet/withdraw
 * @desc Process withdrawal from wallet
 * @access Private
 */
router.post('/withdraw', enhancedWalletController.processWithdrawal);

/**
 * @route GET /api/enhanced-wallet/transactions
 * @desc Get comprehensive transaction history
 * @access Private
 * @query page, limit, type, direction, status, conversation_id
 */
router.get('/transactions', enhancedWalletController.getTransactionHistory);

/**
 * @route GET /api/enhanced-wallet/summary
 * @desc Get transaction summary for a period
 * @access Private
 * @query days (default: 30)
 */
router.get('/summary', enhancedWalletController.getTransactionSummary);

/**
 * @route GET /api/enhanced-wallet/escrow-holds
 * @desc Get escrow holds for user
 * @access Private
 */
router.get('/escrow-holds', enhancedWalletController.getEscrowHolds);

/**
 * @route GET /api/enhanced-wallet/breakdown
 * @desc Get comprehensive wallet breakdown with analysis
 * @access Private
 */
router.get('/breakdown', enhancedWalletController.getWalletBreakdown);

/**
 * @route POST /api/enhanced-wallet/create
 * @desc Create wallet for user (if doesn't exist)
 * @access Private
 */
router.post('/create', enhancedWalletController.createWallet);

module.exports = router;
