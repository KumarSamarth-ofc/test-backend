const { body, param } = require('express-validator');

const validateGetLatestMOU = [
  param('applicationId')
    .notEmpty()
    .withMessage('Application ID is required')
    .isUUID()
    .withMessage('Application ID must be a valid UUID'),
];

const validateAcceptMOU = [
  param('id')
    .notEmpty()
    .withMessage('MOU ID is required')
    .isUUID()
    .withMessage('MOU ID must be a valid UUID'),
];

const validateCreateMOU = [
  body('application_id')
    .notEmpty()
    .withMessage('application_id is required')
    .isUUID()
    .withMessage('application_id must be a valid UUID'),
  body('content')
    .notEmpty()
    .withMessage('content is required')
    .isString()
    .withMessage('content must be a string')
    .trim()
    .isLength({ min: 1 })
    .withMessage('content cannot be empty'),
  body('status')
    .optional()
    .isIn(['DRAFT', 'SENT', 'ACTIVE', 'CANCELLED', 'EXPIRED'])
    .withMessage('status must be one of: DRAFT, SENT, ACTIVE, CANCELLED, EXPIRED'),
];

module.exports = {
  validateGetLatestMOU,
  validateAcceptMOU,
  validateCreateMOU,
};

