const { validationResult } = require("express-validator");
const { ApplicationService } = require("../services");
const { supabaseAdmin } = require("../db/config");

class ApplicationController {
  // Get brand profile ID for a user
  async getBrandProfileId(userId) {
    try {
      const { data: brandProfile, error } = await supabaseAdmin
        .from("v1_brand_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (error) {
        console.error("[v1/getBrandProfileId] Error:", error);
        return { success: false, error: error.message };
      }

      if (!brandProfile) {
        return { success: false, error: "Brand profile not found" };
      }

      return { success: true, brandId: userId };
    } catch (err) {
      console.error("[v1/getBrandProfileId] Exception:", err);
      return { success: false, error: err.message };
    }
  }

  // Apply to a campaign
  async apply(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { campaignId } = req.body;
      const result = await ApplicationService.apply({
        campaignId: campaignId,
        influencerId: req.user.id,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (err) {
      console.error("[ApplicationController/apply] Exception:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to apply to campaign",
      });
    }
  }

  // Accept an application
  async accept(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const brandProfileResult = await this.getBrandProfileId(userId);

      if (!brandProfileResult || !brandProfileResult.success) {
        const errorMsg = brandProfileResult?.error || "Unknown error";
        const isNotFound = errorMsg.includes("not found");
        const status = isNotFound ? 404 : 500;
        return res.status(status).json({
          success: false,
          message: isNotFound
            ? "Brand profile not found. Please complete your profile first."
            : "Failed to fetch brand profile",
          error: errorMsg,
        });
      }

      const result = await ApplicationService.accept({
        applicationId: req.params.id,
        brandId: brandProfileResult.brandId,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      console.error("[ApplicationController/accept] Exception:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to accept application",
      });
    }
  }

  // Bulk accept multiple applications
  async bulkAccept(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const brandProfileResult = await this.getBrandProfileId(userId);

      if (!brandProfileResult || !brandProfileResult.success) {
        const errorMsg = brandProfileResult?.error || "Unknown error";
        const isNotFound = errorMsg.includes("not found");
        const status = isNotFound ? 404 : 500;
        return res.status(status).json({
          success: false,
          message: isNotFound
            ? "Brand profile not found. Please complete your profile first."
            : "Failed to fetch brand profile",
          error: errorMsg,
        });
      }

      const result = await ApplicationService.bulkAccept({
        campaignId: req.body.campaignId,
        applications: req.body.applications,
        brandId: brandProfileResult.brandId,
      });

      const statusCode = result.success ? 200 : 207;
      return res.status(statusCode).json(result);
    } catch (err) {
      console.error("[ApplicationController/bulkAccept] Exception:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to bulk accept applications",
      });
    }
  }

  // Cancel an application
  async cancel(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = req.user;
      let brandId = null;

      if (user.role === "BRAND_OWNER") {
        const brandProfileResult = await this.getBrandProfileId(user.id);
        if (!brandProfileResult || !brandProfileResult.success) {
          const errorMsg = brandProfileResult?.error || "Unknown error";
          const isNotFound = errorMsg.includes("not found");
          const status = isNotFound ? 404 : 500;
          return res.status(status).json({
            success: false,
            message: isNotFound
              ? "Brand profile not found. Please complete your profile first."
              : "Failed to fetch brand profile",
            error: errorMsg,
          });
        }
        brandId = brandProfileResult.brandId;
      }

      const result = await ApplicationService.cancel({
        applicationId: req.params.id,
        user: user,
        brandId: brandId,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      console.error("[ApplicationController/cancel] Exception:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to cancel application",
      });
    }
  }

  // Complete an application
  async complete(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await ApplicationService.complete(req.params.id);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      console.error("[ApplicationController/complete] Exception:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to complete application",
      });
    }
  }
}

module.exports = new ApplicationController();
