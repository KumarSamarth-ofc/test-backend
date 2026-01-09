const { validationResult } = require("express-validator");
const ProfileService = require("../services/profileService");

class ProfileController {
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const userRole = req.user.role;

      let bodyData = req.body;

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

      if (typeof bodyData.languages === "string") {
        try {
          bodyData.languages = JSON.parse(bodyData.languages);
        } catch (e) {
        }
      }
      if (typeof bodyData.categories === "string") {
        try {
          bodyData.categories = JSON.parse(bodyData.categories);
        } catch (e) {
          // Ignore parse errors
        }
      }
      if (typeof bodyData.social_platforms === "string") {
        try {
          bodyData.social_platforms = JSON.parse(bodyData.social_platforms);
        } catch (e) {
          // Ignore parse errors
        }
      }
      if (typeof bodyData.brand_description === "string") {
        try {
          const parsed = JSON.parse(bodyData.brand_description);
          if (typeof parsed === "string") {
            bodyData.brand_description = parsed;
          }
        } catch (e) {
        }
      }

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
