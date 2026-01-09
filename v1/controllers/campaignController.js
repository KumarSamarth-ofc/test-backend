const { validationResult } = require("express-validator");
const { CampaignService } = require("../services");
const { supabaseAdmin } = require("../db/config");

class CampaignController {

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
  /**
   * Create a new campaign (Brand Owner only)
   * POST /api/v1/campaigns
   */
  async createCampaign(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const userRole = req.user.role;

      if (userRole !== "BRAND_OWNER") {
        return res.status(403).json({
          success: false,
          message: "Only brand owners can create campaigns",
        });
      }

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

      const brandId = brandProfileResult.brandId;

      let coverImageUrl = null;
      if (req.file) {
        const { uploadImageToStorage } = require("../utils/imageUpload");
        const { url, error: uploadError } = await uploadImageToStorage(
          req.file.buffer,
          req.file.originalname,
          "campaigns"
        );
        if (uploadError || !url) {
          return res.status(400).json({
            success: false,
            message: uploadError || "Failed to upload cover image",
          });
        }
        coverImageUrl = url;
      }

      const campaignData = {
        ...req.body,
        cover_image_url: coverImageUrl || req.body.cover_image_url || null,
      };

      const result = await CampaignService.createCampaign(brandId, campaignData);

      if (result.success) {
        return res.status(201).json({
          success: true,
          campaign: result.campaign,
          message: result.message || "Campaign created successfully",
        });
      }

      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (err) {
      console.error("[v1/createCampaign] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  }

  async getCampaigns(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const filters = {
        status: req.query.status,
        type: req.query.type,
        brand_id: req.query.brand_id,
        min_budget: req.query.min_budget
          ? parseFloat(req.query.min_budget)
          : undefined,
        max_budget: req.query.max_budget
          ? parseFloat(req.query.max_budget)
          : undefined,
        search: req.query.search,
      };

      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      const pagination = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
      };

      const result = await CampaignService.getCampaigns(filters, pagination);

      if (result.success) {
        return res.json({
          success: true,
          campaigns: result.campaigns,
          pagination: result.pagination,
        });
      }

      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (err) {
      console.error("[v1/getCampaigns] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getMyCampaigns(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const userRole = req.user.role;

      if (userRole !== "BRAND_OWNER") {
        return res.status(403).json({
          success: false,
          message: "Only brand owners can view their campaigns",
        });
      }

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

      const brandId = brandProfileResult.brandId;

      // Extract filters from query params
      const filters = {
        status: req.query.status,
        type: req.query.type,
        min_budget: req.query.min_budget
          ? parseFloat(req.query.min_budget)
          : undefined,
        max_budget: req.query.max_budget
          ? parseFloat(req.query.max_budget)
          : undefined,
        search: req.query.search,
      };

      // Remove undefined filters
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      const pagination = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
      };

      const result = await CampaignService.getBrandCampaigns(
        brandId,
        filters,
        pagination
      );

      if (result.success) {
        return res.json({
          success: true,
          campaigns: result.campaigns,
          pagination: result.pagination,
        });
      }

      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (err) {
      console.error("[v1/getMyCampaigns] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getCampaign(req, res) {
    try {
      const campaignId = req.params.id;
      const userId = req.user?.id || null;

      const result = await CampaignService.getCampaignById(campaignId, userId);

      if (result.success) {
        return res.json({
          success: true,
          campaign: result.campaign,
        });
      }

      const status = result.message === "Campaign not found" ? 404 : 400;
      return res.status(status).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (err) {
      console.error("[v1/getCampaign] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateCampaign(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const userRole = req.user.role;
      const campaignId = req.params.id;

      if (userRole !== "BRAND_OWNER") {
        return res.status(403).json({
          success: false,
          message: "Only brand owners can update campaigns",
        });
      }

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

      const brandId = brandProfileResult.brandId;

      let coverImageUrl = undefined;
      if (req.file) {
        const { uploadImageToStorage, deleteImageFromStorage } = require("../utils/imageUpload");
        
        const currentCampaignResult = await CampaignService.getCampaignById(campaignId, req.user.id);
        const currentCoverImageUrl = currentCampaignResult.success && currentCampaignResult.campaign?.cover_image_url
          ? currentCampaignResult.campaign.cover_image_url
          : null;

        const { url, error: uploadError } = await uploadImageToStorage(
          req.file.buffer,
          req.file.originalname,
          "campaigns"
        );
        if (uploadError || !url) {
          return res.status(400).json({
            success: false,
            message: uploadError || "Failed to upload cover image",
          });
        }
        coverImageUrl = url;

        const placeholderUrl = "https://via.placeholder.com/800x400?text=Campaign+Image";
        if (currentCoverImageUrl && currentCoverImageUrl !== placeholderUrl) {
          await deleteImageFromStorage(currentCoverImageUrl);
        }
      }

      const campaignData = {
        ...req.body,
      };
      if (coverImageUrl !== undefined) {
        campaignData.cover_image_url = coverImageUrl;
      }

      const result = await CampaignService.updateCampaign(
        campaignId,
        brandId,
        campaignData
      );

      if (result.success) {
        return res.json({
          success: true,
          campaign: result.campaign,
          message: result.message || "Campaign updated successfully",
        });
      }

      const status = result.message?.includes("Unauthorized") ? 403 : 400;
      return res.status(status).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (err) {
      console.error("[v1/updateCampaign] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async deleteCampaign(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const campaignId = req.params.id;

      if (userRole !== "BRAND_OWNER") {
        return res.status(403).json({
          success: false,
          message: "Only brand owners can delete campaigns",
        });
      }

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

      const brandId = brandProfileResult.brandId;

      const result = await CampaignService.deleteCampaign(campaignId, brandId);

      if (result.success) {
        return res.json({
          success: true,
          message: result.message || "Campaign deleted successfully",
        });
      }

      const status =
        result.message?.includes("Unauthorized") ||
        result.message === "Campaign not found"
          ? 404
          : 400;
      return res.status(status).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (err) {
      console.error("[v1/deleteCampaign] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  
}

const campaignController = new CampaignController();
campaignController.createCampaign = campaignController.createCampaign.bind(campaignController);
campaignController.getCampaigns = campaignController.getCampaigns.bind(campaignController);
campaignController.getMyCampaigns = campaignController.getMyCampaigns.bind(campaignController);
campaignController.getCampaign = campaignController.getCampaign.bind(campaignController);
campaignController.updateCampaign = campaignController.updateCampaign.bind(campaignController);
campaignController.deleteCampaign = campaignController.deleteCampaign.bind(campaignController);

module.exports = campaignController;
