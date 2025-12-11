const express = require("express");
const router = express.Router();
const authService = require("../utils/auth");
const { upload } = require("../utils/imageUpload");
const {
  CampaignController,
  validateCreateCampaign,
  validateUpdateCampaign,
} = require("../controllers/campaignController");

// All routes require authentication
router.use(authService.authenticateToken);

// Campaign CRUD operations
router.post(
  "/",
  authService.requireRole(["brand_owner", "admin"]),
  upload.single("image"),
  validateCreateCampaign,
  CampaignController.createCampaign
);
const BulkCampaignController = require("../controllers/bulkCampaignController");

router.get("/", (req, res, next) => {
  if (req.query.type === 'BULK') {
    return BulkCampaignController.getBulkCampaigns(req, res);
  }
  return CampaignController.getCampaigns(req, res);
});
router.get("/stats", CampaignController.getCampaignStats);
router.get("/:id", CampaignController.getCampaign);
router.put(
  "/:id",
  authService.requireRole(["brand_owner", "admin"]),
  upload.single("image"),
  validateUpdateCampaign,
  CampaignController.updateCampaign
);
router.delete(
  "/:id",
  authService.requireRole(["brand_owner", "admin"]),
  CampaignController.deleteCampaign
);

// Automated conversation routes
router.post(
  "/automated/initialize",
  authService.requireRole(["brand_owner"]),
  CampaignController.initializeCampaignConversation
);
router.post(
  "/automated/influencer-action",
  authService.requireRole(["influencer"]),
  CampaignController.handleCampaignInfluencerAction
);
router.post(
  "/automated/brand-owner-action",
  authService.requireRole(["brand_owner"]),
  CampaignController.handleCampaignBrandOwnerAction
);
router.post(
  "/:conversation_id/automated/submit-work",
  authService.requireRole(["influencer"]),
  CampaignController.handleWorkSubmission
);
router.post(
  "/:conversation_id/automated/review-work",
  authService.requireRole(["brand_owner"]),
  CampaignController.handleWorkReview
);

// Payment verification route
router.post(
  "/automated/verify-payment",
  CampaignController.verifyAutomatedFlowPayment
);

module.exports = router;
