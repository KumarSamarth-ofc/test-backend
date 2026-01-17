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

const validateTestNotification = [
  body("title")
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage("Title must be a string with max 100 characters"),

  body("body")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Body must be a string with max 500 characters"),

  body("data")
    .optional()
    .isObject()
    .withMessage("Data must be an object"),

  body("clickAction")
    .optional()
    .isString()
    .withMessage("clickAction must be a string"),

  body("badge")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Badge must be a non-negative integer"),
];

module.exports = {
  validateRegisterToken,
  validateUnregisterToken,
  validateTestNotification,
};

