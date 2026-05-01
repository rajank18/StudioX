const { Router } = require('express');
const path = require('path');
const os = require('os');
const multer = require('multer');
const { clerkAuth, ensureUserExists } = require('../middleware/clerkAuth');
const aiSubtitleController = require('../controllers/aiSubtitleController');
const { aiInfoRateLimit, aiGenerateRateLimit } = require('../middleware/usageGuard');

const router = Router();

const storageBase = process.env.STORAGE_BASE || path.join(os.tmpdir(), 'studiox');
const uploadsDir = process.env.UPLOAD_DIR || path.join(storageBase, 'uploads');
// Managed cloud storage path; do not auto-create to avoid permission/host volume issues.

const upload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => cb(null, uploadsDir),
		filename: (req, file, cb) => cb(null, `subtitle_upload_${Date.now()}_${file.originalname}`),
	}),
	limits: { fileSize: 500 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype && file.mimetype.startsWith('video/')) return cb(null, true);
		cb(new Error('Invalid file type. Please upload a video file.'));
	},
});

router.post('/youtube/info', clerkAuth, ensureUserExists, aiInfoRateLimit, aiSubtitleController.getVideoInfo);
router.post('/youtube/generate', clerkAuth, ensureUserExists, aiGenerateRateLimit, aiSubtitleController.generateSubtitles);
router.post('/upload/info', clerkAuth, ensureUserExists, aiInfoRateLimit, upload.single('video'), aiSubtitleController.getUploadedVideoInfo);
router.post('/upload/generate', clerkAuth, ensureUserExists, aiGenerateRateLimit, upload.single('video'), aiSubtitleController.generateSubtitlesFromUpload);

module.exports = router;
