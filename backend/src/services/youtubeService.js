const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const logger = require('../utils/logger');
const ytDlp = require('yt-dlp-exec');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(__dirname, '..', 'temp', 'uploads');

function ensureUploadsDir() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (err) {
    logger.error('Failed to ensure uploads directory', err);
    throw err;
  }
}

/**
 * Download a YouTube video to temp/uploads and return file details
 * @param {string} url - YouTube URL
 * @param {string} userId - User ID for database storage
 * @param {{ quality?: string, format?: 'mp4'|'webm' }} options
 * @returns {{ filePath: string, publicUrl: string, filename: string, sizeBytes: number, id: string }}
 */
async function downloadVideo(url, userId, options = {}) {
  ensureUploadsDir();

  const format = options.format || 'mp4';
  // Create unique session subdirectory to reliably locate output
  const sessionDir = path.join(UPLOADS_DIR, `dl_${Date.now()}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  // Output template inside session directory
  const outTemplate = path.join(sessionDir, '%(title)s_%(id)s.%(ext)s');

  try {
    // Detect if ffmpeg is available to decide format strategy
    const ffmpegCheck = spawnSync('ffmpeg', ['-version'], { windowsHide: true });
    const hasFfmpeg = ffmpegCheck.status === 0;

    // If ffmpeg exists, we can safely download separate streams and merge.
    // Otherwise, prefer a single-file format to avoid merge errors.
    const dlOptions = hasFfmpeg
      ? {
          format: 'bv*+ba/b',
          mergeOutputFormat: format,
        }
      : {
          // Prefer mp4 single-file, then webm, then best available
          format: 'b[ext=mp4]/b[ext=m4v]/b[ext=webm]/best',
        };

    // Get video info first for title and duration
    const videoInfo = await ytDlp(url, {
      dumpJson: true,
      quiet: true,
    });

    const title = videoInfo.title || 'Unknown Video';
    const duration = videoInfo.duration_string || null;
    const thumbnail = videoInfo.thumbnail || null;

    await ytDlp(url, {
      ...dlOptions,
      restrictFilenames: true,
      noPlaylist: true,
      noPart: true,
      output: outTemplate,
      quiet: false, // Enable verbose output for debugging
    });

    // List all files and pick the largest non-temp media-like file
    const allFiles = fs.readdirSync(sessionDir)
      .map((f) => ({ name: f, full: path.join(sessionDir, f) }))
      .filter(({ full }) => fs.statSync(full).isFile());

    // Exclude common temp/sidecar files
    const nonTemp = allFiles.filter(({ name }) => !/(\.part|\.ytdl|\.temp|\.aria2|\.info\.json|\.description)$/i.test(name));

    // Prefer known media extensions, else fallback to any largest file
    const mediaPreferred = nonTemp.filter(({ name }) => /\.(mp4|m4v|mov|webm|mkv|m4a|mp3|avi)$/i.test(name));

    const sizeMap = (arr) => arr.map(({ name, full }) => ({ name, full, size: fs.statSync(full).size }))
                                .sort((a, b) => b.size - a.size);

    // Within preferred, choose by extension priority first, then by size
    const extPriority = ['.mp4', '.m4v', '.mov', '.webm', '.mkv', '.m4a', '.mp3', '.avi'];
    const sortedPreferred = sizeMap(mediaPreferred).sort((a, b) => {
      const extA = path.extname(a.name).toLowerCase();
      const extB = path.extname(b.name).toLowerCase();
      const pa = extPriority.indexOf(extA);
      const pb = extPriority.indexOf(extB);
      if (pa !== pb) return pa - pb;
      return b.size - a.size;
    });
    const sortedFallback = sortedPreferred.length ? sortedPreferred : sizeMap(nonTemp);

    if (!sortedFallback.length) {
      const listed = allFiles.map(({ name }) => name).join(', ');
      throw new Error(`Download finished but file not found. Dir contents: [${listed}]`);
    }

    const picked = sortedFallback[0];
    
    // Basic validation - check if file is not empty and has reasonable size
    if (picked.size < 1000) {
      throw new Error(`Downloaded file seems too small (${picked.size} bytes) - possibly corrupted`);
    }
    
    const publicUrl = `/uploads/${path.basename(sessionDir)}/${picked.name}`;
    
    // Save to database
    const videoRecord = await prisma.videoDownload.create({
      data: {
        userId,
        title,
        originalUrl: url,
        filename: picked.name,
        filePath: picked.full,
        publicUrl,
        fileSize: picked.size,
        duration,
        thumbnail,
        service: 'youtube',
      },
    });
    
    logger.info(`Downloaded and saved ${picked.name} (${picked.size} bytes) for user ${userId}`);
    return { 
      filePath: picked.full, 
      publicUrl, 
      filename: picked.name, 
      sizeBytes: picked.size,
      id: videoRecord.id,
      title,
      duration,
      thumbnail
    };
  } catch (err) {
    logger.error('yt-dlp download error', err);
    throw err;
  }
}

/**
 * Get all video downloads for a user
 */
async function getUserVideos(userId) {
  return await prisma.videoDownload.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete a video download by ID (only if it belongs to the user)
 */
async function deleteUserVideo(userId, videoId) {
  const video = await prisma.videoDownload.findFirst({
    where: { id: videoId, userId },
  });

  if (!video) {
    throw new Error('Video not found or access denied');
  }

  // Delete file from disk
  try {
    if (fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
      // Also try to remove the session directory if it's empty
      const sessionDir = path.dirname(video.filePath);
      try {
        fs.rmdirSync(sessionDir);
      } catch (err) {
        // Ignore if directory not empty
      }
    }
  } catch (err) {
    logger.error('Failed to delete file from disk', err);
  }

  // Delete from database
  await prisma.videoDownload.delete({
    where: { id: videoId },
  });

  return { success: true };
}

module.exports = {
  downloadVideo,
  getUserVideos,
  deleteUserVideo,
};
