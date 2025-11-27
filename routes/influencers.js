const express = require("express");
const router = express.Router();
const influencerController = require("../controllers/influencerController");
const { authenticateToken } = require("../utils/auth");

/**
 * @route   POST /api/influencers/search
 * @desc    Search/discover influencers with filtering
 * @access  Private (Brand owners)
 */
router.post("/search", authenticateToken, influencerController.searchInfluencers);

/**
 * @route   POST /api/influencers/ai-search
 * @desc    AI-based influencer search using Gemini
 * @access  Private (Brand owners)
 */
router.post("/ai-search", authenticateToken, influencerController.aiSearchInfluencers);

module.exports = router;
