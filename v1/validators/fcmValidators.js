const { body } = require("express-validator");

/**
 * FCM Token Validators
 * Validation rules for FCM token registration
 */

const validateRegisterToken = [
  body("token")
    .notEmpty()
    .withMessage("FCM token is required")
    .isString()
    .withMessage("FCM token must be a string")
    .trim()
    .isLength({ min: 1 })
    .withMessage("FCM token cannot be empty"),

  body("device_type")
    .optional()
    .isString()
    .withMessage("device_type must be a string")
    .custom((value) => {
      if (!value) return true;
      const normalized = String(value).toLowerCase().trim();
      const validValues = ["android", "ios", "web", "unknown"];
      if (!validValues.includes(normalized)) {
        throw new Error("device_type must be one of: android, ios, web, unknown");
      }
      return true;
    }),

  body("device_id")
    .optional()
    .isString()
    .withMessage("device_id must be a string")
    .trim(),
];

const validateUnregisterToken = [
  body("token")
    .notEmpty()
    .withMessage("FCM token is required")
    .isString()
    .withMessage("FCM token must be a string")
    .trim(),
];

module.exports = {
  validateRegisterToken,
  validateUnregisterToken,
};

