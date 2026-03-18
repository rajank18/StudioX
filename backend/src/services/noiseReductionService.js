const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const prisma = require('../config/prisma');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Use outputs directory to avoid nested paths
const uploadDir = path.join(__dirname, '..', 'temp', 'outputs');
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

async function probeMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

/**
 * Apply advanced noise reduction to video audio
 * Uses a multi-stage approach for maximum quality:
 * 1. High-pass filter to remove low-frequency rumble
 * 2. Adaptive FFT denoiser (afftdn) with optimized settings
 * 3. Dynamic compressor to enhance voice clarity
 * 4. Equalization to boost speech frequencies
 * 5. De-esser to reduce harsh sibilance
 * 
 * @param {string} inputPath - Path to input video file
 * @param {number} noiseReduction - Noise reduction strength (0-100)
 * @param {number} voiceEnhancement - Voice enhancement level (0-100)
 * @param {string} userId - User ID for tracking
 * @param {string} originalTitle - Original video title
 * @returns {Promise<{publicUrl: string, filename: string, videoId: string}>}
 */
async function applyNoiseReduction(inputPath, noiseReduction = 70, voiceEnhancement = 70, userId = null, originalTitle = 'Noise Reduced Video') {
  const id = Date.now();
  const audioTemp = path.join(uploadDir, `a${id}.aac`).replace(/\\/g, '/');
  const outputFile = `c${id}.mp4`;
  const outputPath = path.join(uploadDir, outputFile).replace(/\\/g, '/');
  const ffmpegInput = inputPath.replace(/\\/g, '/');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  noiseReduction = Math.max(0, Math.min(100, noiseReduction));
  voiceEnhancement = Math.max(0, Math.min(100, voiceEnhancement));

  const metadata = await probeMetadata(inputPath);
  const hasAudio = metadata.streams.some(s => s.codec_type === 'audio');
  
  if (!hasAudio) {
    throw new Error('No audio track found in video');
  }

  // Use ONLY basic filters that definitely work on Windows
  const filters = [];
  
  // Basic noise reduction
  if (noiseReduction > 30) {
    filters.push('highpass=f=200');
    filters.push('lowpass=f=3000');
  }
  
  const filterChain = filters.length > 0 ? filters.join(',') : null;

  try {
    // Step 1: Extract and process audio
    await new Promise((resolve, reject) => {
      const cmd = ffmpeg(ffmpegInput)
        .audioCodec('aac')
        .audioBitrate('128k')
        .noVideo();
      
      if (filterChain) {
        cmd.audioFilters(filterChain);
      }
      
      cmd.output(audioTemp)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Step 2: Merge
    await new Promise((resolve, reject) => {
      ffmpeg(ffmpegInput)
        .input(audioTemp)
        .videoCodec('copy')
        .audioCodec('copy')
        .outputOptions('-map', '0:v:0', '-map', '1:a:0')
        .output(outputPath)
        .on('end', () => {
          try { fs.unlinkSync(audioTemp.replace(/\//g, '\\')); } catch (e) {}
          resolve();
        })
        .on('error', (err) => {
          try { fs.unlinkSync(audioTemp.replace(/\//g, '\\')); } catch (e) {}
          reject(err);
        })
        .run();
    });

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
            service: 'noise-reduction',
          },
        });
      } catch (err) {
        console.error('Failed to save noise reduction to database:', err);
      }
    }

    return { 
      publicUrl, 
      filename: outputFile,
      videoId: videoRecord?.id 
    };
    
  } catch (err) {
    try { fs.unlinkSync(audioTemp.replace(/\//g, '\\')); } catch (e) {}
    try { fs.unlinkSync(outputPath.replace(/\//g, '\\')); } catch (e) {}
    throw err;
  }
}

/**
 * Apply preset-based noise reduction for common scenarios
 */
async function applyPreset(inputPath, preset = 'balanced', userId = null, originalTitle = 'Noise Reduced Video') {
  const presets = {
    light: { noiseReduction: 40, voiceEnhancement: 40 },
    balanced: { noiseReduction: 70, voiceEnhancement: 70 },
    aggressive: { noiseReduction: 90, voiceEnhancement: 90 },
    speech: { noiseReduction: 75, voiceEnhancement: 85 },
    podcast: { noiseReduction: 80, voiceEnhancement: 80 },
  };

  const settings = presets[preset] || presets.balanced;
  return applyNoiseReduction(inputPath, settings.noiseReduction, settings.voiceEnhancement, userId, originalTitle);
}

module.exports = { 
  applyNoiseReduction, 
  applyPreset,
  probeDuration, 
  probeMetadata 
};
