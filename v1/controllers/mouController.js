const { validationResult } = require('express-validator');
const MOUService = require('../services/mouService');

/**
 * MOU Controller
 * Handles HTTP requests for MOU-related endpoints
 */
class MOUController {
  /**
   * Get latest MOU by application ID
   * GET /api/v1/mous/application/:applicationId
   */
  async getLatestMOU(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { applicationId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await MOUService.getLatestMOU(applicationId, userId, userRole);

      if (!result.success) {
        const statusCode = result.message.includes('not found') ? 404 : 
                          result.message.includes('access') ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (err) {
      console.error('[MOUController/getLatestMOU] Exception:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
      });
    }
  }

  /**
   * Accept MOU
   * POST /api/v1/mous/:id/accept
   */
  async acceptMOU(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await MOUService.acceptMOU(id, userId, userRole);

      if (!result.success) {
        const statusCode = result.message.includes('not found') ? 404 :
                          result.message.includes('authorized') || result.message.includes('Only') ? 403 :
                          result.message.includes('already been accepted') || result.message.includes('cannot be accepted') ? 400 : 400;
        return res.status(statusCode).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        fullyAccepted: result.fullyAccepted
      });
    } catch (err) {
      console.error('[MOUController/acceptMOU] Exception:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
      });
    }
  }

  /**
   * Create MOU (Admin only)
   * POST /api/v1/mous
   */
  async createMOU(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const result = await MOUService.createMOU(req.body);

      if (!result.success) {
        const statusCode = result.message.includes('not found') ? 404 :
                          result.message.includes('required') || result.message.includes('Invalid') ? 400 : 400;
        return res.status(statusCode).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }

      return res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (err) {
      console.error('[MOUController/createMOU] Exception:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
      });
    }
  }
}

// Create instance and bind methods to preserve 'this' context
const mouController = new MOUController();
mouController.getLatestMOU = mouController.getLatestMOU.bind(mouController);
mouController.acceptMOU = mouController.acceptMOU.bind(mouController);
mouController.createMOU = mouController.createMOU.bind(mouController);

module.exports = mouController;

