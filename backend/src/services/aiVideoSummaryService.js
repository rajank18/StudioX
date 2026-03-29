const fs = require('fs');
const path = require('path');
const ytDlp = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const OpenAI = require('openai');
const { AssemblyAI } = require('assemblyai');
const logger = require('../utils/logger');
const prisma = require('../config/prisma');

const TEMP_DIR = path.join(__dirname, '..', 'temp', 'ai-summary');
const OUTPUT_DIR = path.join(__dirname, '..', 'temp', 'outputs');
const YT_DLP_PATH = 'yt-dlp';
const OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for Whisper transcription');
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getOpenRouterClient() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is required for summary generation');
  }

  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'StudioX',
    },
  });
}

function getAssemblyAiClient() {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is required for AssemblyAI transcription');
  }

  return new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY,
  });
}

function cleanupDirSafe(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    logger.warn('Failed to cleanup AI summary temp directory', { dirPath, error: error.message });
  }
}

function formatDurationFromSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;

  if (hh > 0) {
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

async function getLocalVideoMetadata(videoPath, originalFilename = '') {
  const stats = fs.statSync(videoPath);
  const title = originalFilename || path.basename(videoPath);

  const ffprobeData = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, metadata) => {
      if (error) return reject(error);
      resolve(metadata || {});
    });
  });

  const durationSeconds = ffprobeData?.format?.duration || 0;

  return {
    title,
    duration: formatDurationFromSeconds(durationSeconds),
    channel: 'Uploaded from device',
    thumbnail: null,
    fileSize: stats.size,
  };
}

function normalizeTranscriptText(rawText) {
  if (!rawText) return '';

  return rawText
    .replace(/\r/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/\[\s*Music\s*\]/gi, ' ')
    .replace(/\[\s*Applause\s*\]/gi, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^\d+$/.test(line)) return false;
      if (/^\d{2}:\d{2}:\d{2}[\.,]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[\.,]\d{3}$/.test(line)) return false;
      if (/^\d{2}:\d{2}[\.:]\d{2}[\.,]\d{3}\s+-->\s+\d{2}:\d{2}[\.:]\d{2}[\.,]\d{3}/.test(line)) return false;
      if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/.test(line)) return false;
      if (/^WEBVTT$/i.test(line)) return false;
      if (/^(NOTE|STYLE|REGION)/i.test(line)) return false;
      return true;
    })
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function downloadYoutubeTranscript(url, sessionDir) {
  const outputTemplate = path.join(sessionDir, 'captions.%(ext)s');

  await ytDlp(
    url,
    {
      skipDownload: true,
      writeAutoSubs: true,
      writeSubs: true,
      subLangs: 'en.*,en',
      subFormat: 'vtt/srt/best',
      noPlaylist: true,
      noWarnings: true,
      extractorArgs: 'youtube:player_client=android,web;youtube:skip=ads,hls,dash',
      extractorRetries: 3,
      output: outputTemplate,
      quiet: true,
    },
    { ytDlpPath: YT_DLP_PATH }
  );

  const subtitleFiles = fs
    .readdirSync(sessionDir)
    .filter((name) => /\.(vtt|srt|srv3|ttml)$/i.test(name))
    .map((name) => path.join(sessionDir, name));

  if (!subtitleFiles.length) {
    throw new Error('No subtitles/captions were found for this video');
  }

  let bestTranscript = '';
  for (const subtitlePath of subtitleFiles) {
    try {
      const raw = fs.readFileSync(subtitlePath, 'utf8');
      const parsed = normalizeTranscriptText(raw);
      if (parsed.length > bestTranscript.length) {
        bestTranscript = parsed;
      }
    } catch (error) {
      logger.warn('Failed reading subtitle file', { subtitlePath, error: error.message });
    }
  }

  if (!bestTranscript) {
    throw new Error('Captions were downloaded but transcript text is empty');
  }

  return bestTranscript;
}

async function getYoutubeMetadata(url) {
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

async function downloadYoutubeAudio(url, sessionDir) {
  const ffmpegPath = require('ffmpeg-static');
  const outputTemplate = path.join(sessionDir, 'audio.%(ext)s');

  await ytDlp(
    url,
    {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      noPlaylist: true,
      noPart: true,
      noWarnings: true,
      preferFreeFormats: true,
      ffmpegLocation: ffmpegPath, // Pass full path to ffmpeg binary
      extractorArgs: 'youtube:player_client=android,web;youtube:skip=ads,hls,dash',
      extractorRetries: 3,
      output: outputTemplate,
      quiet: true,
    },
    { ytDlpPath: YT_DLP_PATH }
  );

  const files = fs
    .readdirSync(sessionDir)
    .filter((name) => /\.(mp3|m4a|wav|ogg)$/i.test(name))
    .map((name) => ({
      name,
      fullPath: path.join(sessionDir, name),
      size: fs.statSync(path.join(sessionDir, name)).size,
    }))
    .sort((a, b) => b.size - a.size);

  if (!files.length) {
    throw new Error('Audio extraction failed: no audio file generated');
  }

  return files[0].fullPath;
}

async function extractAudioFromLocalVideo(videoPath, sessionDir) {
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
    throw new Error('Failed to extract audio from uploaded video');
  }

  return audioPath;
}

async function transcribeAudioWithWhisper(audioPath) {
  const client = getOpenAiClient();

  const transcriptionResult = await client.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: process.env.WHISPER_MODEL || 'whisper-1',
    response_format: 'text',
  });

  if (!transcriptionResult || (typeof transcriptionResult === 'string' && !transcriptionResult.trim())) {
    throw new Error('Whisper transcription returned empty text');
  }

  const transcript = typeof transcriptionResult === 'string'
    ? transcriptionResult
    : transcriptionResult.text;

  if (!transcript || !transcript.trim()) {
    throw new Error('Whisper transcription returned empty text');
  }

  return transcript.trim();
}

async function transcribeAudioWithAssemblyAi(audioPath) {
  const client = getAssemblyAiClient();

  const transcript = await client.transcripts.transcribe({
    audio: audioPath,
    language_detection: true,
    speech_models: ['universal-3-pro', 'universal-2'],
  });

  if (!transcript || !transcript.text || !transcript.text.trim()) {
    throw new Error('AssemblyAI transcription returned empty text');
  }

  return transcript.text.trim();
}

async function summarizeTranscriptWithOpenRouter(transcript, videoTitle) {
  const client = getOpenRouterClient();

  const prompt = [
    `Video title: ${videoTitle || 'N/A'}`,
    '',
    'Write a concise and useful summary using exactly these plain-text sections:',
    'Summary',
    'One-line Summary',
    'Key Points',
    'Actionable Takeaways',
    '',
    'Formatting rules:',
    '- Return plain text only (no markdown, no #, no **, no ---)',
    '- Use short lines and clean punctuation',
    '- Use bullet lines starting with "• " under list sections',
    '',
    'Transcript:',
    transcript,
  ].join('\n');

  const completion = await client.chat.completions.create({
    model: OPENROUTER_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: 'You summarize video transcripts clearly and accurately. Do not hallucinate details not present in transcript.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const summary = completion?.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    throw new Error('OpenRouter returned an empty summary');
  }

  return summary
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-]{3,}\s*$/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function saveSummaryArtifact({
  userId,
  title,
  originalUrl = '',
  summary,
  metadata,
  transcriptSource,
}) {
  const filename = `summary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`;
  const filePath = path.join(OUTPUT_DIR, filename);

  const content = [
    'AI Video Summary',
    '================',
    `Title: ${title || 'N/A'}`,
    `Duration: ${metadata?.duration || 'N/A'}`,
    `Channel: ${metadata?.channel || 'N/A'}`,
    `Transcript Source: ${transcriptSource || 'N/A'}`,
    '',
    summary,
  ].join('\n');

  fs.writeFileSync(filePath, content, 'utf8');
  const fileSize = fs.statSync(filePath).size;

  const record = await prisma.userOutput.create({
    data: {
      userId,
      title: `${title || 'Untitled video'} (AI Summary)`,
      originalUrl,
      filename,
      filePath,
      publicUrl: `/uploads/${filename}`,
      fileSize,
      duration: metadata?.duration || null,
      thumbnail: metadata?.thumbnail || null,
      service: 'ai-video-summary',
    },
  });

  return {
    id: record.id,
    filename,
    filePath,
    publicUrl: `/uploads/${filename}`,
    fileSize,
  };
}

async function generateAiVideoSummary(url, userId) {
  ensureTempDir();

  const sessionId = `summary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionDir = path.join(TEMP_DIR, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    logger.info('AI summary started', { userId, sessionId });

    const metadata = await getYoutubeMetadata(url);
    let transcript = '';
    let transcriptSource = 'youtube-captions';

    try {
      transcript = await downloadYoutubeTranscript(url, sessionDir);
    } catch (captionError) {
      logger.warn('Caption transcript unavailable, checking audio transcription fallback', {
        sessionId,
        error: captionError.message,
      });

      const audioPath = await downloadYoutubeAudio(url, sessionDir);

      if (process.env.ASSEMBLYAI_API_KEY) {
        try {
          transcript = await transcribeAudioWithAssemblyAi(audioPath);
          transcriptSource = 'assemblyai';
        } catch (assemblyError) {
          logger.warn('AssemblyAI transcription failed, checking Whisper fallback', {
            sessionId,
            error: assemblyError.message,
          });

          if (process.env.OPENAI_API_KEY) {
            transcript = await transcribeAudioWithWhisper(audioPath);
            transcriptSource = 'whisper';
          } else {
            throw new Error(`AssemblyAI transcription failed: ${assemblyError.message}`);
          }
        }
      } else if (process.env.OPENAI_API_KEY) {
        transcript = await transcribeAudioWithWhisper(audioPath);
        transcriptSource = 'whisper';
      } else {
        throw new Error('No captions available and no transcription provider key found. Set ASSEMBLYAI_API_KEY (recommended) or OPENAI_API_KEY.');
      }
    }

    const summary = await summarizeTranscriptWithOpenRouter(transcript, metadata.title);
    const artifact = await saveSummaryArtifact({
      userId,
      title: metadata.title,
      originalUrl: url,
      summary,
      metadata,
      transcriptSource,
    });

    logger.info('AI summary completed', {
      userId,
      sessionId,
      transcriptLength: transcript.length,
      summaryLength: summary.length,
      transcriptSource,
    });

    return {
      id: artifact.id,
      sessionId,
      model: OPENROUTER_MODEL,
      transcriptSource,
      video: metadata,
      transcript,
      summary,
      artifact: {
        filename: artifact.filename,
        url: artifact.publicUrl,
        fileSize: artifact.fileSize,
      },
    };
  } finally {
    cleanupDirSafe(sessionDir);
  }
}

async function generateAiVideoSummaryFromFile(videoPath, userId, originalFilename = '') {
  ensureTempDir();

  const sessionId = `summary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionDir = path.join(TEMP_DIR, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    logger.info('AI summary (upload) started', { userId, sessionId, originalFilename });

    const metadata = await getLocalVideoMetadata(videoPath, originalFilename);
    const audioPath = await extractAudioFromLocalVideo(videoPath, sessionDir);

    let transcript = '';
    let transcriptSource = 'assemblyai';

    if (process.env.ASSEMBLYAI_API_KEY) {
      try {
        transcript = await transcribeAudioWithAssemblyAi(audioPath);
      } catch (assemblyError) {
        logger.warn('AssemblyAI transcription failed for upload, checking Whisper fallback', {
          sessionId,
          error: assemblyError.message,
        });

        if (process.env.OPENAI_API_KEY) {
          transcript = await transcribeAudioWithWhisper(audioPath);
          transcriptSource = 'whisper';
        } else {
          throw new Error(`AssemblyAI transcription failed: ${assemblyError.message}`);
        }
      }
    } else if (process.env.OPENAI_API_KEY) {
      transcript = await transcribeAudioWithWhisper(audioPath);
      transcriptSource = 'whisper';
    } else {
      throw new Error('No transcription provider key found. Set ASSEMBLYAI_API_KEY (recommended) or OPENAI_API_KEY.');
    }

    const summary = await summarizeTranscriptWithOpenRouter(transcript, metadata.title);
    const artifact = await saveSummaryArtifact({
      userId,
      title: metadata.title,
      originalUrl: '',
      summary,
      metadata,
      transcriptSource,
    });

    return {
      id: artifact.id,
      sessionId,
      model: OPENROUTER_MODEL,
      transcriptSource,
      video: metadata,
      transcript,
      summary,
      artifact: {
        filename: artifact.filename,
        url: artifact.publicUrl,
        fileSize: artifact.fileSize,
      },
    };
  } finally {
    cleanupDirSafe(sessionDir);
  }
}

module.exports = {
  generateAiVideoSummary,
  getYoutubeMetadata,
  getLocalVideoMetadata,
  generateAiVideoSummaryFromFile,
};
