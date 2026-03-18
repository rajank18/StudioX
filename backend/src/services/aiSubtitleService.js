const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const ytDlp = require('yt-dlp-exec');
const { AssemblyAI } = require('assemblyai');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const YT_DLP_PATH = 'yt-dlp';
const WORK_DIR = path.join(__dirname, '..', 'temp', 'ai-subtitles');
const OUTPUT_DIR = path.join(__dirname, '..', 'temp', 'outputs');

function ensureDirs() {
  if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function getAssemblyAiClient() {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is required for subtitle generation');
  }

  return new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
}

function formatSrtTimestamp(ms) {
  const safeMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const millis = safeMs % 1000;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

function buildSrtFromTranscript(transcript) {
  if (Array.isArray(transcript?.utterances) && transcript.utterances.length) {
    return transcript.utterances
      .map((item, index) => {
        const start = formatSrtTimestamp(item.start ?? 0);
        const end = formatSrtTimestamp(item.end ?? (item.start ?? 0) + 1800);
        const text = String(item.text || '').trim();
        return `${index + 1}\n${start} --> ${end}\n${text}\n`;
      })
      .join('\n');
  }

  if (Array.isArray(transcript?.words) && transcript.words.length) {
    const chunks = [];
    let current = [];
    let currentStart = null;

    for (const word of transcript.words) {
      if (currentStart === null) currentStart = word.start ?? 0;
      current.push(word);

      const chunkDuration = (word.end ?? word.start ?? 0) - currentStart;
      if (current.length >= 10 || chunkDuration >= 2500 || /[.!?]$/.test(word.text || '')) {
        chunks.push(current);
        current = [];
        currentStart = null;
      }
    }

    if (current.length) chunks.push(current);

    return chunks
      .map((chunk, index) => {
        const first = chunk[0];
        const last = chunk[chunk.length - 1];
        const start = formatSrtTimestamp(first.start ?? 0);
        const end = formatSrtTimestamp((last.end ?? last.start ?? 0) + 120);
        const text = chunk.map((w) => w.text).join(' ').replace(/\s+([,.!?;:])/g, '$1').trim();
        return `${index + 1}\n${start} --> ${end}\n${text}\n`;
      })
      .join('\n');
  }

  const plain = String(transcript?.text || '').trim();
  if (!plain) {
    throw new Error('AssemblyAI returned no text for subtitle generation');
  }

  return `1\n00:00:00,000 --> 00:00:05,000\n${plain}\n`;
}

function pickDownloadedVideoFile(sessionDir) {
  const candidates = fs
    .readdirSync(sessionDir)
    .map((name) => ({
      name,
      fullPath: path.join(sessionDir, name),
    }))
    .filter((item) => fs.statSync(item.fullPath).isFile())
    .filter((item) => !/(\.part|\.ytdl|\.temp|\.aria2|\.json)$/i.test(item.name))
    .filter((item) => /\.(mp4|mkv|webm|mov|m4v)$/i.test(item.name))
    .map((item) => ({ ...item, size: fs.statSync(item.fullPath).size }))
    .sort((a, b) => b.size - a.size);

  if (!candidates.length) {
    throw new Error('Unable to locate downloaded video file');
  }

  return candidates[0].fullPath;
}

function escapePathForSubtitlesFilter(filePath) {
  return filePath
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/'/g, "\\'");
}

async function getYoutubeVideoInfo(url) {
  const videoInfo = await ytDlp(
    url,
    {
      dumpJson: true,
      skipDownload: true,
      quiet: true,
      noWarnings: true,
      extractorArgs: 'youtube:player_client=android,web;youtube:skip=ads,hls,dash',
      extractorRetries: 3,
    },
    { ytDlpPath: YT_DLP_PATH }
  );

  return {
    title: videoInfo.title || 'Untitled video',
    duration: videoInfo.duration_string || null,
    channel: videoInfo.uploader || null,
    thumbnail: videoInfo.thumbnail || null,
  };
}

function formatDurationFromSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  if (hh > 0) return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

async function getLocalVideoInfo(videoPath, originalFilename = '') {
  const stats = fs.statSync(videoPath);
  const metadata = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, data) => {
      if (error) return reject(error);
      resolve(data || {});
    });
  });

  return {
    title: originalFilename || path.basename(videoPath),
    duration: formatDurationFromSeconds(metadata?.format?.duration || 0),
    channel: 'Uploaded from device',
    thumbnail: null,
    fileSize: stats.size,
  };
}

async function downloadSourceVideo(url, sessionDir) {
  const outputTemplate = path.join(sessionDir, 'source.%(ext)s');

  await ytDlp(
    url,
    {
      format: 'bestvideo+bestaudio/best',
      mergeOutputFormat: 'mp4',
      noPlaylist: true,
      noPart: true,
      quiet: true,
      noWarnings: true,
      extractorArgs: 'youtube:player_client=android,web;youtube:skip=ads,hls,dash',
      extractorRetries: 3,
      ffmpegLocation: path.dirname(ffmpegPath),
      output: outputTemplate,
    },
    { ytDlpPath: YT_DLP_PATH }
  );

  return pickDownloadedVideoFile(sessionDir);
}

async function extractAudioFromVideo(videoPath, sessionDir) {
  const audioPath = path.join(sessionDir, `audio_${Date.now()}.mp3`);

  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(['-vn', '-ac', '1', '-ar', '16000', '-b:a', '128k'])
      .audioCodec('libmp3lame')
      .output(audioPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  if (!fs.existsSync(audioPath)) {
    throw new Error('Failed to extract audio from video');
  }

  return audioPath;
}

async function transcribeAudioWithAssemblyAi(audioPath) {
  const client = getAssemblyAiClient();

  return client.transcripts.transcribe({
    audio: audioPath,
    language_detection: true,
    speech_models: ['universal-3-pro', 'universal-2'],
    punctuate: true,
    format_text: true,
    speaker_labels: false,
  });
}

async function burnSubtitlesIntoVideo(videoPath, srtPath) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const outputFilename = `subtitled_${id}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);
  const subtitlesPathEscaped = escapePathForSubtitlesFilter(srtPath);

  const subtitleFilter = `subtitles='${subtitlesPathEscaped}':force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,BackColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,Alignment=2,MarginV=34'`;

  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoFilters(subtitleFilter)
      .outputOptions(['-c:a copy', '-movflags +faststart'])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  return { outputPath, outputFilename };
}

async function generateSubtitledVideo(url, userId) {
  ensureDirs();

  const sessionId = `subtitle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionDir = path.join(WORK_DIR, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const videoInfo = await getYoutubeVideoInfo(url);
    const sourceVideoPath = await downloadSourceVideo(url, sessionDir);
    const audioPath = await extractAudioFromVideo(sourceVideoPath, sessionDir);

    const transcript = await transcribeAudioWithAssemblyAi(audioPath);
    const srtText = buildSrtFromTranscript(transcript);

    const srtFilename = `subtitles_${Date.now()}.srt`;
    const srtPath = path.join(OUTPUT_DIR, srtFilename);
    fs.writeFileSync(srtPath, srtText, 'utf8');

    const { outputPath, outputFilename } = await burnSubtitlesIntoVideo(sourceVideoPath, srtPath);
    const fileSize = fs.statSync(outputPath).size;

    let record = null;
    if (userId) {
      try {
        record = await prisma.userOutput.create({
          data: {
            userId,
            title: `${videoInfo.title} (Subtitled)`,
            originalUrl: url,
            filename: outputFilename,
            filePath: outputPath,
            publicUrl: `/uploads/${outputFilename}`,
            fileSize,
            duration: videoInfo.duration,
            thumbnail: videoInfo.thumbnail,
            service: 'ai-subtitle-generator',
          },
        });
      } catch (error) {
        logger.warn('Failed to save subtitle video record', { error: error.message });
      }
    }

    return {
      id: record?.id,
      sessionId,
      videoInfo,
      transcriptSource: 'assemblyai',
      video: {
        filename: outputFilename,
        path: outputPath,
        url: `/uploads/${outputFilename}`,
      },
      subtitle: {
        filename: srtFilename,
        path: srtPath,
        url: `/uploads/${srtFilename}`,
      },
    };
  } finally {
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch (error) {
      logger.warn('Failed cleaning subtitle temp directory', { error: error.message });
    }
  }
}

async function generateSubtitledVideoFromFile(videoPath, userId, originalFilename = '') {
  ensureDirs();

  const sessionId = `subtitle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionDir = path.join(WORK_DIR, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const videoInfo = await getLocalVideoInfo(videoPath, originalFilename);
    const audioPath = await extractAudioFromVideo(videoPath, sessionDir);
    const transcript = await transcribeAudioWithAssemblyAi(audioPath);
    const srtText = buildSrtFromTranscript(transcript);

    const srtFilename = `subtitles_${Date.now()}.srt`;
    const srtPath = path.join(OUTPUT_DIR, srtFilename);
    fs.writeFileSync(srtPath, srtText, 'utf8');

    const { outputPath, outputFilename } = await burnSubtitlesIntoVideo(videoPath, srtPath);
    const fileSize = fs.statSync(outputPath).size;

    let record = null;
    if (userId) {
      try {
        record = await prisma.userOutput.create({
          data: {
            userId,
            title: `${videoInfo.title} (Subtitled)`,
            originalUrl: '',
            filename: outputFilename,
            filePath: outputPath,
            publicUrl: `/uploads/${outputFilename}`,
            fileSize,
            duration: videoInfo.duration,
            thumbnail: null,
            service: 'ai-subtitle-generator',
          },
        });
      } catch (error) {
        logger.warn('Failed to save uploaded subtitle video record', { error: error.message });
      }
    }

    return {
      id: record?.id,
      sessionId,
      videoInfo,
      transcriptSource: 'assemblyai',
      video: {
        filename: outputFilename,
        path: outputPath,
        url: `/uploads/${outputFilename}`,
      },
      subtitle: {
        filename: srtFilename,
        path: srtPath,
        url: `/uploads/${srtFilename}`,
      },
    };
  } finally {
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch (error) {
      logger.warn('Failed cleaning uploaded subtitle temp directory', { error: error.message });
    }
  }
}

module.exports = {
  getYoutubeVideoInfo,
  getLocalVideoInfo,
  generateSubtitledVideo,
  generateSubtitledVideoFromFile,
};
