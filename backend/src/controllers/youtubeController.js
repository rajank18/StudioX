const { downloadVideo, getUserVideos, deleteUserVideo } = require('../services/youtubeService');
const { asyncHandler } = require('../middleware/errorHandler');

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
        currentCredits: 10000,
      },
    });
  } catch (err) {
    console.log('User upsert failed:', err.message);
  }


  const result = await downloadVideo(url, userId, { quality, format });
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
  const userId = req.auth?.userId || req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const videos = await getUserVideos(userId);
  return res.status(200).json({ videos });
});

// DELETE /api/video/user/videos/:id
const deleteUserVideoById = asyncHandler(async (req, res) => {
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const { id } = req.params;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  await deleteUserVideo(userId, id);
  return res.status(200).json({ message: 'Video deleted successfully' });
});

module.exports = {
  downloadYoutubeVideo,
  getUserVideoList,
  deleteUserVideoById,
};
