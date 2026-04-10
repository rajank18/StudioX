const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const logger = require('../utils/logger');
const ytDlp = require('yt-dlp-exec');
const prisma = require('../config/prisma');
const { getYtDlpAuthOptions } = require('../utils/youtubeAuth');

const UPLOADS_DIR = path.join(__dirname, '..', 'temp', 'uploads');

// Use system yt-dlp if available, fallback to bundled
const YT_DLP_PATH = 'yt-dlp'; // This will use system PATH yt-dlp

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
 * Get video info without downloading
 * @param {string} url - YouTube URL
 * @returns {{ title: string, duration: string, thumbnail: string, formats: array }}
 */
async function getVideoInfo(url) {
  try {
    const videoInfo = await ytDlp(url, {
      ...getYtDlpAuthOptions(),
      dumpJson: true,
      quiet: true,
    }, { ytDlpPath: YT_DLP_PATH });

    const title = videoInfo.title || 'Unknown Video';
    const duration = videoInfo.duration_string || null;
    const thumbnail = videoInfo.thumbnail || null;
    
    // Extract available formats with quality info
    const availableFormats = [];
    const formatMap = new Map();
    
    if (videoInfo.formats) {
      videoInfo.formats.forEach(fmt => {
        if (fmt.ext === 'mp4' && fmt.height && fmt.vcodec !== 'none') {
          const quality = `${fmt.height}p`;
          if (!formatMap.has(quality) || fmt.filesize > (formatMap.get(quality).filesize || 0)) {
            formatMap.set(quality, {
              quality,
              height: fmt.height,
              ext: 'mp4',
              filesize: fmt.filesize || 0,
              formatId: fmt.format_id,
            });
          }
        }
      });
    }
    
    // Convert to array and sort by quality
    const formats = Array.from(formatMap.values())
      .sort((a, b) => b.height - a.height)
      .map(f => ({
        quality: f.quality,
        label: `MP4 ${f.quality}`,
        filesize: f.filesize,
      }));

    return {
      title,
      duration,
      thumbnail,
      formats: formats.length > 0 ? formats : [
        { quality: '1080p', label: 'MP4 1080p', filesize: 0 },
        { quality: '720p', label: 'MP4 720p', filesize: 0 },
        { quality: '480p', label: 'MP4 480p', filesize: 0 },
        { quality: '360p', label: 'MP4 360p', filesize: 0 },
      ],
    };
  } catch (err) {
    logger.error('Error fetching video info', err);
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
  const quality = options.quality || 'best'; // e.g., '1080p', '720p', '480p', '360p'
  
  // Create unique session subdirectory to reliably locate output
  const sessionDir = path.join(UPLOADS_DIR, `dl_${Date.now()}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  // Output template inside session directory
  const outTemplate = path.join(sessionDir, '%(title)s_%(id)s.%(ext)s');

  try {
    // Get ffmpeg path for yt-dlp
    const ffmpegPath = require('ffmpeg-static');
    const ffprobePath = require('ffprobe-static').path;

    // Build format string - use simpler format to avoid YouTube blocks
    let formatString;
    if (quality !== 'best') {
      const heightMap = { '360p': 360, '480p': 480, '720p': 720, '1080p': 1080 };
      const targetHeight = heightMap[quality] || 720;
      // Simplified format selector that works better with current YouTube
      formatString = `bestvideo[height<=${targetHeight}]+bestaudio/best[height<=${targetHeight}]/best`;
    } else {
      // Use simple best format without protocol restrictions
      formatString = 'bestvideo+bestaudio/best';
    }

    const dlOptions = {
      format: formatString,
      mergeOutputFormat: format,
      preferFreeFormats: true,
      noCheckCertificates: true,
      ffmpegLocation: path.dirname(ffmpegPath),
      // Use android client to bypass signature verification and n-param challenges
      extractorArgs: 'youtube:player_client=android,web;youtube:skip=ads,hls,dash',
      noCallHome: true,
      extractorRetries: 3,
    };

    // Get video info first for title and duration - skip ads
    const videoInfo = await ytDlp(url, {
      ...getYtDlpAuthOptions(),
      dumpJson: true,
      skipDownload: true,
      noCallHome: true,
      extractorArgs: 'youtube:player_client=android,web;youtube:skip=ads,hls,dash',
      extractorRetries: 3,
    }, { ytDlpPath: YT_DLP_PATH });

    const title = videoInfo.title || 'Unknown Video';
    const duration = videoInfo.duration_string || null;
    const thumbnail = videoInfo.thumbnail || null;

    await ytDlp(url, {
      ...getYtDlpAuthOptions(),
      ...dlOptions,
      restrictFilenames: true,
      noPlaylist: true,
      noPart: true,
      output: outTemplate,
      quiet: false, // Enable verbose output for debugging
    }, { ytDlpPath: YT_DLP_PATH });

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
    const videoRecord = await prisma.userOutput.create({
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
 * Get all user outputs for a user (includes all services)
 */
async function getUserVideos(userId) {
  const userOutputs = await prisma.userOutput.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return userOutputs;
}

/**
 * Delete a user output by ID (only if it belongs to the user)
 * Handles UserOutput records for all services
 */
async function deleteUserVideo(userId, videoId) {
  const video = await prisma.userOutput.findFirst({
    where: { id: videoId, userId },
  });

  if (video) {
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
    await prisma.userOutput.delete({
      where: { id: videoId },
    });

    return { success: true };
  }

  throw new Error('Item not found or access denied');
}

/**
 * Delete all user outputs for a user (includes all services)
 */
async function deleteAllUserVideos(userId) {
  const videos = await prisma.userOutput.findMany({
    where: { userId },
  });

  // Delete video download files from disk
  for (const video of videos) {
    try {
      if (fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
        // Try to remove the session directory
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
  }

  // Delete all from database
  const videoResult = await prisma.userOutput.deleteMany({
    where: { userId },
  });

  return videoResult.count;
}

/**
 * Enforce Free plan project cap by keeping only latest N outputs.
 * Returns the number of deleted records when pruning happens.
 */
async function enforceProjectLimitForFreePlan(userId, limit = 5) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (!user || user.plan?.name !== 'Free') {
    return { pruned: false, deletedCount: 0 };
  }

  const outputs = await prisma.userOutput.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, filePath: true },
  });

  if (outputs.length <= limit) {
    return { pruned: false, deletedCount: 0 };
  }

  const staleOutputs = outputs.slice(limit);
  const staleIds = staleOutputs.map((item) => item.id);

  for (const output of staleOutputs) {
    try {
      if (output.filePath && fs.existsSync(output.filePath)) {
        fs.unlinkSync(output.filePath);
      }
    } catch (err) {
      logger.error('Failed to delete stale project file from disk', err);
    }
  }

  const result = await prisma.userOutput.deleteMany({
    where: {
      id: { in: staleIds },
      userId,
    },
  });

  logger.info(`Pruned ${result.count} stale projects for Free user ${userId}`);
  return { pruned: result.count > 0, deletedCount: result.count };
}

module.exports = {
  getVideoInfo,
  downloadVideo,
  getUserVideos,
  deleteUserVideo,
  deleteAllUserVideos,
  enforceProjectLimitForFreePlan,
};
