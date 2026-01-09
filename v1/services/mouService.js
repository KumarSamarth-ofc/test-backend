const { supabaseAdmin } = require("../db/config");

class MOUService {
  // Get latest MOU for an application
  async getLatestMOU(applicationId, userId, userRole) {
    try {
      const { data: application, error: appError } = await supabaseAdmin
        .from("v1_applications")
        .select(`
          id,
          phase,
          influencer_id,
          brand_id,
          v1_campaigns!inner(brand_id)
        `)
        .eq("id", applicationId)
        .maybeSingle();

      if (appError) {
        console.error(
          "[MOUService/getLatestMOU] Application fetch error:",
          appError
        );
        return { success: false, message: "Database error" };
      }

      if (!application) {
        return { success: false, message: "Application not found" };
      }

      if (userRole === "INFLUENCER") {
        if (application.influencer_id !== userId) {
          return {
            success: false,
            message: "You do not have access to this application",
          };
        }
      } else if (userRole === "BRAND_OWNER") {
        if (application.v1_campaigns.brand_id !== userId) {
          return {
            success: false,
            message: "You do not have access to this application",
          };
        }
      }

      const { data: mous, error: mouError } = await supabaseAdmin
        .from("v1_mous")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (mouError) {
        console.error("[MOUService/getLatestMOU] MOU fetch error:", mouError);
        return { success: false, message: "Database error" };
      }

      if (!mous || mous.length === 0) {
        if (application && application.phase === "ACCEPTED") {
          console.log(
            `[MOUService/getLatestMOU] No MOU found for ACCEPTED application ${applicationId}, attempting to generate...`
          );
          const generateResult =
            await this.generateMOUForApplication(applicationId);
          if (generateResult.success) {
            const { data: newMous, error: newMouError } = await supabaseAdmin
              .from("v1_mous")
              .select("*")
              .eq("application_id", applicationId)
              .order("created_at", { ascending: false })
              .limit(1);

            if (!newMouError && newMous && newMous.length > 0) {
              return {
                success: true,
                message: "MOU generated and fetched successfully",
                data: newMous[0],
              };
            } else {
              console.error(
                `[MOUService/getLatestMOU] Failed to fetch newly generated MOU:`,
                newMouError?.message || "Unknown error"
              );
            }
          } else {
            console.error(
              `[MOUService/getLatestMOU] Failed to auto-generate MOU: ${generateResult.message}`,
              generateResult.error || ""
            );
          }
        }

        return {
          success: true,
          message: "No MOU found for this application",
          data: null,
        };
      }

      return {
        success: true,
        message: "MOU fetched successfully",
        data: mous[0],
      };
    } catch (err) {
      console.error("[MOUService/getLatestMOU] Exception:", err);
      return {
        success: false,
        message: "Failed to fetch MOU",
        error: err.message,
      };
    }
  }

  // Accept a MOU (Influencer or Brand owner)
  async acceptMOU(mouId, userId, userRole) {
    try {
      // Get the MOU with application details
      const { data: mou, error: mouError } = await supabaseAdmin
        .from("v1_mous")
        .select(`
          *,
          v1_applications!inner(
            id,
            influencer_id,
            brand_id,
            v1_campaigns!inner(brand_id)
          )
        `)
        .eq("id", mouId)
        .maybeSingle();

      if (mouError) {
        console.error("[MOUService/acceptMOU] MOU fetch error:", mouError);
        return { success: false, message: "Database error" };
      }

      if (!mou) {
        return { success: false, message: "MOU not found" };
      }

      const application = mou.v1_applications;

      if (userRole === "INFLUENCER") {
        if (application.influencer_id !== userId) {
          return {
            success: false,
            message:
              "Only the influencer associated with this MOU can accept it as influencer",
          };
        }
      } else if (userRole === "BRAND_OWNER") {
        if (application.v1_campaigns.brand_id !== userId) {
          return {
            success: false,
            message:
              "Only the brand owner associated with this MOU can accept it as brand",
          };
        }
      } else {
        return {
          success: false,
          message: "Only influencers and brand owners can accept MOUs",
        };
      }

      if (userRole === "INFLUENCER" && mou.accepted_by_influencer) {
        return {
          success: false,
          message: "MOU has already been accepted by the influencer",
        };
      }

      if (userRole === "BRAND_OWNER" && mou.accepted_by_brand) {
        return {
          success: false,
          message: "MOU has already been accepted by the brand",
        };
      }

      if (["CANCELLED", "EXPIRED"].includes(mou.status)) {
        return {
          success: false,
          message: `MOU cannot be accepted. Current status: ${mou.status}`,
        };
      }

      if (
        mou.status === "ACTIVE" &&
        mou.accepted_by_influencer &&
        mou.accepted_by_brand
      ) {
        return {
          success: false,
          message: "MOU has already been fully accepted by both parties",
        };
      }

      const now = new Date().toISOString();
      const updateData = {};

      if (userRole === "INFLUENCER") {
        updateData.accepted_by_influencer = true;
        updateData.influencer_accepted_at = now;
      } else if (userRole === "BRAND_OWNER") {
        updateData.accepted_by_brand = true;
        updateData.brand_accepted_at = now;
      }

      const willBeFullyAccepted =
        (userRole === "INFLUENCER" && mou.accepted_by_brand) ||
        (userRole === "BRAND_OWNER" && mou.accepted_by_influencer);

      if (willBeFullyAccepted) {
        updateData.status = "ACTIVE";
      } else if (mou.status === "DRAFT") {
        updateData.status = "SENT";
      } else if (
        mou.status === "ACTIVE" &&
        !mou.accepted_by_influencer &&
        !mou.accepted_by_brand
      ) {
        updateData.status = "SENT";
      }

      const { data: updatedMOU, error: updateError } = await supabaseAdmin
        .from("v1_mous")
        .update(updateData)
        .eq("id", mouId)
        .select()
        .single();

      if (updateError) {
        console.error("[MOUService/acceptMOU] Update error:", updateError);
        return {
          success: false,
          message: "Failed to accept MOU",
          error: updateError.message,
        };
      }

      const fullyAccepted =
        updatedMOU.accepted_by_influencer && updatedMOU.accepted_by_brand;

      return {
        success: true,
        message: "MOU accepted successfully",
        data: updatedMOU,
        fullyAccepted,
      };
    } catch (err) {
      console.error("[MOUService/acceptMOU] Exception:", err);
      return {
        success: false,
        message: "Failed to accept MOU",
        error: err.message,
      };
    }
  }

  // Generate MOU document for an application
  async generateMOUForApplication(applicationId) {
    try {
      if (!applicationId) {
        return { success: false, message: "applicationId is required" };
      }

      const { data: application, error: appError } = await supabaseAdmin
        .from("v1_applications")
        .select(`
          *,
          v1_campaigns(
            *,
            brand_id
          )
        `)
        .eq("id", applicationId)
        .maybeSingle();

      if (appError) {
        console.error(
          "[MOUService/generateMOUForApplication] Application fetch error:",
          appError
        );
        return {
          success: false,
          message: "Database error",
          error: appError.message,
        };
      }

      if (!application) {
        return { success: false, message: "Application not found" };
      }

      // Check if application is in ACCEPTED phase (warn if not, but still proceed if called from accept flow)
      if (application.phase !== "ACCEPTED") {
        console.warn(
          `[MOUService/generateMOUForApplication] Warning: Application ${applicationId} is not in ACCEPTED phase (current: ${application.phase}). Proceeding with MOU generation anyway.`
        );
      }

      const campaign = application.v1_campaigns;
      if (!campaign) {
        return {
          success: false,
          message: "Campaign not found for this application",
        };
      }

      const { data: influencerUser, error: influencerError } =
        await supabaseAdmin
          .from("v1_users")
          .select("id, name, email, phone_number")
          .eq("id", application.influencer_id)
          .eq("is_deleted", false)
          .maybeSingle();

      if (influencerError) {
        console.error(
          "[MOUService/generateMOUForApplication] Influencer fetch error:",
          influencerError
        );
        console.error(
          "[MOUService/generateMOUForApplication] Influencer ID:",
          application.influencer_id
        );
      }

      if (!influencerUser) {
        console.warn(`[MOUService/generateMOUForApplication] Influencer user not found for ID: ${application.influencer_id}`);
      } else {
        console.log(`[MOUService/generateMOUForApplication] Found influencer: ${influencerUser.name} (${influencerUser.email})`);
      }

      const { data: influencerProfile, error: influencerProfileError } =
        await supabaseAdmin
          .from("v1_influencer_profiles")
          .select("*")
          .eq("user_id", application.influencer_id)
          .eq("is_deleted", false)
          .maybeSingle();

      if (influencerProfileError) {
        console.warn(
          "[MOUService/generateMOUForApplication] Influencer profile fetch error (non-critical):",
          influencerProfileError.message
        );
      }

      const { data: brandUser, error: brandError } = await supabaseAdmin
        .from("v1_users")
        .select("id, name, email, phone_number")
        .eq("id", campaign.brand_id)
        .eq("is_deleted", false)
        .maybeSingle();

      if (brandError) {
        console.error(
          "[MOUService/generateMOUForApplication] Brand fetch error:",
          brandError
        );
        console.error(
          "[MOUService/generateMOUForApplication] Brand ID:",
          campaign.brand_id
        );
      }

      if (!brandUser) {
        console.warn(`[MOUService/generateMOUForApplication] Brand user not found for ID: ${campaign.brand_id}`);
      } else {
        console.log(`[MOUService/generateMOUForApplication] Found brand: ${brandUser.name} (${brandUser.email})`);
      }

      const { data: brandProfile, error: brandProfileError } =
        await supabaseAdmin
          .from("v1_brand_profiles")
          .select("*")
          .eq("user_id", campaign.brand_id)
          .eq("is_deleted", false)
          .maybeSingle();

      if (brandProfileError) {
        console.warn(
          "[MOUService/generateMOUForApplication] Brand profile fetch error (non-critical):",
          brandProfileError.message
        );
      }

      // Get financial details from application
      const budget = application.budget_amount || campaign.budget || 0;
      const platformFeePercentage = application.platform_fee_percentage || campaign.platform_fee_percentage || 0;
      const platformFeeAmount = application.platform_fee_amount || campaign.platform_fee_amount || 0;
      const agreedAmount = application.agreed_amount || campaign.net_amount || 0;
      const requiresScript = campaign.requires_script || false;
      const startDeadline = campaign.start_deadline || null;
      const bufferDays = campaign.buffer_days || 3; // Default to 3 days if not specified

      // Calculate script deadline (if script is required, set it to 3 days before work deadline)
      let scriptDeadline = null;
      let workDeadline = null;
      let bufferDeadline = null;
      
      if (startDeadline) {
        workDeadline = new Date(startDeadline);
        if (requiresScript) {
          scriptDeadline = new Date(workDeadline);
          scriptDeadline.setDate(scriptDeadline.getDate() - 3); // 3 days before work deadline
        }
        // Calculate buffer deadline (work deadline + buffer days)
        bufferDeadline = new Date(workDeadline);
        bufferDeadline.setDate(bufferDeadline.getDate() + bufferDays);
      }

      const formatDate = (date) => {
        if (!date) return "Not specified";
        return new Date(date).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      };

      const formatCurrency = (amount) => {
        return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      const mouContent = this.generateMOUContent({
        influencer: {
          name: influencerUser?.name || "Not specified",
          email: influencerUser?.email || "Not specified",
          phone: influencerUser?.phone_number || "Not specified",
          profile: influencerProfile,
        },
        brand: {
          name: brandUser?.name || "Not specified",
          email: brandUser?.email || "Not specified",
          phone: brandUser?.phone_number || "Not specified",
          brandName:
            brandProfile?.brand_name || brandUser?.name || "Not specified",
          profile: brandProfile,
        },
        campaign: {
          title: campaign.title || "Not specified",
          description: campaign.description || "Not specified",
          bufferDays: bufferDays,
        },
        financials: {
          budget: budget,
          platformFeePercentage: platformFeePercentage,
          platformFeeAmount: platformFeeAmount,
          agreedAmount: agreedAmount,
        },
        requiresScript: requiresScript,
        scriptDeadline: scriptDeadline,
        workDeadline: workDeadline,
        bufferDeadline: bufferDeadline,
        bufferDays: bufferDays,
        formatDate: formatDate,
        formatCurrency: formatCurrency,
      });

      const { data: existingMous, error: existingError } = await supabaseAdmin
        .from("v1_mous")
        .select("template_version")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingError && !existingError.message?.includes("does not exist")) {
        console.error(
          "[MOUService/generateMOUForApplication] Existing MOU check error:",
          existingError
        );
        return {
          success: false,
          message: "Database error",
          error: existingError.message,
        };
      }

      let templateVersion = 1;
      if (existingMous && existingMous.length > 0) {
        const latestVersion = existingMous[0].template_version;
        if (typeof latestVersion === "number") {
          templateVersion = latestVersion + 1;
        } else if (typeof latestVersion === "string") {
          const versionMatch = latestVersion.match(/v?(\d+)/);
          if (versionMatch) {
            templateVersion = parseInt(versionMatch[1], 10) + 1;
          } else {
            templateVersion = 2;
          }
        } else {
          templateVersion = 2;
        }
      }

      const { data: newMOU, error: createError } = await supabaseAdmin
        .from("v1_mous")
        .insert({
          application_id: applicationId,
          template_version: templateVersion,
          content: mouContent,
          status: "SENT",
          accepted_by_influencer: false,
          accepted_by_brand: false,
        })
        .select()
        .single();

      if (createError) {
        console.error(
          "[MOUService/generateMOUForApplication] Create error:",
          createError
        );
        return {
          success: false,
          message: "Failed to create MOU",
          error: createError.message,
        };
      }

      return {
        success: true,
        message: "MOU generated successfully",
        data: newMOU,
      };
    } catch (err) {
      console.error(
        "[MOUService/generateMOUForApplication] Exception:",
        err
      );
      return {
        success: false,
        message: "Failed to generate MOU",
        error: err.message,
      };
    }
  }

  // Generate MOU content text from data
  generateMOUContent(data) {
    const {
      influencer,
      brand,
      campaign,
      financials,
      requiresScript,
      scriptDeadline,
      workDeadline,
      bufferDeadline,
      bufferDays,
      formatDate,
      formatCurrency
    } = data;

    let content = `MEMORANDUM OF UNDERSTANDING\n`;
    content += `================================\n\n`;
    content += `This Memorandum of Understanding (MOU) is entered into between:\n\n`;
    if (brand) {
      content += `PARTY 1 - BRAND OWNER:\n`;
      content += `Name: ${brand.name}\n`;
      content += `Brand Name: ${brand.brandName}\n`;
      content += `Email: ${brand.email}\n`;
      content += `Phone: ${brand.phone}\n\n`;
    }
    if (influencer) {
      content += `PARTY 2 - INFLUENCER:\n`;
      content += `Name: ${influencer.name}\n`;
      content += `Email: ${influencer.email}\n`;
      content += `Phone: ${influencer.phone}\n\n`;
    }

    if (campaign) {
      content += `CAMPAIGN DETAILS:\n`;
      content += `Campaign Title: ${campaign.title}\n`;
      if (campaign.description) {
        content += `Campaign Description: ${campaign.description}\n`;
      }
      content += `\n`;
    }

    // Combined FINANCIAL TERMS with CALCULATION BREAKDOWN
    content += `FINANCIAL TERMS:\n`;
    content += `----------------\n`;
    content += `Total Budget (Paid by Brand): ${formatCurrency(financials.budget)}\n`;
    content += `Platform Fee Percentage: ${financials.platformFeePercentage}%\n`;
    content += `Platform Fee Amount: ${formatCurrency(financials.platformFeeAmount)}\n`;
    content += `Agreed Amount (Net Amount to Influencer): ${formatCurrency(financials.agreedAmount)}\n\n`;
    

    // PROCEDURE section (replaced WORK PROCEDURE)
    content += `PROCEDURE:\n`;
    content += `----------\n`;
    
    if (requiresScript) {
      content += `1. SCRIPT SUBMISSION:\n`;
      content += `   - The Influencer must submit the script within the stipulated deadline.\n`;
      content += `   - Script Deadline: ${formatDate(scriptDeadline)}\n`;
      content += `   - The script is subject to revision, rejection, and acceptance.\n`;
      content += `   - In case of revision, the Influencer needs to submit the revised script.\n\n`;
      
      content += `2. WORK SUBMISSION:\n`;
      content += `   - The Influencer must submit the work within the stipulated deadline.\n`;
      content += `   - Work Deadline: ${formatDate(workDeadline)}\n`;
      content += `   - The work is subject to revision, rejection, and acceptance.\n`;
      content += `   - In case of revision, the Influencer needs to submit the revised work.\n\n`;
    } else {
      content += `1. WORK SUBMISSION:\n`;
      content += `   - The Influencer must submit the work within the stipulated deadline.\n`;
      content += `   - Work Deadline: ${formatDate(workDeadline)}\n`;
      content += `   - The work is subject to revision, rejection, and acceptance.\n`;
      content += `   - In case of revision, the Influencer needs to submit the revised work.\n\n`;
    }

    // Buffer timeline
    if (bufferDeadline) {
      content += `BUFFER TIMELINE:\n`;
      content += `----------------\n`;
      content += `A buffer period of ${bufferDays} days is provided after the work deadline.\n`;
      content += `Buffer Deadline: ${formatDate(bufferDeadline)}\n\n`;
    }

    // Terms and Conditions
    content += `TERMS AND CONDITIONS:\n`;
    content += `---------------------\n`;
    content += `1. Both parties agree to fulfill their obligations as outlined in this MOU.\n`;
    content += `2. The Brand Owner agrees to pay to the platform immediately after the agreement of MOU, and the Influencer agrees to receive the Agreed Amount after successful submission of the work.\n`;
    content += `3. The Influencer agrees to deliver the work as per the campaign requirements and within the specified deadlines.\n`;
    content += `4. In case of dispute and rejection, it is up to the platform authority to resolve the dispute and will give payouts accordingly.\n`;
    content += `5. This MOU is binding upon both parties and their respective successors.\n\n`;

    // Agreement Statement (kept as is)
    content += `AGREEMENT STATEMENT:\n`;
    content += `--------------------\n`;
    content += `Both parties hereby acknowledge that they have read, understood, and agree to all the terms and conditions mentioned in this Memorandum of Understanding. Both parties agree to abide by the financial terms, work procedures, and deadlines as specified above.\n\n`;

    content += `This MOU is effective from the date of acceptance by both parties.\n\n`;

    content += `Generated on: ${formatDate(new Date())}\n`;

    return content;
  }

  // Create a new MOU (Admin only)
  async createMOU(mouData) {
    try {
      const { application_id, content, status = "DRAFT" } = mouData;

      if (!application_id || !content) {
        return {
          success: false,
          message: "application_id and content are required",
        };
      }

      const validStatuses = ["DRAFT", "SENT", "ACTIVE", "CANCELLED", "EXPIRED"];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        };
      }

      const { data: application, error: appError } = await supabaseAdmin
        .from("v1_applications")
        .select("id")
        .eq("id", application_id)
        .maybeSingle();

      if (appError) {
        console.error(
          "[MOUService/createMOU] Application check error:",
          appError
        );
        return { success: false, message: "Database error" };
      }

      if (!application) {
        return { success: false, message: "Application not found" };
      }

      const { data: existingMous, error: existingError } = await supabaseAdmin
        .from("v1_mous")
        .select("template_version")
        .eq("application_id", application_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingError) {
        console.error(
          "[MOUService/createMOU] Existing MOU check error:",
          existingError
        );
        return { success: false, message: "Database error" };
      }

      let templateVersion = 1;
      if (existingMous && existingMous.length > 0) {
        const latestVersion = existingMous[0].template_version;

        if (typeof latestVersion === "number") {
          templateVersion = latestVersion + 1;
        } else if (typeof latestVersion === "string") {
          const versionMatch = latestVersion.match(/v?(\d+)/);
          if (versionMatch) {
            templateVersion = parseInt(versionMatch[1], 10) + 1;
          } else {
            templateVersion = 2;
          }
        } else {
          templateVersion = 2;
        }
      }

      const { data: newMOU, error: createError } = await supabaseAdmin
        .from("v1_mous")
        .insert({
          application_id,
          template_version: templateVersion,
          content,
          status,
          accepted_by_influencer: false,
          accepted_by_brand: false,
        })
        .select()
        .single();

      if (createError) {
        console.error("[MOUService/createMOU] Create error:", createError);
        return {
          success: false,
          message: "Failed to create MOU",
          error: createError.message,
        };
      }

      return {
        success: true,
        message: "MOU created successfully",
        data: newMOU,
      };
    } catch (err) {
      console.error("[MOUService/createMOU] Exception:", err);
      return {
        success: false,
        message: "Failed to create MOU",
        error: err.message,
      };
    }
  }
}

module.exports = new MOUService();

