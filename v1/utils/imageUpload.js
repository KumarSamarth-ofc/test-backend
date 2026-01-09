const { supabaseAdmin } = require("../db/config");
const multer = require("multer");
const path = require("path");

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Multer upload configuration for regular images (5MB limit)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Multer upload configuration for bulk campaign files (50MB limit)
const uploadBulkCampaignFiles = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Upload image to Supabase Storage
async function uploadImageToStorage(fileBuffer, fileName, folder) {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${folder}/${timestamp}_${Math.random()
      .toString(36)
      .substring(2)}${fileExtension}`;

    // Detect MIME type from file extension
    const mimeType = getMimeType(fileName);

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from("images")
      .upload(uniqueFileName, fileBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return { url: null, error: error.message };
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from("images")
      .getPublicUrl(uniqueFileName);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error("Image upload error:", error);
    return { url: null, error: error.message };
  }
}

// Get MIME type from file extension
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
  };
  return mimeTypes[ext] || "image/jpeg";
}

// Delete image from Supabase Storage
async function deleteImageFromStorage(imageUrl) {
  try {
    if (!imageUrl) {
      return { success: true, error: null };
    }

    // Extract file path from URL
    const urlParts = imageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2];
    const filePath = `${folder}/${fileName}`;

    // Delete from Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from("images")
      .remove([filePath]);

    if (error) {
      console.error("Supabase storage delete error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Image deletion error:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  upload,
  uploadBulkCampaignFiles,
  uploadImageToStorage,
  deleteImageFromStorage,
};
