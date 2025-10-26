const express = require("express");
const router = express.Router();
const commissionSettingsController = require("../controllers/commissionSettingsController");
const authService = require("../utils/auth");

// Apply admin authentication middleware to all routes
router.use(authService.authenticateToken);
router.use(authService.requireRole('admin'));

/**
 * @route GET /api/admin/commission/current
 * @desc Get current active commission rate
 * @access Admin Only
 */
router.get("/current", commissionSettingsController.getCurrentCommission);

/**
 * @route PUT /api/admin/commission/update
 * @desc Update commission percentage (admin only)
 * @access Admin Only
 * @body { commission_percentage: number }
 */
router.put("/update", commissionSettingsController.updateCommission);

/**
 * @route GET /api/admin/commission/history
 * @desc Get commission change history
 * @access Admin Only
 * @query page, limit
 */
router.get("/history", commissionSettingsController.getCommissionHistory);

module.exports = router;
