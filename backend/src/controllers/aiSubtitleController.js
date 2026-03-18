const { asyncHandler } = require('../middleware/errorHandler');
const fs = require('fs');
const { getYoutubeVideoInfo, getLocalVideoInfo, generateSubtitledVideo, generateSubtitledVideoFromFile } = require('../services/aiSubtitleService');

const getVideoInfo = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const data = await getYoutubeVideoInfo(url.trim());

  return res.status(200).json({
    message: 'Video info fetched successfully',
    data,
  });
});

const getUploadedVideoInfo = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field: video)' });
  }

  try {
    const data = await getLocalVideoInfo(req.file.path, req.file.originalname);
    return res.status(200).json({
      message: 'Uploaded video info fetched successfully',
      data,
    });
  } finally {
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (_) {}
  }
});

const generateSubtitles = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const userId = req.auth?.userId || req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  if (!process.env.ASSEMBLYAI_API_KEY) {
    return res.status(400).json({
      error: 'Missing required environment variable: ASSEMBLYAI_API_KEY',
      hint: 'Set ASSEMBLYAI_API_KEY in backend/.env and restart backend.',
    });
  }

  const data = await generateSubtitledVideo(url.trim(), userId);

  return res.status(200).json({
    message: 'Subtitled video generated successfully',
    data,
  });
});

const generateSubtitlesFromUpload = asyncHandler(async (req, res) => {
  const userId = req.auth?.userId || req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field: video)' });
  }

  if (!process.env.ASSEMBLYAI_API_KEY) {
    return res.status(400).json({
      error: 'Missing required environment variable: ASSEMBLYAI_API_KEY',
      hint: 'Set ASSEMBLYAI_API_KEY in backend/.env and restart backend.',
    });
  }

  try {
    const data = await generateSubtitledVideoFromFile(req.file.path, userId, req.file.originalname);
    return res.status(200).json({
      message: 'Subtitled video generated successfully',
      data,
    });
  } finally {
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (_) {}
  }
});

module.exports = {
  getVideoInfo,
  getUploadedVideoInfo,
  generateSubtitles,
  generateSubtitlesFromUpload,
};
