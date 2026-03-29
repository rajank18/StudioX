const fs = require('fs');
const { asyncHandler } = require('../middleware/errorHandler');
const { enhanceVideo } = require('../services/videoEnhancementService');

function parseEnableFpsSmooth(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }
  if (typeof value === 'number') return value === 1;
  return false;
}

function parseMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'light' || normalized === 'medium' || normalized === 'heavy') {
    return normalized;
  }
  return 'light';
}

const processVideoEnhancement = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field name: video)' });
  }

  const inputPath = req.file.path;
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const originalFilename = req.file.originalname || 'video.mp4';
  const mode = parseMode(req.body?.mode);
  const enableFpsSmooth = parseEnableFpsSmooth(req.body?.enableFpsSmooth);

  try {
    const title = `Enhanced - ${originalFilename}`;
    const result = await enhanceVideo(inputPath, {
      userId,
      title,
      mode,
      enableFpsSmooth,
    });

    const modePipeline = {
      light: {
        denoise: false,
        upscale: 'bilinear',
        sharpen: 'none',
        colorBoost: true,
      },
      medium: {
        denoise: false,
        upscale: 'bicubic',
        sharpen: 'light',
        colorBoost: true,
      },
      heavy: {
        denoise: true,
        upscale: 'lanczos',
        sharpen: 'strong',
        colorBoost: true,
      },
    };

    try {
      fs.unlinkSync(inputPath);
    } catch (err) {
      // best-effort cleanup
    }

    return res.status(200).json({
      url: result.publicUrl,
      filename: result.filename,
      videoId: result.videoId,
      pipeline: {
        mode: result.appliedOptions.mode,
        ...modePipeline[result.appliedOptions.mode],
        fpsSmooth: result.appliedOptions.enableFpsSmooth,
        highQualityEncoding: true,
        upscaleMaxWidth: result.appliedOptions.upscaleMaxWidth,
      },
    });
  } catch (err) {
    try {
      fs.unlinkSync(inputPath);
    } catch (cleanupErr) {
      // best-effort cleanup
    }

    return res.status(500).json({
      error: 'Video enhancement failed',
      details: String(err.message || err),
    });
  }
});

const getEnhancementFlow = asyncHandler(async (req, res) => {
  return res.status(200).json({
    flow: [
      'Input Video',
      'Denoise',
      'Upscale (Lanczos)',
      'Sharpen',
      'Color Boost',
      'FPS Smooth (optional)',
      'High-quality encoding',
      'Output',
    ],
    modes: {
      light: 'scale + color only',
      medium: 'bicubic upscale + light sharpen + color',
      heavy: 'denoise + lanczos upscale + sharpen + color',
    },
    limits: {
      upscaleMaxWidth: 2048,
    },
  });
});

module.exports = {
  processVideoEnhancement,
  getEnhancementFlow,
};
