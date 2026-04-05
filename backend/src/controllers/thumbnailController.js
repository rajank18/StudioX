const fs = require('fs');
const path = require('path');
const { 
  extractFrames, 
  analyzeFrameQuality, 
  addTextToFrame,
  saveThumbnailTask 
} = require('../services/thumbnailService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/thumbnail/extract
 * Upload video and extract key frames for thumbnail selection
 */
const extractThumbnailFrames = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field name: video)' });
  }

  const videoPath = req.file.path;
  const userId = req.auth?.userId || req.headers['x-user-id'];
  const frameCount = parseInt(req.body.frameCount) || 10;

  try {
    console.log(`[Thumbnail] Extracting ${frameCount} frames from video...`);

    // Extract frames from video
    const result = await extractFrames(videoPath, frameCount);

    // Analyze frame quality
    const rankedFrames = analyzeFrameQuality(result.frames);

    // Save to database if user is authenticated
    if (userId) {
      await saveThumbnailTask(
        userId, 
        req.file.originalname, 
        result.sessionId, 
        frameCount
      );
    }

    // Clean up uploaded video
    try {
      fs.unlinkSync(videoPath);
    } catch (e) {
      console.error('Failed to delete uploaded video:', e);
    }

    return res.status(200).json({
      message: 'Frames extracted successfully',
      sessionId: result.sessionId,
      frameCount: result.frames.length,
      frames: rankedFrames,
      videoMetadata: result.videoMetadata,
    });
  } catch (err) {
    // Cleanup on error
    try {
      fs.unlinkSync(videoPath);
    } catch (e) {}
    
    console.error('[Thumbnail] Extraction error:', err);
    return res.status(500).json({ 
      error: 'Frame extraction failed', 
      details: err.message 
    });
  }
});

/**
 * POST /api/thumbnail/add-text
 * Add text overlay to a selected frame
 */
const addTextOverlay = asyncHandler(async (req, res) => {
  const { 
    sessionId, 
    frameName, 
    text, 
    fontSize, 
    fontColor, 
    position,
    fontFamily,
    showBackground,
    backgroundColor,
    backgroundOpacity,
    xPosition,
    yPosition
  } = req.body;

  if (!sessionId || !frameName || !text) {
    return res.status(400).json({ 
      error: 'sessionId, frameName, and text are required' 
    });
  }

  try {
    const framePath = path.join(__dirname, '..', 'temp', 'thumbnails', sessionId, frameName);

    if (!fs.existsSync(framePath)) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    console.log(`[Thumbnail] Adding text overlay: "${text}"`);

    const parsedX = xPosition === null || xPosition === undefined || xPosition === ''
      ? null
      : parseInt(xPosition, 10);
    const parsedY = yPosition === null || yPosition === undefined || yPosition === ''
      ? null
      : parseInt(yPosition, 10);

    const result = await addTextToFrame(framePath, text, {
      fontSize: parseInt(fontSize) || 48,
      fontColor: fontColor || 'white',
      position: position || 'bottom',
      fontFamily: fontFamily || 'Arial',
      showBackground: showBackground !== undefined ? showBackground : true,
      backgroundColor: backgroundColor || 'black',
      backgroundOpacity: parseFloat(backgroundOpacity) || 0.7,
      xPosition: Number.isFinite(parsedX) ? parsedX : null,
      yPosition: Number.isFinite(parsedY) ? parsedY : null,
    });

    return res.status(200).json({
      message: 'Text added successfully',
      thumbnail: result,
    });
  } catch (err) {
    console.error('[Thumbnail] Text overlay error:', err);
    return res.status(500).json({ 
      error: 'Failed to add text overlay', 
      details: err.message 
    });
  }
});

/**
 * GET /api/thumbnail/frames/:sessionId
 * Get all frames for a session
 */
const getSessionFrames = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const sessionDir = path.join(__dirname, '..', 'temp', 'thumbnails', sessionId);

  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    const files = fs.readdirSync(sessionDir)
      .filter(f => f.endsWith('.jpg'))
      .map(f => ({
        name: f,
        url: `/thumbnails/${sessionId}/${f}`,
        path: path.join(sessionDir, f),
        size: fs.statSync(path.join(sessionDir, f)).size,
      }));

    return res.status(200).json({
      sessionId,
      frames: files,
    });
  } catch (err) {
    console.error('[Thumbnail] Get frames error:', err);
    return res.status(500).json({ 
      error: 'Failed to retrieve frames', 
      details: err.message 
    });
  }
});

module.exports = {
  extractThumbnailFrames,
  addTextOverlay,
  getSessionFrames,
};
