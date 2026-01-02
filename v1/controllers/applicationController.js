const { validationResult } = require('express-validator');
const { ApplicationService } = require('../services');

class ApplicationController {
  async apply(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Format campaignId to UUID format (trim and lowercase)
      const campaignId = req.body.campaignId?.trim().toLowerCase();

      const app = await ApplicationService.apply({
        campaignId: campaignId,
        influencerId: req.user.id,
      });

      res.status(201).json(app);
    } catch (err) {
      res.status(400).json({
        message: err.message || 'Failed to apply to campaign',
      });
    }
  }

  async accept(req, res) {
    try {
      const app = await ApplicationService.accept({
        applicationId: req.params.id,
        brandId: req.user.id,
        agreedAmount: req.body.agreedAmount,
        platformFeePercent: req.body.platformFeePercent,
        // requiresScript: req.body.requiresScript,
      });

      res.json(app);
    } catch (err) {
      res.status(400).json({
        message: err.message || 'Failed to accept application',
      });
    }
  }

  async cancel(req, res) {
    try {
      const app = await ApplicationService.cancel({
        applicationId: req.params.id,
        user: req.user,
      });

      res.json(app);
    } catch (err) {
      res.status(400).json({
        message: err.message || 'Failed to cancel application',
      });
    }
  }

  async complete(req, res) {
    try {
      const app = await ApplicationService.complete(req.params.id);
      res.json(app);
    } catch (err) {
      res.status(400).json({
        message: err.message || 'Failed to complete application',
      });
    }
  }

    async uploadCampaignImage(req, res) {
      try {
        // Handle multer errors
        if (req.file === undefined && req.body) {
          if (req.body.error) {
            return res.status(400).json({
              success: false,
              message: req.body.error,
            });
          }
        }
  
        // Check for multer file size error
        if (req.file === undefined) {
          return res.status(400).json({
            success: false,
            message: "No image file provided or file too large (max 5MB)",
          });
        }
  
        const userId = req.user.id;
        const userRole = req.user.role;
        const campaignId = req.params.id;
  
        // Only brand owners can upload campaign images
        if (userRole !== "BRAND") {
          return res.status(403).json({
            success: false,
            message: "Only brand owners can upload campaign images",
          });
        }
  
        const brandId = userId;
  
        const result = await CampaignService.uploadCampaignImage(
          campaignId,
          brandId,
          req.file.buffer,
          req.file.originalname
        );
  
        if (result.success) {
          return res.json({
            success: true,
            campaign: { id: campaignId },
            campaign_image_url: result.campaign_image_url,
            message: result.message,
          });
        }
  
        const status = result.message?.includes("Unauthorized") ? 403 : 400;
        return res.status(status).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      } catch (err) {
        console.error("[v1/uploadCampaignImage] error:", err);
  
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File too large. Maximum size is 5MB",
          });
        }
  
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
}

module.exports = new ApplicationController();