const { validationResult } = require('express-validator');
const { ApplicationService } = require('../services');

class ApplicationController {
  async apply(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const app = await ApplicationService.apply({
        campaignId: req.body.campaignId,
        influencerId: req.user.id,
      });

      res.status(201).json(app);
    } catch (err) {
      res.status(400).json({
        message: err.message || 'Failed to apply to campaign',
      });
    }
  }

  async accept(req, res) {
    try {
      const app = await ApplicationService.accept({
        applicationId: req.params.id,
        brandId: req.user.id,
        agreedAmount: req.body.agreedAmount,
        platformFeePercent: req.body.platformFeePercent,
        requiresScript: req.body.requiresScript,
      });

      res.json(app);
    } catch (err) {
      res.status(400).json({
        message: err.message || 'Failed to accept application',
      });
    }
  }

  async cancel(req, res) {
    try {
      const app = await ApplicationService.cancel({
        applicationId: req.params.id,
        user: req.user,
      });

      res.json(app);
    } catch (err) {
      res.status(400).json({
        message: err.message || 'Failed to cancel application',
      });
    }
  }

  async complete(req, res) {
    try {
      const app = await ApplicationService.complete(req.params.id);
      res.json(app);
    } catch (err) {
      res.status(400).json({
        message: err.message || 'Failed to complete application',
      });
    }
  }
}

module.exports = new ApplicationController();