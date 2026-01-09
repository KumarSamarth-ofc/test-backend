const express = require("express");
const router = express.Router();

const submissionController = require("../controllers/submissionController");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeEnums } = require("../middleware/enumNormalizer");
const {
  validateSubmitScript,
  validateSubmitWork,
  validateReviewScript,
  validateReviewWork,
  validateGetScripts,
  validateGetWorkSubmissions,
} = require("../validators/submissionValidators");

// Submit script for an application (Influencer only)
router.post(
  "/scripts",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("INFLUENCER"),
  normalizeEnums,
  submissionController.upload,
  validateSubmitScript,
  submissionController.submitScript
);

// Submit work for an application (Influencer only)
router.post(
  "/work",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("INFLUENCER"),
  normalizeEnums,
  submissionController.upload,
  validateSubmitWork,
  submissionController.submitWork
);

// Get script submissions for an application
router.get(
  "/applications/:applicationId/scripts",
  authMiddleware.authenticateToken,
  validateGetScripts,
  submissionController.getScripts
);

// Get work submissions for an application
router.get(
  "/applications/:applicationId/work",
  authMiddleware.authenticateToken,
  validateGetWorkSubmissions,
  submissionController.getWorkSubmissions
);

// Review script submission (Brand owner only)
router.post(
  "/scripts/:id/review",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  normalizeEnums,
  validateReviewScript,
  submissionController.reviewScript
);

// Review work submission (Brand owner only)
router.post(
  "/work/:id/review",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  normalizeEnums,
  validateReviewWork,
  submissionController.reviewWork
);

module.exports = router;
