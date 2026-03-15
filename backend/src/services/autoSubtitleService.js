const fs = require('fs');
const path = require('path');
const ytDlp = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const { AssemblyAI } = require('assemblyai');
const OpenAI = require('openai');
const logger = require('../utils/logger');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp', 'auto-subtitle');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'temp', 'outputs');
const YT_DLP_PATH = 'yt-dlp';

function ensureDirs() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for Whisper transcription');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getAssemblyAiClient() {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is required for AssemblyAI transcription');
  }
  return new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
}

function cleanupDirSafe(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    logger.warn('Failed to cleanup auto subtitle temp directory', {
      dirPath,
      error: error.message,
    });
  }
}

async function downloadYoutubeVideo(url, sessionDir) {
  const outputTemplate = path.join(sessionDir, 'video.%(ext)s');

  await ytDlp(
    url,
    {
      format: 'best[height<=720]',
      output: outputTemplate,
      noPlaylist: true,
      noWarnings: true,
      extractorArgs: 'youtube:player_client=android,web;youtube:skip=ads,hls,dash',
      extractorRetries: 3,
      quiet: true,
    },
    { ytDlpPath: YT_DLP_PATH }
  );

  const videoFiles = fs
    .readdirSync(sessionDir)
    .filter((name) => /\.(mp4|mkv|webm|avi|mov)$/i.test(name))
    .map((name) => path.join(sessionDir, name));

  if (!videoFiles.length) {
    throw new Error('Video download failed: no video file generated');
  }

  return videoFiles[0];
}

async function extractAudioFromVideo(videoPath, sessionDir) {
  const audioPath = path.join(sessionDir, 'audio.mp3');

  if (fs.existsSync(audioPath)) {
    return audioPath;
  }

  return new Promise((resolve, reject) => {
    ffmpeg(normalizePath(videoPath))
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .format('mp3')
      .output(normalizePath(audioPath))
      .on('end', () => resolve(audioPath))
      .on('error', (error) =>
        reject(new Error(`Failed to extract audio: ${error.message}`))
      )
      .run();
  });
}

async function transcribeAudioWithWhisper(audioPath) {
  const client = getOpenAiClient();

  const result = await client.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: process.env.WHISPER_MODEL || 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  if (!result || !result.segments) {
    throw new Error('Whisper transcription returned no segments');
  }

  return result.segments.map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }));
}

async function transcribeAudioWithAssemblyAi(audioPath) {
  const client = getAssemblyAiClient();

  const transcript = await client.transcripts.transcribe({
    audio: audioPath,
    language_detection: true,
    speech_models: ['universal-3-pro', 'universal-2'],
  });

  if (!transcript || !transcript.words?.length) {
    throw new Error('AssemblyAI transcription returned no words');
  }

  const segments = [];
  let current = { words: [], start: null, end: null };

  for (const word of transcript.words) {
    if (!current.words.length) current.start = word.start;

    current.words.push(word);
    current.end = word.end;

    const duration = current.end - current.start;

    if (current.words.length >= 5 || duration >= 8) {
      segments.push({
        start: current.start,
        end: current.end,
        text: current.words.map((w) => w.text).join(' '),
      });
      current = { words: [], start: null, end: null };
    }
  }

  if (current.words.length) {
    segments.push({
      start: current.start,
      end: current.end,
      text: current.words.map((w) => w.text).join(' '),
    });
  }

  return segments;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${h.toString().padStart(2, '0')}:${m
    .toString()
    .padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms
    .toString()
    .padStart(3, '0')}`;
}

function generateSRTFile(segments, outputPath) {
  let srt = '';

  segments.forEach((seg, i) => {
    srt += `${i + 1}\n`;
    srt += `${formatTime(seg.start)} --> ${formatTime(seg.end)}\n`;
    srt += `${seg.text}\n\n`;
  });

  fs.writeFileSync(outputPath, srt, 'utf8');
  return outputPath;
}

async function burnSubtitlesIntoVideo(videoPath, srtPath, outputPath) {
  const video = normalizePath(videoPath);
  const srt = normalizePath(srtPath).replace(/:/g, '\\:');
  const out = normalizePath(outputPath);

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file missing: ${videoPath}`);
  }

  if (!fs.existsSync(srtPath)) {
    throw new Error(`SRT file missing: ${srtPath}`);
  }

  return new Promise((resolve, reject) => {
    ffmpeg(video)
      .outputOptions([
        '-vf',
        'subtitles=${srt}',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
      ])
      .output(out)
      .on('start', (cmd) => logger.info('FFmpeg command', { cmd }))
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function generateAutoSubtitledVideo(url, userId) {
  ensureDirs();

  const sessionId = `subtitle_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const sessionDir = path.join(TEMP_DIR, sessionId);

  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    logger.info('Auto subtitle generation started', { userId, sessionId });

    const videoPath = await downloadYoutubeVideo(url, sessionDir);
    const audioPath = await extractAudioFromVideo(videoPath, sessionDir);

    const preservedAudioPath = path.join(
      OUTPUT_DIR,
      `audio_${sessionId}.mp3`
    );
    fs.copyFileSync(audioPath, preservedAudioPath);

    let segments;

    if (process.env.ASSEMBLYAI_API_KEY) {
      segments = await transcribeAudioWithAssemblyAi(audioPath);
    } else if (process.env.OPENAI_API_KEY) {
      segments = await transcribeAudioWithWhisper(audioPath);
    } else {
      throw new Error(
        'No transcription provider key found (AssemblyAI or OpenAI)'
      );
    }

    const srtPath = path.join(sessionDir, 'subtitles.srt');
    generateSRTFile(segments, srtPath);

    const outputFilename = `subtitled_${sessionId}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    await burnSubtitlesIntoVideo(videoPath, srtPath, outputPath);

    logger.info('Auto subtitle generation completed', {
      userId,
      sessionId,
      outputFilename,
    });

    return {
      sessionId,
      outputFilename,
      publicUrl: `/uploads/${outputFilename}`,
      segmentsCount: segments.length,
    };
  } finally {
    cleanupDirSafe(sessionDir);
  }
}

module.exports = {
  generateAutoSubtitledVideo,
};