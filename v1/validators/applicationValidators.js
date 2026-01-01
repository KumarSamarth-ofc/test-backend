const { body, param } = require('express-validator');

/**
 * Application Validators
 * Validation rules for application operations
 */

const validateApply = [
  body('campaignId')
    .notEmpty()
    .withMessage('campaignId is required')
    .isUUID()
    .withMessage('campaignId must be a valid UUID'),
];

const validateAccept = [
  param('id')
    .notEmpty()
    .withMessage('Application ID is required')
    .isUUID()
    .withMessage('Application ID must be a valid UUID'),
  body('agreedAmount')
    .notEmpty()
    .withMessage('agreedAmount is required')
    .isFloat({ min: 0 })
    .withMessage('agreedAmount must be a non-negative number'),
  body('platformFeePercent')
    .notEmpty()
    .withMessage('platformFeePercent is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('platformFeePercent must be between 0 and 100'),
  body('requiresScript')
    .optional()
    .isBoolean()
    .withMessage('requiresScript must be a boolean'),
];

const validateCancel = [
  param('id')
    .notEmpty()
    .withMessage('Application ID is required')
    .isUUID()
    .withMessage('Application ID must be a valid UUID'),
];

const validateComplete = [
  param('id')
    .notEmpty()
    .withMessage('Application ID is required')
    .isUUID()
    .withMessage('Application ID must be a valid UUID'),
];

module.exports = {
  validateApply,
  validateAccept,
  validateCancel,
  validateComplete,
};