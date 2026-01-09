const { body, param } = require("express-validator");

// Valid submission statuses
const SUBMISSION_STATUSES = ["ACCEPTED", "REVISION", "REJECTED"];

// Helper function to validate submission status
const validateSubmissionStatus = (value) => {
  const normalized = String(value).toUpperCase().trim();
  if (!SUBMISSION_STATUSES.includes(normalized)) {
    throw new Error("status must be ACCEPTED, REVISION, or REJECTED");
  }
  return true;
};

// Validate submit script
const validateSubmitScript = [
  body("applicationId")
    .notEmpty()
    .withMessage("applicationId is required")
    .isUUID()
    .withMessage("applicationId must be a valid UUID"),
  body("fileUrl")
    .optional()
    .isURL()
    .withMessage("fileUrl must be a valid URL"),
];

// Validate submit work
const validateSubmitWork = [
  body("applicationId")
    .notEmpty()
    .withMessage("applicationId is required")
    .isUUID()
    .withMessage("applicationId must be a valid UUID"),
  body("fileUrl")
    .optional()
    .isURL()
    .withMessage("fileUrl must be a valid URL"),
];

// Validate review script
const validateReviewScript = [
  param("id")
    .notEmpty()
    .withMessage("Script ID is required")
    .isUUID()
    .withMessage("Script ID must be a valid UUID"),
  body("status")
    .notEmpty()
    .withMessage("status is required")
    .isString()
    .custom(validateSubmissionStatus),
  body("rejectionReasonId")
    .optional()
    .isUUID()
    .withMessage("rejectionReasonId must be a valid UUID"),
  body("remarks")
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage("remarks must be up to 5000 characters"),
];

// Validate review work
const validateReviewWork = [
  param("id")
    .notEmpty()
    .withMessage("Work submission ID is required")
    .isUUID()
    .withMessage("Work submission ID must be a valid UUID"),
  body("status")
    .notEmpty()
    .withMessage("status is required")
    .isString()
    .custom(validateSubmissionStatus),
  body("rejectionReasonId")
    .optional()
    .isUUID()
    .withMessage("rejectionReasonId must be a valid UUID"),
  body("remarks")
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage("remarks must be up to 5000 characters"),
];

// Validate get scripts
const validateGetScripts = [
  param("applicationId")
    .notEmpty()
    .withMessage("applicationId is required")
    .isUUID()
    .withMessage("applicationId must be a valid UUID"),
];

// Validate get work submissions
const validateGetWorkSubmissions = [
  param("applicationId")
    .notEmpty()
    .withMessage("applicationId is required")
    .isUUID()
    .withMessage("applicationId must be a valid UUID"),
];

module.exports = {
  validateSubmitScript,
  validateSubmitWork,
  validateReviewScript,
  validateReviewWork,
  validateGetScripts,
  validateGetWorkSubmissions,
};
