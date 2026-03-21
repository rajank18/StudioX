const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const { clerkAuth } = require('../middleware/clerkAuth');
const thumbnailController = require('../controllers/thumbnailController');

// Multer configuration for video uploads
const storageBase = process.env.STORAGE_BASE || path.join(os.tmpdir(), 'studiox');
const uploadsDir = process.env.UPLOAD_DIR || path.join(storageBase, 'uploads');
// No explicit folder creation: cloud/storage-managed environment handles this.

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `thumb_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Supported: MP4, AVI, MOV, WEBM, MPEG'));
    }
  },
});

// Routes
router.post('/extract', upload.single('video'), thumbnailController.extractThumbnailFrames);
router.post('/add-text', clerkAuth, thumbnailController.addTextOverlay);
router.get('/frames/:sessionId', clerkAuth, thumbnailController.getSessionFrames);

module.exports = router;
