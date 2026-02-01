const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { convert } = require('../controllers/videoToGifController');

// Ensure upload folder exists
const uploadDir = path.join(__dirname, '..', 'temp', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = (file.originalname || '').split('.').pop();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('video/')) {
    return cb(new Error('Only video files are allowed'), false);
  }
  const allowed = ['mp4', 'webm', 'mov', 'm4v', 'ogg', 'mkv'];
  const ext = (file.originalname || '').split('.').pop().toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error('Unsupported video format'), false);
  }
  cb(null, true);
};

const upload = multer({ storage, limits: { fileSize: MAX_BYTES }, fileFilter });

const router = Router();

// POST /api/video/to-gif
router.post('/', upload.single('video'), convert);

module.exports = router;
