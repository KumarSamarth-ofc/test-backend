const express = require("express");
const router = express.Router();
const PlanController = require("../controllers/planController");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeEnums } = require("../middleware/enumNormalizer");
const { validateCreatePlan, validateUpdatePlan } = require("../validators/planValidators");

router.get(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(["BRAND_OWNER", "ADMIN"]),
  PlanController.getAllPlans
);

router.post(
  "/",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  normalizeEnums,
  validateCreatePlan,
  PlanController.createPlan
);

router.put(
  "/:id",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole("ADMIN"),
  normalizeEnums,
  validateUpdatePlan,
  PlanController.updatePlan
);

module.exports = router;

