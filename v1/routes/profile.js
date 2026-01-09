const express = require("express");
const router = express.Router();
const { ProfileController } = require("../controllers/profileController");
const { validateCompleteProfile } = require("../validators");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeEnums } = require("../middleware/enumNormalizer");
const { upload } = require("../../utils/imageUpload");

router.put(
  "/update",
  authMiddleware.authenticateToken,
  normalizeEnums,
  (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      upload.fields([
        { name: "profileImage", maxCount: 1 },
        { name: "brandLogo", maxCount: 1 }
      ])(req, res, (err) => {
        if (err) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              message: "File too large. Maximum size is 5MB",
            });
          }
          return res.status(400).json({
            success: false,
            message: err.message || "File upload error",
          });
        }
        next();
      });
    } else {
      next();
    }
  },
  validateCompleteProfile,
  ProfileController.updateProfile
);

module.exports = router;
