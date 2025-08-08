const paymentService = require('../utils/payment');
const { supabaseAdmin } = require('../supabase/client');

class PaymentController {
    /**
     * Process payment response from frontend
     */
    async processPayment(req, res) {
        try {
            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                request_id,
                amount,
                payment_type // 'approval' or 'completion'
            } = req.body;

            // Validate required fields
            if (!razorpay_order_id || !razorpay_payment_id || !request_id || !amount || !payment_type) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required payment information'
                });
            }

            // Process the payment
            const result = await paymentService.processPaymentResponse({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                request_id,
                amount,
                payment_type
            });

            if (result.success) {
                res.json({
                    success: true,
                    transaction: result.transaction,
                    message: result.message
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get transaction history for a user
     */
    async getTransactionHistory(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10, status } = req.query;

            const result = await paymentService.getTransactionHistory(
                userId,
                parseInt(page),
                parseInt(limit),
                status
            );

            if (result.success) {
                res.json({
                    success: true,
                    transactions: result.transactions,
                    pagination: result.pagination
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get wallet balance
     */
    async getWalletBalance(req, res) {
        try {
            const userId = req.user.id;

            const result = await paymentService.getWalletBalance(userId);

            if (result.success) {
                res.json({
                    success: true,
                    balance: result.balance
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get payment statistics
     */
    async getPaymentStats(req, res) {
        try {
            const userId = req.user.id;

            const result = await paymentService.getPaymentStats(userId);

            if (result.success) {
                res.json({
                    success: true,
                    stats: result.stats
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Create refund record
     */
    async createRefund(req, res) {
        try {
            const { payment_id, amount, reason } = req.body;
            const userId = req.user.id;

            // Check if user has permission to request refund
            const { data: transaction, error: transactionError } = await supabaseAdmin
                .from('transactions')
                .select(`
                    *,
                    wallets!inner (
                        user_id
                    )
                `)
                .eq('razorpay_payment_id', payment_id)
                .single();

            if (transactionError || !transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            if (transaction.wallets.user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Process refund
            const refundResult = await paymentService.createRefundRecord(payment_id, amount, reason);

            if (refundResult.success) {
                res.json({
                    success: true,
                    refund: refundResult.refund,
                    message: refundResult.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: refundResult.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get request payment details
     */
    async getRequestPaymentDetails(req, res) {
        try {
            const { request_id } = req.params;
            const userId = req.user.id;

            // Check if request exists and user has permission
            const { data: request, error: requestError } = await supabaseAdmin
                .from('requests')
                .select(`
                    *,
                    campaigns (
                        id,
                        title,
                        created_by,
                        budget
                    ),
                    influencer:users!requests_influencer_id_fkey (
                        id,
                        wallets (id)
                    )
                `)
                .eq('id', request_id)
                .single();

            if (requestError || !request) {
                return res.status(404).json({
                    success: false,
                    message: 'Request not found'
                });
            }

            // Check permissions
            if (req.user.role === 'brand_owner' && request.campaigns.created_by !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            if (req.user.role === 'influencer' && request.influencer_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Calculate payment amounts
            const totalBudget = parseFloat(request.campaigns.budget);
            const approvalAmount = totalBudget * 0.5;
            const completionAmount = totalBudget * 0.5;

            res.json({
                success: true,
                request: request,
                payment_details: {
                    total_budget: totalBudget,
                    approval_amount: approvalAmount,
                    completion_amount: completionAmount,
                    approval_paid: request.status === 'approved' || request.status === 'in_progress' || request.status === 'completed',
                    completion_paid: request.status === 'completed'
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = {
    PaymentController: new PaymentController()
}; 