const { supabaseAdmin } = require("../db/config");

/**
 * Campaign Service
 * Handles all business logic for campaign CRUD operations
 */
class CampaignService {
  /**
   * Validate campaign status enum
   */
  validateStatus(status) {
    const validStatuses = [
      "DRAFT",
      "LIVE",
      "LOCKED",
      "ACTIVE",
      "COMPLETED",
      "EXPIRED",
      "CANCELLED",
    ];
    return validStatuses.includes(status?.toUpperCase());
  }

  /**
   * Validate campaign type enum
   */
  validateType(type) {
    const validTypes = ["NORMAL", "BULK"];
    return validTypes.includes(type?.toUpperCase());
  }

  /**
   * Normalize status to uppercase
   */
  normalizeStatus(status) {
    if (!status) return "DRAFT";
    return status.toUpperCase();
  }

  /**
   * Normalize type to uppercase
   */
  normalizeType(type) {
    if (!type) return "NORMAL";
    return type.toUpperCase();
  }

  /**
   * Check if brand owns the campaign
   */
  async checkBrandOwnership(campaignId, brandId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("v1_campaigns")
        .select("brand_id")
        .eq("id", campaignId)
        .maybeSingle();

      if (error) {
        console.error("[v1/checkBrandOwnership] Error:", error);
        return { success: false, message: "Database error" };
      }

      if (!data) {
        return { success: false, message: "Campaign not found" };
      }

      if (data.brand_id !== brandId) {
        return { success: false, message: "Unauthorized: Not your campaign" };
      }

      return { success: true };
    } catch (err) {
      console.error("[v1/checkBrandOwnership] Exception:", err);
      return { success: false, message: "Internal server error" };
    }
  }

    /**
   * Create a new campaign (Brand Owner only)
   */
    async createCampaign(brandId, campaignData) {
      try {
        // Validate type
        const type = this.normalizeType(campaignData.type);
        if (!this.validateType(type)) {
          return {
            success: false,
            message: "Invalid campaign type. Must be NORMAL or BULK",
          };
        }
  
        // Validate status
        const status = this.normalizeStatus(campaignData.status || "DRAFT");
        if (!this.validateStatus(status)) {
          return {
            success: false,
            message: "Invalid campaign status",
          };
        }
  
        // Validate min/max influencers
        if (
          campaignData.min_influencers !== undefined &&
          campaignData.max_influencers !== undefined
        ) {
          if (campaignData.min_influencers > campaignData.max_influencers) {
            return {
              success: false,
              message: "min_influencers cannot be greater than max_influencers",
            };
          }
        }
  
        // Build campaign object
        const campaign = {
          brand_id: brandId,
          title: campaignData.title,
          type: type,
          status: status,
          min_influencers: campaignData.min_influencers ?? null,
          max_influencers: campaignData.max_influencers ?? null,
          accepted_count: 0, // Always start at 0
          requires_script: campaignData.requires_script || false,
          start_deadline: campaignData.start_deadline, // Required field
          budget: campaignData.budget ?? null,
          // New fields
          description: campaignData.description ?? null,
          cover_image_url: campaignData.cover_image_url ?? null,
          platform: Array.isArray(campaignData.platform) 
            ? campaignData.platform 
            : [],
          content_type: Array.isArray(campaignData.content_type) 
            ? campaignData.content_type 
            : [],
          influencer_tier: campaignData.influencer_tier ?? null,
          categories: campaignData.categories ?? null,
          language: campaignData.language ?? null,
          brand_guideline: campaignData.brand_guideline ?? null,
        };
  
        // Insert campaign
        const { data, error } = await supabaseAdmin
          .from("v1_campaigns")
          .insert(campaign)
          .select()
          .single();
  
        if (error) {
          console.error("[v1/createCampaign] Database error:", error);
          return {
            success: false,
            message: "Failed to create campaign",
            error: error.message,
          };
        }
  
        return {
          success: true,
          campaign: data,
          message: "Campaign created successfully",
        };
      } catch (err) {
        console.error("[v1/createCampaign] Exception:", err);
        return {
          success: false,
          message: "Internal server error",
          error: err.message,
        };
      }
    }

  /**
   * Get all campaigns with filtering and pagination
   * Influencers can see all campaigns, Brand owners see their own + all
   */
  async getCampaigns(filters = {}, pagination = {}) {
    try {
      const { status, type, brand_id, min_budget, max_budget, search } =
        filters;

      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      // Build query
      let query = supabaseAdmin
        .from("v1_campaigns")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply filters
      if (status) {
        const normalizedStatus = this.normalizeStatus(status);
        if (this.validateStatus(normalizedStatus)) {
          query = query.eq("status", normalizedStatus);
        }
      }

      if (type) {
        const normalizedType = this.normalizeType(type);
        if (this.validateType(normalizedType)) {
          query = query.eq("type", normalizedType);
        }
      }

      if (brand_id) {
        query = query.eq("brand_id", brand_id);
      }

      if (min_budget !== undefined) {
        query = query.gte("budget", min_budget);
      }

      if (max_budget !== undefined) {
        query = query.lte("budget", max_budget);
      }

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("[v1/getCampaigns] Database error:", error);
        return {
          success: false,
          message: "Failed to fetch campaigns",
          error: error.message,
        };
      }

      return {
        success: true,
        campaigns: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (err) {
      console.error("[v1/getCampaigns] Exception:", err);
      return {
        success: false,
        message: "Internal server error",
        error: err.message,
      };
    }
  }

  /**
   * Get single campaign by ID
   */
  async getCampaignById(campaignId, userId = null) {
    try {
      const { data, error } = await supabaseAdmin
        .from("v1_campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();

      if (error) {
        console.error("[v1/getCampaignById] Database error:", error);
        return {
          success: false,
          message: "Failed to fetch campaign",
          error: error.message,
        };
      }

      if (!data) {
        return {
          success: false,
          message: "Campaign not found",
        };
      }

      return {
        success: true,
        campaign: data,
      };
    } catch (err) {
      console.error("[v1/getCampaignById] Exception:", err);
      return {
        success: false,
        message: "Internal server error",
        error: err.message,
      };
    }
  }

  /**
   * Get campaigns created by a specific brand owner
   */
  async getBrandCampaigns(brandId, filters = {}, pagination = {}) {
    try {
      // Add brand_id filter
      const brandFilters = { ...filters, brand_id: brandId };
      return await this.getCampaigns(brandFilters, pagination);
    } catch (err) {
      console.error("[v1/getBrandCampaigns] Exception:", err);
      return {
        success: false,
        message: "Internal server error",
        error: err.message,
      };
    }
  }

    /**
   * Update campaign (Brand Owner only)
   */
    async updateCampaign(campaignId, brandId, updateData) {
      try {
        // Check ownership
        const ownershipCheck = await this.checkBrandOwnership(
          campaignId,
          brandId
        );
        if (!ownershipCheck.success) {
          return ownershipCheck;
        }
  
        // Build update object (only include provided fields)
        const update = {};
  
        if (updateData.title !== undefined) {
          update.title = updateData.title;
        }
  
        if (updateData.type !== undefined) {
          const type = this.normalizeType(updateData.type);
          if (!this.validateType(type)) {
            return {
              success: false,
              message: "Invalid campaign type. Must be NORMAL or BULK",
            };
          }
          update.type = type;
        }
  
        if (updateData.status !== undefined) {
          const status = this.normalizeStatus(updateData.status);
          if (!this.validateStatus(status)) {
            return {
              success: false,
              message: "Invalid campaign status",
            };
          }
          update.status = status;
        }
  
        if (updateData.min_influencers !== undefined) {
          update.min_influencers = updateData.min_influencers;
        }
  
        if (updateData.max_influencers !== undefined) {
          update.max_influencers = updateData.max_influencers;
        }
  
        // Validate min/max if both are being updated
        if (
          update.min_influencers !== undefined &&
          update.max_influencers !== undefined
        ) {
          if (update.min_influencers > update.max_influencers) {
            return {
              success: false,
              message: "min_influencers cannot be greater than max_influencers",
            };
          }
        }
  
        if (updateData.requires_script !== undefined) {
          update.requires_script = updateData.requires_script;
        }
  
        if (updateData.start_deadline !== undefined) {
          update.start_deadline = updateData.start_deadline;
        }
  
        if (updateData.budget !== undefined) {
          update.budget = updateData.budget ?? null;
        }
  
        // New fields
        if (updateData.description !== undefined) {
          update.description = updateData.description ?? null;
        }
  
        if (updateData.cover_image_url !== undefined) {
          update.cover_image_url = updateData.cover_image_url ?? null;
        }
  
        if (updateData.platform !== undefined) {
          update.platform = Array.isArray(updateData.platform) 
            ? updateData.platform 
            : [];
        }
  
        if (updateData.content_type !== undefined) {
          update.content_type = Array.isArray(updateData.content_type) 
            ? updateData.content_type 
            : [];
        }
  
        if (updateData.influencer_tier !== undefined) {
          update.influencer_tier = updateData.influencer_tier ?? null;
        }
  
        if (updateData.categories !== undefined) {
          update.categories = updateData.categories ?? null;
        }
  
        if (updateData.language !== undefined) {
          update.language = updateData.language ?? null;
        }
  
        if (updateData.brand_guideline !== undefined) {
          update.brand_guideline = updateData.brand_guideline ?? null;
        }
  
        // If no updates, return early
        if (Object.keys(update).length === 0) {
          return {
            success: false,
            message: "No valid fields to update",
          };
        }
  
        // Update campaign
        const { data, error } = await supabaseAdmin
          .from("v1_campaigns")
          .update(update)
          .eq("id", campaignId)
          .select()
          .single();
  
        if (error) {
          console.error("[v1/updateCampaign] Database error:", error);
          return {
            success: false,
            message: "Failed to update campaign",
            error: error.message,
          };
        }
  
        return {
          success: true,
          campaign: data,
          message: "Campaign updated successfully",
        };
      } catch (err) {
        console.error("[v1/updateCampaign] Exception:", err);
        return {
          success: false,
          message: "Internal server error",
          error: err.message,
        };
      }
    }

  /**
   * Delete campaign (Brand Owner only)
   */
  async deleteCampaign(campaignId, brandId) {
    try {
      // Check ownership
      const ownershipCheck = await this.checkBrandOwnership(
        campaignId,
        brandId
      );
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      // Hard delete
      const { error } = await supabaseAdmin
        .from("v1_campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) {
        console.error("[v1/deleteCampaign] Database error:", error);
        return {
          success: false,
          message: "Failed to delete campaign",
          error: error.message,
        };
      }

      return {
        success: true,
        message: "Campaign deleted successfully",
      };
    } catch (err) {
      console.error("[v1/deleteCampaign] Exception:", err);
      return {
        success: false,
        message: "Internal server error",
        error: err.message,
      };
    }
  }

    // Upload campaign image
    async uploadCampaignImage(campaignId, brandId, fileBuffer, fileName) {
      try {
        const {
          uploadImageToStorage,
          deleteImageFromStorage,
        } = require("../utils/imageUpload");
    
        // 1) Verify brand owns the campaign
        const ownershipCheck = await this.checkBrandOwnership(campaignId, brandId);
        if (!ownershipCheck.success) {
          return {
            success: false,
            message: ownershipCheck.message,
          };
        }
    
        // 2) Get current campaign to check for existing image
        const { data: currentCampaign, error: fetchError } = await supabaseAdmin
          .from("v1_campaigns")
          .select("cover_image_url")
          .eq("id", campaignId)
          .single();
    
        if (fetchError) {
          console.error("[v1/uploadCampaignImage] Error fetching campaign:", fetchError);
          return {
            success: false,
            message: "Failed to fetch campaign",
            error: fetchError.message,
          };
        }
    
        // 3) Upload new campaign image first
        const { url, error: uploadError } = await uploadImageToStorage(
          fileBuffer,
          fileName,
          "campaigns" // Folder name in storage bucket
        );
    
        if (uploadError || !url) {
          console.error("[v1/uploadCampaignImage] Upload error:", uploadError);
          return {
            success: false,
            message: uploadError || "Failed to upload image",
          };
        }
    
        // 4) Delete old campaign image if it exists (and not placeholder)
        const placeholderUrl =
          "https://via.placeholder.com/800x400?text=Campaign+Image";
        if (
          currentCampaign?.cover_image_url &&
          currentCampaign.cover_image_url !== placeholderUrl
        ) {
          await deleteImageFromStorage(currentCampaign.cover_image_url);
        }
    
        // 5) Update campaign with new image URL
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("v1_campaigns")
          .update({ cover_image_url: url })
          .eq("id", campaignId)
          .select()
          .single();
    
        if (updateError) {
          console.error("[v1/uploadCampaignImage] Update error:", updateError);
          // Try to delete uploaded image if update fails
          await deleteImageFromStorage(url);
          return {
            success: false,
            message: "Failed to update campaign image",
            error: updateError.message,
          };
        }
    
        return {
          success: true,
          campaign: updated,
          campaign_image_url: url,
          message: "Campaign image uploaded successfully",
        };
      } catch (err) {
        console.error("[v1/uploadCampaignImage] Exception:", err);
        return {
          success: false,
          message: err.message || "Internal server error",
        };
      }
    }
}

module.exports = new CampaignService();
