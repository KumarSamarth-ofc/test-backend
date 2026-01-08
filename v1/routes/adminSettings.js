const express = require("express");
const router = express.Router();
const AdminSettingsController = require("../controllers/adminSettingsController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * Admin Settings Routes
 * All routes require admin authentication
 */

// Get current admin settings (non-expired)
router.get(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  AdminSettingsController.getAdminSettings
);

// Create new admin settings (expires all previous settings)
router.post(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  AdminSettingsController.createAdminSettings
);

module.exports = router;

