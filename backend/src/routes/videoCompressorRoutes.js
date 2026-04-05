const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  analyzeVideoForCompression,
  processVideoCompression,
  getCompressionProgress,
  getCompressionFlow,
} = require('../controllers/videoCompressorController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'temp', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ext = path.extname(file.originalname || '.mp4');
    cb(null, `compress_input_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

router.get('/flow', getCompressionFlow);
router.post('/analyze', upload.single('video'), analyzeVideoForCompression);
router.post('/process', express.json(), processVideoCompression);
router.get('/progress/:jobId', getCompressionProgress);

module.exports = router;
