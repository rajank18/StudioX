const fs = require('fs');
const path = require('path');
const modulePath = path.join(__dirname, '../../backend/node_modules');
if (!module.paths.includes(modulePath)) {
  module.paths.push(modulePath);
}

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const FIXTURES_DIR = path.join(__dirname);

function ensureFixturesDir() {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
}

/**
 * Generate synthetic 1-second test MP4 and MP3 files
 */
async function generateTestFixtures() {
  ensureFixturesDir();

  const videoPath = path.join(FIXTURES_DIR, 'sample.mp4');
  const audioPath = path.join(FIXTURES_DIR, 'sample.mp3');

  const createVideo = () =>
    new Promise((resolve, reject) => {
      if (fs.existsSync(videoPath) && fs.statSync(videoPath).size > 1000) {
        return resolve(videoPath);
      }
      ffmpeg()
        .input('color=c=blue:s=320x240:d=1.5')
        .inputFormat('lavfi')
        .input('sine=frequency=440:duration=1.5')
        .inputFormat('lavfi')
        .outputOptions(['-c:v libx264', '-c:a aac', '-pix_fmt yuv420p', '-shortest'])
        .output(videoPath)
        .on('end', () => resolve(videoPath))
        .on('error', (err) => reject(err))
        .run();
    });

  const createAudio = () =>
    new Promise((resolve, reject) => {
      if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) {
        return resolve(audioPath);
      }
      ffmpeg()
        .input('sine=frequency=440:duration=2.0')
        .inputFormat('lavfi')
        .outputOptions(['-c:a libmp3lame', '-b:a 128k'])
        .output(audioPath)
        .on('end', () => resolve(audioPath))
        .on('error', (err) => reject(err))
        .run();
    });

  try {
    await Promise.all([createVideo(), createAudio()]);
    return { videoPath, audioPath };
  } catch (err) {
    // If lavfi is not available or fails, create simple placeholder bytes
    if (!fs.existsSync(videoPath)) fs.writeFileSync(videoPath, Buffer.alloc(1024));
    if (!fs.existsSync(audioPath)) fs.writeFileSync(audioPath, Buffer.alloc(1024));
    return { videoPath, audioPath };
  }
}

module.exports = {
  generateTestFixtures,
  FIXTURES_DIR,
};
