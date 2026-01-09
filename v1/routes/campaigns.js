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

router.use(authMiddleware.authenticateToken);

router.post(
  "/",
  authMiddleware.requireRole(["BRAND_OWNER"]),
  normalizeEnums,
  (req, res, next) => {
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
  },
  validateCreateCampaign,
  CampaignController.createCampaign
);

router.get(
  "/",
  normalizeEnums,
  validateCampaignFilters,
  CampaignController.getCampaigns
);

router.get(
  "/my",
  authMiddleware.requireRole(["BRAND_OWNER"]),
  normalizeEnums,
  validateCampaignFilters,
  CampaignController.getMyCampaigns
);

router.get("/:id", CampaignController.getCampaign);

router.put(
  "/:id",
  authMiddleware.requireRole(["BRAND_OWNER"]),
  normalizeEnums,
  (req, res, next) => {
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
  },
  validateUpdateCampaign,
  CampaignController.updateCampaign
);

router.delete(
  "/:id",
  authMiddleware.requireRole(["BRAND_OWNER"]),
  CampaignController.deleteCampaign
);

module.exports = router;