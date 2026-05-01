const ytDlp = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const MB = 1024 * 1024;

const FEATURE_LIMITS = {
  Free: {
    'ai-video-summary': { maxUploadBytes: 200 * MB, maxDurationSeconds: 30 * 60 },
    'ai-subtitle-generator': { maxUploadBytes: 200 * MB, maxDurationSeconds: 20 * 60 },
    'reel-cutter': { maxUploadBytes: 300 * MB, maxDurationSeconds: 25 * 60 },
  },
  Standard: {
    'ai-video-summary': { maxUploadBytes: 500 * MB, maxDurationSeconds: 90 * 60 },
    'ai-subtitle-generator': { maxUploadBytes: 500 * MB, maxDurationSeconds: 60 * 60 },
    'reel-cutter': { maxUploadBytes: 700 * MB, maxDurationSeconds: 90 * 60 },
  },
  Pro: {
    'ai-video-summary': { maxUploadBytes: 1024 * MB, maxDurationSeconds: 4 * 60 * 60 },
    'ai-subtitle-generator': { maxUploadBytes: 1024 * MB, maxDurationSeconds: 3 * 60 * 60 },
    'reel-cutter': { maxUploadBytes: 1024 * MB, maxDurationSeconds: 4 * 60 * 60 },
  },
};

const YT_DLP_PATH = 'yt-dlp';

function normalizePlanName(planName) {
  if (planName === 'Standard' || planName === 'Pro') return planName;
  return 'Free';
}

function getFeatureLimits(featureKey, planName) {
  const safePlan = normalizePlanName(planName);
  const planLimits = FEATURE_LIMITS[safePlan] || FEATURE_LIMITS.Free;
  return planLimits[featureKey] || FEATURE_LIMITS.Free[featureKey] || null;
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatBytes(bytes) {
  const safe = Math.max(0, Number(bytes) || 0);
  if (safe >= 1024 * MB) return `${(safe / (1024 * MB)).toFixed(1)} GB`;
  return `${(safe / MB).toFixed(0)} MB`;
}

function validateFeatureConstraints({ featureKey, planName, durationSeconds, fileSizeBytes }) {
  const limits = getFeatureLimits(featureKey, planName);
  if (!limits) {
    return { ok: true };
  }

  if (Number.isFinite(fileSizeBytes) && fileSizeBytes > limits.maxUploadBytes) {
    return {
      ok: false,
      statusCode: 413,
      error: `File is too large for ${normalizePlanName(planName)} plan. Max allowed: ${formatBytes(limits.maxUploadBytes)}.`,
    };
  }

  if (Number.isFinite(durationSeconds) && durationSeconds > limits.maxDurationSeconds) {
    return {
      ok: false,
      statusCode: 422,
      error: `Video is too long for ${normalizePlanName(planName)} plan. Max allowed: ${formatDuration(limits.maxDurationSeconds)}.`,
    };
  }

  return { ok: true };
}

async function getYoutubeDurationSeconds(url) {
  const info = await ytDlp(
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

  const duration = Number(info?.duration);
  return Number.isFinite(duration) ? duration : null;
}

async function getLocalVideoDurationSeconds(videoPath) {
  const metadata = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, data) => {
      if (error) return reject(error);
      resolve(data || {});
    });
  });

  const duration = Number(metadata?.format?.duration);
  return Number.isFinite(duration) ? duration : null;
}

module.exports = {
  getFeatureLimits,
  validateFeatureConstraints,
  getYoutubeDurationSeconds,
  getLocalVideoDurationSeconds,
};
