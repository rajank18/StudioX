const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const prisma = require('../config/prisma');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const OUTPUT_DIR = path.join(__dirname, '..', 'temp', 'outputs');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const AUDIO = {
  MAX_BITRATE:     128_000,   // 128 kbps  — ceiling; keeps dialog/music clean
  DEFAULT_BITRATE: 128_000,
  MIN_BITRATE:      48_000,   // 48 kbps   — floor; below this sounds degraded
  RETAIN_FACTOR:      0.85,   // keep 85 % of source audio quality
};

const VIDEO = {
  MIN_BITRATE: 150_000,       // 150 kbps  — absolute floor to avoid blocky output
  MIN_TOTAL:   220_000,       // 220 kbps  — floor for total stream
};

// CRF reference values per visual content type.
// Lower CRF = better quality / larger file. Range 0–51 (libx264).
// 18–23 is visually transparent for most content.
const CRF = {
  QUALITY:   18,   // ≤ 45 % compression target
  BALANCED:  21,   // 46–70 %
  SIZE:      24,   // > 70 %   (still visually acceptable for web/mobile delivery)
};

// Resolution ladder — keeps aspect ratio, snaps to nearest standard height.
// Only downscale; never upscale.
const SCALE_LADDER = [2160, 1440, 1080, 720, 480, 360];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Clamp a number to [min, max].
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Parse and validate the user-supplied compression percentage.
 * Returns an integer in [30, 90].
 */
function parseCompressionPercent(value) {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(Math.round(n), 30, 90) : 70;
}

/**
 * Return encoding strategy based on compression target.
 *
 * preset  – FFmpeg x264 speed/quality trade-off
 * crf     – Constant Rate Factor (quality gate; final bitrate cap still applies)
 * tune    – content-aware hint to x264 optimizer
 */
function getCompressionStrategy(compressionPercent) {
  if (compressionPercent <= 45) {
    return { label: 'Quality Priority', preset: 'slow',   crf: CRF.QUALITY,   tune: 'film' };
  }
  if (compressionPercent <= 70) {
    return { label: 'Balanced',         preset: 'medium', crf: CRF.BALANCED,  tune: 'film' };
  }
  return   { label: 'Size Priority',   preset: 'faster', crf: CRF.SIZE,      tune: 'film' };
}

/**
 * Probe a video file and return its key technical properties.
 */
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const fmt         = metadata.format || {};
      const videoStream = (metadata.streams || []).find(s => s.codec_type === 'video');
      const audioStream = (metadata.streams || []).find(s => s.codec_type === 'audio');

      resolve({
        duration:     Number(fmt.duration       || 0),
        bitrate:      Number(fmt.bit_rate        || 0),
        width:        Number(videoStream?.width   || 0),
        height:       Number(videoStream?.height  || 0),
        codec:        videoStream?.codec_name     || null,
        audioCodec:   audioStream?.codec_name     || null,
        videoBitrate: Number(videoStream?.bit_rate || 0),
        audioBitrate: Number(audioStream?.bit_rate || AUDIO.DEFAULT_BITRATE),
        frameRate:    videoStream?.r_frame_rate   || null,   // e.g. "30000/1001"
        colorSpace:   videoStream?.color_space    || null,
        hasAudio:     !!audioStream,
      });
    });
  });
}

/**
 * Decide whether to scale down the resolution.
 *
 * Rules:
 *  - Quality Priority  → never downscale
 *  - Balanced          → cap at 1080p
 *  - Size Priority     → cap at 720p
 *
 * Returns a ffmpeg-compatible scale filter string, or null to skip scaling.
 */
function resolveScaleFilter(width, height, compressionPercent) {
  // Quality priority: preserve original resolution
  if (compressionPercent <= 45) return null;

  const maxHeight = compressionPercent <= 70 ? 1080 : 720;

  // Already within target — no scaling needed
  if (height <= maxHeight) return null;

  // Scale down keeping aspect ratio; ensure width is divisible by 2 (yuv420p req.)
  return `scale=-2:${maxHeight}`;
}

// ─────────────────────────────────────────────
// CORE ENCODER
// ─────────────────────────────────────────────

/**
 * Run a single FFmpeg encode pass.
 *
 * Uses a dual-constraint approach:
 *   - CRF  → quality floor (encoder won't go below this quality)
 *   - -b:v / -maxrate / -bufsize → bitrate ceiling (file size guarantee)
 *
 * This combination is more reliable than either CRF-only or CBR-only:
 *   - CRF alone can produce unexpectedly large files on complex content
 *   - CBR alone wastes bits on simple scenes
 *
 * @param {object} opts
 * @param {string}   opts.inputPath
 * @param {string}   opts.outputPath
 * @param {number}   opts.videoBitrate   Target video bitrate (bps)
 * @param {number}   opts.audioBitrate   Target audio bitrate (bps)
 * @param {string}   opts.preset         x264 preset
 * @param {number}   opts.crf            x264 CRF value
 * @param {string}   [opts.tune]         x264 tune flag
 * @param {string}   [opts.scaleFilter]  ffmpeg scale filter, e.g. 'scale=-2:720'
 * @param {boolean}  [opts.hasAudio]     Whether the source has an audio track
 * @param {Function} [opts.onProgress]   Callback(percent: number)
 */
async function encodePass({
  inputPath,
  outputPath,
  videoBitrate,
  audioBitrate,
  preset,
  crf,
  tune,
  scaleFilter,
  hasAudio = true,
  onProgress,
}) {
  const vbK      = Math.round(videoBitrate / 1000);
  const maxrateK = Math.round(videoBitrate * 1.10 / 1000);  // 10 % headroom (tighter than original 15 %)
  const bufsizeK = Math.round(videoBitrate * 1.75 / 1000);  // VBV buffer: ~1.75× target bitrate

  const outputOptions = [
    '-preset',    preset,
    '-crf',       String(crf),          // quality gate
    '-b:v',       `${vbK}k`,            // bitrate target
    '-maxrate',   `${maxrateK}k`,       // peak cap
    '-bufsize',   `${bufsizeK}k`,       // VBV buffer
    '-movflags',  '+faststart',          // web-optimised MP4 (moov atom at front)
    '-pix_fmt',   'yuv420p',            // broadest player compatibility
    '-profile:v', 'high',               // H.264 High profile
    '-level',     '4.1',                // compatible with most devices (1080p@30)
  ];

  // x264 tune: helps the encoder pick better decisions for the content type
  if (tune) outputOptions.push('-tune', tune);

  // Psychovisual optimisations (x264 private options via -x264-params)
  // aq-mode=3   — Variance AQ + auto-variance; redistributes bits toward complex areas
  // aq-strength — how aggressively bits are redistributed (0.8 is mild but effective)
  // mbtree=1    — macroblock tree rate control; improves quality on still/slow areas
  // rc-lookahead — frames ahead the encoder analyses for better bit allocation
  outputOptions.push(
    '-x264-params',
    'aq-mode=3:aq-strength=0.8:mbtree=1:rc-lookahead=40'
  );

  // Scale filter (resolution downgrade when applicable)
  const videoFilters = [];
  if (scaleFilter) videoFilters.push(scaleFilter);
  if (videoFilters.length) outputOptions.push('-vf', videoFilters.join(','));

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath)
      .videoCodec('libx264')
      .outputOptions(outputOptions);

    // Audio handling
    if (hasAudio) {
      const abK = Math.round(audioBitrate / 1000);
      cmd
        .audioCodec('aac')
        .audioBitrate(`${abK}k`)
        // AAC quality: highest-quality AAC encoder profile (requires libfdk_aac if
        // available; falls back to FFmpeg native aac which is still very good)
        .outputOptions(['-profile:a', 'aac_low']);
    } else {
      cmd.noAudio();
    }

    cmd
      .on('progress', ({ percent }) => {
        if (typeof onProgress === 'function') {
          onProgress(clamp(Math.round(Number(percent || 0)), 0, 100));
        }
      })
      .on('end',   resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

// ─────────────────────────────────────────────
// MAIN COMPRESS FUNCTION
// ─────────────────────────────────────────────

/**
 * Compress a video file to reduce its size while preserving maximum quality.
 *
 * Strategy:
 *  1. Probe source to get real bitrate/resolution data.
 *  2. Derive a target bitrate from the compression percent.
 *  3. Optionally downscale resolution (Balanced/Size modes only).
 *  4. Run up to 3 encode attempts with progressively lower bitrates if the
 *     first attempt doesn't meet the size goal.
 *  5. Safety net: if all attempts produce a larger file, copy the original.
 *
 * @param {string} inputPath  Absolute path to the source video.
 * @param {object} opts
 * @param {number|string} [opts.compressionPercent=70]  How aggressively to compress (30–90).
 * @param {Function}      [opts.onProgress]             Callback(percent: 0–100).
 * @returns {Promise<CompressionResult>}
 */
async function compressVideo(inputPath, { compressionPercent, onProgress } = {}) {
  const normalizedPercent = parseCompressionPercent(compressionPercent);
  const strategy          = getCompressionStrategy(normalizedPercent);
  const metadata          = await getVideoMetadata(inputPath);
  const inputSize         = fs.statSync(inputPath).size;

  // ── Derive source bitrate ────────────────────────────────────────────────
  // Prefer the container-level bitrate. Fall back to size/duration estimate
  // when the muxer didn't write bit_rate (common with some .mov files).
  const sourceBitrate = metadata.bitrate > 0
    ? metadata.bitrate
    : Math.round((inputSize * 8) / Math.max(metadata.duration, 1));

  // ── Calculate target bitrates ────────────────────────────────────────────
  const compressionFactor  = normalizedPercent / 100;
  const targetTotalBitrate = Math.max(
    VIDEO.MIN_TOTAL,
    Math.round(sourceBitrate * (1 - compressionFactor))
  );

  // Allocate audio bits conservatively; never waste bits above 128 kbps
  const sourceAudioBitrate = metadata.audioBitrate || AUDIO.DEFAULT_BITRATE;
  const audioBitrate = clamp(
    Math.round(sourceAudioBitrate * AUDIO.RETAIN_FACTOR),
    AUDIO.MIN_BITRATE,
    AUDIO.MAX_BITRATE
  );

  const targetVideoBitrate = Math.max(
    VIDEO.MIN_BITRATE,
    targetTotalBitrate - audioBitrate
  );

  // ── Resolution scaling decision ──────────────────────────────────────────
  const scaleFilter = resolveScaleFilter(
    metadata.width,
    metadata.height,
    normalizedPercent
  );

  // ── Output path setup ────────────────────────────────────────────────────
  const outputId       = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const outputFilename = `compressed_${outputId}.mp4`;
  const outputPath     = path.join(OUTPUT_DIR, outputFilename);

  // ── Multi-attempt encode ─────────────────────────────────────────────────
  // Each attempt reduces bitrate further if the previous output wasn't
  // smaller than the input. Ratios: 100 % → 80 % → 62 % of target.
  const ATTEMPT_FACTORS = [1.0, 0.80, 0.62];
  let chosenOutputPath  = outputPath;
  let outputSize        = Number.MAX_SAFE_INTEGER;
  const totalAttempts   = ATTEMPT_FACTORS.length;

  for (let i = 0; i < totalAttempts; i++) {
    const factor       = ATTEMPT_FACTORS[i];
    const isLastPass   = i === totalAttempts - 1;
    const attemptPath  = isLastPass
      ? outputPath
      : path.join(OUTPUT_DIR, `tmp_${outputId}_${i}.mp4`);

    await encodePass({
      inputPath,
      outputPath:    attemptPath,
      videoBitrate:  Math.max(VIDEO.MIN_BITRATE,    Math.round(targetVideoBitrate * factor)),
      audioBitrate:  Math.max(AUDIO.MIN_BITRATE,    Math.round(audioBitrate * factor)),
      preset:        strategy.preset,
      crf:           strategy.crf,
      tune:          strategy.tune,
      scaleFilter,
      hasAudio:      metadata.hasAudio,
      onProgress: (pct) => {
        if (typeof onProgress !== 'function') return;
        // Map each attempt's 0–100 % into the overall 0–99 % progress range
        const overall = ((i + pct / 100) / totalAttempts) * 100;
        onProgress(clamp(Math.round(overall), 0, 99));
      },
    });

    outputSize        = fs.statSync(attemptPath).size;
    chosenOutputPath  = attemptPath;

    if (outputSize < inputSize) break;  // ✓ Successfully reduced size
  }

  // Move winner to the canonical output path (if it's a temp file)
  if (chosenOutputPath !== outputPath) {
    fs.copyFileSync(chosenOutputPath, outputPath);
  }

  // ── Clean up temp attempt files ──────────────────────────────────────────
  for (let i = 0; i < totalAttempts - 1; i++) {
    const tmpPath = path.join(OUTPUT_DIR, `tmp_${outputId}_${i}.mp4`);
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) { /* best-effort */ }
  }

  // ── Safety net ───────────────────────────────────────────────────────────
  // If all attempts produced a larger file (e.g. already-compressed source),
  // return the original. Never give the user a bigger file.
  if (outputSize >= inputSize) {
    try { fs.unlinkSync(outputPath); } catch (_) { /* best-effort */ }
    fs.copyFileSync(inputPath, outputPath);
    outputSize = fs.statSync(outputPath).size;
  }

  // ── Build result ─────────────────────────────────────────────────────────
  const savedBytes   = Math.max(0, inputSize - outputSize);
  const savedPercent = inputSize > 0
    ? Number(((savedBytes / inputSize) * 100).toFixed(2))
    : 0;

  onProgress?.(100);

  return {
    outputPath,
    outputFilename,
    publicUrl:          `/uploads/${outputFilename}`,
    inputSize,
    outputSize,
    savedBytes,
    savedPercent,
    compressionPercent: normalizedPercent,
    strategy,
    analysis: {
      duration:     metadata.duration,
      width:        metadata.width,
      height:       metadata.height,
      bitrate:      sourceBitrate,
      targetBitrate:targetTotalBitrate,
      scaleApplied: scaleFilter ?? 'none',
    },
  };
}

// ─────────────────────────────────────────────
// DATABASE PERSISTENCE
// ─────────────────────────────────────────────

/**
 * Persist a completed compression job to the database.
 * Returns the created record, or null on failure (non-fatal).
 */
async function saveCompressedOutput({
  userId,
  title,
  outputPath,
  outputFilename,
  publicUrl,
  outputSize,
}) {
  if (!userId) return null;

  try {
    return await prisma.userOutput.create({
      data: {
        userId,
        title,
        originalUrl: '',
        filename:    outputFilename,
        filePath:    outputPath,
        publicUrl,
        fileSize:    outputSize,
        service:     'video-compressor',
      },
    });
  } catch (err) {
    console.error('[VideoCompressor] Failed to persist output:', err);
    return null;
  }
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

module.exports = {
  getVideoMetadata,
  parseCompressionPercent,
  getCompressionStrategy,
  compressVideo,
  saveCompressedOutput,
};