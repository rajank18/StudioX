const { Router } = require('express');
const youtubeController = require('../controllers/youtubeController');
const { clerkAuth, ensureUserExists } = require('../middleware/clerkAuth');

const router = Router();

// Get video info without downloading
router.post('/youtube/info', youtubeController.getYoutubeVideoInfo);

// Temporary: Allow downloads without strict auth for testing
router.post('/youtube/download', clerkAuth, ensureUserExists, youtubeController.downloadYoutubeVideo);

// Protected routes for user video management  
router.get('/user/videos', clerkAuth, youtubeController.getUserVideoList);
router.delete('/user/videos/:id', clerkAuth, youtubeController.deleteUserVideoById);

module.exports = router;
