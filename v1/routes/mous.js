const express = require("express");
const router = express.Router();

const mouController = require("../controllers/mouController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  validateGetLatestMOU,
  validateAcceptMOU,
  validateCreateMOU,
} = require("../validators/mouValidators");

// Get latest MOU for an application (Influencer, Brand owner, or Admin)
router.get(
  "/application/:applicationId",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(["INFLUENCER", "BRAND_OWNER", "ADMIN"]),
  validateGetLatestMOU,
  mouController.getLatestMOU
);

// Accept an MOU (Influencer or Brand owner)
router.post(
  "/:id/accept",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(["INFLUENCER", "BRAND_OWNER"]),
  validateAcceptMOU,
  mouController.acceptMOU
);

// Create a new MOU (Admin only)
router.post(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  validateCreateMOU,
  mouController.createMOU
);

module.exports = router;
