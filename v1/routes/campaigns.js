const express = require("express");
const router = express.Router();

const CampaignController = require("../controllers/campaignController");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeEnums } = require("../middleware/enumNormalizer");
const {
  validateCreateCampaign,
  validateUpdateCampaign,
  validateCampaignFilters,
} = require("../validators/campaignValidators");
const { upload } = require("../utils/imageUpload");

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticateToken);

// File upload error handler helper
const handleUploadError = (req, res, next) => {
  upload.single("coverImage")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "File upload error",
      });
    }
    next();
  });
};

// Create a new campaign (Brand owner only)
router.post(
  "/",
  authMiddleware.requireRole(["BRAND_OWNER"]),
  normalizeEnums,
  handleUploadError,
  validateCreateCampaign,
  CampaignController.createCampaign
);

// Get all campaigns with filters
router.get(
  "/",
  normalizeEnums,
  validateCampaignFilters,
  CampaignController.getCampaigns
);

// Get campaigns for authenticated brand owner
router.get(
  "/my",
  authMiddleware.requireRole(["BRAND_OWNER"]),
  normalizeEnums,
  validateCampaignFilters,
  CampaignController.getMyCampaigns
);

// Get a single campaign by ID
router.get("/:id", CampaignController.getCampaign);

// Update a campaign (Brand owner only)
router.put(
  "/:id",
  authMiddleware.requireRole(["BRAND_OWNER"]),
  normalizeEnums,
  handleUploadError,
  validateUpdateCampaign,
  CampaignController.updateCampaign
);

// Delete a campaign (Brand owner only)
router.delete(
  "/:id",
  authMiddleware.requireRole(["BRAND_OWNER"]),
  CampaignController.deleteCampaign
);

module.exports = router;
