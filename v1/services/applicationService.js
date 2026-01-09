const { supabaseAdmin } = require("../db/config");
const { canTransition } = require("./applicationStateMachine");

class ApplicationService {
  // Update accepted_count for a campaign
  async updateCampaignAcceptedCount(campaignId) {
    try {
      if (!campaignId) {
        return { success: false, message: "Campaign ID is required" };
      }

      const { count, error: countError } = await supabaseAdmin
        .from("v1_applications")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .in("phase", ["ACCEPTED", "COMPLETED"]);

      if (countError) {
        console.error(
          "[ApplicationService/updateCampaignAcceptedCount] Count error:",
          countError
        );
        return {
          success: false,
          message: "Failed to count applications",
          error: countError.message,
        };
      }

      const acceptedCount = count || 0;

      const { error: updateError } = await supabaseAdmin
        .from("v1_campaigns")
        .update({ accepted_count: acceptedCount })
        .eq("id", campaignId);

      if (updateError) {
        console.error(
          "[ApplicationService/updateCampaignAcceptedCount] Update error:",
          updateError
        );
        return {
          success: false,
          message: "Failed to update accepted_count",
          error: updateError.message,
        };
      }

      return { success: true, count: acceptedCount };
    } catch (err) {
      console.error(
        "[ApplicationService/updateCampaignAcceptedCount] Exception:",
        err
      );
      return {
        success: false,
        message: "Failed to update accepted_count",
        error: err.message,
      };
    }
  }

  // Verify brand owns the application's campaign
  async checkBrandOwnership(applicationId, brandId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("v1_applications")
        .select(`
          *,
          v1_campaigns!inner(brand_id)
        `)
        .eq("id", applicationId)
        .maybeSingle();

      if (error) {
        console.error(
          "[ApplicationService/checkBrandOwnership] Error:",
          error
        );
        return { success: false, message: "Database error" };
      }

      if (!data || !data.v1_campaigns) {
        return { success: false, message: "Application not found" };
      }

      if (data.v1_campaigns.brand_id !== brandId) {
        return {
          success: false,
          message: "Unauthorized: Not your campaign",
        };
      }

      return {
        success: true,
        application: { ...data, brand_id: data.v1_campaigns.brand_id },
      };
    } catch (err) {
      console.error(
        "[ApplicationService/checkBrandOwnership] Error:",
        err
      );
      return { success: false, message: "Database error" };
    }
  }

  // Check if user has permission to cancel application
  async checkCancelPermission(
    applicationId,
    userId,
    userRole,
    brandId = null
  ) {
    try {
      const { data, error } = await supabaseAdmin
        .from("v1_applications")
        .select(`
          *,
          v1_campaigns!inner(brand_id)
        `)
        .eq("id", applicationId)
        .maybeSingle();

      if (error) {
        console.error(
          "[ApplicationService/checkCancelPermission] Error:",
          error
        );
        return { success: false, message: "Database error" };
      }

      if (!data || !data.v1_campaigns) {
        return { success: false, message: "Application not found" };
      }

      if (userRole === "INFLUENCER" && data.influencer_id === userId) {
        return {
          success: true,
          application: { ...data, brand_id: data.v1_campaigns.brand_id },
        };
      }

      if (
        userRole === "BRAND_OWNER" &&
        brandId &&
        data.v1_campaigns.brand_id === brandId
      ) {
        return {
          success: true,
          application: { ...data, brand_id: data.v1_campaigns.brand_id },
        };
      }

      return {
        success: false,
        message: "Unauthorized: Cannot cancel this application",
      };
    } catch (err) {
      console.error(
        "[ApplicationService/checkCancelPermission] Error:",
        err
      );
      return { success: false, message: "Database error" };
    }
  }

  // Apply to a campaign
  async apply({ campaignId, influencerId }) {
    try {
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("v1_campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();

      if (campaignError) {
        console.error(
          "[ApplicationService/apply] Campaign check error:",
          campaignError
        );
        return { success: false, message: "Database error" };
      }

      if (!campaign) {
        return { success: false, message: "Campaign not found" };
      }

      const allowedStatuses = ["LIVE", "ACTIVE", "OPEN", "PUBLISHED"];
      if (!allowedStatuses.includes(campaign.status)) {
        return {
          success: false,
          message: `Campaign is not accepting applications (Status: ${campaign.status})`,
        };
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from("v1_applications")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("influencer_id", influencerId)
        .maybeSingle();

      if (existingError) {
        console.error(
          "[ApplicationService/apply] Duplicate check error:",
          existingError
        );
        return { success: false, message: "Database error" };
      }

      if (existing) {
        return {
          success: false,
          message: "You have already applied to this campaign",
        };
      }

      const { data: app, error: insertError } = await supabaseAdmin
        .from("v1_applications")
        .insert({
          campaign_id: campaignId,
          influencer_id: influencerId,
          brand_id: campaign.brand_id,
          phase: "APPLIED",
          budget_amount: campaign.budget ?? null,
          platform_fee_percentage: campaign.platform_fee_percentage ?? null,
          platform_fee_amount: campaign.platform_fee_amount ?? null,
          agreed_amount: campaign.net_amount ?? null,
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "[ApplicationService/apply] Insert error:",
          insertError
        );
        return {
          success: false,
          message:
            insertError.message || "Failed to apply to campaign",
        };
      }

      return {
        success: true,
        message: "Application submitted successfully",
        application: app,
      };
    } catch (err) {
      console.error("[ApplicationService/apply] Error:", err);
      return {
        success: false,
        message: err.message || "Failed to apply to campaign",
      };
    }
  }

  // Bulk accept multiple applications
  async bulkAccept({ campaignId, applications, brandId }) {
    try {
      if (!campaignId) {
        return { success: false, message: "campaignId is required" };
      }

      if (!Array.isArray(applications) || applications.length === 0) {
        return {
          success: false,
          message: "applications array is required and must not be empty",
        };
      }

      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("v1_campaigns")
        .select(
          "id, brand_id, budget, platform_fee_percentage, platform_fee_amount, net_amount, requires_script"
        )
        .eq("id", campaignId)
        .maybeSingle();

      if (campaignError) {
        console.error(
          "[ApplicationService/bulkAccept] Campaign check error:",
          campaignError
        );
        return { success: false, message: "Database error" };
      }

      if (!campaign) {
        return { success: false, message: "Campaign not found" };
      }

      if (campaign.brand_id !== brandId) {
        return {
          success: false,
          message: "Unauthorized: You do not own this campaign",
        };
      }

      const applicationIds = applications.map((app) => app.applicationId);
      const { data: existingApplications, error: fetchError } =
        await supabaseAdmin
          .from("v1_applications")
          .select("id, campaign_id, phase, brand_id")
          .in("id", applicationIds);

      if (fetchError) {
        console.error(
          "[ApplicationService/bulkAccept] Fetch applications error:",
          fetchError
        );
        return { success: false, message: "Database error" };
      }

      if (
        !existingApplications ||
        existingApplications.length !== applicationIds.length
      ) {
        return {
          success: false,
          message: "One or more applications not found",
        };
      }

      const invalidApplications = existingApplications.filter(
        (app) => app.campaign_id !== campaignId
      );
      if (invalidApplications.length > 0) {
        return {
          success: false,
          message: `One or more applications do not belong to campaign ${campaignId}`,
        };
      }

      const results = [];
      const errors = [];
      const campaignIdsToUpdate = new Set();

      for (const appData of applications) {
        const { applicationId } = appData;
        let individualResult = {
          applicationId,
          success: false,
          message: "Unknown error",
        };

        try {
          const existingApp = existingApplications.find(
            (app) => app.id === applicationId
          );
          if (!existingApp) {
            individualResult.message = "Application not found";
            errors.push({ applicationId, error: individualResult.message });
            results.push(individualResult);
            continue;
          }

          if (!canTransition(existingApp.phase, "ACCEPTED")) {
            individualResult.message = `Cannot accept application. Current phase: ${existingApp.phase}`;
            errors.push({ applicationId, error: individualResult.message });
            results.push(individualResult);
            continue;
          }

          const { data: updated, error: updateError } = await supabaseAdmin
            .from("v1_applications")
            .update({
              phase: "ACCEPTED",
              budget_amount: campaign.budget ?? null,
              platform_fee_percentage:
                campaign.platform_fee_percentage ?? null,
              platform_fee_amount: campaign.platform_fee_amount ?? null,
              agreed_amount: campaign.net_amount ?? null,
              brand_id: brandId,
            })
            .eq("id", applicationId)
            .select()
            .single();

          if (updateError) {
            console.error(
              `[ApplicationService/bulkAccept] Update error for ${applicationId}:`,
              updateError
            );
            individualResult.message =
              updateError.message || "Failed to accept application";
            errors.push({ applicationId, error: individualResult.message });
            results.push(individualResult);
            continue;
          }

          if (existingApp.campaign_id) {
            campaignIdsToUpdate.add(existingApp.campaign_id);
          }

          const MOUService = require("./mouService");
          const mouResult =
            await MOUService.generateMOUForApplication(applicationId);

          if (!mouResult.success) {
            console.error(
              `❌ [ApplicationService/bulkAccept] Failed to generate MOU for application ${applicationId}: ${mouResult.message}`,
              mouResult.error || ""
            );
            individualResult = {
              applicationId,
              success: false,
              message: `Application was accepted but MOU generation failed: ${mouResult.message}`,
              error: mouResult.error || mouResult.message,
              application: updated,
            };
            errors.push({ applicationId, error: individualResult.message });
            results.push(individualResult);
            continue;
          }

          console.log(
            `✅ [ApplicationService/bulkAccept] MOU generated successfully for application ${applicationId}`
          );

          individualResult = {
            applicationId,
            success: true,
            message: "Application accepted successfully and MOU generated",
            application: updated,
            mou: mouResult.data,
          };
          results.push(individualResult);
        } catch (err) {
          console.error(
            `[ApplicationService/bulkAccept] Exception for ${applicationId}:`,
            err
          );
          individualResult.message =
            err.message || "Failed to accept application";
          errors.push({ applicationId, error: individualResult.message });
          results.push(individualResult);
        }
      }

      for (const campId of campaignIdsToUpdate) {
        const countUpdateResult = await this.updateCampaignAcceptedCount(
          campId
        );
        if (!countUpdateResult.success) {
          console.error(
            `[ApplicationService/bulkAccept] Failed to update accepted_count for campaign ${campId}:`,
            countUpdateResult.message
          );
        }
      }

      const succeededCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      const overallSuccess = errors.length === 0;
      const overallMessage = `Bulk accept completed. ${succeededCount} succeeded, ${failedCount} failed.`;

      return {
        success: overallSuccess,
        message: overallMessage,
        total: applications.length,
        succeeded: succeededCount,
        failed: failedCount,
        results: results,
        ...(errors.length > 0 && { errors }),
      };
    } catch (err) {
      console.error("[ApplicationService/bulkAccept] Exception:", err);
      return {
        success: false,
        message: err.message || "Failed to bulk accept applications",
      };
    }
  }

  // Accept a single application
  async accept({ applicationId, brandId }) {
    try {
      const ownershipCheck = await this.checkBrandOwnership(
        applicationId,
        brandId
      );
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      const app = ownershipCheck.application;

      if (!canTransition(app.phase, "ACCEPTED")) {
        return {
          success: false,
          message: `Cannot accept application. Current phase: ${app.phase}`,
        };
      }

      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("v1_campaigns")
        .select(
          "budget, platform_fee_percentage, platform_fee_amount, net_amount, requires_script"
        )
        .eq("id", app.campaign_id)
        .maybeSingle();

      if (campaignError) {
        console.error(
          "[ApplicationService/accept] Campaign fetch error:",
          campaignError
        );
        return {
          success: false,
          message: "Failed to fetch campaign details",
        };
      }

      if (!campaign) {
        return {
          success: false,
          message: "Campaign not found",
        };
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("v1_applications")
        .update({
          phase: "ACCEPTED",
          budget_amount: campaign.budget ?? null,
          platform_fee_percentage: campaign.platform_fee_percentage ?? null,
          platform_fee_amount: campaign.platform_fee_amount ?? null,
          agreed_amount: campaign.net_amount ?? null,
          brand_id: brandId,
        })
        .eq("id", applicationId)
        .select()
        .single();

      if (updateError) {
        console.error(
          "[ApplicationService/accept] Update error:",
          updateError
        );
        return {
          success: false,
          message: updateError.message || "Failed to accept application",
        };
      }

      const MOUService = require("./mouService");
      const mouResult =
        await MOUService.generateMOUForApplication(applicationId);

      if (!mouResult.success) {
        console.error(
          `❌ [ApplicationService/accept] Failed to generate MOU for application ${applicationId}: ${mouResult.message}`,
          mouResult.error || ""
        );
        return {
          success: false,
          message: `Application was accepted but MOU generation failed: ${mouResult.message}`,
          error: mouResult.error || mouResult.message,
          application: updated,
        };
      }

      console.log(
        `✅ [ApplicationService/accept] MOU generated successfully for application ${applicationId}`
      );

      if (app.campaign_id) {
        const countUpdateResult = await this.updateCampaignAcceptedCount(
          app.campaign_id
        );
        if (!countUpdateResult.success) {
          console.error(
            "[ApplicationService/accept] Failed to update accepted_count:",
            countUpdateResult.message
          );
        }
      }

      return {
        success: true,
        message: "Application accepted successfully and MOU generated",
        application: updated,
        mou: mouResult.data,
      };
    } catch (err) {
      console.error("[ApplicationService/accept] Error:", err);
      return {
        success: false,
        message: err.message || "Failed to accept application",
      };
    }
  }

  // Cancel an application
  async cancel({ applicationId, user, brandId = null }) {
    try {
      const permissionCheck = await this.checkCancelPermission(
        applicationId,
        user.id,
        user.role,
        brandId
      );
      if (!permissionCheck.success) {
        return permissionCheck;
      }

      const app = permissionCheck.application;

      if (!canTransition(app.phase, "CANCELLED")) {
        return {
          success: false,
          message: `Cannot cancel application. Current phase: ${app.phase}`,
        };
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("v1_applications")
        .update({
          phase: "CANCELLED",
        })
        .eq("id", applicationId)
        .select()
        .single();

      if (updateError) {
        console.error(
          "[ApplicationService/cancel] Update error:",
          updateError
        );
        return {
          success: false,
          message: updateError.message || "Failed to cancel application",
        };
      }

      return {
        success: true,
        message: "Application cancelled successfully",
        application: updated,
      };
    } catch (err) {
      console.error("[ApplicationService/cancel] Error:", err);
      return {
        success: false,
        message: err.message || "Failed to cancel application",
      };
    }
  }

  // Complete an application (Admin only)
  async complete(applicationId) {
    try {
      const { data: app, error: fetchError } = await supabaseAdmin
        .from("v1_applications")
        .select("*")
        .eq("id", applicationId)
        .maybeSingle();

      if (fetchError) {
        console.error(
          "[ApplicationService/complete] Fetch error:",
          fetchError
        );
        return { success: false, message: "Database error" };
      }

      if (!app) {
        return { success: false, message: "Application not found" };
      }

      if (!canTransition(app.phase, "COMPLETED")) {
        return {
          success: false,
          message: `Cannot complete application. Current phase: ${app.phase}`,
        };
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("v1_applications")
        .update({
          phase: "COMPLETED",
        })
        .eq("id", applicationId)
        .select()
        .single();

      if (updateError) {
        console.error(
          "[ApplicationService/complete] Update error:",
          updateError
        );
        return {
          success: false,
          message: updateError.message || "Failed to complete application",
        };
      }

      try {
        const ChatService = require("./chatService");
        await ChatService.closeChat(applicationId);
        console.log(
          `[ApplicationService/complete] Chat closed for application ${applicationId}`
        );
      } catch (chatError) {
        console.error(
          `[ApplicationService/complete] Failed to close chat:`,
          chatError
        );
      }

      return {
        success: true,
        message: "Application completed successfully",
        application: updated,
      };
    } catch (err) {
      console.error("[ApplicationService/complete] Error:", err);
      return {
        success: false,
        message: err.message || "Failed to complete application",
      };
    }
  }
}

module.exports = new ApplicationService();