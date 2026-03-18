const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const prisma = require('../config/prisma');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const uploadDir = path.join(__dirname, '..', 'temp', 'uploads');
const outputDir = path.join(__dirname, '..', 'temp', 'outputs');

[uploadDir, outputDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Get video metadata: duration (seconds), width, height
 * @param {string} filePath - Path to video file
 * @returns {Promise<{ duration: number, width: number, height: number }>}
 */
async function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const format = metadata?.format;
      const videoStream = metadata?.streams?.find((s) => s.codec_type === 'video');
      const duration = format?.duration != null ? Number(format.duration) : 0;
      const width = videoStream?.width != null ? Number(videoStream.width) : 0;
      const height = videoStream?.height != null ? Number(videoStream.height) : 0;
      resolve({ duration, width, height });
    });
  });
}

/**
 * Crop and trim video with FFmpeg
 * @param {Object} options
 * @param {string} options.inputPath - Input video path
 * @param {number} options.startTime - Start time in seconds
 * @param {number} options.endTime - End time in seconds (or use duration)
 * @param {number} options.cropX - Crop left (pixels)
 * @param {number} options.cropY - Crop top (pixels)
 * @param {number} options.cropWidth - Crop width (pixels)
 * @param {number} options.cropHeight - Crop height (pixels)
 * @param {number} [options.outWidth] - Optional output width (resize after crop)
 * @param {number} [options.outHeight] - Optional output height (resize after crop)
 * @param {string} [options.userId] - User ID for persistence
 * @param {string} [options.originalTitle] - Original uploaded filename/title
 * @returns {Promise<{ outputPath: string, publicUrl: string, filename: string, videoId?: string }>}
 */
async function cropAndTrimVideo(options) {
  const {
    inputPath,
    startTime = 0,
    endTime,
    cropX = 0,
    cropY = 0,
    cropWidth,
    cropHeight,
    outWidth,
    outHeight,
    userId,
    originalTitle = 'Crop & Resize Output',
  } = options;

  const duration = endTime != null && endTime > startTime ? endTime - startTime : null;
  if (duration != null && duration <= 0) {
    throw new Error('Invalid time range: end must be after start');
  }

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const outputFile = `crop_${id}.mp4`;
  const outputPath = path.join(outputDir, outputFile);

  // Build video filter: crop then optionally scale
  let vf = [];
  if (cropWidth != null && cropHeight != null && cropWidth > 0 && cropHeight > 0) {
    const x = Math.max(0, Math.floor(cropX));
    const y = Math.max(0, Math.floor(cropY));
    const w = Math.max(1, Math.floor(cropWidth));
    const h = Math.max(1, Math.floor(cropHeight));
    vf.push(`crop=${w}:${h}:${x}:${y}`);
  }
  if (outWidth != null && outHeight != null && outWidth > 0 && outHeight > 0) {
    vf.push(`scale=${Math.floor(outWidth)}:${Math.floor(outHeight)}:force_original_aspect_ratio=decrease`);
  }
  const vfStr = vf.length > 0 ? vf.join(',') : null;

  await new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath)
      .seekInput(startTime);
    if (duration != null) cmd = cmd.duration(duration);
    if (vfStr) cmd = cmd.outputOptions(['-vf', vfStr]);
    cmd
      .outputOptions(['-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-movflags', '+faststart'])
      .outputOptions(['-c:a', 'aac', '-b:a', '128k'])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  // Schedule cleanup after 10 minutes
  setTimeout(() => {
    try {
      fs.unlinkSync(outputPath);
    } catch (e) {}
  }, 10 * 60 * 1000);

  const publicUrl = `/uploads/${outputFile}`;
  let videoRecord = null;
  if (userId) {
    try {
      const fileSize = fs.statSync(outputPath).size;
      videoRecord = await prisma.userOutput.create({
        data: {
          userId,
          title: originalTitle,
          originalUrl: '',
          filename: outputFile,
          filePath: outputPath,
          publicUrl,
          fileSize,
          service: 'crop-resize',
        },
      });
    } catch (err) {
      console.error('Failed to save crop-resize output to database:', err);
    }
  }

  return { outputPath, publicUrl, filename: outputFile, videoId: videoRecord?.id };
}

module.exports = { probeVideo, cropAndTrimVideo };
