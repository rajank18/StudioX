const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const prisma = require('../config/prisma');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const uploadDir = path.join(__dirname, '..', 'temp', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

async function probeDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata && metadata.format && metadata.format.duration ? metadata.format.duration : 0;
      resolve(duration);
    });
  });
}

async function convertToGif(inputPath, startTime = 0, duration = 1, gifWidth = 640) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const palettePath = path.join(uploadDir, `${id}_palette.png`);
  const outputFile = `gif_${id}.gif`;
  const outputPath = path.join(uploadDir, outputFile);

  // Ensure minimum duration of 0.1s, no maximum limit
  duration = Math.max(0.1, duration);
  
  // Clamp width to reasonable range (100-2000px)
  gifWidth = Math.max(100, Math.min(2000, gifWidth || 640));

  // First pass: generate palette for better quality
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(duration)
      .outputOptions([
        '-vf', `fps=10,scale=${gifWidth}:-1:flags=lanczos,palettegen`
      ])
      .output(palettePath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  // Second pass: use palette to generate gif
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(duration)
      .input(palettePath)
      .outputOptions([
        '-lavfi', `fps=10,scale=${gifWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse`
      ])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  // cleanup palette file
  try { fs.unlinkSync(palettePath); } catch (e) {}

  const fileSize = fs.statSync(outputPath).size;
  const publicUrl = `/uploads/${outputFile}`;

  // Save to database if userId provided
  let videoRecord = null;
  if (userId) {
    try {
      videoRecord = await prisma.userOutput.create({
        data: {
          userId,
          title: originalTitle,
          originalUrl: '',
          filename: outputFile,
          filePath: outputPath,
          publicUrl,
          fileSize,
          duration: `${duration.toFixed(1)}s`,
          service: 'video-to-gif',
        },
      });
    } catch (err) {
      console.error('Failed to save GIF to database:', err);
    }
  }

  // schedule cleanup of GIF after 10 minutes
  setTimeout(() => {
    try { fs.unlinkSync(outputPath); } catch (e) {}
  }, 1000 * 60 * 10);

  return { 
    outputPath, 
    publicUrl, 
    filename: outputFile,
    videoId: videoRecord?.id 
  };
}

module.exports = { probeDuration, convertToGif };
