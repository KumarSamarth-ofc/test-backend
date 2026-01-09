const express = require("express");
const router = express.Router();

const AdminSettingsController = require("../controllers/adminSettingsController");
const authMiddleware = require("../middleware/authMiddleware");

// Get active admin settings (Admin only)
router.get(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  AdminSettingsController.getAdminSettings
);

// Create new admin settings (Admin only)
router.post(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  AdminSettingsController.createAdminSettings
);

module.exports = router;
