const { downloadVideo, getUserVideos, deleteUserVideo, deleteAllUserVideos, getVideoInfo, enforceProjectLimitForFreePlan } = require('../services/youtubeService');
const { asyncHandler } = require('../middleware/errorHandler');
const { getJsonCache, setJsonCache, deleteCache } = require('../config/redis');
const { PLAN_DEFINITIONS } = require('../config/creditPolicy');

const PROJECTS_CACHE_TTL_SECONDS = parseInt(process.env.PROJECTS_CACHE_TTL_SECONDS || '60', 10);
const PROJECTS_LOCAL_CACHE_TTL_SECONDS = parseInt(process.env.PROJECTS_LOCAL_CACHE_TTL_SECONDS || '15', 10);
const getProjectsCacheKey = (userId) => `projects:user:${userId}`;
const localProjectsCache = new Map();

const getLocalProjectsCache = (key) => {
  const cached = localProjectsCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    localProjectsCache.delete(key);
    return null;
  }

  return cached.value;
};

const setLocalProjectsCache = (key, value) => {
  localProjectsCache.set(key, {
    value,
    expiresAt: Date.now() + PROJECTS_LOCAL_CACHE_TTL_SECONDS * 1000,
  });
};

const clearProjectsCache = async (userId) => {
  const key = getProjectsCacheKey(userId);
  localProjectsCache.delete(key);
  await deleteCache(key);
};

// POST /api/video/youtube/download
const downloadYoutubeVideo = asyncHandler(async (req, res) => {
  const { url, quality, format } = req.body;
  let userId = req.auth?.userId || req.headers['x-user-id'];
  let userEmail = req.headers['x-user-email'];
  
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  // If no userId from auth, create a temporary one for testing
  if (!userId) {
    userId = 'temp_user_' + Date.now();
    userEmail = `${userId}@temp.com`;
  }
  
  // Create/update user in database
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: { email: userEmail || `${userId}@temp.com` },
      create: {
        id: userId,
        email: userEmail || `${userId}@temp.com`,
        currentCredits: PLAN_DEFINITIONS.Free.monthlyCredits,
      },
    });
  } catch (err) {
    console.log('User upsert failed:', err.message);
  }


  const result = await downloadVideo(url, userId, { quality, format });
  await clearProjectsCache(userId);
  return res.status(200).json({
    message: 'Download complete',
    file: {
      id: result.id,
      filename: result.filename,
      title: result.title,
      duration: result.duration,
      thumbnail: result.thumbnail,
      sizeBytes: result.sizeBytes,
      path: result.filePath,
      url: result.publicUrl,
    },
  });
});

// GET /api/video/user/videos
const getUserVideoList = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const userId = req.auth?.userId || req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const pruneResult = await enforceProjectLimitForFreePlan(userId, 5);
  if (pruneResult.pruned) {
    await clearProjectsCache(userId);
  }

  const cacheKey = getProjectsCacheKey(userId);
  const localCachedVideos = getLocalProjectsCache(cacheKey);
  if (localCachedVideos) {
    return res.status(200).json({ videos: localCachedVideos, cached: true, source: 'memory', latencyMs: Date.now() - startedAt });
  }

  const cachedVideos = await getJsonCache(cacheKey);
  if (cachedVideos) {
    setLocalProjectsCache(cacheKey, cachedVideos);
    return res.status(200).json({ videos: cachedVideos, cached: true, source: 'redis', latencyMs: Date.now() - startedAt });
  }

  const videos = await getUserVideos(userId);
  setLocalProjectsCache(cacheKey, videos);
  await setJsonCache(cacheKey, videos, PROJECTS_CACHE_TTL_SECONDS);
  return res.status(200).json({ videos, cached: false, source: 'db', latencyMs: Date.now() - startedAt });
});

// DELETE /api/video/user/videos/:id
const deleteUserVideoById = asyncHandler(async (req, res) => {
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const { id } = req.params;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  await deleteUserVideo(userId, id);
  await clearProjectsCache(userId);
  return res.status(200).json({ message: 'Video deleted successfully' });
});

// POST /api/video/youtube/info
const getYoutubeVideoInfo = asyncHandler(async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const videoInfo = await getVideoInfo(url);
  return res.status(200).json(videoInfo);
});

// DELETE /api/video/user/videos/all
const deleteAllUserVideosHandler = asyncHandler(async (req, res) => {
  const userId = req.auth?.userId || req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const deletedCount = await deleteAllUserVideos(userId);
  await clearProjectsCache(userId);
  return res.status(200).json({ 
    message: 'All items deleted successfully',
    deletedCount 
  });
});

module.exports = {
  downloadYoutubeVideo,
  getUserVideoList,
  deleteUserVideoById,
  deleteAllUserVideos: deleteAllUserVideosHandler,
  getYoutubeVideoInfo,
};
