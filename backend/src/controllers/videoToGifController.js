const fs = require('fs');
const path = require('path');
const { convertToGif, probeDuration } = require('../services/videoToGifService');
const { asyncHandler } = require('../middleware/errorHandler');

const convert = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Video file is required (field name: video)' });

  const inputPath = req.file.path;
  let startTime = 0;
  try {
    startTime = parseFloat(req.body.startTime || '0');
    if (isNaN(startTime) || startTime < 0) startTime = 0;
  } catch (e) { startTime = 0; }

  // Probe duration to ensure we don't go past end
  const totalDur = await probeDuration(inputPath);
  if (totalDur <= 0) {
    // cleanup input
    try { fs.unlinkSync(inputPath); } catch (e) {}
    return res.status(400).json({ error: 'Unable to read uploaded video duration' });
  }

  const available = Math.max(0, totalDur - startTime);
  if (available <= 0) {
    try { fs.unlinkSync(inputPath); } catch (e) {}
    return res.status(400).json({ error: 'startTime is beyond video duration' });
  }

  const duration = Math.min(5, available);

  // Convert
  try {
    const { publicUrl, filename } = await convertToGif(inputPath, startTime, duration);

    // remove input video after successful conversion
    try { fs.unlinkSync(inputPath); } catch (e) {}

    return res.status(200).json({ url: publicUrl, filename });
  } catch (err) {
    // cleanup input
    try { fs.unlinkSync(inputPath); } catch (e) {}
    console.error('[videoToGif] conversion error', err);
    return res.status(500).json({ error: 'Conversion failed', details: String(err.message || err) });
  }
});

module.exports = { convert };
