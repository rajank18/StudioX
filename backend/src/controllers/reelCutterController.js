const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  checkHealth,
  generateZipToFile,
  subscribeToProgress,
} = require('../services/hfReelCutterService');

const jobs = new Map();
const sseClients = new Map();

const outputsDir = path.join(__dirname, '..', 'temp', 'outputs');
if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true });

function makeJobId() {
  return `reel_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function toBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeOptions(payload = {}) {
  return {
    num_reels: Math.max(1, Math.min(20, Math.round(toNumber(payload.num_reels, 5)))),
    min_duration: Math.max(5, Math.min(180, Math.round(toNumber(payload.min_duration, 10)))),
    max_duration: Math.max(5, Math.min(300, Math.round(toNumber(payload.max_duration, 30)))),
    resolution: payload.resolution === '1080p' ? '1080p' : '720p',
    add_captions: toBoolean(payload.add_captions, true),
    caption_font_size: Math.max(18, Math.min(96, Math.round(toNumber(payload.caption_font_size, 48)))),
    caption_color: String(payload.caption_color || 'white').trim() || 'white',
  };
}

function setJob(jobId, patch) {
  const prev = jobs.get(jobId) || { jobId, createdAt: Date.now() };
  const next = {
    ...prev,
    ...patch,
    updatedAt: Date.now(),
  };
  jobs.set(jobId, next);
  publishProgress(jobId, next);
  return next;
}

function publishProgress(jobId, payload) {
  const clients = sseClients.get(jobId);
  if (!clients || clients.size === 0) return;

  const publicPayload = {
    jobId: payload.jobId,
    status: payload.status,
    stage: payload.stage,
    pct: payload.pct,
    done: payload.done,
    error: payload.error,
    output: payload.output || null,
    updatedAt: payload.updatedAt,
  };

  const line = `data: ${JSON.stringify(publicPayload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(line);
    } catch (_) {
      // ignore dead client writes
    }
  }
}

function removeClient(jobId, res) {
  const clients = sseClients.get(jobId);
  if (!clients) return;
  clients.delete(res);
  if (clients.size === 0) {
    sseClients.delete(jobId);
  }
}

function validateInput({ ytUrl, file, options }) {
  if ((ytUrl && file) || (!ytUrl && !file)) {
    return 'Provide exactly one input source: yt_url or video_file';
  }

  if (options.min_duration > options.max_duration) {
    return 'min_duration must be less than or equal to max_duration';
  }

  return null;
}

async function runJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  const log = (message, extra = null) => {
    if (extra) {
      console.log(`[ReelCutter][${jobId}] ${message}`, extra);
    } else {
      console.log(`[ReelCutter][${jobId}] ${message}`);
    }
  };

  const markError = (errorMessage) => {
    setJob(jobId, {
      status: 'failed',
      stage: 'error',
      pct: 100,
      done: true,
      error: errorMessage,
    });
  };

  let progressSubscription = null;

  try {
    log('start');
    setJob(jobId, {
      status: 'running',
      stage: 'health-check',
      pct: 2,
      done: false,
      error: null,
    });

    try {
      await checkHealth(jobId);
      log('health ok');
    } catch (healthError) {
      if (healthError?.code === 'HF_HEALTH_ENDPOINT_NOT_FOUND') {
        log('health endpoint missing on upstream, continuing without strict health gate');
        setJob(jobId, {
          status: 'running',
          stage: 'health-check-skipped',
          pct: 3,
          done: false,
          error: null,
        });
      } else {
        throw healthError;
      }
    }

    let streamHealthy = true;
    progressSubscription = subscribeToProgress({
      jobId,
      onEvent: (event) => {
        const stage = event?.stage || 'processing';
        const pct = Number.isFinite(event?.pct) ? Math.max(0, Math.min(100, Math.round(event.pct))) : 10;
        const done = Boolean(event?.done);
        const error = event?.error ? String(event.error) : null;

        log('stage change', { stage, pct, done, error });

        setJob(jobId, {
          status: done ? (error ? 'failed' : 'completed') : 'running',
          stage,
          pct,
          done,
          error,
        });
      },
      onError: (streamError) => {
        streamHealthy = false;
        log('progress stream degraded', streamError);
        setJob(jobId, {
          status: 'running',
          stage: 'processing (progress stream degraded)',
          error: null,
        });
      },
    });

    setJob(jobId, {
      status: 'running',
      stage: streamHealthy ? 'processing' : 'processing (poll fallback)',
      pct: Math.max(jobs.get(jobId)?.pct || 0, 5),
      done: false,
      error: null,
    });

    const outputFilename = `reel_cutter_${jobId}.zip`;
    const outputFilePath = path.join(outputsDir, outputFilename);

    const result = await generateZipToFile({
      jobId,
      ytUrl: job.ytUrl,
      videoFilePath: job.videoFilePath,
      videoOriginalName: job.videoOriginalName,
      options: job.options,
      outputFilePath,
    });

    if (progressSubscription) progressSubscription.close();

    const fileSize = fs.existsSync(outputFilePath) ? fs.statSync(outputFilePath).size : 0;
    const publicUrl = `/uploads/${outputFilename}`;

    let dbRecord = null;
    if (job.userId) {
      dbRecord = await prisma.userOutput.create({
        data: {
          userId: job.userId,
          title: `AI Reel Cutter - ${job.inputLabel}`,
          originalUrl: job.ytUrl || '',
          filename: outputFilename,
          filePath: outputFilePath,
          publicUrl,
          fileSize,
          service: 'reel-cutter',
        },
      }).catch((err) => {
        log('db save failed', err.message);
        return null;
      });
    }

    setJob(jobId, {
      status: 'completed',
      stage: 'done',
      pct: 100,
      done: true,
      error: null,
      output: {
        jobId: result.hfJobId || jobId,
        filename: outputFilename,
        publicUrl,
        downloadUrl: `/api/reel-cutter/download/${jobId}`,
        fileSize,
        videoId: dbRecord?.id || null,
      },
    });

    log('done', { filename: outputFilename, size: fileSize });
  } catch (err) {
    if (progressSubscription) progressSubscription.close();
    log('error', err);
    markError(err?.message || 'Reel cutter processing failed');
  } finally {
    if (job.videoFilePath && fs.existsSync(job.videoFilePath)) {
      try {
        fs.unlinkSync(job.videoFilePath);
      } catch (_) {
        // noop
      }
    }
  }
}

const startReelCutting = asyncHandler(async (req, res) => {
  const ytUrl = req.body?.yt_url ? String(req.body.yt_url).trim() : '';
  const videoFile = req.file || null;
  const options = normalizeOptions(req.body || {});
  const validationError = validateInput({ ytUrl, file: videoFile, options });

  if (validationError) {
    return res.status(422).json({ error: validationError });
  }

  const providedJobId = req.body?.job_id ? String(req.body.job_id).trim() : '';
  const jobId = providedJobId || makeJobId();
  const userId = req.auth?.userId || req.headers['x-user-id'] || null;

  setJob(jobId, {
    status: 'queued',
    stage: 'queued',
    pct: 0,
    done: false,
    error: null,
    userId,
    ytUrl: ytUrl || null,
    videoFilePath: videoFile?.path || null,
    videoOriginalName: videoFile?.originalname || null,
    inputLabel: ytUrl || videoFile?.originalname || 'input-video',
    options,
  });

  runJob(jobId).catch((err) => {
    setJob(jobId, {
      status: 'failed',
      stage: 'error',
      pct: 100,
      done: true,
      error: err?.message || 'Unhandled job failure',
    });
  });

  return res.status(202).json({
    job_id: jobId,
    status: 'queued',
    progress_sse: `/api/reel-cutter/progress/${jobId}`,
    status_endpoint: `/api/reel-cutter/status/${jobId}`,
    download_endpoint: `/api/reel-cutter/download/${jobId}`,
  });
});

const getReelCutterStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  return res.status(200).json(job);
});

const streamReelCutterProgress = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients.has(jobId)) {
    sseClients.set(jobId, new Set());
  }
  sseClients.get(jobId).add(res);

  res.write(`data: ${JSON.stringify({
    jobId: job.jobId,
    status: job.status,
    stage: job.stage,
    pct: job.pct,
    done: job.done,
    error: job.error,
    output: job.output || null,
    updatedAt: job.updatedAt,
  })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (_) {
      clearInterval(heartbeat);
      removeClient(jobId, res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(jobId, res);
  });
});

const downloadReelZip = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job || !job.output?.filename) {
    return res.status(404).json({ error: 'Reel ZIP is not ready yet' });
  }

  const filePath = path.join(outputsDir, job.output.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'ZIP file not found on server' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${job.output.filename}"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

module.exports = {
  startReelCutting,
  getReelCutterStatus,
  streamReelCutterProgress,
  downloadReelZip,
};
