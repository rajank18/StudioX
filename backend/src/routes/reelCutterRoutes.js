const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  startReelCutting,
  getReelCutterStatus,
  streamReelCutterProgress,
  downloadReelZip,
} = require('../controllers/reelCutterController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'temp', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.mp4');
    const name = `reel_input_${Date.now()}_${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for video_file input'));
    }
  },
});

router.post('/generate', upload.single('video_file'), startReelCutting);
router.get('/status/:jobId', getReelCutterStatus);
router.get('/progress/:jobId', streamReelCutterProgress);
router.get('/download/:jobId', downloadReelZip);

module.exports = router;
