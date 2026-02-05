const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processCustom, processPreset, getPresets } = require('../controllers/noiseReductionController');

const router = express.Router();

// Setup multer for video upload
const uploadDir = path.join(__dirname, '..', 'temp', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `input_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Get available presets
router.get('/presets', getPresets);

// Process with custom settings
router.post('/custom', upload.single('video'), processCustom);

// Process with preset
router.post('/preset', upload.single('video'), processPreset);

module.exports = router;
