const express = require("express");
const router = express.Router();
const AdminSettingsController = require("../controllers/adminSettingsController");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  AdminSettingsController.getAdminSettings
);

router.post(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  AdminSettingsController.createAdminSettings
);

module.exports = router;

