const { supabaseAdmin } = require("../supabase/client");
const { body, validationResult, query } = require("express-validator");
const {
  uploadImageToStorage,
  deleteImageFromStorage,
} = require("../utils/imageUpload");
const automatedFlowService = require("../services/automatedFlowService");

class CampaignController {
  /**
   * Create a new campaign
   */
  async createCampaign(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const formData = req.body;

      // Handle image upload if present
      let imageUrl = formData.image_url || formData.image || null;
      if (req.file) {
        const { url, error } = await uploadImageToStorage(
          req.file.buffer,
          req.file.originalname,
          "campaigns"
        );

        if (error) {
          return res.status(500).json({
            success: false,
            message: "Failed to upload image",
            error: error,
          });
        }

        imageUrl = url;
      }

      // Map form data to database schema
      const campaignData = {
        title: formData.name || formData.title,
        description: formData.description || "",
        min_budget: parseFloat(formData.min_budget || 0),
        max_budget: parseFloat(formData.max_budget || 0),
        start_date: formData.start_date || formData.startDate,
        end_date: formData.end_date || formData.endDate,
        campaign_type: formData.category || formData.campaign_type || "product",
        target_audience: formData.targetAudience || "",
        requirements: formData.requirements || "",
        deliverables: formData.deliverables || [],
        // Image and content fields
        image_url: imageUrl,
        language: formData.language || "",
        platform: formData.platform || "",
        content_type: formData.contentType || formData.content_type || "",
        // Package options for product campaigns
        sending_package_to_influencer: formData.sendingPackageToInfluencer || "no",
        no_of_packages: formData.noOfPackages ? parseInt(formData.noOfPackages) : null,
      };

      // Ensure only brand owners can create campaigns
      if (req.user.role !== "brand_owner" && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only brand owners can create campaigns",
        });
      }

      // Check subscription status for brand owners
      if (req.user.role === "brand_owner") {
        const { data: hasPremiumAccess } = await supabaseAdmin.rpc(
          "has_active_premium_subscription",
          {
            user_uuid: userId,
          }
        );

        if (!hasPremiumAccess) {
          return res.status(403).json({
            success: false,
            message: "Premium subscription required to create campaigns",
            requires_subscription: true,
          });
        }
      }

      console.log("Creating campaign with data:", {
        userId: userId,
        formData: formData,
        campaignData: campaignData,
      });

      const { data: campaign, error } = await supabaseAdmin
        .from("campaigns")
        .insert({
          ...campaignData,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error("Database error creating campaign:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to create campaign",
          error: error.message,
        });
      }

      console.log("Campaign created successfully:", campaign);
      res.status(201).json({
        success: true,
        campaign: campaign,
        message: "Campaign created successfully",
      });
    } catch (error) {
      console.error("Exception creating campaign:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Get all campaigns with filtering and pagination
   */
  async getCampaigns(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        min_budget,
        max_budget,
        search,
        category,
        type,
        campaign_type,
      } = req.query;

      const offset = (page - 1) * limit;
      let baseSelect = supabaseAdmin.from("campaigns").select(`
                    *,
                    created_by_user:users!campaigns_created_by_fkey (
                        id,
                        phone,
                        email,
                        role
                    ),
                    requests_count:requests(count)
                `);

      // Generic filters
      if (min_budget) {
        baseSelect = baseSelect.gte("min_budget", parseFloat(min_budget));
      }
      if (max_budget) {
        baseSelect = baseSelect.lte("max_budget", parseFloat(max_budget));
      }
      if (search) {
        baseSelect = baseSelect.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`
        );
      }
      const typeFilter = type || campaign_type;
      if (typeFilter) {
        baseSelect = baseSelect.eq("campaign_type", typeFilter);
      }

      // Role-based server-driven filtering
      if (req.user.role === "influencer") {
        const userId = req.user.id;
        const normalizedStatus = (status || "open").toLowerCase();

        // Fetch all campaign_ids this influencer has interacted with
        const { data: influencerRequests } = await supabaseAdmin
          .from("requests")
          .select("campaign_id, status")
          .eq("influencer_id", userId)
          .not("campaign_id", "is", null);

        const interactedCampaignIds = (influencerRequests || [])
          .map((r) => r.campaign_id)
          .filter(Boolean);

        if (normalizedStatus === "open" || normalizedStatus === "new") {
          // Open/new: show all open campaigns (including interacted) but filter out expired ones for influencers
          let query = baseSelect.eq("status", "open");
          
          // Filter out expired campaigns for influencers
          const currentDate = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
          query = query.or(`end_date.is.null,end_date.gte.${currentDate}`);
          
          const {
            data: campaigns,
            error,
            count,
          } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);
          if (error) {
            return res
              .status(500)
              .json({ success: false, message: "Failed to fetch campaigns" });
          }
          return res.json({
            success: true,
            campaigns: campaigns || [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: count || (campaigns || []).length,
              pages: Math.ceil((count || (campaigns || []).length) / limit),
            },
          });
        } else if (
          normalizedStatus === "pending" ||
          normalizedStatus === "closed"
        ) {
          // Map request statuses to tabs
          const pendingRequestStatuses = [
            "connected",
            "negotiating",
            "paid",
            "finalized",
            "work_submitted",
            "work_approved",
          ];
          const closedRequestStatuses = ["completed", "cancelled"];
          const allowedReqStatuses =
            normalizedStatus === "pending"
              ? pendingRequestStatuses
              : closedRequestStatuses;

          // Collect campaign ids that have a matching request status for this influencer
          const filteredIds = (influencerRequests || [])
            .filter(
              (r) => r.campaign_id && allowedReqStatuses.includes(r.status)
            )
            .map((r) => r.campaign_id);
          const idsSet = new Set(filteredIds);
          if (idsSet.size === 0) {
            return res.json({
              success: true,
              campaigns: [],
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                pages: 0,
              },
            });
          }

          let query = baseSelect
            .eq("status", normalizedStatus)
            .in("id", Array.from(idsSet));
          const { data: campaigns, error } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);
          if (error) {
            return res
              .status(500)
              .json({ success: false, message: "Failed to fetch campaigns" });
          }
          return res.json({
            success: true,
            campaigns: campaigns || [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: (campaigns || []).length,
              pages: Math.ceil((campaigns || []).length / limit),
            },
          });
        } else {
          // Default: treat as open
          let query = baseSelect.eq("status", "open");
          const { data: campaigns, error } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);
          if (error) {
            return res
              .status(500)
              .json({ success: false, message: "Failed to fetch campaigns" });
          }
          const interactedSet = new Set(interactedCampaignIds);
          const filtered = (campaigns || []).filter(
            (c) => !interactedSet.has(c.id)
          );
          return res.json({
            success: true,
            campaigns: filtered,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: filtered.length,
              pages: Math.ceil(filtered.length / limit),
            },
          });
        }
      } else if (req.user.role === "brand_owner") {
        // Brand owners only see their own campaigns
        let query = baseSelect.eq("created_by", req.user.id);
        if (status) query = query.eq("status", status);
        const {
          data: campaigns,
          error,
          count,
        } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) {
          return res
            .status(500)
            .json({ success: false, message: "Failed to fetch campaigns" });
        }
        return res.json({
          success: true,
          campaigns: campaigns,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / limit),
          },
        });
      } else {
        // Admin or other roles: generic filters
        let query = baseSelect;
        if (status) query = query.eq("status", status);
        const {
          data: campaigns,
          error,
          count,
        } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) {
          return res
            .status(500)
            .json({ success: false, message: "Failed to fetch campaigns" });
        }
        return res.json({
          success: true,
          campaigns: campaigns,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / limit),
          },
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get a specific campaign by ID
   */
  async getCampaign(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      let query = supabaseAdmin
        .from("campaigns")
        .select(
          `
                    *,
                    created_by_user:users!campaigns_created_by_fkey (
                        id,
                        phone,
                        email,
                        role
                    ),
                    requests (
                        id,
                        status,
                        created_at,
                        influencer:users!requests_influencer_id_fkey (
                            id,
                            phone,
                            email,
                            name,
                            role,
                            languages,
                            categories,
                            min_range,
                            max_range
                        )
                    )
                `
        )
        .eq("id", id);

      const { data: campaign, error } = await query.single();

      if (error || !campaign) {
        return res.status(404).json({
          success: false,
          message: "Campaign not found",
        });
      }

      // Check access permissions
      if (req.user.role === "brand_owner" && campaign.created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      if (req.user.role === "influencer") {
        // Check if influencer has interacted with this campaign
        const hasInteraction = campaign.requests.some(
          (request) => request.influencer.id === userId
        );
        if (!hasInteraction && campaign.status !== "open") {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }
      }

      res.json({
        success: true,
        campaign: campaign,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update a campaign
   */
  async updateCampaign(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const formData = req.body;

      // Handle image upload if present
      let imageUrl = null;
      if (req.file) {
        const { url, error } = await uploadImageToStorage(
          req.file.buffer,
          req.file.originalname,
          "campaigns"
        );

        if (error) {
          return res.status(500).json({
            success: false,
            message: "Failed to upload image",
            error: error,
          });
        }

        imageUrl = url;
      }

      // Map frontend form fields to database columns
      const updateData = {};

      if (formData.name !== undefined) updateData.title = formData.name;
      if (formData.description !== undefined)
        updateData.description = formData.description;
      if (formData.min_budget !== undefined)
        updateData.min_budget = parseFloat(formData.min_budget);
      if (formData.max_budget !== undefined)
        updateData.max_budget = parseFloat(formData.max_budget);
      if (formData.budget !== undefined) {
        updateData.min_budget = parseFloat(formData.budget);
        updateData.max_budget = parseFloat(formData.budget);
      }
      if (formData.expiryDate !== undefined)
        updateData.end_date = formData.expiryDate;
      if (formData.category !== undefined)
        updateData.campaign_type =
          formData.category === "product" ? "product" : "service";
      if (formData.targetAudience !== undefined)
        updateData.requirements = formData.targetAudience;
      if (formData.contentType !== undefined)
        updateData.deliverables = [formData.contentType];
      if (imageUrl !== null) updateData.image_url = imageUrl;
      else if (formData.image !== undefined)
        updateData.image_url = formData.image;
      if (formData.language !== undefined)
        updateData.language = formData.language;
      if (formData.platform !== undefined)
        updateData.platform = formData.platform;
      if (formData.contentType !== undefined)
        updateData.content_type = formData.contentType;
      if (formData.sendingPackageToInfluencer !== undefined)
        updateData.sending_package =
          formData.sendingPackageToInfluencer === "yes";
      if (formData.noOfPackages !== undefined)
        updateData.no_of_packages = formData.noOfPackages
          ? parseInt(formData.noOfPackages)
          : null;

      console.log("Update campaign request:", {
        campaignId: id,
        userId: userId,
        receivedData: formData,
        updateData: updateData,
      });

      // Check if campaign exists and user has permission
      const { data: existingCampaign, error: checkError } = await supabaseAdmin
        .from("campaigns")
        .select("created_by")
        .eq("id", id)
        .single();

      if (checkError || !existingCampaign) {
        return res.status(404).json({
          success: false,
          message: "Campaign not found",
        });
      }

      if (existingCampaign.created_by !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { data: campaign, error } = await supabaseAdmin
        .from("campaigns")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Database error updating campaign:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to update campaign",
          error: error.message,
        });
      }

      console.log("Campaign updated successfully:", campaign);
      res.json({
        success: true,
        campaign: campaign,
        message: "Campaign updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if campaign exists and user has permission
      const { data: existingCampaign, error: checkError } = await supabaseAdmin
        .from("campaigns")
        .select("created_by, image_url")
        .eq("id", id)
        .single();

      if (checkError || !existingCampaign) {
        return res.status(404).json({
          success: false,
          message: "Campaign not found",
        });
      }

      if (existingCampaign.created_by !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Delete associated image if it exists
      if (existingCampaign.image_url) {
        await deleteImageFromStorage(existingCampaign.image_url);
      }

      const { error } = await supabaseAdmin
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete campaign",
        });
      }

      res.json({
        success: true,
        message: "Campaign deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(req, res) {
    try {
      const userId = req.user.id;

      let queryBuilder = supabaseAdmin
        .from("campaigns")
        .select("status, budget");

      // Apply role-based filtering
      if (req.user.role === "brand_owner") {
        queryBuilder = queryBuilder.eq("created_by", userId);
      } else if (req.user.role === "influencer") {
        // Get campaigns where influencer has requests
        queryBuilder = supabaseAdmin
          .from("requests")
          .select(
            `
                        campaigns (
                            status,
                            budget
                        )
                    `
          )
          .eq("influencer_id", userId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch statistics",
        });
      }

      // Calculate statistics
      const campaigns =
        req.user.role === "influencer"
          ? data.map((item) => item.campaigns).filter(Boolean)
          : data;

      const stats = {
        total: campaigns.length,
        byStatus: {},
        totalBudget: 0,
      };

      campaigns.forEach((campaign) => {
        // Status stats
        stats.byStatus[campaign.status] =
          (stats.byStatus[campaign.status] || 0) + 1;

        // Budget
        stats.totalBudget += parseFloat(campaign.budget || 0);
      });

      res.json({
        success: true,
        stats: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Initialize automated conversation for campaign connection
   */
  async initializeCampaignConversation(req, res) {
    try {
      const { campaign_id, influencer_id } = req.body;

      if (!campaign_id || !influencer_id) {
        return res.status(400).json({
          success: false,
          message: "campaign_id and influencer_id are required",
        });
      }

      // Verify user is the brand owner of this campaign
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("campaigns")
        .select("created_by")
        .eq("id", campaign_id)
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({
          success: false,
          message: "Campaign not found",
        });
      }

      if (campaign.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Only the campaign creator can initialize conversations",
        });
      }

      const result = await automatedFlowService.initializeCampaignConversation(
        campaign_id,
        influencer_id
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to initialize campaign conversation",
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: "Campaign conversation initialized successfully",
        conversation: result.conversation,
        flow_state: result.flow_state,
        awaiting_role: result.awaiting_role,
      });
    } catch (error) {
      console.error("Error initializing campaign conversation:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Handle automated flow action from campaign influencer
   */
  async handleCampaignInfluencerAction(req, res) {
    try {
      const { conversation_id, action, data } = req.body;

      if (!conversation_id || !action) {
        return res.status(400).json({
          success: false,
          message: "conversation_id and action are required",
        });
      }

      // Verify user is the influencer of this conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("influencer_id, flow_state, awaiting_role")
        .eq("id", conversation_id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      if (conversation.influencer_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Only the influencer can perform this action",
        });
      }

      if (conversation.awaiting_role !== "influencer") {
        return res.status(400).json({
          success: false,
          message: "It's not your turn to act",
        });
      }

      const result = await automatedFlowService.handleCampaignInfluencerAction(
        conversation_id,
        action,
        data
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to handle action",
          error: result.error,
        });
      }

      // ✅ Return the complete result structure for automated flow
      res.json({
        success: true,
        conversation: result.conversation,
        message: result.message,
        audit_message: result.audit_message, // Include audit message for sender
        flow_state: result.flow_state,
        awaiting_role: result.awaiting_role,
      });
    } catch (error) {
      console.error("Error handling campaign influencer action:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Handle automated flow action from campaign brand owner
   */
  async handleCampaignBrandOwnerAction(req, res) {
    try {
      const { conversation_id, action, data } = req.body;

      if (!conversation_id || !action) {
        return res.status(400).json({
          success: false,
          message: "conversation_id and action are required",
        });
      }

      // Verify user is the brand owner of this conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("brand_owner_id, flow_state, awaiting_role")
        .eq("id", conversation_id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      if (conversation.brand_owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Only the brand owner can perform this action",
        });
      }

      if (conversation.awaiting_role !== "brand_owner") {
        return res.status(400).json({
          success: false,
          message: "It's not your turn to act",
        });
      }

      const result = await automatedFlowService.handleCampaignBrandOwnerAction(
        conversation_id,
        action,
        data
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to handle action",
          error: result.error,
        });
      }

      // ✅ Return the complete result structure for automated flow
      res.json({
        success: true,
        conversation: result.conversation,
        message: result.message,
        audit_message: result.audit_message, // Include audit message for sender
        flow_state: result.flow_state,
        awaiting_role: result.awaiting_role,
      });
    } catch (error) {
      console.error("Error handling campaign brand owner action:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Handle work submission for campaign
   */
  async handleWorkSubmission(req, res) {
    try {
      const { conversation_id } = req.params;
      const { deliverables, description, submission_notes } = req.body;

      if (!deliverables || !description) {
        return res.status(400).json({
          success: false,
          message: "deliverables and description are required",
        });
      }

      // Verify user is the influencer of this conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("influencer_id, flow_state")
        .eq("id", conversation_id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      if (conversation.influencer_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Only the influencer can submit work",
        });
      }

      if (conversation.flow_state !== "work_in_progress") {
        return res.status(400).json({
          success: false,
          message: "Work cannot be submitted at this stage",
        });
      }

      const submissionData = {
        deliverables,
        description,
        submission_notes,
        submitted_at: new Date().toISOString(),
      };

      const result = await automatedFlowService.handleWorkSubmission(
        conversation_id,
        submissionData
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to submit work",
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: "Work submitted successfully",
        flow_state: result.flow_state,
        awaiting_role: result.awaiting_role,
      });
    } catch (error) {
      console.error("Error handling work submission:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Handle work review for campaign
   */
  async handleWorkReview(req, res) {
    try {
      const { conversation_id } = req.params;
      const { action, feedback } = req.body;

      if (!action) {
        return res.status(400).json({
          success: false,
          message: "action is required",
        });
      }

      // Verify user is the brand owner of this conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("brand_owner_id, flow_state")
        .eq("id", conversation_id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      if (conversation.brand_owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Only the brand owner can review work",
        });
      }

      if (conversation.flow_state !== "work_submitted") {
        return res.status(400).json({
          success: false,
          message: "Work cannot be reviewed at this stage",
        });
      }

      const result = await automatedFlowService.handleWorkReview(
        conversation_id,
        action,
        feedback
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to review work",
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: "Work reviewed successfully",
        flow_state: result.flow_state,
        awaiting_role: result.awaiting_role,
      });
    } catch (error) {
      console.error("Error handling work review:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Verify campaign payment and transition to real-time chat
   */
  async verifyCampaignPayment(req, res) {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature, 
        conversation_id 
      } = req.body;
      const userId = req.user.id;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !conversation_id) {
        return res.status(400).json({
          success: false,
          message: "Missing required payment verification parameters"
        });
      }

      // Verify user is part of this conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("id", conversation_id)
        .or(`brand_owner_id.eq.${userId},influencer_id.eq.${userId}`)
        .single();

      if (convError || !conversation) {
        return res.status(403).json({
          success: false,
          message: "Access denied or conversation not found"
        });
      }

      // Verify Razorpay signature
      const crypto = require('crypto');
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      if (razorpay_signature !== expectedSignature) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature"
        });
      }

      // Check for duplicate payment
      const { data: existingTransaction } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("razorpay_payment_id", razorpay_payment_id)
        .single();

      if (existingTransaction) {
        return res.status(400).json({
          success: false,
          message: "Payment already processed"
        });
      }

      // Get campaign details for payment amount
      const { data: campaign } = await supabaseAdmin
        .from("campaigns")
        .select("title, min_budget, max_budget")
        .eq("id", conversation.campaign_id)
        .single();

      // Use campaign budget as payment amount (you might want to adjust this logic)
      const paymentAmount = Math.round((campaign?.min_budget || 1000) * 100); // Convert to paise

      // Get influencer's wallet
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("id, balance_paise, frozen_balance_paise, user_id")
        .eq("user_id", conversation.influencer_id)
        .single();

      if (walletError) {
        console.error("Wallet error:", walletError);
        return res.status(500).json({
          success: false,
          message: "Failed to get influencer wallet"
        });
      }

      // Update wallet balance (add payment amount in paise)
      const newBalance = (wallet.balance_paise || 0) + paymentAmount;
      const { error: walletUpdateError } = await supabaseAdmin
        .from("wallets")
        .update({ 
          balance_paise: newBalance,
          balance: newBalance / 100 // Keep old balance field for compatibility
        })
        .eq("id", wallet.id);

      if (walletUpdateError) {
        console.error("Wallet update error:", walletUpdateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update wallet balance"
        });
      }

      // Create payment order
      const { data: paymentOrder, error: orderError } = await supabaseAdmin
        .from("payment_orders")
        .insert({
          conversation_id: conversation_id,
          amount_paise: paymentAmount,
          currency: "INR",
          status: "verified",
          razorpay_order_id: razorpay_order_id,
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
          metadata: {
            conversation_type: "campaign",
            brand_owner_id: conversation.brand_owner_id,
            influencer_id: conversation.influencer_id,
            campaign_id: conversation.campaign_id
          }
        })
        .select()
        .single();

      if (orderError) {
        console.error("Payment order creation error:", orderError);
        return res.status(500).json({ success: false, message: "Failed to create payment order" });
      }

      // Create escrow hold record
      const { data: escrowHold, error: escrowError } = await supabaseAdmin
        .from('escrow_holds')
        .insert({
          conversation_id: conversation_id,
          payment_order_id: paymentOrder.id,
          amount_paise: paymentAmount,
          status: 'held',
          release_reason: 'Payment held in escrow until work completion',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (escrowError) {
        console.error("Escrow hold creation error:", escrowError);
        // Continue anyway as the payment is processed
      }

      // Create transaction record
      const transactionData = {
        wallet_id: wallet.id,
        user_id: conversation.influencer_id,
        amount: paymentAmount / 100,
        amount_paise: paymentAmount,
        type: "credit",
        direction: "credit",
        status: "completed",
        stage: "escrow_hold",
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        related_payment_order_id: paymentOrder.id,
        campaign_id: conversation.campaign_id,
        notes: `Payment held in escrow for campaign collaboration${escrowHold ? ` (Escrow ID: ${escrowHold.id})` : ''}`
      };

      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from("transactions")
        .insert(transactionData)
        .select()
        .single();

      if (transactionError) {
        console.error("Transaction creation error:", transactionError);
        return res.status(500).json({ success: false, message: "Failed to create transaction record" });
      }

      // Update campaign status to "pending" (work in progress)
      await supabaseAdmin
        .from("campaigns")
        .update({ status: "pending" })
        .eq("id", conversation.campaign_id);

      // First update to payment_completed state
      const { data: paymentCompletedConversation, error: paymentUpdateError } = await supabaseAdmin
        .from("conversations")
        .update({
          flow_state: "payment_completed",
          awaiting_role: null,
          chat_status: "real_time",
          conversation_type: "campaign",
          escrow_hold_id: escrowHold?.id,
          flow_data: {
            agreed_amount: paymentAmount / 100,
            agreement_timestamp: new Date().toISOString(),
            payment_completed: true,
            payment_timestamp: new Date().toISOString()
          },
          current_action_data: {}
        })
        .eq("id", conversation_id)
        .select()
        .single();

      if (paymentUpdateError) {
        console.error("Payment completion update error:", paymentUpdateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update conversation to payment completed state"
        });
      }

      // Create payment completion message
      const { data: paymentCompletionMessage, error: paymentMessageError } = await supabaseAdmin
        .from("messages")
        .insert({
          conversation_id: conversation_id,
          sender_id: "00000000-0000-0000-0000-000000000000", // System user
          receiver_id: conversation.brand_owner_id,
          message: `✅ **Payment Completed Successfully!**\n\nPayment of ₹${paymentAmount / 100} has been processed and verified for the campaign "${campaign?.title || 'Campaign'}". The collaboration is now active and you can communicate in real-time.\n\n**Next Steps:**\n- You can now chat freely with the influencer\n- The influencer will begin working on your campaign\n- Payment is held in escrow until work completion`,
          message_type: "automated",
          action_required: false
        })
        .select()
        .single();

      if (paymentMessageError) {
        console.error("Payment completion message error:", paymentMessageError);
        // Continue anyway as payment is processed
      }

      // Emit payment completion events and create notifications
      const io = req.app.get("io");
      if (io) {
        // Set socket in automated flow service
        automatedFlowService.setSocket(io);
        
        // Emit conversation update with notifications
        // await automatedFlowService.emitConversationUpdate(
        //   conversation_id,
        //   "payment_completed",
        //   null,
        //   "real_time",
        //   conversation.influencer_id,
        //   "Payment completed successfully! You can now start working on the campaign."
        // );

        // Emit payment completion message with notification
        if (paymentCompletionMessage) {
          await automatedFlowService.emitMessageEvents(
            conversation,
            paymentCompletionMessage,
            conversation.influencer_id
          );
        }
      }

      // Now transition to work_in_progress after a short delay
      setTimeout(async () => {
        const { data: updatedConversation, error: workUpdateError } = await supabaseAdmin
          .from("conversations")
          .update({
            flow_state: "work_in_progress",
            awaiting_role: "influencer", // Influencer's turn to work
            chat_status: "real_time",
            conversation_type: "campaign",
            escrow_hold_id: escrowHold?.id,
            flow_data: {
              agreed_amount: paymentAmount / 100,
              agreement_timestamp: new Date().toISOString(),
              payment_completed: true,
              payment_timestamp: new Date().toISOString(),
              work_started: true,
              work_started_timestamp: new Date().toISOString()
            },
            current_action_data: {}
          })
          .eq("id", conversation_id)
          .select()
          .single();

        if (workUpdateError) {
          console.error("Work in progress update error:", workUpdateError);
          return;
        }

        // Create work started message
        const { data: workStartedMessage, error: workMessageError } = await supabaseAdmin
          .from("messages")
          .insert({
            conversation_id: conversation_id,
            sender_id: "00000000-0000-0000-0000-000000000000", // System user
            receiver_id: conversation.influencer_id,
            message: `🚀 **Work Phase Started!**\n\nGreat! The payment has been completed and the work phase has begun for the campaign "${campaign?.title || 'Campaign'}". You can now communicate freely with the brand owner and start working on the project.\n\n**Project Details:**\n- Amount: ₹${paymentAmount / 100}\n- Status: Work in Progress\n- Communication: Real-time chat enabled`,
            message_type: "automated",
            action_required: false
          })
          .select()
          .single();

        // Emit work started events and create notifications
        if (io) {
          // Set socket in automated flow service
          automatedFlowService.setSocket(io);
          
          // Emit conversation update with notifications
          // await automatedFlowService.emitConversationUpdate(
          //   conversation_id,
          //   "work_in_progress",
          //   "influencer",
          //   "real_time",
          //   conversation.influencer_id,
          //   "Work phase started! You can now begin working on the campaign."
          // );

          // Emit work started message with notification
          if (workStartedMessage) {
            await automatedFlowService.emitMessageEvents(
              conversation,
              workStartedMessage,
              conversation.influencer_id
            );
          }
        }
      }, 2000); // 2 second delay to show payment completion first

      res.json({
        success: true,
        message: "Payment verified and processed successfully",
        conversation: {
          id: paymentCompletedConversation.id,
          conversation_type: paymentCompletedConversation.conversation_type,
          flow_state: paymentCompletedConversation.flow_state,
          awaiting_role: paymentCompletedConversation.awaiting_role,
          chat_status: paymentCompletedConversation.chat_status,
          flow_data: paymentCompletedConversation.flow_data,
          current_action_data: paymentCompletedConversation.current_action_data,
          created_at: paymentCompletedConversation.created_at,
          updated_at: paymentCompletedConversation.updated_at
        },
        payment_status: {
          status: "verified",
          razorpay_payment_id: razorpay_payment_id,
          razorpay_order_id: razorpay_order_id,
          amount: paymentAmount,
          currency: "INR"
        },
        wallet_updates: {
          influencer: {
            balance_paise: newBalance,
            frozen_balance_paise: paymentAmount
          }
        }
      });

    } catch (error) {
      console.error("❌ Error verifying campaign payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify payment",
        error: error.message
      });
    }
  }
}

// Validation middleware
const validateCreateCampaign = [
  // Campaign name (required)
  body("name")
    .notEmpty()
    .isLength({ min: 3, max: 200 })
    .withMessage("Campaign name is required and must be between 3 and 200 characters"),
  
  // Description (required)
  body("description")
    .notEmpty()
    .isLength({ min: 50, max: 2000 })
    .withMessage("Description is required and must be between 50 and 2000 characters"),
  
  // Budget validation
  body("min_budget")
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage("Minimum budget is required and must be a positive number"),
  body("max_budget")
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage("Maximum budget is required and must be a positive number"),
  
  // Custom validation for budget relationship
  body().custom((value) => {
    if (value.min_budget && value.max_budget && parseFloat(value.min_budget) > parseFloat(value.max_budget)) {
      throw new Error("Maximum budget must be greater than or equal to minimum budget");
    }
    return true;
  }),
  
  // Category validation
  body("category")
    .notEmpty()
    .isIn(["product", "service"])
    .withMessage("Category is required and must be 'product' or 'service'"),
  
  // Target audience (optional)
  body("targetAudience")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Target audience must be less than 1000 characters"),
  
  // Content type (required)
  body("contentType")
    .notEmpty()
    .withMessage("Content type is required"),
  
  // Language (required)
  body("language")
    .notEmpty()
    .withMessage("Language is required"),
  
  // Platform (required)
  body("platform")
    .notEmpty()
    .withMessage("Platform is required"),
  
  // Package validation for product campaigns
  body().custom((value) => {
    if (value.category === "product") {
      if (!value.sendingPackageToInfluencer || !["yes", "no"].includes(value.sendingPackageToInfluencer)) {
        throw new Error("Package sending option is required for product campaigns");
      }
      if (value.sendingPackageToInfluencer === "yes" && (!value.noOfPackages || value.noOfPackages < 1 || value.noOfPackages > 100)) {
        throw new Error("Number of packages must be between 1 and 100 when sending packages");
      }
    }
    return true;
  }),
  
  // Date validation
  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  body("end_date")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
  
  // Image validation
  body("image_url")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),
];

const validateUpdateCampaign = [
  // Support both old format (title) and new format (name)
  body("title")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters"),
  body("name")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Name must be between 3 and 200 characters"),
  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),
  body("budget")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Budget must be a positive number"),
  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("end_date")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date"),
  body("campaign_type")
    .optional()
    .isIn(["product", "service", "mixed"])
    .withMessage("Campaign type must be product, service, or mixed"),
  body("requirements")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Requirements must be less than 2000 characters"),
  body("deliverables")
    .optional()
    .isArray()
    .withMessage("Deliverables must be an array"),
  // New form fields
  body("image_url")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),
  body("language")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Language must be less than 100 characters"),
  body("platform")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Platform must be less than 100 characters"),
  body("content_type")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Content type must be less than 100 characters"),
  body("sending_package")
    .optional()
    .isBoolean()
    .withMessage("Sending package must be a boolean"),
  body("no_of_packages")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Number of packages must be a non-negative integer"),
];

module.exports = {
  CampaignController: new CampaignController(),
  validateCreateCampaign,
  validateUpdateCampaign,
};
