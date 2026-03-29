const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processVideoEnhancement, getEnhancementFlow } = require('../controllers/videoEnhancementController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'temp', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ext = path.extname(file.originalname || '.mp4');
    cb(null, `enhance_input_${uniqueSuffix}${ext}`);
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

router.get('/flow', getEnhancementFlow);
router.post('/process', upload.single('video'), processVideoEnhancement);

module.exports = router;
