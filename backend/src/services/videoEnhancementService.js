const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const prisma = require('../config/prisma');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const outputDir = path.join(__dirname, '..', 'temp', 'outputs');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

function boolFromInput(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }
  return false;
}

function normalizeMode(mode) {
  const value = String(mode || '').trim().toLowerCase();
  if (value === 'light' || value === 'medium' || value === 'heavy') return value;
  return 'light';
}

function buildVideoFilter({ mode, enableFpsSmooth }) {
  const normalizedMode = normalizeMode(mode);
  const filters = [];

  // 2x upscale with hard max width 2048 (2K cap for now)
  const scale2kLight = "scale='min(iw*2,2048)':-2:flags=bilinear";
  const scale2kBicubic = "scale='min(iw*2,2048)':-2:flags=bicubic";
  const scale2kLanczos = "scale='min(iw*2,2048)':-2:flags=lanczos";

  if (normalizedMode === 'light') {
    // light: scale + color only
    filters.push(scale2kLight);
    filters.push('eq=saturation=1.08:contrast=1.04:brightness=0.01');
  }

  if (normalizedMode === 'medium') {
    // medium: bicubic + light sharpen + color
    filters.push(scale2kBicubic);
    filters.push('unsharp=3:3:0.5:3:3:0.0');
    filters.push('eq=saturation=1.10:contrast=1.06:brightness=0.01');
  }

  if (normalizedMode === 'heavy') {
    // heavy: denoise + lanczos + sharpen + color
    filters.push('hqdn3d=1.5:1.5:6:6');
    filters.push(scale2kLanczos);
    filters.push('unsharp=5:5:1.0:5:5:0.0');
    filters.push('eq=saturation=1.15:contrast=1.08:brightness=0.02');
  }

  // 5) FPS Smooth (optional)
  if (enableFpsSmooth) {
    // Keep this optional for performance-sensitive machines.
    filters.push('fps=60');
  }

  return {
    normalizedMode,
    filter: filters.join(','),
  };
}

async function enhanceVideo(inputPath, { userId = null, title = 'Enhanced Video', mode = 'light', enableFpsSmooth = false } = {}) {
  const outputId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const outputFilename = `enhanced_${outputId}.mp4`;
  const outputPath = path.join(outputDir, outputFilename);

  const safeFpsSmooth = boolFromInput(enableFpsSmooth);
  const { normalizedMode, filter: videoFilter } = buildVideoFilter({ mode, enableFpsSmooth: safeFpsSmooth });

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters(videoFilter)
      // 6) High-quality encoding
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('192k')
      .outputOptions([
        '-preset', normalizedMode === 'light' ? 'veryfast' : normalizedMode === 'medium' ? 'faster' : 'slow',
        '-crf', normalizedMode === 'light' ? '22' : normalizedMode === 'medium' ? '20' : '18',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
      ])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  const fileSize = fs.statSync(outputPath).size;
  const publicUrl = `/uploads/${outputFilename}`;

  let videoRecord = null;
  if (userId) {
    try {
      videoRecord = await prisma.userOutput.create({
        data: {
          userId,
          title,
          originalUrl: '',
          filename: outputFilename,
          filePath: outputPath,
          publicUrl,
          fileSize,
          service: 'video-enhancer',
        },
      });
    } catch (err) {
      console.error('Failed to save enhanced output to database:', err);
    }
  }

  return {
    outputPath,
    filename: outputFilename,
    publicUrl,
    videoId: videoRecord?.id,
    appliedOptions: {
      mode: normalizedMode,
      enableFpsSmooth: safeFpsSmooth,
      upscaleMaxWidth: 2048,
    },
  };
}

module.exports = {
  enhanceVideo,
};
