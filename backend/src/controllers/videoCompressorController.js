const fs = require('fs');
const path = require('path');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  getVideoMetadata,
  parseCompressionPercent,
  getCompressionStrategy,
  compressVideo,
  saveCompressedOutput,
} = require('../services/videoCompressorService');

const uploadSessions = new Map();
const compressionJobs = new Map();

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

function createUploadId() {
  return `compress_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function cleanupUpload(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    // best-effort cleanup
  }
}

const analyzeVideoForCompression = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field name: video)' });
  }

  const inputPath = req.file.path;
  const userId = req.auth?.userId || req.headers['x-user-id'] || null;

  try {
    const metadata = await getVideoMetadata(inputPath);
    const inputSize = fs.statSync(inputPath).size;
    const bitrate = metadata.bitrate > 0
      ? metadata.bitrate
      : Math.round((inputSize * 8) / Math.max(metadata.duration, 1));

    const uploadId = createUploadId();
    uploadSessions.set(uploadId, {
      filePath: inputPath,
      originalFilename: req.file.originalname || path.basename(inputPath),
      mimeType: req.file.mimetype || 'video/mp4',
      userId,
      inputSize,
      metadata: {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        bitrate,
      },
      createdAt: Date.now(),
    });

    return res.status(200).json({
      uploadId,
      analysis: {
        resolution: `${metadata.width}x${metadata.height}`,
        durationSeconds: Number((metadata.duration || 0).toFixed(2)),
        bitrateKbps: Math.round((bitrate || 0) / 1000),
        fileSizeBytes: inputSize,
        fileSizeLabel: formatBytes(inputSize),
      },
      compression: {
        defaultPercent: 70,
        minPercent: 30,
        maxPercent: 90,
      },
    });
  } catch (err) {
    cleanupUpload(inputPath);
    return res.status(500).json({
      error: 'Video analysis failed',
      details: String(err.message || err),
    });
  }
});

const startCompressionJob = async (jobId, uploadId, compressionPercent) => {
  const session = uploadSessions.get(uploadId);
  const job = compressionJobs.get(jobId);
  if (!session || !job) return;

  try {
    const result = await compressVideo(session.filePath, {
      compressionPercent,
      onProgress: (percent) => {
        const activeJob = compressionJobs.get(jobId);
        if (!activeJob || activeJob.status !== 'processing') return;
        activeJob.progress = percent;
      },
    });

    const title = `Compressed - ${session.originalFilename}`;
    const record = await saveCompressedOutput({
      userId: session.userId,
      title,
      outputPath: result.outputPath,
      outputFilename: result.outputFilename,
      publicUrl: result.publicUrl,
      outputSize: result.outputSize,
    });

    job.status = 'completed';
    job.progress = 100;
    job.result = {
      url: result.publicUrl,
      filename: result.outputFilename,
      videoId: record?.id,
      inputSizeBytes: result.inputSize,
      outputSizeBytes: result.outputSize,
      savedBytes: result.savedBytes,
      savedPercent: result.savedPercent,
      inputSizeLabel: formatBytes(result.inputSize),
      outputSizeLabel: formatBytes(result.outputSize),
      savedSizeLabel: formatBytes(result.savedBytes),
      appliedCompressionPercent: result.compressionPercent,
      strategy: result.strategy.label,
      analysis: result.analysis,
    };

    cleanupUpload(session.filePath);
    uploadSessions.delete(uploadId);
  } catch (err) {
    job.status = 'failed';
    job.error = String(err.message || err);
    cleanupUpload(session.filePath);
    uploadSessions.delete(uploadId);
  }
};

const processVideoCompression = asyncHandler(async (req, res) => {
  const { uploadId, compressionPercent } = req.body || {};

  if (!uploadId || !uploadSessions.has(uploadId)) {
    return res.status(400).json({ error: 'Valid uploadId is required. Please upload and analyze first.' });
  }

  const normalizedPercent = parseCompressionPercent(compressionPercent);
  const strategy = getCompressionStrategy(normalizedPercent);

  const jobId = createJobId();
  compressionJobs.set(jobId, {
    jobId,
    uploadId,
    status: 'processing',
    progress: 0,
    error: null,
    result: null,
    startedAt: Date.now(),
    strategy: strategy.label,
    compressionPercent: normalizedPercent,
  });

  startCompressionJob(jobId, uploadId, normalizedPercent).catch((err) => {
    const job = compressionJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = String(err.message || err);
    }
  });

  return res.status(202).json({
    message: 'Compression started',
    jobId,
    strategy: strategy.label,
    compressionPercent: normalizedPercent,
  });
});

const getCompressionProgress = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = compressionJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Compression job not found' });
  }

  return res.status(200).json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    strategy: job.strategy,
    compressionPercent: job.compressionPercent,
    error: job.error,
    result: job.result,
  });
});

const getCompressionFlow = asyncHandler(async (req, res) => {
  return res.status(200).json({
    flow: [
      'User Upload',
      'Pre-analysis (resolution, bitrate, duration)',
      'Select Compression Strategy',
      'FFmpeg Compression Engine',
      'Progress Tracking',
      'Output Optimized Video',
      'Preview + Download + Size Saved %',
    ],
    compression: {
      defaultPercent: 70,
      minPercent: 30,
      maxPercent: 90,
    },
    note: 'Compression is tuned for high visual quality while reducing size. Exact savings depend on source content and codec.',
  });
});

module.exports = {
  analyzeVideoForCompression,
  processVideoCompression,
  getCompressionProgress,
  getCompressionFlow,
};
