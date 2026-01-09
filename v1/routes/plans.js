const express = require("express");
const router = express.Router();

const PlanController = require("../controllers/planController");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeEnums } = require("../middleware/enumNormalizer");
const {
  validateCreatePlan,
  validateUpdatePlan,
} = require("../validators/planValidators");

// Get all subscription plans (Brand owner or Admin)
router.get(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(["BRAND_OWNER", "ADMIN"]),
  PlanController.getAllPlans
);

// Create a new subscription plan (Admin only)
router.post(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  normalizeEnums,
  validateCreatePlan,
  PlanController.createPlan
);

// Update an existing plan (Admin only)
router.put(
  "/:id",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  normalizeEnums,
  validateUpdatePlan,
  PlanController.updatePlan
);

module.exports = router;
