const { asyncHandler } = require('../middleware/errorHandler');
const { generateAiVideoSummary, getYoutubeMetadata } = require('../services/aiVideoSummaryService');

// POST /api/ai-video-summary/youtube/info
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

// POST /api/ai-video-summary/youtube
const generateYoutubeVideoSummary = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const userId = req.auth?.userId || req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(400).json({
      error: 'Missing required environment variable: OPENROUTER_API_KEY',
      hint: 'Set OPENROUTER_API_KEY in backend/.env and restart the backend server.',
    });
  }

  const result = await generateAiVideoSummary(url.trim(), userId);

  return res.status(200).json({
    message: 'Video summary generated successfully',
    data: result,
  });
});

module.exports = {
  getYoutubeVideoInfo,
  generateYoutubeVideoSummary,
};
