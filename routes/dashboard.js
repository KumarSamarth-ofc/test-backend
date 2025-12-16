const express = require("express");
const router = express.Router();
const authService = require("../utils/auth");
const BulkCampaignController = require("../controllers/bulkCampaignController");

// All dashboard routes require authentication
router.use(authService.authenticateToken);

router.get("/stats", BulkCampaignController.getDashboardStats);

module.exports = router;
