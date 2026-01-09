const { body, param } = require("express-validator");

// Validate apply to campaign
const validateApply = [
  body("campaignId")
    .notEmpty()
    .withMessage("campaignId is required")
    .isUUID()
    .withMessage("campaignId must be a valid UUID"),
];

// Validate accept application
const validateAccept = [
  param("id")
    .notEmpty()
    .withMessage("Application ID is required")
    .isUUID()
    .withMessage("Application ID must be a valid UUID"),
];

// Validate bulk accept applications
const validateBulkAccept = [
  body("campaignId")
    .notEmpty()
    .withMessage("campaignId is required")
    .isUUID()
    .withMessage("campaignId must be a valid UUID"),
  body("applications")
    .isArray({ min: 1 })
    .withMessage("applications must be a non-empty array"),
  body("applications.*.applicationId")
    .notEmpty()
    .withMessage("applicationId is required for each application")
    .isUUID()
    .withMessage("applicationId must be a valid UUID for each application"),
];

// Validate cancel application
const validateCancel = [
  param("id")
    .notEmpty()
    .withMessage("Application ID is required")
    .isUUID()
    .withMessage("Application ID must be a valid UUID"),
];

// Validate complete application
const validateComplete = [
  param("id")
    .notEmpty()
    .withMessage("Application ID is required")
    .isUUID()
    .withMessage("Application ID must be a valid UUID"),
];

module.exports = {
  validateApply,
  validateAccept,
  validateBulkAccept,
  validateCancel,
  validateComplete,
};
