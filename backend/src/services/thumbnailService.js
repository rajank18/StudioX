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
    position = 'bottom', // top, center, bottom, or custom coordinates
    fontWeight = 'bold',
    fontFamily = 'Arial',
    showBackground = true,
    xPosition = null, // Custom X position (null = centered)
    yPosition = null, // Custom Y position (null = use position preset)
    backgroundOpacity = 0.7
  } = options;

  const outputName = `thumbnail_${Date.now()}.jpg`;
  const outputPath = path.join(path.dirname(framePath), outputName);

  // Get image dimensions
  const metadata = await getVideoMetadata(framePath);
  const height = metadata.height || 720;
  const width = metadata.width || 1280;
  
  // Calculate Y position
  let yPos;
  if (yPosition !== null) {
    // Use custom Y position
    yPos = yPosition;
  } else {
    // Use position preset
    switch (position) {
      case 'top':
        yPos = fontSize + 20;
        break;
      case 'center':
        yPos = height / 2;
        break;
      case 'bottom':
      default:
        yPos = height - fontSize - 20;
        break;
    }
  }

  // Calculate X position
  const xPos = xPosition !== null ? xPosition : '(w-text_w)/2'; // Centered by default

  // Escape special characters in text
  const escapedText = text.replace(/:/g, '\\:').replace(/'/g, "\\'");

  // Build drawtext filter with options
  let drawtextFilter = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}`;
  
  // Add font family (use system fonts)
  const fontMap = {
    'Arial': 'Arial',
    'Helvetica': 'Helvetica',
    'Impact': 'Impact',
    'Times New Roman': 'Times New Roman',
    'Courier New': 'Courier New',
    'Georgia': 'Georgia',
    'Verdana': 'Verdana',
    'Comic Sans MS': 'Comic Sans MS'
  };
  
  if (fontMap[fontFamily]) {
    drawtextFilter += `:font='${fontMap[fontFamily]}'`;
  }

  // Add background box if enabled
  if (showBackground) {
    drawtextFilter += `:box=1:boxcolor=${backgroundColor}@${backgroundOpacity}:boxborderw=10`;
  }

  // Add position
  drawtextFilter += `:x=${xPos}:y=${yPos}`;

  return new Promise((resolve, reject) => {
    ffmpeg(framePath)
      .outputOptions([
        '-vf',
        drawtextFilter
      ])
      .output(outputPath)
      .on('end', () => {
        const stats = fs.statSync(outputPath);
        resolve({
          path: outputPath,
          name: outputName,
          url: `/thumbnails/${path.basename(path.dirname(framePath))}/${outputName}`,
          size: stats.size
        });
      })
      .on('error', reject)
      .run();
  });
}

/**
 * Save thumbnail generation to database
 */
async function saveThumbnailTask(userId, videoFilename, sessionId, frameCount) {
  try {
    const thumbnail = await prisma.videoDownload.create({
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
