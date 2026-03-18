const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { probeVideo, cropAndTrimVideo } = require('../services/cropResizeService');
const { hasEnoughCredits, useCredits, getFeatureCost, getRemainingCredits } = require('../utils/creditManager');

const FEATURE_NAME = 'video_crop_resize';

// Set to true when you want to enforce and deduct credits for Crop & Resize
const APPLY_CREDITS_FOR_CROP_RESIZE = false;

/**
 * POST /api/crop-resize/process
 * Upload video and process with trim + crop. Deducts credits. Returns download URL.
 */
async function processCropResize(req, res) {
  let inputPath = null;

  try {
    const userId = req.auth?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required (field name: video)' });
    }

    inputPath = req.file.path;

    const startTime = Math.max(0, parseFloat(req.body.startTime) || 0);
    const endTime = req.body.endTime != null && req.body.endTime !== '' ? parseFloat(req.body.endTime) : null;
    const durationSec = req.body.duration != null && req.body.duration !== '' ? parseFloat(req.body.duration) : null;

    let effectiveEnd = endTime;
    if (effectiveEnd == null && durationSec != null && durationSec > 0) {
      effectiveEnd = startTime + durationSec;
    }

    const cropX = Math.max(0, parseFloat(req.body.cropX) || 0);
    const cropY = Math.max(0, parseFloat(req.body.cropY) || 0);
    const cropWidth = parseFloat(req.body.cropWidth);
    const cropHeight = parseFloat(req.body.cropHeight);
    const outWidth = req.body.outWidth != null && req.body.outWidth !== '' ? parseInt(req.body.outWidth, 10) : null;
    const outHeight = req.body.outHeight != null && req.body.outHeight !== '' ? parseInt(req.body.outHeight, 10) : null;

    const meta = await probeVideo(inputPath);
    if (!meta.duration || meta.duration <= 0) {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).json({ error: 'Unable to read video duration' });
    }

    const maxEnd = meta.duration;
    const finalEnd = effectiveEnd != null ? Math.min(effectiveEnd, maxEnd) : maxEnd;
    if (finalEnd <= startTime) {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).json({ error: 'Invalid trim range: end must be after start' });
    }

    const w = meta.width || 0;
    const h = meta.height || 0;
    const hasCrop = cropWidth != null && !Number.isNaN(cropWidth) && cropHeight != null && !Number.isNaN(cropHeight) && cropWidth > 0 && cropHeight > 0;
    const cropXClamp = Math.max(0, Math.min(cropX, w - 1));
    const cropYClamp = Math.max(0, Math.min(cropY, h - 1));
    const cropWClamp = hasCrop ? Math.max(1, Math.min(Math.floor(cropWidth), w - cropXClamp)) : w;
    const cropHClamp = hasCrop ? Math.max(1, Math.min(Math.floor(cropHeight), h - cropYClamp)) : h;

    const cost = getFeatureCost(FEATURE_NAME);
    if (APPLY_CREDITS_FOR_CROP_RESIZE) {
      const hasCredits = await hasEnoughCredits(userId, cost);
      if (!hasCredits) {
        if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        return res.status(402).json({
          error: 'Insufficient credits',
          required: cost,
          message: `This operation costs ${cost} credits. Please add more credits to continue.`,
        });
      }
    }

    const result = await cropAndTrimVideo({
      inputPath,
      startTime,
      endTime: finalEnd,
      cropX: cropXClamp,
      cropY: cropYClamp,
      cropWidth: cropWClamp,
      cropHeight: cropHClamp,
      outWidth: outWidth > 0 ? outWidth : null,
      outHeight: outHeight > 0 ? outHeight : null,
      userId,
      originalTitle: `Crop & Resize - ${req.file.originalname || 'video'}`,
    });

    let remainingCredits = null;
    if (APPLY_CREDITS_FOR_CROP_RESIZE) {
      const creditResult = await useCredits(userId, cost, FEATURE_NAME);
      if (!creditResult.success) {
        logger.warn('Credit deduction failed after crop-resize:', creditResult.message);
      }
      remainingCredits = creditResult.remainingCredits;
    } else {
      remainingCredits = await getRemainingCredits(userId);
    }

    try {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch (e) {
      logger.warn('Cleanup input after crop-resize failed', e);
    }

    return res.status(200).json({
      url: result.publicUrl,
      filename: result.filename,
      videoId: result.videoId,
      remainingCredits,
    });
  } catch (err) {
    logger.error('Crop-resize process error', err);
    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {}
    }
    return res.status(500).json({
      error: 'Processing failed',
      details: err.message || String(err),
    });
  }
}

/**
 * POST /api/crop-resize/probe
 * Accepts multipart video file, returns duration and dimensions (no credits).
 */
async function probeCropResize(req, res) {
  let inputPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required (field name: video)' });
    }
    inputPath = req.file.path;
    const meta = await probeVideo(inputPath);
    try {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch (e) {}
    return res.status(200).json(meta);
  } catch (err) {
    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {}
    }
    return res.status(400).json({ error: 'Failed to read video', details: err.message });
  }
}

module.exports = { processCropResize, probeCropResize };
