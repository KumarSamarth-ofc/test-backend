const { validationResult } = require("express-validator");
const ProfileService = require("../services/profileService");

class ProfileController {
  // Parse JSON string if needed
  parseJsonField(field, defaultValue = null) {
    if (typeof field === "string") {
      try {
        const parsed = JSON.parse(field);
        return typeof parsed === "string" ? parsed : parsed;
      } catch (e) {
        return defaultValue !== null ? defaultValue : field;
      }
    }
    return field;
  }

  // Update user profile (influencer or brand owner)
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const userRole = req.user.role;
      let bodyData = req.body;

      // Handle file uploads
      if (req.files) {
        if (req.files.profileImage && req.files.profileImage[0]) {
          bodyData.profile_image_file = req.files.profileImage[0];
        }
        if (req.files.brandLogo && req.files.brandLogo[0]) {
          bodyData.brand_logo_file = req.files.brandLogo[0];
        }
      }
      if (req.file && !bodyData.brand_logo_file && !bodyData.profile_image_file) {
        bodyData.brand_logo_file = req.file;
      }

      // Parse JSON fields if they are strings
      bodyData.languages = this.parseJsonField(bodyData.languages, bodyData.languages);
      bodyData.categories = this.parseJsonField(bodyData.categories, bodyData.categories);
      bodyData.social_platforms = this.parseJsonField(
        bodyData.social_platforms,
        bodyData.social_platforms
      );
      bodyData.brand_description = this.parseJsonField(
        bodyData.brand_description,
        bodyData.brand_description
      );

      // Update profile based on user role
      let result;
      if (userRole === "INFLUENCER") {
        result = await ProfileService.updateInfluencerProfile(userId, bodyData);
      } else if (userRole === "BRAND_OWNER") {
        result = await ProfileService.updateBrandProfile(userId, bodyData);
      } else {
        return res.status(400).json({
          success: false,
          message: "Profile update not supported for this role",
        });
      }

      if (result.success) {
        return res.json(result);
      }

      return res.status(400).json({
        success: false,
        message: result.message,
      });
    } catch (err) {
      console.error("[v1/updateProfile] error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = {
  ProfileController: new ProfileController(),
};
