const { body, query } = require("express-validator");

/**
 * Portfolio Validators
 * Validation rules for portfolio CRUD operations
 */

const validateCreatePortfolio = [
  body("media_type")
    .notEmpty()
    .withMessage("media_type is required")
    .isString()
    .custom((value) => {
      if (!value) return false;
      const normalized = String(value).toUpperCase().trim();
      const validValues = ["IMAGE", "VIDEO"];
      if (!validValues.includes(normalized)) {
        throw new Error("media_type must be IMAGE or VIDEO");
      }
      return true;
    }),
  body("media_url")
    .notEmpty()
    .withMessage("media_url is required")
    .isString()
    .isLength({ min: 1 })
    .withMessage("media_url must be a non-empty string")
    .isURL()
    .withMessage("media_url must be a valid URL"),
  body("thumbnail_url")
    .optional()
    .isString()
    .isURL()
    .withMessage("thumbnail_url must be a valid URL"),
  body("duration_seconds")
    .custom((value, { req }) => {
      const mediaType = req.body.media_type?.toUpperCase().trim();
      
      // Skip validation if media_type is not set (media_type validator will catch it)
      if (!mediaType || !["IMAGE", "VIDEO"].includes(mediaType)) {
        return true;
      }
      
      // If media_type is VIDEO, duration_seconds is required
      if (mediaType === "VIDEO") {
        if (value === null || value === undefined || value === "") {
          throw new Error("duration_seconds is required for VIDEO media_type");
        }
        const duration = parseInt(value);
        if (isNaN(duration) || duration < 0 || duration > 120) {
          throw new Error("duration_seconds must be between 0 and 120 for VIDEO");
        }
      } else if (mediaType === "IMAGE") {
        // If media_type is IMAGE, duration_seconds must be null, undefined, or not provided
        if (value !== null && value !== undefined && value !== "") {
          throw new Error("duration_seconds must be null or omitted for IMAGE media_type");
        }
      }
      return true;
    })
    .optional({ nullable: true }),
  body("description")
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage("description must be at most 5000 characters"),
];

const validateGetPortfolio = [
  query("user_id")
    .optional()
    .isUUID()
    .withMessage("user_id must be a valid UUID"),
  query("media_type")
    .optional()
    .isString()
    .custom((value) => {
      if (!value) return true;
      const normalized = String(value).toUpperCase().trim();
      const validValues = ["IMAGE", "VIDEO"];
      if (!validValues.includes(normalized)) {
        throw new Error("media_type must be IMAGE or VIDEO");
      }
      return true;
    }),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
];

module.exports = {
  validateCreatePortfolio,
  validateGetPortfolio,
};

