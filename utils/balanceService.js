const { supabaseAdmin } = require("../supabase/client");

class BalanceService {
  /**
   * Get user's wallet balance with proper breakdown using wallet table
   */
  async getWalletBalance(userId) {
    try {
      // Get balance using the get_wallet_balance function
      const { data: balance, error } = await supabaseAdmin.rpc(
        'get_wallet_balance',
        { p_user_id: userId }
      );

      if (error) {
        if (error.code === "PGRST116") {
          // No wallet found, create one
          return await this.createWallet(userId);
        }
        throw error;
      }

      if (!balance || balance.length === 0) {
        // No wallet found, create one
        return await this.createWallet(userId);
      }

      const walletData = balance[0];

      return {
        success: true,
        wallet: {
          user_id: userId,
          total_balance_paise: walletData.total_balance_paise || 0,
          withdrawable_balance_paise: walletData.withdrawable_balance_paise || 0,
          frozen_balance_paise: walletData.frozen_balance_paise || 0,
          total_balance_rupees: walletData.total_balance_rupees || 0,
          withdrawable_balance_rupees: walletData.withdrawable_balance_rupees || 0,
          frozen_balance_rupees: walletData.frozen_balance_rupees || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a new wallet for user
   */
  async createWallet(userId) {
    try {
      const { data: wallet, error } = await supabaseAdmin
        .from("wallets")
        .insert({
          user_id: userId,
          balance: 0.0,
          balance_paise: 0,
          withdrawable_balance_paise: 0,
          frozen_balance_paise: 0,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        wallet: {
          user_id: userId,
          total_balance_paise: 0,
          withdrawable_balance_paise: 0,
          frozen_balance_paise: 0,
          total_balance_rupees: 0,
          withdrawable_balance_rupees: 0,
          frozen_balance_rupees: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add funds to wallet (for payments received)
   */
  async addFunds(userId, amountPaise, transactionData = {}) {
    try {
      // Get or create wallet
      const walletResult = await this.getWalletBalance(userId);
      if (!walletResult.success) {
        return walletResult;
      }

      const wallet = walletResult.wallet;
      const newTotalBalance = wallet.total_balance_paise + amountPaise;
      const newWithdrawableBalance = wallet.withdrawable_balance_paise + amountPaise;

      // Update wallet: add to both total and withdrawable
      const { error: updateError } = await supabaseAdmin
        .from("wallets")
        .update({
          balance_paise: newTotalBalance,
          withdrawable_balance_paise: newWithdrawableBalance,
          balance: newTotalBalance / 100, // Keep old balance field for compatibility
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (updateError) {
        throw updateError;
      }

      // Create transaction record
      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from("transactions")
        .insert({
          user_id: userId,
          amount: amountPaise / 100,
          amount_paise: amountPaise,
          type: "credit",
          status: "completed",
          description: transactionData.description || "Funds added to wallet",
          ...transactionData,
        })
        .select()
        .single();

      if (transactionError) {
        throw transactionError;
      }

      return {
        success: true,
        transaction,
        new_total_balance: newTotalBalance,
        new_withdrawable_balance: newWithdrawableBalance,
        new_total_balance_rupees: newTotalBalance / 100,
        new_withdrawable_balance_rupees: newWithdrawableBalance / 100,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }


  /**
   * Freeze amount in wallet for escrow
   */
  async freezeAmountForEscrow(userId, amountPaise, conversationId, paymentOrderId) {
    try {
      const { data: escrowHoldId, error } = await supabaseAdmin.rpc(
        'freeze_wallet_for_escrow',
        {
          p_user_id: userId,
          p_amount_paise: amountPaise,
          p_conversation_id: conversationId,
          p_payment_order_id: paymentOrderId
        }
      );

      if (error) throw error;

      return {
        success: true,
        escrow_hold_id: escrowHoldId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Release escrow amount
   */
  async releaseEscrowAmount(escrowHoldId) {
    try {
      const { data: result, error } = await supabaseAdmin.rpc(
        'release_escrow_amount',
        {
          p_escrow_hold_id: escrowHoldId,
          p_release_type: 'released'
        }
      );

      if (error) throw error;

      return {
        success: true,
        released: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Refund escrow amount
   */
  async refundEscrowAmount(escrowHoldId) {
    try {
      const { data: result, error } = await supabaseAdmin.rpc(
        'refund_escrow_amount',
        {
          p_escrow_hold_id: escrowHoldId
        }
      );

      if (error) throw error;

      return {
        success: true,
        refunded: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get escrow holds for user (via conversations)
   */
  async getEscrowHolds(userId) {
    try {
      const { data: escrowHolds, error } = await supabaseAdmin
        .from("escrow_holds")
        .select(`
          *,
          conversations(id, title, brand_owner_id, influencer_id),
          payment_orders(id, amount_paise, currency)
        `)
        .or(`conversations.brand_owner_id.eq.${userId},conversations.influencer_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return {
        success: true,
        escrow_holds: escrowHolds || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new BalanceService();
