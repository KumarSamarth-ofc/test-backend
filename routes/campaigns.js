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
router.get("/", CampaignController.getCampaigns);
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
  "/initialize-conversation",
  authService.requireRole(["brand_owner"]),
  CampaignController.initializeCampaignConversation
);
router.post(
  "/handle-influencer-action",
  authService.requireRole(["influencer"]),
  CampaignController.handleCampaignInfluencerAction
);
router.post(
  "/handle-brand-owner-action",
  authService.requireRole(["brand_owner"]),
  CampaignController.handleCampaignBrandOwnerAction
);
router.post(
  "/:conversation_id/submit-work",
  authService.requireRole(["influencer"]),
  CampaignController.handleWorkSubmission
);
router.post(
  "/:conversation_id/review-work",
  authService.requireRole(["brand_owner"]),
  CampaignController.handleWorkReview
);

// Payment verification route
router.post(
  "/verify-payment",
  authService.requireRole(["brand_owner", "influencer"]),
  CampaignController.verifyCampaignPayment
);

module.exports = router;
