const { supabaseAdmin } = require("../db/config");

/**
 * Coupon Service
 * Handles business logic for coupon operations
 */
class CouponService {
  /**
   * Validate a coupon code for a user and order amount
   * @param {string} couponCode - Coupon code
   * @param {string} userId - User ID
   * @param {number} orderAmount - Order amount in rupees
   * @returns {Promise<Object>} Validation result
   */
  async validateCoupon(couponCode, userId, orderAmount) {
    try {
      if (!couponCode || !userId || orderAmount === undefined) {
        return {
          success: false,
          valid: false,
          message: "Coupon code, user ID, and order amount are required",
        };
      }

      // Get coupon
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from("v1_coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .single();

      if (couponError || !coupon) {
        return {
          success: false,
          valid: false,
          message: "Invalid coupon code",
        };
      }

      // Check if coupon is active
      if (!coupon.is_active) {
        return {
          success: false,
          valid: false,
          message: "Coupon is not active",
        };
      }

      // Check validity dates
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);

      if (now < validFrom) {
        return {
          success: false,
          valid: false,
          message: "Coupon is not yet valid",
        };
      }

      if (now > validUntil) {
        return {
          success: false,
          valid: false,
          message: "Coupon has expired",
        };
      }

      // Check usage limit
      if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
        return {
          success: false,
          valid: false,
          message: "Coupon usage limit reached",
        };
      }

      // Check minimum order amount
      if (orderAmount < coupon.min_order_amount) {
        return {
          success: false,
          valid: false,
          message: `Minimum order amount of ₹${coupon.min_order_amount} required`,
        };
      }

      // Check user usage limit
      const { data: userUsage, error: usageError } = await supabaseAdmin
        .from("v1_coupon_usage")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("user_id", userId);

      if (usageError) {
        console.error("[CouponService/validateCoupon] Error checking user usage:", usageError);
        return {
          success: false,
          valid: false,
          message: "Failed to validate coupon usage",
        };
      }

      if (userUsage && userUsage.length >= coupon.usage_limit_per_user) {
        return {
          success: false,
          valid: false,
          message: "You have already used this coupon maximum times",
        };
      }

      // Calculate discount (all in rupees)
      let discountAmount = 0;
      if (coupon.type === "PERCENTAGE") {
        discountAmount = (orderAmount * coupon.value) / 100;
        // Cap discount at order amount
        if (discountAmount > orderAmount) {
          discountAmount = orderAmount;
        }
      } else if (coupon.type === "FIXED") {
        discountAmount = coupon.value;
        // Cap discount at order amount
        if (discountAmount > orderAmount) {
          discountAmount = orderAmount;
        }
      } else {
        return {
          success: false,
          valid: false,
          message: "Invalid coupon type",
        };
      }

      const finalAmount = Math.max(0, orderAmount - discountAmount);

      return {
        success: true,
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          value: coupon.value,
        },
        discount_amount: parseFloat(discountAmount.toFixed(2)),
        final_amount: parseFloat(finalAmount.toFixed(2)),
        original_amount: parseFloat(orderAmount.toFixed(2)),
        message: "Coupon is valid",
      };
    } catch (err) {
      console.error("[CouponService/validateCoupon] Exception:", err);
      return {
        success: false,
        valid: false,
        message: "Failed to validate coupon",
        error: err.message,
      };
    }
  }

  /**
   * Apply coupon and record usage
   * @param {string} couponId - Coupon ID
   * @param {string} userId - User ID
   * @param {string} subscriptionId - Subscription ID (optional, can be null initially)
   * @param {number} originalAmount - Original amount in rupees
   * @param {number} discountAmount - Discount amount in rupees
   * @param {number} finalAmount - Final amount after discount in rupees
   * @returns {Promise<Object>} Result
   */
  async applyCoupon(couponId, userId, subscriptionId, originalAmount, discountAmount, finalAmount) {
    try {
      // Record coupon usage (all amounts in rupees)
      const { data: couponUsage, error: usageError } = await supabaseAdmin
        .from("v1_coupon_usage")
        .insert({
          coupon_id: couponId,
          user_id: userId,
          subscription_id: subscriptionId,
          original_amount: originalAmount,
          discount_amount: discountAmount,
          final_amount: finalAmount,
        })
        .select()
        .single();

      if (usageError) {
        console.error("[CouponService/applyCoupon] Error recording usage:", usageError);
        return {
          success: false,
          message: "Failed to record coupon usage",
          error: usageError.message,
        };
      }

      // Update coupon usage count
      const { error: updateError } = await supabaseAdmin.rpc("increment_coupon_usage", {
        coupon_id_param: couponId,
      });

      // If RPC doesn't exist, manually update
      if (updateError) {
        const { data: coupon } = await supabaseAdmin
          .from("v1_coupons")
          .select("usage_count")
          .eq("id", couponId)
          .single();

        if (coupon) {
          await supabaseAdmin
            .from("v1_coupons")
            .update({ usage_count: (coupon.usage_count || 0) + 1 })
            .eq("id", couponId);
        }
      }

      return {
        success: true,
        coupon_usage: couponUsage,
        message: "Coupon applied successfully",
      };
    } catch (err) {
      console.error("[CouponService/applyCoupon] Exception:", err);
      return {
        success: false,
        message: "Failed to apply coupon",
        error: err.message,
      };
    }
  }

  /**
   * Update coupon usage with subscription ID (after subscription is created)
   * @param {string} couponUsageId - Coupon usage ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Result
   */
  async updateCouponUsageSubscription(couponUsageId, subscriptionId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("v1_coupon_usage")
        .update({ subscription_id: subscriptionId })
        .eq("id", couponUsageId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          message: "Failed to update coupon usage",
          error: error.message,
        };
      }

      return {
        success: true,
        coupon_usage: data,
      };
    } catch (err) {
      console.error("[CouponService/updateCouponUsageSubscription] Exception:", err);
      return {
        success: false,
        message: "Failed to update coupon usage",
        error: err.message,
      };
    }
  }
}

module.exports = new CouponService();

