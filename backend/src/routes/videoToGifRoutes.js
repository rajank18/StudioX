const { Router } = require('express');
const path = require('path');
const os = require('os');
const multer = require('multer');
const { convert } = require('../controllers/videoToGifController');

const storageBase = process.env.STORAGE_BASE || path.join(os.tmpdir(), 'studiox');
const uploadDir = process.env.UPLOAD_DIR || path.join(storageBase, 'uploads');
// No explicit local directory creation to support managed cloud filesystems.

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
