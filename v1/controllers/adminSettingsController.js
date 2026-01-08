const { supabaseAdmin } = require("../db/config");

/**
 * Admin Settings Controller
 * Handles HTTP requests for admin settings endpoints
 */
class AdminSettingsController {
  /**
   * Get current admin settings (non-expired)
   * GET /api/v1/admin/settings
   */
  async getAdminSettings(req, res) {
    try {
      const { data, error } = await supabaseAdmin
        .from("v1_admin_settings")
        .select("*")
        .eq("is_expired", false)
        .maybeSingle();

      if (error) {
        console.error("[v1/AdminSettingsController/getAdminSettings] Error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch admin settings",
          error: error.message,
        });
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "No active admin settings found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Admin settings fetched successfully",
        data: data,
      });
    } catch (err) {
      console.error("[v1/AdminSettingsController/getAdminSettings] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  }

  /**
   * Create new admin settings (expires all previous settings)
   * POST /api/v1/admin/settings
   */
  async createAdminSettings(req, res) {
    try {
      const { commission_percentage } = req.body;

      // Validate commission_percentage
      if (
        commission_percentage === undefined ||
        commission_percentage === null
      ) {
        return res.status(400).json({
          success: false,
          message: "commission_percentage is required",
        });
      }

      if (
        typeof commission_percentage !== "number" ||
        commission_percentage < 1 ||
        commission_percentage > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "commission_percentage must be between 1 and 100",
        });
      }

      const adminUserId = req.user.id;
      const now = new Date().toISOString(); // Format as ISO timestamp (YYYY-MM-DDTHH:mm:ss.sssZ)

      // Start transaction: expire all existing non-expired settings
      const { error: updateError } = await supabaseAdmin
        .from("v1_admin_settings")
        .update({
          is_expired: true,
          expired_at: now,
        })
        .eq("is_expired", false);

      if (updateError) {
        console.error(
          "[v1/AdminSettingsController/createAdminSettings] Update Error:",
          updateError
        );
        return res.status(500).json({
          success: false,
          message: "Failed to expire existing settings",
          error: updateError.message,
        });
      }

      // Insert new settings
      const { data, error: insertError } = await supabaseAdmin
        .from("v1_admin_settings")
        .insert({
          user_id: adminUserId,
          commission_percentage: commission_percentage,
          is_expired: false,
          // created_at and expired_at will use defaults (created_at = now() as timestamp, expired_at = null)
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "[v1/AdminSettingsController/createAdminSettings] Insert Error:",
          insertError
        );
        return res.status(500).json({
          success: false,
          message: "Failed to create admin settings",
          error: insertError.message,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Admin settings created successfully",
        data: data,
      });
    } catch (err) {
      console.error(
        "[v1/AdminSettingsController/createAdminSettings] Exception:",
        err
      );
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  }
}

module.exports = new AdminSettingsController();

