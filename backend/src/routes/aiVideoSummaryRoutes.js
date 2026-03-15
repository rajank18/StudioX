const { Router } = require('express');
const { clerkAuth, ensureUserExists } = require('../middleware/clerkAuth');
const aiVideoSummaryController = require('../controllers/aiVideoSummaryController');

const router = Router();

router.post('/youtube/info', clerkAuth, ensureUserExists, aiVideoSummaryController.getYoutubeVideoInfo);
router.post('/youtube', clerkAuth, ensureUserExists, aiVideoSummaryController.generateYoutubeVideoSummary);

module.exports = router;
