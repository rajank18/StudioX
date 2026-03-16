const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { clerkAuth, ensureUserExists } = require('../middleware/clerkAuth');
const aiSubtitleController = require('../controllers/aiSubtitleController');

const router = Router();

const uploadsDir = path.join(__dirname, '..', 'temp', 'uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

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

router.post('/youtube/info', clerkAuth, ensureUserExists, aiSubtitleController.getVideoInfo);
router.post('/youtube/generate', clerkAuth, ensureUserExists, aiSubtitleController.generateSubtitles);
router.post('/upload/info', clerkAuth, ensureUserExists, upload.single('video'), aiSubtitleController.getUploadedVideoInfo);
router.post('/upload/generate', clerkAuth, ensureUserExists, upload.single('video'), aiSubtitleController.generateSubtitlesFromUpload);

module.exports = router;
