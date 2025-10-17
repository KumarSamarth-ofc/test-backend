const express = require("express");
const router = express.Router();
const adminPaymentController = require("../controllers/adminPaymentController");
const authService = require("../utils/auth");

// Apply admin authentication middleware to all routes
router.use(authService.authenticateToken);
router.use(authService.requireRole('admin'));

/**
 * @route GET /api/admin/payments/pending
 * @desc Get all pending payments for admin
 * @access Admin Only
 * @query page, limit, status (advance_pending, final_pending)
 */
router.get("/pending", adminPaymentController.getPendingPayments);

/**
 * @route POST /api/admin/payments/:payment_id/confirm-advance
 * @desc Confirm advance payment
 * @access Admin Only
 * @body { screenshot_url }
 */
router.post("/:payment_id/confirm-advance", adminPaymentController.confirmAdvancePayment);

/**
 * @route POST /api/admin/payments/:payment_id/process-final
 * @desc Process final payment
 * @access Admin Only
 * @body { screenshot_url }
 */
router.post("/:payment_id/process-final", adminPaymentController.processFinalPayment);

/**
 * @route GET /api/admin/payments/timeline/:conversation_id
 * @desc Get payment timeline for a conversation
 * @access Admin Only
 */
router.get("/timeline/:conversation_id", adminPaymentController.getPaymentTimeline);

/**
 * @route POST /api/admin/payments/:payment_id/upload-screenshot
 * @desc Upload payment screenshot
 * @access Admin Only
 * @body { screenshot_url, payment_type }
 */
router.post("/:payment_id/upload-screenshot", adminPaymentController.uploadScreenshot);

/**
 * @route GET /api/admin/payments/statistics
 * @desc Get payment statistics for admin dashboard
 * @access Admin Only
 * @query days (default: 30)
 */
router.get("/statistics", adminPaymentController.getPaymentStatistics);

/**
 * @route POST /api/admin/payments/expiry-sweep
 * @desc Mark expired campaigns/bids based on dates and no requests
 * @access Admin Only
 */
router.post("/expiry-sweep", adminPaymentController.runExpirySweep);

module.exports = router;
