const { validationResult } = require("express-validator");
const PlanService = require("../services/planService");

class PlanController {
  async createPlan(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const result = await PlanService.createPlan(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || "Failed to create plan",
          error: result.error,
        });
      }

      return res.status(201).json({
        success: true,
        message: result.message || "Plan created successfully",
        plan: result.plan,
      });
    } catch (err) {
      console.error("[v1/PlanController/createPlan] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  }

  async getAllPlans(req, res) {
    try {
      const result = await PlanService.getAllPlans();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message || "Failed to fetch plans",
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message || "Plans fetched successfully",
        plans: result.plans,
      });
    } catch (err) {
      console.error("[v1/PlanController/getAllPlans] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  }

  async updatePlan(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const planId = req.params.id;
      const result = await PlanService.updatePlan(planId, req.body);

      if (!result.success) {
        const statusCode = result.message === "Plan not found" ? 404 : 400;
        return res.status(statusCode).json({
          success: false,
          message: result.message || "Failed to update plan",
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message || "Plan updated successfully",
        plan: result.plan,
      });
    } catch (err) {
      console.error("[v1/PlanController/updatePlan] Exception:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  }
}

module.exports = new PlanController();

