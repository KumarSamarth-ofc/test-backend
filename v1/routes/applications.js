const express = require("express");
const router = express.Router();

const { applicationController } = require("../controllers");
const authMiddleware = require("../middleware/authMiddleware");
const {
  validateApply,
  validateAccept,
  validateBulkAccept,
  validateCancel,
  validateComplete,
} = require("../validators/applicationValidators");

// Apply to a campaign (Influencer only)
router.post(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("INFLUENCER"),
  validateApply,
  applicationController.apply
);

// Accept an application (Brand owner only)
router.post(
  "/:id/accept",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  validateAccept,
  applicationController.accept
);

// Bulk accept applications (Brand owner only)
router.post(
  "/bulk-accept",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("BRAND_OWNER"),
  validateBulkAccept,
  applicationController.bulkAccept
);

// Cancel an application (Influencer or Brand owner)
router.post(
  "/:id/cancel",
  authMiddleware.authenticateToken,
  validateCancel,
  applicationController.cancel
);

// Complete an application (Admin only)
router.post(
  "/:id/complete",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  validateComplete,
  applicationController.complete
);

module.exports = router;
