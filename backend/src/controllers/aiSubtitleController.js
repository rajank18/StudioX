const { asyncHandler } = require('../middleware/errorHandler');
const fs = require('fs');
const { getYoutubeVideoInfo, getLocalVideoInfo, generateSubtitledVideo, generateSubtitledVideoFromFile } = require('../services/aiSubtitleService');
const { hasEnoughCredits, useCredits, addCredits, getFeatureCost } = require('../utils/creditManager');
const { validateFeatureConstraints } = require('../utils/featureConstraints');

async function refundSafely(userId, amount, description) {
  try {
    await addCredits(userId, amount, description);
  } catch (_) {
    // best-effort refund
  }
}

const getVideoInfo = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const planName = req.user?.plan?.name || 'Free';

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const creditsRequired = getFeatureCost('ai_subtitle_generator');
  const hasCredits = await hasEnoughCredits(userId, creditsRequired);
  if (!hasCredits) {
    return res.status(402).json({ error: `Insufficient credits. Required: ${creditsRequired}` });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const data = await getYoutubeVideoInfo(url.trim());
  const constraint = validateFeatureConstraints({
    featureKey: 'ai-subtitle-generator',
    planName,
    durationSeconds: data?.durationSeconds,
  });
  if (!constraint.ok) {
    return res.status(constraint.statusCode).json({ error: constraint.error });
  }

  return res.status(200).json({
    message: 'Video info fetched successfully',
    data,
  });
});

const getUploadedVideoInfo = asyncHandler(async (req, res) => {
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const planName = req.user?.plan?.name || 'Free';

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const creditsRequired = getFeatureCost('ai_subtitle_generator');
  const hasCredits = await hasEnoughCredits(userId, creditsRequired);
  if (!hasCredits) {
    return res.status(402).json({ error: `Insufficient credits. Required: ${creditsRequired}` });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field: video)' });
  }

  try {
    const sizeConstraint = validateFeatureConstraints({
      featureKey: 'ai-subtitle-generator',
      planName,
      fileSizeBytes: req.file?.size,
    });
    if (!sizeConstraint.ok) {
      return res.status(sizeConstraint.statusCode).json({ error: sizeConstraint.error });
    }

    const data = await getLocalVideoInfo(req.file.path, req.file.originalname);
    const durationConstraint = validateFeatureConstraints({
      featureKey: 'ai-subtitle-generator',
      planName,
      durationSeconds: data?.durationSeconds,
    });
    if (!durationConstraint.ok) {
      return res.status(durationConstraint.statusCode).json({ error: durationConstraint.error });
    }

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
  const planName = req.user?.plan?.name || 'Free';

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const metadata = await getYoutubeVideoInfo(url.trim());
  const constraint = validateFeatureConstraints({
    featureKey: 'ai-subtitle-generator',
    planName,
    durationSeconds: metadata?.durationSeconds,
  });
  if (!constraint.ok) {
    return res.status(constraint.statusCode).json({ error: constraint.error });
  }

  const creditsRequired = getFeatureCost('ai_subtitle_generator');
  const hasCredits = await hasEnoughCredits(userId, creditsRequired);
  if (!hasCredits) {
    return res.status(402).json({ error: `Insufficient credits. Required: ${creditsRequired}` });
  }

  const chargeResult = await useCredits(userId, creditsRequired, 'ai_subtitle_generator');
  if (!chargeResult.success) {
    return res.status(402).json({ error: chargeResult.message });
  }

  if (!process.env.ASSEMBLYAI_API_KEY) {
    if (chargeResult.charged) {
      await refundSafely(userId, creditsRequired, 'Refund: AI Subtitle Generator missing API key');
    }
    return res.status(400).json({
      error: 'Missing required environment variable: ASSEMBLYAI_API_KEY',
      hint: 'Set ASSEMBLYAI_API_KEY in backend/.env and restart backend.',
    });
  }

  let data;
  try {
    data = await generateSubtitledVideo(url.trim(), userId);
  } catch (err) {
    if (chargeResult.charged) {
      await refundSafely(userId, creditsRequired, 'Refund: AI Subtitle Generator failed');
    }
    throw err;
  }

  return res.status(200).json({
    message: 'Subtitled video generated successfully',
    data,
  });
});

const generateSubtitlesFromUpload = asyncHandler(async (req, res) => {
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const planName = req.user?.plan?.name || 'Free';

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field: video)' });
  }

  const sizeConstraint = validateFeatureConstraints({
    featureKey: 'ai-subtitle-generator',
    planName,
    fileSizeBytes: req.file?.size,
  });
  if (!sizeConstraint.ok) {
    return res.status(sizeConstraint.statusCode).json({ error: sizeConstraint.error });
  }

  const uploadMetadata = await getLocalVideoInfo(req.file.path, req.file.originalname);
  const durationConstraint = validateFeatureConstraints({
    featureKey: 'ai-subtitle-generator',
    planName,
    durationSeconds: uploadMetadata?.durationSeconds,
  });
  if (!durationConstraint.ok) {
    return res.status(durationConstraint.statusCode).json({ error: durationConstraint.error });
  }

  const creditsRequired = getFeatureCost('ai_subtitle_generator');
  const hasCredits = await hasEnoughCredits(userId, creditsRequired);
  if (!hasCredits) {
    return res.status(402).json({ error: `Insufficient credits. Required: ${creditsRequired}` });
  }

  const chargeResult = await useCredits(userId, creditsRequired, 'ai_subtitle_generator');
  if (!chargeResult.success) {
    return res.status(402).json({ error: chargeResult.message });
  }

  if (!process.env.ASSEMBLYAI_API_KEY) {
    if (chargeResult.charged) {
      await refundSafely(userId, creditsRequired, 'Refund: AI Subtitle Generator missing API key');
    }
    return res.status(400).json({
      error: 'Missing required environment variable: ASSEMBLYAI_API_KEY',
      hint: 'Set ASSEMBLYAI_API_KEY in backend/.env and restart backend.',
    });
  }

  try {
    let data;
    try {
      data = await generateSubtitledVideoFromFile(req.file.path, userId, req.file.originalname);
    } catch (err) {
      if (chargeResult.charged) {
        await refundSafely(userId, creditsRequired, 'Refund: AI Subtitle Generator upload failed');
      }
      throw err;
    }

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
