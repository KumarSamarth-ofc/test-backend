const { supabaseAdmin } = require("../supabase/client");

class CouponController {
  /**
   * Validate a coupon code
   */
  async validateCoupon(req, res) {
    try {
      const { coupon_code, plan_id } = req.body;
      const userId = req.user.id;

      if (!coupon_code || !plan_id) {
        return res.status(400).json({
          success: false,
          message: "Coupon code and plan ID are required",
        });
      }

      // Get plan details to get the price
      const { data: plan, error: planError } = await supabaseAdmin
        .from("plans")
        .select("price")
        .eq("id", plan_id)
        .eq("is_active", true)
        .single();

      if (planError || !plan) {
        return res.status(400).json({
          success: false,
          message: "Invalid plan selected",
        });
      }

      const { data, error } = await supabaseAdmin.rpc("validate_coupon", {
        p_coupon_code: coupon_code,
        p_user_id: userId,
        p_order_amount: parseFloat(plan.price),
      });

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to validate coupon",
          error: error.message,
        });
      }

      return res.json({
        success: true,
        validation: data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Apply a coupon code
   */
  async applyCoupon(req, res) {
    try {
      const { coupon_code, plan_id, subscription_id } = req.body;
      const userId = req.user.id;

      if (!coupon_code || !plan_id) {
        return res.status(400).json({
          success: false,
          message: "Coupon code and plan ID are required",
        });
      }

      // Get plan details to get the price
      const { data: plan, error: planError } = await supabaseAdmin
        .from("plans")
        .select("price")
        .eq("id", plan_id)
        .eq("is_active", true)
        .single();

      if (planError || !plan) {
        return res.status(400).json({
          success: false,
          message: "Invalid plan selected",
        });
      }

      const { data, error } = await supabaseAdmin.rpc("apply_coupon", {
        p_coupon_code: coupon_code,
        p_user_id: userId,
        p_order_amount: parseFloat(plan.price),
        p_subscription_id: subscription_id || null,
      });

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to apply coupon",
          error: error.message,
        });
      }

      return res.json({
        success: true,
        result: data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Create subscription with coupon applied
   */
  async createSubscriptionWithCoupon(req, res) {
    try {
      const { plan_id, coupon_code } = req.body;
      const userId = req.user.id;

      if (!plan_id || !coupon_code) {
        return res.status(400).json({
          success: false,
          message: "Plan ID and coupon code are required",
        });
      }

      // Get plan details
      const { data: plan, error: planError } = await supabaseAdmin
        .from("plans")
        .select("*")
        .eq("id", plan_id)
        .eq("is_active", true)
        .single();

      if (planError || !plan) {
        return res.status(400).json({
          success: false,
          message: "Invalid plan selected",
        });
      }

      // Validate coupon
      const { data: validation, error: validationError } = await supabaseAdmin.rpc(
        "validate_coupon",
        {
          p_coupon_code: coupon_code,
          p_user_id: userId,
          p_order_amount: plan.price,
        }
      );

      if (validationError || !validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation?.error || "Invalid coupon",
        });
      }

      // Apply coupon
      const { data: couponResult, error: couponError } = await supabaseAdmin.rpc(
        "apply_coupon",
        {
          p_coupon_code: coupon_code,
          p_user_id: userId,
          p_order_amount: plan.price,
        }
      );

      if (couponError || !couponResult.valid) {
        return res.status(400).json({
          success: false,
          message: couponResult?.error || "Failed to apply coupon",
        });
      }

      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // 3 months

      // Create subscription record
      const { data: subscription, error: subscriptionError } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_id: plan_id,
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          amount: parseFloat(couponResult.final_amount),
          original_amount: parseFloat(couponResult.original_amount),
          discount_amount: parseFloat(couponResult.discount_amount),
          coupon_code: coupon_code,
        })
        .select()
        .single();

      if (subscriptionError) {
        return res.status(500).json({
          success: false,
          message: "Failed to create subscription",
          error: subscriptionError.message,
        });
      }

      // Update coupon usage with subscription ID
      await supabaseAdmin
        .from("coupon_usage")
        .update({ subscription_id: subscription.id })
        .eq("id", couponResult.usage_record_id);

      return res.json({
        success: true,
        message: "Subscription created successfully with coupon applied",
        subscription: {
          id: subscription.id,
          plan_name: plan.name,
          amount: subscription.amount,
          original_amount: subscription.original_amount,
          discount_amount: subscription.discount_amount,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          status: subscription.status,
        },
        coupon: {
          code: coupon_code,
          discount_amount: couponResult.discount_amount,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Get user's coupon usage history
   */
  async getCouponHistory(req, res) {
    try {
      const userId = req.user.id;

      const { data, error } = await supabaseAdmin
        .from("coupon_usage")
        .select(`
          id,
          original_amount,
          discount_amount,
          final_amount,
          used_at,
          subscription_id,
          coupons (
            code,
            name
          )
        `)
        .eq("user_id", userId)
        .order("used_at", { ascending: false });

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to get coupon history",
          error: error.message,
        });
      }

      return res.json({
        success: true,
        history: data || [],
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Get all coupons (Admin only)
   */
  async getAllCoupons(req, res) {
    try {
      const userRole = req.user.role;

      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin role required.",
        });
      }

      const { data, error } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to get coupons",
          error: error.message,
        });
      }

      return res.json({
        success: true,
        coupons: data || [],
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Create coupon (Admin only)
   */
  async createCoupon(req, res) {
    try {
      const userRole = req.user.role;

      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin role required.",
        });
      }

      const {
        code,
        name,
        description,
        type,
        value,
        min_order_amount,
        valid_from,
        valid_until,
        usage_limit,
        usage_limit_per_user,
        is_active
      } = req.body;

      if (!code || !name || !type || !value) {
        return res.status(400).json({
          success: false,
          message: "Code, name, type, and value are required",
        });
      }

      const { data, error } = await supabaseAdmin
        .from("coupons")
        .insert({
          code,
          name,
          description,
          type,
          value,
          min_order_amount: min_order_amount || 0,
          valid_from: valid_from || new Date().toISOString(),
          valid_until: valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          usage_limit,
          usage_limit_per_user: usage_limit_per_user || 1,
          is_active: is_active !== undefined ? is_active : true,
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to create coupon",
          error: error.message,
        });
      }

      return res.json({
        success: true,
        coupon: data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Update coupon (Admin only)
   */
  async updateCoupon(req, res) {
    try {
      const userRole = req.user.role;
      const { couponId } = req.params;

      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin role required.",
        });
      }

      const updateData = req.body;
      delete updateData.id; // Prevent ID updates
      delete updateData.created_at; // Prevent creation date updates

      const { data, error } = await supabaseAdmin
        .from("coupons")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", couponId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to update coupon",
          error: error.message,
        });
      }

      return res.json({
        success: true,
        coupon: data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Delete coupon (Admin only)
   */
  async deleteCoupon(req, res) {
    try {
      const userRole = req.user.role;
      const { couponId } = req.params;

      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin role required.",
        });
      }

      const { error } = await supabaseAdmin
        .from("coupons")
        .delete()
        .eq("id", couponId);

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete coupon",
          error: error.message,
        });
      }

      return res.json({
        success: true,
        message: "Coupon deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Get coupon usage statistics (Admin only)
   */
  async getCouponStats(req, res) {
    try {
      const userRole = req.user.role;

      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin role required.",
        });
      }

      const { data, error } = await supabaseAdmin
        .from("coupon_usage")
        .select(`
          id,
          original_amount,
          discount_amount,
          final_amount,
          used_at,
          coupons (
            code,
            name,
            type
          )
        `)
        .order("used_at", { ascending: false });

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to get coupon statistics",
          error: error.message,
        });
      }

      // Calculate statistics
      const totalUsage = data.length;
      const totalDiscount = data.reduce((sum, usage) => sum + parseFloat(usage.discount_amount), 0);
      const totalRevenue = data.reduce((sum, usage) => sum + parseFloat(usage.final_amount), 0);

      return res.json({
        success: true,
        stats: {
          totalUsage,
          totalDiscount,
          totalRevenue,
          usageHistory: data || [],
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

module.exports = new CouponController();