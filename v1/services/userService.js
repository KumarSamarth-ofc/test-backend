const { supabaseAdmin } = require("../db/config");

class UserService {
  async getUser(userId) {
    try {
      const { data: user, error: userError } = await supabaseAdmin
        .from("v1_users")
        .select("*")
        .eq("id", userId)
        .eq("is_deleted", false)
        .single();

      if (userError || !user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      if (user.role === "BRAND_OWNER") {
        return await this.getBrandUserData(user);
      } else if (user.role === "INFLUENCER") {
        return await this.getInfluencerUserData(user);
      } else {
        return {
          success: true,
          user: user,
        };
      }
    } catch (err) {
      console.error("[v1/UserService/getUser] Exception:", err);
      return {
        success: false,
        message: "Failed to fetch user data",
        error: err.message,
      };
    }
  }

  async getBrandUserData(user) {
    try {
      const { data: brandProfile, error: brandProfileError } =
        await supabaseAdmin
          .from("v1_brand_profiles")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_deleted", false)
          .maybeSingle();

      if (brandProfileError) {
        console.error(
          "[v1/UserService/getBrandUserData] Brand profile error:",
          brandProfileError
        );
      }

      const { data: campaigns, error: campaignsError } = await supabaseAdmin
        .from("v1_campaigns")
        .select(`
          *,
          v1_applications(
            *
          )
        `)
        .eq("brand_id", user.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (campaignsError) {
        console.error(
          "[v1/UserService/getBrandUserData] Campaigns error:",
          campaignsError
        );
      }

      const campaignsWithApplications = (campaigns || []).map(campaign => {
        const { v1_applications, ...campaignData } = campaign;
        return {
          ...campaignData,
          applications: v1_applications || []
        };
      });

      return {
        success: true,
        user: user,
        brand_id: user.id,
        brand_profile: brandProfile || null,
        campaigns: campaignsWithApplications,
      };
    } catch (err) {
      console.error(
        "[v1/UserService/getBrandUserData] Exception:",
        err
      );
      return {
        success: false,
        message: "Failed to fetch brand user data",
        error: err.message,
      };
    }
  }

  async getInfluencerUserData(user) {
    try {
      const { data: influencerProfile, error: influencerProfileError } =
        await supabaseAdmin
          .from("v1_influencer_profiles")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_deleted", false)
          .maybeSingle();

      if (influencerProfileError) {
        console.error(
          "[v1/UserService/getInfluencerUserData] Influencer profile error:",
          influencerProfileError
        );
      }

      const { data: socialAccounts, error: socialAccountsError } =
        await supabaseAdmin
          .from("v1_influencer_social_accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });

      if (socialAccountsError) {
        console.error(
          "[v1/UserService/getInfluencerUserData] Social accounts error:",
          socialAccountsError
        );
      }

      const { data: applications, error: applicationsError } =
        await supabaseAdmin
          .from("v1_applications")
          .select(`
            *,
            v1_campaigns(
              *
            )
          `)
          .eq("influencer_id", user.id)
          .order("created_at", { ascending: false });

      if (applicationsError) {
        console.error(
          "[v1/UserService/getInfluencerUserData] Applications error:",
          applicationsError
        );
      }

      const applicationsWithCampaigns = (applications || []).map(application => {
        const { v1_campaigns, ...applicationData } = application;
        return {
          ...applicationData,
          campaign: v1_campaigns || null
        };
      });

      return {
        success: true,
        user: user,
        influencer_profile: influencerProfile || null,
        social_accounts: socialAccounts || [],
        applications: applicationsWithCampaigns,
      };
    } catch (err) {
      console.error(
        "[v1/UserService/getInfluencerUserData] Exception:",
        err
      );
      return {
        success: false,
        message: "Failed to fetch influencer user data",
        error: err.message,
      };
    }
  }

  async getAllInfluencers() {
    try {
      const { data: influencers, error: influencersError } = await supabaseAdmin
        .from("v1_users")
        .select("*")
        .eq("role", "INFLUENCER")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (influencersError) {
        console.error(
          "[v1/UserService/getAllInfluencers] Database error:",
          influencersError
        );
        return {
          success: false,
          message: "Failed to fetch influencers",
          error: influencersError.message,
        };
      }

      const userIds = (influencers || []).map((inf) => inf.id);
      let influencerProfiles = [];
      let profilesError = null;
      let socialAccountsMap = {};
      let socialAccountsError = null;

      if (userIds.length > 0) {
        const profilesResult = await supabaseAdmin
          .from("v1_influencer_profiles")
          .select("*")
          .in("user_id", userIds)
          .eq("is_deleted", false);
        
        influencerProfiles = profilesResult.data || [];
        profilesError = profilesResult.error;

        const socialAccountsResult = await supabaseAdmin
          .from("v1_influencer_social_accounts")
          .select("*")
          .in("user_id", userIds)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });

        if (socialAccountsResult.error) {
          socialAccountsError = socialAccountsResult.error;
          console.error(
            "[v1/UserService/getAllInfluencers] Social accounts error:",
            socialAccountsError
          );
        } else if (socialAccountsResult.data) {
          socialAccountsResult.data.forEach((account) => {
            if (!socialAccountsMap[account.user_id]) {
              socialAccountsMap[account.user_id] = [];
            }
            socialAccountsMap[account.user_id].push(account);
          });
        }
      }

      if (profilesError) {
        console.error(
          "[v1/UserService/getAllInfluencers] Profiles error:",
          profilesError
        );
      }

      const profileMap = {};
      (influencerProfiles || []).forEach((profile) => {
        profileMap[profile.user_id] = profile;
      });

      const influencersWithProfiles = (influencers || []).map((influencer) => {
        const profile = profileMap[influencer.id] || null;
        
        const { password_hash, password_reset_token, password_reset_token_expires_at, is_deleted, ...userDetails } = influencer;
        
        return {
          ...userDetails,
          profile: profile || null,
          portfolio: profile?.portfolio || profile?.portfolio_links || null,
          social_accounts: socialAccountsMap[influencer.id] || [],
          categories: profile?.categories || [],
        };
      });

      return {
        success: true,
        influencers: influencersWithProfiles,
        total: influencersWithProfiles.length,
      };
    } catch (err) {
      console.error(
        "[v1/UserService/getAllInfluencers] Exception:",
        err
      );
      return {
        success: false,
        message: "Failed to fetch influencers",
        error: err.message,
      };
    }
  }
}

module.exports = new UserService();

