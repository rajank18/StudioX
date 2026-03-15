const { asyncHandler } = require('../middleware/errorHandler');
const { generateAutoSubtitledVideo, getYoutubeMetadata } = require('../services/autoSubtitleService');
// const { hasEnoughCredits, useCredits } = require('../utils/creditManager');

// POST /api/auto-subtitle/youtube/info
const getYoutubeVideoInfo = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const metadata = await getYoutubeMetadata(url.trim());

  return res.status(200).json({
    message: 'Video info fetched successfully',
    data: metadata,
  });
});

// POST /api/auto-subtitle/youtube
const createAutoSubtitledVideo = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const userId = req.auth?.userId || req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  if (!process.env.OPENAI_API_KEY && !process.env.ASSEMBLYAI_API_KEY) {
    return res.status(400).json({
      error: 'Missing required environment variables',
      hint: 'Set ASSEMBLYAI_API_KEY (recommended) or OPENAI_API_KEY in backend/.env and restart the backend server.',
    });
  }

  // Check credits - COMMENTED OUT FOR DEVELOPMENT
  // const hasCredits = await hasEnoughCredits(userId, 200); // subtitle_generator costs 200
  // if (!hasCredits) {
  //   return res.status(402).json({ error: 'Insufficient credits. You need 200 credits for auto subtitle generation.' });
  // }

  // Deduct credits - COMMENTED OUT FOR DEVELOPMENT
  // await useCredits(userId, 200, 'subtitle_generator');

  const result = await generateAutoSubtitledVideo(url.trim(), userId);

  return res.status(200).json({
    message: 'Auto subtitle generation completed successfully',
    data: result,
  });
});

module.exports = {
  getYoutubeVideoInfo,
  createAutoSubtitledVideo,
};