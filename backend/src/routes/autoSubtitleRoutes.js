const { Router } = require('express');
const { clerkAuth, ensureUserExists } = require('../middleware/clerkAuth');
const autoSubtitleController = require('../controllers/autoSubtitleController');

const router = Router();

router.post('/youtube/info', clerkAuth, ensureUserExists, autoSubtitleController.getYoutubeVideoInfo);
router.post('/youtube', clerkAuth, ensureUserExists, autoSubtitleController.createAutoSubtitledVideo);

module.exports = router;