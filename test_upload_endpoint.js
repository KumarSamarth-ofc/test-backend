// Simple test endpoint for debugging image uploads
const express = require('express');
const multer = require('multer');
const { uploadImageToStorage } = require('./utils/imageUpload');

const app = express();
const port = 3001;

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Test endpoint for image upload
app.post('/test-upload', upload.single('image'), async (req, res) => {
    try {
        console.log('Test upload request received');
        console.log('File:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'No file');

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        // Test upload
        const { url, error } = await uploadImageToStorage(
            req.file.buffer,
            req.file.originalname,
            'test'
        );

        if (error) {
            console.error('Upload failed:', error);
            return res.status(500).json({
                success: false,
                message: 'Upload failed',
                error: error
            });
        }

        console.log('Upload successful:', url);
        res.json({
            success: true,
            message: 'Upload successful',
            url: url
        });

    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`Test server running on http://localhost:${port}`);
    console.log('Test upload endpoint: POST /test-upload');
    console.log('Health check: GET /health');
});

