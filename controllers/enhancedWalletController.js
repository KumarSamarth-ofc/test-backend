const enhancedBalanceService = require('../utils/enhancedBalanceService');
const { supabaseAdmin } = require('../supabase/client');

class EnhancedWalletController {
  /**
   * Get comprehensive wallet balance with all components
   */
  async getWalletBalance(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await enhancedBalanceService.getWalletBalance(userId);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      res.json({
        success: true,
        wallet: result.wallet,
        balance_summary: result.balance_summary
      });
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Process withdrawal from wallet
   */
  async processWithdrawal(req, res) {
    try {
      const { amount } = req.body;
      const userId = req.user.id;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid withdrawal amount is required'
        });
      }

      // Convert to paise
      const amountPaise = Math.round(amount * 100);

      const result = await enhancedBalanceService.processWithdrawal(
        userId,
        amountPaise,
        {
          withdrawal_method: req.body.method || 'bank_transfer',
          bank_details: req.body.bank_details || null,
          notes: req.body.notes || 'Withdrawal request'
        }
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
          details: result
        });
      }

      res.json({
        success: true,
        message: 'Withdrawal processed successfully',
        withdrawal_id: result.withdrawal_id,
        transaction: result.transaction,
        new_balance: result.new_balance_rupees,
        new_withdrawn_balance: result.new_withdrawn_balance_rupees,
        new_total_balance: result.new_total_balance_rupees
      });
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get comprehensive transaction history
   */
  async getTransactionHistory(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      const filters = {
        type: req.query.type,
        direction: req.query.direction,
        status: req.query.status,
        conversation_id: req.query.conversation_id
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const result = await enhancedBalanceService.getTransactionHistory(
        userId,
        page,
        limit,
        filters
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      res.json({
        success: true,
        transactions: result.transactions,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting transaction history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get transaction summary for a period
   */
  async getTransactionSummary(req, res) {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days) || 30;

      const result = await enhancedBalanceService.getTransactionSummary(userId, days);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      const summary = result.summary;

      res.json({
        success: true,
        summary: {
          period_days: days,
          total_credits: summary.total_credits_paise / 100,
          total_debits: summary.total_debits_paise / 100,
          total_withdrawals: summary.total_withdrawals_paise / 100,
          total_escrow_holds: summary.total_escrow_holds_paise / 100,
          total_escrow_releases: summary.total_escrow_releases_paise / 100,
          net_balance_change: summary.net_balance_change_paise / 100,
          // Paise values for precision
          total_credits_paise: summary.total_credits_paise,
          total_debits_paise: summary.total_debits_paise,
          total_withdrawals_paise: summary.total_withdrawals_paise,
          total_escrow_holds_paise: summary.total_escrow_holds_paise,
          total_escrow_releases_paise: summary.total_escrow_releases_paise,
          net_balance_change_paise: summary.net_balance_change_paise
        }
      });
    } catch (error) {
      console.error('Error getting transaction summary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get escrow holds for user
   */
  async getEscrowHolds(req, res) {
    try {
      const userId = req.user.id;

      const result = await enhancedBalanceService.getEscrowHolds(userId);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      res.json({
        success: true,
        escrow_holds: result.holds
      });
    } catch (error) {
      console.error('Error getting escrow holds:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get wallet balance breakdown with detailed analysis
   */
  async getWalletBreakdown(req, res) {
    try {
      const userId = req.user.id;

      // Get wallet balance
      const balanceResult = await enhancedBalanceService.getWalletBalance(userId);
      if (!balanceResult.success) {
        return res.status(500).json({
          success: false,
          message: balanceResult.error
        });
      }

      // Get transaction summary for last 30 days
      const summaryResult = await enhancedBalanceService.getTransactionSummary(userId, 30);
      if (!summaryResult.success) {
        return res.status(500).json({
          success: false,
          message: summaryResult.error
        });
      }

      // Get recent transactions
      const historyResult = await enhancedBalanceService.getTransactionHistory(userId, 1, 10);
      if (!historyResult.success) {
        return res.status(500).json({
          success: false,
          message: historyResult.error
        });
      }

      // Get escrow holds
      const escrowResult = await enhancedBalanceService.getEscrowHolds(userId);
      if (!escrowResult.success) {
        return res.status(500).json({
          success: false,
          message: escrowResult.error
        });
      }

      res.json({
        success: true,
        wallet: balanceResult.wallet,
        balance_summary: balanceResult.balance_summary,
        transaction_summary: summaryResult.summary,
        recent_transactions: historyResult.transactions,
        escrow_holds: escrowResult.holds,
        analysis: {
          available_percentage: balanceResult.balance_summary.total > 0 
            ? Math.round((balanceResult.balance_summary.available / balanceResult.balance_summary.total) * 100)
            : 0,
          frozen_percentage: balanceResult.balance_summary.total > 0 
            ? Math.round((balanceResult.balance_summary.frozen / balanceResult.balance_summary.total) * 100)
            : 0,
          withdrawn_percentage: balanceResult.balance_summary.total > 0 
            ? Math.round((balanceResult.balance_summary.withdrawn / balanceResult.balance_summary.total) * 100)
            : 0,
          total_escrow_amount: escrowResult.holds
            .filter(hold => hold.status === 'held')
            .reduce((sum, hold) => sum + hold.amount_paise, 0) / 100
        }
      });
    } catch (error) {
      console.error('Error getting wallet breakdown:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Create wallet for user (if doesn't exist)
   */
  async createWallet(req, res) {
    try {
      const userId = req.user.id;

      const result = await enhancedBalanceService.createWallet(userId);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error
        });
      }

      res.json({
        success: true,
        message: 'Wallet created successfully',
        wallet: result.wallet,
        balance_summary: result.balance_summary
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new EnhancedWalletController();
