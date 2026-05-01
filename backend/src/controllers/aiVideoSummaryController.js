const { asyncHandler } = require('../middleware/errorHandler');
const fs = require('fs');
const { generateAiVideoSummary, getYoutubeMetadata, getLocalVideoMetadata, generateAiVideoSummaryFromFile } = require('../services/aiVideoSummaryService');
const { hasEnoughCredits, useCredits, addCredits, getFeatureCost } = require('../utils/creditManager');
const { validateFeatureConstraints } = require('../utils/featureConstraints');

async function refundSafely(userId, amount, description) {
  try {
    await addCredits(userId, amount, description);
  } catch (_) {
    // best-effort refund
  }
}

// POST /api/ai-video-summary/youtube/info
const getYoutubeVideoInfo = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const planName = req.user?.plan?.name || 'Free';

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const creditsRequired = getFeatureCost('ai_video_summary');
  const hasCredits = await hasEnoughCredits(userId, creditsRequired);
  if (!hasCredits) {
    return res.status(402).json({ error: `Insufficient credits. Required: ${creditsRequired}` });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const metadata = await getYoutubeMetadata(url.trim());
  const constraint = validateFeatureConstraints({
    featureKey: 'ai-video-summary',
    planName,
    durationSeconds: metadata?.durationSeconds,
  });
  if (!constraint.ok) {
    return res.status(constraint.statusCode).json({ error: constraint.error });
  }

  return res.status(200).json({
    message: 'Video info fetched successfully',
    data: metadata,
  });
});

// POST /api/ai-video-summary/upload/info
const getUploadedVideoInfo = asyncHandler(async (req, res) => {
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const planName = req.user?.plan?.name || 'Free';

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const creditsRequired = getFeatureCost('ai_video_summary');
  const hasCredits = await hasEnoughCredits(userId, creditsRequired);
  if (!hasCredits) {
    return res.status(402).json({ error: `Insufficient credits. Required: ${creditsRequired}` });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field: video)' });
  }

  try {
    const sizeConstraint = validateFeatureConstraints({
      featureKey: 'ai-video-summary',
      planName,
      fileSizeBytes: req.file?.size,
    });
    if (!sizeConstraint.ok) {
      return res.status(sizeConstraint.statusCode).json({ error: sizeConstraint.error });
    }

    const metadata = await getLocalVideoMetadata(req.file.path, req.file.originalname);
    const durationConstraint = validateFeatureConstraints({
      featureKey: 'ai-video-summary',
      planName,
      durationSeconds: metadata?.durationSeconds,
    });
    if (!durationConstraint.ok) {
      return res.status(durationConstraint.statusCode).json({ error: durationConstraint.error });
    }

    return res.status(200).json({
      message: 'Uploaded video info fetched successfully',
      data: metadata,
    });
  } finally {
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (_) {}
  }
});

// POST /api/ai-video-summary/youtube
const generateYoutubeVideoSummary = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const planName = req.user?.plan?.name || 'Free';

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const metadata = await getYoutubeMetadata(url.trim());
  const constraint = validateFeatureConstraints({
    featureKey: 'ai-video-summary',
    planName,
    durationSeconds: metadata?.durationSeconds,
  });
  if (!constraint.ok) {
    return res.status(constraint.statusCode).json({ error: constraint.error });
  }

  const creditsRequired = getFeatureCost('ai_video_summary');
  const hasCredits = await hasEnoughCredits(userId, creditsRequired);
  if (!hasCredits) {
    return res.status(402).json({ error: `Insufficient credits. Required: ${creditsRequired}` });
  }

  const chargeResult = await useCredits(userId, creditsRequired, 'ai_video_summary');
  if (!chargeResult.success) {
    return res.status(402).json({ error: chargeResult.message });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    if (chargeResult.charged) {
      await refundSafely(userId, creditsRequired, 'Refund: AI Video Summary missing API key');
    }
    return res.status(400).json({
      error: 'Missing required environment variable: OPENROUTER_API_KEY',
      hint: 'Set OPENROUTER_API_KEY in backend/.env and restart the backend server.',
    });
  }

  let result;
  try {
    result = await generateAiVideoSummary(url.trim(), userId);
  } catch (err) {
    if (chargeResult.charged) {
      await refundSafely(userId, creditsRequired, 'Refund: AI Video Summary failed');
    }
    throw err;
  }

  return res.status(200).json({
    message: 'Video summary generated successfully',
    data: result,
  });
});

// POST /api/ai-video-summary/upload
const generateUploadedVideoSummary = asyncHandler(async (req, res) => {
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const planName = req.user?.plan?.name || 'Free';

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field: video)' });
  }

  const sizeConstraint = validateFeatureConstraints({
    featureKey: 'ai-video-summary',
    planName,
    fileSizeBytes: req.file?.size,
  });
  if (!sizeConstraint.ok) {
    return res.status(sizeConstraint.statusCode).json({ error: sizeConstraint.error });
  }

  const uploadMetadata = await getLocalVideoMetadata(req.file.path, req.file.originalname);
  const durationConstraint = validateFeatureConstraints({
    featureKey: 'ai-video-summary',
    planName,
    durationSeconds: uploadMetadata?.durationSeconds,
  });
  if (!durationConstraint.ok) {
    return res.status(durationConstraint.statusCode).json({ error: durationConstraint.error });
  }

  const creditsRequired = getFeatureCost('ai_video_summary');
  const hasCredits = await hasEnoughCredits(userId, creditsRequired);
  if (!hasCredits) {
    return res.status(402).json({ error: `Insufficient credits. Required: ${creditsRequired}` });
  }

  const chargeResult = await useCredits(userId, creditsRequired, 'ai_video_summary');
  if (!chargeResult.success) {
    return res.status(402).json({ error: chargeResult.message });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    if (chargeResult.charged) {
      await refundSafely(userId, creditsRequired, 'Refund: AI Video Summary missing API key');
    }
    return res.status(400).json({
      error: 'Missing required environment variable: OPENROUTER_API_KEY',
      hint: 'Set OPENROUTER_API_KEY in backend/.env and restart the backend server.',
    });
  }

  try {
    let result;
    try {
      result = await generateAiVideoSummaryFromFile(req.file.path, userId, req.file.originalname);
    } catch (err) {
      if (chargeResult.charged) {
        await refundSafely(userId, creditsRequired, 'Refund: AI Video Summary upload failed');
      }
      throw err;
    }

    return res.status(200).json({
      message: 'Video summary generated successfully',
      data: result,
    });
  } finally {
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (_) {}
  }
});

module.exports = {
  getYoutubeVideoInfo,
  getUploadedVideoInfo,
  generateYoutubeVideoSummary,
  generateUploadedVideoSummary,
};
