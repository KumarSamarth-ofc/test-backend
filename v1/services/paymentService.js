const { supabaseAdmin } = require("../db/config");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn(
    "⚠️  RazorPay environment variables not set. Payment features will be limited."
  );
}

/**
 * Payment Service for Applications
 * Handles payment flow: Brand pays admin after application completion, Admin releases to influencer
 */
class PaymentService {
  /**
   * Normalize payment status to UPPERCASE
   * Valid statuses: CREATED, PROCESSING, VERIFIED, FAILED, REFUNDED
   */
  normalizeStatus(status) {
    if (!status) return null;
    const normalized = String(status).toUpperCase().trim();
    const validStatuses = ["CREATED", "PROCESSING", "VERIFIED", "FAILED", "REFUNDED"];
    if (validStatuses.includes(normalized)) {
      return normalized;
    }
    return status; // Return original if not valid (for error handling)
  }

  /**
   * Calculate commission and breakdown
   */
  async calculateCommissionBreakdown(amount) {
    try {
      // Get current commission settings
      const { data: commissionSettings, error: commError } = await supabaseAdmin
        .from("v1_commission_settings")
        .select("*")
        .eq("is_active", true)
        .order("effective_from", { ascending: false })
        .limit(1)
        .single();

      if (commError || !commissionSettings) {
        console.warn("⚠️ No commission settings found, using default 10%");
        var commissionPercentage = 10.0;
      } else {
        var commissionPercentage = commissionSettings.commission_percentage;
      }

      const totalAmountPaise = Math.round(amount * 100);
      const commissionAmountPaise = Math.round(
        (totalAmountPaise * commissionPercentage) / 100
      );
      const netAmountPaise = totalAmountPaise - commissionAmountPaise;

      return {
        total_amount_paise: totalAmountPaise,
        commission_amount_paise: commissionAmountPaise,
        net_amount_paise: netAmountPaise,
        commission_percentage: commissionPercentage,
      };
    } catch (err) {
      console.error("[v1/PaymentService/calculateCommissionBreakdown] Exception:", err);
      throw err;
    }
  }

  /**
   * Create Razorpay order for application payment (Brand pays admin)
   * Only allowed when application phase is ACCEPTED
   */
  async createPaymentOrder(applicationId, userId) {
    try {
      if (!razorpay) {
        return {
          success: false,
          message: "Payment service is not configured",
        };
      }

      // Get application with campaign and influencer details
      const { data: application, error: applicationError } = await supabaseAdmin
        .from("v1_applications")
        .select(`
          *,
          v1_campaigns!inner(
            id,
            brand_id,
            title
          )
        `)
        .eq("id", applicationId)
        .single();

      if (applicationError || !application) {
        return {
          success: false,
          message: "Application not found",
        };
      }

      // Check if application phase is ACCEPTED (payment can be made after acceptance)
      if (application.phase !== "ACCEPTED") {
        return {
          success: false,
          message: "Payment can only be initiated for accepted applications",
        };
      }

      // Check if user is the brand owner
      const { data: user, error: userError } = await supabaseAdmin
        .from("v1_users")
        .select("id, role")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Permission check: Only brand owner can pay for their applications
      if (user.role !== "ADMIN" && application.v1_campaigns.brand_id !== userId) {
        return {
          success: false,
          message: "You don't have permission to pay for this application",
        };
      }

      // Check if agreed_amount exists
      if (!application.agreed_amount || application.agreed_amount <= 0) {
        return {
          success: false,
          message: "Application does not have a valid agreed amount",
        };
      }

      // Check if payment already exists for this application
      const { data: existingPayment } = await supabaseAdmin
        .from("v1_payment_orders")
        .select("id, status")
        .eq("application_id", applicationId)
        .maybeSingle();

      if (existingPayment) {
        // Normalize status to UPPERCASE
        const normalizedStatus = this.normalizeStatus(existingPayment.status) || existingPayment.status;
        if (normalizedStatus === "VERIFIED") {
          return {
            success: false,
            message: "Payment already completed for this application",
          };
        }
        // If payment exists but not verified, can create new one or return existing
        return {
          success: false,
          message: "Payment order already exists for this application",
        };
      }

      // Calculate commission breakdown using agreed_amount
      const breakdown = await this.calculateCommissionBreakdown(application.agreed_amount);

      // Razorpay receipt must be <= 40 chars
      const rawReceipt = `app_${applicationId.substring(0, 20)}_${Date.now()}`;
      const safeReceipt = rawReceipt.substring(0, 40);

      // Create Razorpay order
      const orderOptions = {
        amount: breakdown.total_amount_paise,
        currency: "INR",
        receipt: safeReceipt,
        notes: {
          application_id: applicationId,
          campaign_id: application.campaign_id,
          brand_id: application.v1_campaigns.brand_id,
          influencer_id: application.influencer_id,
          payer_id: userId,
          payment_type: "application_payment",
          commission_percentage: breakdown.commission_percentage,
        },
      };

      const razorpayOrder = await razorpay.orders.create(orderOptions);

      // Store payment order in database
      const { data: paymentOrder, error: orderError } = await supabaseAdmin
        .from("v1_payment_orders")
        .insert({
          application_id: applicationId,
          amount_paise: breakdown.total_amount_paise,
          currency: "INR",
          status: "CREATED",
          razorpay_order_id: razorpayOrder.id,
          metadata: {
            campaign_id: application.campaign_id,
            brand_id: application.v1_campaigns.brand_id,
            influencer_id: application.influencer_id,
            payer_id: userId,
            payer_role: user.role,
            payment_type: "application_payment",
            agreed_amount: application.agreed_amount,
            commission_percentage: breakdown.commission_percentage,
            commission_amount_paise: breakdown.commission_amount_paise,
            net_amount_paise: breakdown.net_amount_paise,
            campaign_title: application.v1_campaigns.title,
          },
        })
        .select()
        .single();

      if (orderError) {
        console.error(
          "[v1/PaymentService/createPaymentOrder] Database error:",
          orderError
        );
        return {
          success: false,
          message: "Failed to create payment order",
          error: orderError.message,
        };
      }

      return {
        success: true,
        order: razorpayOrder,
        payment_order: paymentOrder,
        breakdown: breakdown,
        message: "Payment order created successfully",
      };
    } catch (err) {
      console.error("[v1/PaymentService/createPaymentOrder] Exception:", err);
      return {
        success: false,
        message: "Failed to create payment order",
        error: err.message,
      };
    }
  }

  /**
   * Verify payment and update payment order
   */
  async verifyPayment(paymentData) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        application_id,
      } = paymentData;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return {
          success: false,
          message: "Missing required payment information",
        };
      }

      // Verify payment signature
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest("hex");

      if (razorpay_signature !== expectedSignature) {
        return {
          success: false,
          message: "Invalid payment signature",
        };
      }

      // Get payment order
      const { data: paymentOrder, error: orderError } = await supabaseAdmin
        .from("v1_payment_orders")
        .select("*")
        .eq("razorpay_order_id", razorpay_order_id)
        .single();

      if (orderError || !paymentOrder) {
        return {
          success: false,
          message: "Payment order not found",
        };
      }

      // Normalize status to UPPERCASE (in case of legacy lowercase values)
      paymentOrder.status = this.normalizeStatus(paymentOrder.status) || paymentOrder.status;

      // Check if payment already verified
      if (paymentOrder.status === "VERIFIED") {
        return {
          success: false,
          message: "Payment already verified",
        };
      }

      // Check for duplicate payment
      const { data: existingPayment } = await supabaseAdmin
        .from("v1_payment_orders")
        .select("id")
        .eq("razorpay_payment_id", razorpay_payment_id)
        .single();

      if (existingPayment) {
        return {
          success: false,
          message: "Payment already processed",
        };
      }

      // Get application_id from payment order (it's a required field)
      const orderApplicationId = paymentOrder.application_id;

      // If application_id is provided in request, validate it matches the payment order
      if (application_id && application_id !== orderApplicationId) {
        return {
          success: false,
          message: "Application ID mismatch with payment order",
        };
      }

      // Verify application exists and is ACCEPTED, then transition phase after payment
      if (orderApplicationId) {
        const { data: application, error: applicationError } = await supabaseAdmin
          .from("v1_applications")
          .select("id, phase, campaign_id")
          .eq("id", orderApplicationId)
          .single();

        if (applicationError || !application) {
          return {
            success: false,
            message: "Application not found",
          };
        }

        if (application.phase !== "ACCEPTED") {
          return {
            success: false,
            message: "Application must be accepted before payment",
          };
        }

        // Fetch campaign to check requires_script
        const { data: campaign, error: campaignError } = await supabaseAdmin
          .from("v1_campaigns")
          .select("requires_script")
          .eq("id", application.campaign_id)
          .maybeSingle();

        if (campaignError) {
          console.error("[v1/PaymentService/verifyPayment] Campaign fetch error:", campaignError);
        }

        // Determine next phase based on requires_script
        const nextPhase = campaign?.requires_script === true ? 'SCRIPT' : 'WORK';

        // Update application phase after payment verification
        const { error: phaseUpdateError } = await supabaseAdmin
          .from("v1_applications")
          .update({
            phase: nextPhase
          })
          .eq("id", orderApplicationId);

        if (phaseUpdateError) {
          console.error("[v1/PaymentService/verifyPayment] Phase update error:", phaseUpdateError);
          // Don't fail payment verification if phase update fails, but log it
        }
      }

      // Update payment order
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("v1_payment_orders")
        .update({
          status: "VERIFIED",
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
        })
        .eq("id", paymentOrder.id)
        .select()
        .single();

      if (updateError) {
        console.error(
          "[v1/PaymentService/verifyPayment] Update error:",
          updateError
        );
        return {
          success: false,
          message: "Failed to verify payment",
          error: updateError.message,
        };
      }

      return {
        success: true,
        payment_order: updatedOrder,
        message: "Payment verified successfully",
      };
    } catch (err) {
      console.error("[v1/PaymentService/verifyPayment] Exception:", err);
      return {
        success: false,
        message: "Failed to verify payment",
        error: err.message,
      };
    }
  }

  /**
   * Release payout to influencer (Admin only)
   * Admin releases payment to influencer after keeping commission
   */
  async releasePayoutToInfluencer(applicationId, adminUserId) {
    try {
      // Get verified payment order for this application
      const { data: paymentOrder, error: paymentsError } = await supabaseAdmin
        .from("v1_payment_orders")
        .select("*")
        .eq("application_id", applicationId)
        .eq("status", "VERIFIED")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentsError) {
        console.error(
          "[v1/PaymentService/releasePayoutToInfluencer] Database error:",
          paymentsError
        );
        return {
          success: false,
          message: "Failed to fetch payments",
          error: paymentsError.message,
        };
      }

      if (!paymentOrder) {
        return {
          success: false,
          message: "No verified payment found for this application",
        };
      }

      // Normalize status to UPPERCASE (in case of legacy lowercase values)
      paymentOrder.status = this.normalizeStatus(paymentOrder.status) || paymentOrder.status;

      // Check if payout already exists
      const { data: existingPayout, error: payoutCheckError } = await supabaseAdmin
        .from("v1_payouts")
        .select("id, status")
        .eq("application_id", applicationId)
        .maybeSingle();

      if (payoutCheckError && payoutCheckError.code !== "PGRST116") {
        console.error(
          "[v1/PaymentService/releasePayoutToInfluencer] Payout check error:",
          payoutCheckError
        );
        return {
          success: false,
          message: "Failed to check existing payouts",
          error: payoutCheckError.message,
        };
      }

      if (existingPayout) {
        if (existingPayout.status === "RELEASED") {
          return {
            success: false,
            message: "Payout already released for this application",
          };
        }
        if (existingPayout.status === "PENDING") {
          return {
            success: false,
            message: "Payout already exists in PENDING status",
          };
        }
      }

      // Get application details
      const { data: application, error: applicationError } = await supabaseAdmin
        .from("v1_applications")
        .select("id, influencer_id, phase")
        .eq("id", applicationId)
        .single();

      if (applicationError || !application) {
        return {
          success: false,
          message: "Application not found",
        };
      }

      if (application.phase !== "COMPLETED") {
        return {
          success: false,
          message: "Application must be completed before releasing payout",
        };
      }

      // Get influencer wallet
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("v1_wallets")
        .select("*")
        .eq("user_id", application.influencer_id)
        .maybeSingle();

      if (walletError) {
        console.error(
          "[v1/PaymentService/releasePayoutToInfluencer] Wallet error:",
          walletError
        );
        return {
          success: false,
          message: "Failed to fetch influencer wallet",
          error: walletError.message,
        };
      }

      // If wallet doesn't exist, create one
      let influencerWallet = wallet;
      if (!wallet) {
        const { data: newWallet, error: createWalletError } = await supabaseAdmin
          .from("v1_wallets")
          .insert({
            user_id: application.influencer_id,
            balance: 0.0,
            balance_paise: 0,
            frozen_balance_paise: 0,
            withdrawn_balance_paise: 0,
            total_balance_paise: 0,
          })
          .select()
          .single();

        if (createWalletError) {
          return {
            success: false,
            message: "Failed to create wallet",
            error: createWalletError.message,
          };
        }
        influencerWallet = newWallet;
      }

      // Calculate amount to release (net amount after commission)
      const netAmountPaise = paymentOrder.metadata?.net_amount_paise || 0;
      const netAmountRupees = netAmountPaise / 100;
      const newBalancePaise = (influencerWallet.balance_paise || 0) + netAmountPaise;

      // Create payout record first (status: PENDING)
      const { data: payout, error: payoutError } = await supabaseAdmin
        .from("v1_payouts")
        .insert({
          application_id: applicationId,
          influencer_id: application.influencer_id,
          amount: netAmountRupees, // Store in rupees (numeric(10,2))
          status: "PENDING",
          released_by_admin_id: adminUserId,
        })
        .select()
        .single();

      if (payoutError) {
        console.error(
          "[v1/PaymentService/releasePayoutToInfluencer] Payout creation error:",
          payoutError
        );
        return {
          success: false,
          message: "Failed to create payout record",
          error: payoutError.message,
        };
      }

      // Update wallet
      const { error: updateWalletError } = await supabaseAdmin
        .from("v1_wallets")
        .update({
          balance_paise: newBalancePaise,
          balance: newBalancePaise / 100,
        })
        .eq("id", influencerWallet.id);

      if (updateWalletError) {
        console.error(
          "[v1/PaymentService/releasePayoutToInfluencer] Wallet update error:",
          updateWalletError
        );
        // Update payout status to FAILED if wallet update fails
        await supabaseAdmin
          .from("v1_payouts")
          .update({ status: "FAILED" })
          .eq("id", payout.id);
        return {
          success: false,
          message: "Failed to update wallet",
          error: updateWalletError.message,
        };
      }

      // Create transaction record
      const { error: transactionError } = await supabaseAdmin
        .from("v1_transactions")
        .insert({
          wallet_id: influencerWallet.id,
          user_id: application.influencer_id,
          amount: netAmountRupees,
          amount_paise: netAmountPaise,
          type: "credit",
          status: "completed",
          razorpay_payment_id: paymentOrder.razorpay_payment_id,
          razorpay_order_id: paymentOrder.razorpay_order_id,
          campaign_id: paymentOrder.metadata?.campaign_id,
          notes: `Payout released for application ${applicationId}`,
          balance_after_paise: newBalancePaise,
        });

      if (transactionError) {
        console.error(
          "[v1/PaymentService/releasePayoutToInfluencer] Transaction error:",
          transactionError
        );
        // Don't fail if transaction record fails, payment is already processed
      }

      // Update payout status to RELEASED
      const { data: updatedPayout, error: updatePayoutError } = await supabaseAdmin
        .from("v1_payouts")
        .update({
          status: "RELEASED",
          released_at: new Date().toISOString(),
        })
        .eq("id", payout.id)
        .select()
        .single();

      if (updatePayoutError) {
        console.error(
          "[v1/PaymentService/releasePayoutToInfluencer] Payout update error:",
          updatePayoutError
        );
        // Don't fail if payout status update fails, wallet is already updated
      }

      return {
        success: true,
        message: "Payout released to influencer successfully",
        payout_amount_paise: netAmountPaise,
        payout_amount_rupees: netAmountRupees,
        commission_amount_paise: paymentOrder.metadata?.commission_amount_paise || 0,
        new_wallet_balance_paise: newBalancePaise,
        payout: updatedPayout || payout,
      };
    } catch (err) {
      console.error("[v1/PaymentService/releasePayoutToInfluencer] Exception:", err);
      return {
        success: false,
        message: "Failed to release payout",
        error: err.message,
      };
    }
  }

  /**
   * Get payment config for frontend
   */
  getPaymentConfig() {
    if (!razorpay) {
      return {
        success: false,
        message: "Payment service is not configured",
      };
    }

    return {
      success: true,
      config: {
        key_id: process.env.RAZORPAY_KEY_ID,
        currency: "INR",
      },
    };
  }

  /**
   * Get payments for an application
   */
  async getApplicationPayments(applicationId) {
    try {
      // Get payment orders for this application
      const { data: payments, error } = await supabaseAdmin
        .from("v1_payment_orders")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "[v1/PaymentService/getApplicationPayments] Database error:",
          error
        );
        return {
          success: false,
          message: "Failed to fetch payments",
          error: error.message,
        };
      }

      // Normalize all status values to UPPERCASE
      const normalizedPayments = (payments || []).map((payment) => ({
        ...payment,
        status: this.normalizeStatus(payment.status) || payment.status,
      }));

      return {
        success: true,
        payments: normalizedPayments,
        message: "Payments fetched successfully",
      };
    } catch (err) {
      console.error("[v1/PaymentService/getApplicationPayments] Exception:", err);
      return {
        success: false,
        message: "Failed to fetch payments",
        error: err.message,
      };
    }
  }
}

module.exports = new PaymentService();
