const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const prisma = require('../config/prisma');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const outputDir = path.join(__dirname, '..', 'temp', 'thumbnails');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Get video duration and metadata
 */
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration || 0;
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      resolve({
        duration,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        codec: videoStream?.codec_name,
      });
    });
  });
}

/**
 * Extract frames from video at specific intervals
 * @param {string} videoPath - Path to video file
 * @param {number} frameCount - Number of frames to extract (default: 10)
 * @returns {Promise<Array>} Array of frame file paths
 */
async function extractFrames(videoPath, frameCount = 10) {
  const metadata = await getVideoMetadata(videoPath);
  const duration = metadata.duration;
  
  if (duration <= 0) {
    throw new Error('Invalid video duration');
  }

  const sessionId = `thumb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const sessionDir = path.join(outputDir, sessionId);
  
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Calculate timestamps to extract frames evenly throughout the video
  const interval = duration / (frameCount + 1);
  const timestamps = [];
  
  for (let i = 1; i <= frameCount; i++) {
    timestamps.push(interval * i);
  }

  const frames = [];

  // Extract each frame at the calculated timestamps
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const frameName = `frame_${i + 1}.jpg`;
    const framePath = path.join(sessionDir, frameName);

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .output(framePath)
        .outputOptions([
          '-vf', 'scale=1280:-1', // Resize to 1280 width, maintain aspect ratio
          '-q:v', '2' // High quality JPEG
        ])
        .on('end', () => {
          const stats = fs.statSync(framePath);
          frames.push({
            name: frameName,
            path: framePath,
            url: `/thumbnails/${sessionId}/${frameName}`,
            timestamp: timestamp.toFixed(2),
            size: stats.size,
            index: i + 1
          });
          resolve();
        })
        .on('error', reject)
        .run();
    });
  }

  return {
    sessionId,
    sessionDir,
    frames,
    videoMetadata: metadata
  };
}

/**
 * Analyze frame quality (brightness, sharpness estimation)
 * Simple heuristic: larger file size often means more detail
 */
function analyzeFrameQuality(frames) {
  return frames.map(frame => {
    // Simple quality score based on file size (more detail = larger file)
    const qualityScore = Math.min(100, (frame.size / 50000) * 100);
    return {
      ...frame,
      qualityScore: Math.round(qualityScore)
    };
  }).sort((a, b) => b.qualityScore - a.qualityScore);
}

let sharp;
try {
  sharp = require('sharp');
} catch (_) {
  sharp = null;
}

/**
 * Generate thumbnail with text overlay
 * @param {string} framePath - Path to source frame
 * @param {string} text - Text to overlay
 * @param {object} options - Text styling options
 */
async function addTextToFrame(framePath, text, options = {}) {
  const {
    fontSize = 48,
    fontColor = 'white',
    backgroundColor = 'black',
    position = 'bottom',
    fontFamily = 'Arial',
    showBackground = true,
    xPosition = null,
    yPosition = null,
    backgroundOpacity = 0.7
  } = options;

  const outputName = `thumbnail_${Date.now()}.jpg`;
  const outputPath = path.join(path.dirname(framePath), outputName);

  if (sharp) {
    try {
      const image = sharp(framePath);
      const meta = await image.metadata();
      const width = meta.width || 1280;
      const height = meta.height || 720;

      let yPos = height - fontSize - 30;
      if (yPosition !== null) {
        yPos = Number(yPosition) <= 100 ? (Number(yPosition) / 100) * height : Number(yPosition);
      } else if (position === 'top') {
        yPos = fontSize + 20;
      } else if (position === 'center') {
        yPos = height / 2;
      }

      let xPos = width / 2;
      let textAnchor = 'middle';
      if (xPosition !== null) {
        xPos = Number(xPosition) <= 100 ? (Number(xPosition) / 100) * width : Number(xPosition);
        textAnchor = 'start';
      }

      const escapedSvgText = String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const bgSvg = showBackground
        ? `<rect x="0" y="${Math.max(0, yPos - fontSize * 0.75)}" width="${width}" height="${fontSize * 1.5}" fill="${backgroundColor}" fill-opacity="${backgroundOpacity}" />`
        : '';

      const svgOverlay = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          ${bgSvg}
          <text x="${xPos}" y="${yPos}" font-family="${fontFamily}, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${fontColor}" text-anchor="${textAnchor}" dominant-baseline="middle">
            ${escapedSvgText}
          </text>
        </svg>
      `;

      await image
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      return {
        path: outputPath,
        name: outputName,
        url: `/thumbnails/${path.basename(path.dirname(framePath))}/${outputName}`,
        size: stats.size,
      };
    } catch (sharpErr) {
      console.warn('[Thumbnail] Sharp text overlay warning:', sharpErr.message);
    }
  }

  // Fallback: copy frame if sharp encounters an issue
  try {
    fs.copyFileSync(framePath, outputPath);
    const stats = fs.statSync(outputPath);
    return {
      path: outputPath,
      name: outputName,
      url: `/thumbnails/${path.basename(path.dirname(framePath))}/${outputName}`,
      size: stats.size,
    };
  } catch (copyErr) {
    throw new Error(`Failed to create thumbnail: ${copyErr.message}`);
  }
}


/**
 * Save thumbnail generation to database
 */
async function saveThumbnailTask(userId, videoFilename, sessionId, frameCount) {
  try {
    const thumbnail = await prisma.userOutput.create({
      data: {
        userId,
        title: `Thumbnail Frames - ${videoFilename}`,
        originalUrl: '',
        filename: sessionId,
        filePath: path.join(outputDir, sessionId),
        publicUrl: `/thumbnails/${sessionId}`,
        fileSize: 0,
        service: 'thumbnail-generator',
      },
    });
    return thumbnail;
  } catch (err) {
    console.error('Failed to save thumbnail task:', err);
    return null;
  }
}

/**
 * Cleanup old thumbnail directories (older than 1 hour)
 */
function cleanupOldThumbnails() {
  try {
    const dirs = fs.readdirSync(outputDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    dirs.forEach(dir => {
      const dirPath = path.join(outputDir, dir);
      const stats = fs.statSync(dirPath);
      
      if (stats.isDirectory() && (now - stats.mtimeMs) > oneHour) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`Cleaned up old thumbnail directory: ${dir}`);
      }
    });
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldThumbnails, 30 * 60 * 1000);

module.exports = {
  extractFrames,
  analyzeFrameQuality,
  addTextToFrame,
  saveThumbnailTask,
  getVideoMetadata,
};
