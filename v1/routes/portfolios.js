const express = require("express");
const router = express.Router();
const PortfolioController = require("../controllers/portfolioController");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeEnums } = require("../middleware/enumNormalizer");
const {
  validateCreatePortfolio,
  validateGetPortfolio,
} = require("../validators/portfolioValidators");

// All routes require authentication
router.use(authMiddleware.authenticateToken);

/**
 * Create a new portfolio item (Influencer only)
 * POST /api/v1/portfolios
 */
router.post(
  "/",
  authMiddleware.requireRole(["INFLUENCER"]),
  normalizeEnums,
  validateCreatePortfolio,
  PortfolioController.createPortfolioItem
);

/**
 * Get portfolio items
 * GET /api/v1/portfolios
 * - Influencers: Can see their own portfolio (or filtered by user_id if it's their own)
 * - Brand Owners: Can see all portfolios (can filter by user_id)
 * - Admins: Can see all portfolios (can filter by user_id)
 * Query params: user_id (optional), media_type (optional), page (optional), limit (optional)
 */
router.get(
  "/",
  normalizeEnums,
  validateGetPortfolio,
  PortfolioController.getPortfolioItems
);

module.exports = router;

