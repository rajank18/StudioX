const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { pipeline } = require('stream/promises');

const HF_BASE_URL = (process.env.HF_REEL_CUTTER_BASE_URL || 'https://rajan18-studiox-reel-cutter.hf.space').replace(/\/$/, '');
const HF_TOKEN = process.env.HF_REEL_CUTTER_TOKEN || process.env.HF_TOKEN || '';
const HEALTH_TIMEOUT_MS = Number(process.env.HF_REEL_CUTTER_HEALTH_TIMEOUT_MS || 10000);
const PROGRESS_CONNECT_TIMEOUT_MS = Number(process.env.HF_REEL_CUTTER_PROGRESS_CONNECT_TIMEOUT_MS || 20000);
const GENERATE_TIMEOUT_MS = Number(process.env.HF_REEL_CUTTER_GENERATE_TIMEOUT_MS || 1800000);
const RETRY_COUNT = Number(process.env.HF_REEL_CUTTER_RETRY_COUNT || 2);
const RETRY_DELAY_MS = Number(process.env.HF_REEL_CUTTER_RETRY_DELAY_MS || 1200);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriable(err) {
  const status = err?.response?.status;
  const code = err?.code;

  if (!status && (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ENOTFOUND')) {
    return true;
  }

  if (status >= 500) return true;
  return false;
}

function getAuthHeaders() {
  if (!HF_TOKEN) return {};
  return {
    Authorization: `Bearer ${HF_TOKEN}`,
  };
}

function isHfGeneric404Html(details) {
  const text = String(details || '');
  return text.includes('<!DOCTYPE html>') && text.toLowerCase().includes('hugging face') && text.includes('<h1>404</h1>');
}

function mapHfError(err, context) {
  const status = err?.response?.status;
  const details = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unknown error';
  const normalizedContext = String(context || '').toLowerCase();
  const isProgressContext = normalizedContext.includes('progress');
  const isHealthContext = normalizedContext.includes('health');

  if (status === 404 && isHfGeneric404Html(details)) {
    return {
      status: 502,
      code: 'HF_SPACE_UNAVAILABLE_OR_PRIVATE',
      message: `${context}: Hugging Face Space endpoint is not publicly reachable`,
      details: HF_TOKEN
        ? 'Space returned generic 404 HTML. Verify HF_REEL_CUTTER_BASE_URL and endpoint paths in the deployed Space.'
        : 'Space may be private/gated. Set HF_REEL_CUTTER_TOKEN in backend .env and verify HF_REEL_CUTTER_BASE_URL.',
    };
  }

  if (status === 404) {
    if (isProgressContext) {
      return {
        status: 404,
        code: 'HF_JOB_NOT_FOUND',
        message: `${context}: job not found in Hugging Face Space`,
        details,
      };
    }

    if (isHealthContext) {
      return {
        status: 502,
        code: 'HF_HEALTH_ENDPOINT_NOT_FOUND',
        message: `${context}: health endpoint not found on Hugging Face Space`,
        details,
      };
    }

    return {
      status: 502,
      code: 'HF_ENDPOINT_NOT_FOUND',
      message: `${context}: endpoint not found on Hugging Face Space`,
      details,
    };
  }

  if (status === 422) {
    return {
      status: 422,
      code: 'HF_VALIDATION_FAILED',
      message: `${context}: invalid request to Hugging Face Space`,
      details,
    };
  }

  if (status >= 500) {
    return {
      status: 502,
      code: 'HF_UPSTREAM_FAILURE',
      message: `${context}: upstream processing error`,
      details,
    };
  }

  return {
    status: 502,
    code: 'HF_REQUEST_FAILED',
    message: `${context}: request failed`,
    details,
  };
}

async function withRetry(task, { retries = RETRY_COUNT, baseDelayMs = RETRY_DELAY_MS } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetriable(err)) break;
      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  throw lastErr;
}

async function checkHealth(jobId) {
  try {
    const response = await withRetry(() => axios.get(`${HF_BASE_URL}/health`, {
      timeout: HEALTH_TIMEOUT_MS,
      headers: {
        ...getAuthHeaders(),
      },
    }));
    return response.data;
  } catch (err) {
    throw mapHfError(err, `job ${jobId} health check`);
  }
}

async function readErrorBody(responseStream) {
  try {
    const chunks = [];
    for await (const chunk of responseStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      if (Buffer.concat(chunks).length > 10240) break;
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch (_) {
    return '';
  }
}

async function generateZipToFile({
  jobId,
  ytUrl,
  videoFilePath,
  videoOriginalName,
  options,
  outputFilePath,
}) {
  const task = async () => {
    const form = new FormData();

    if (ytUrl) {
      form.append('yt_url', ytUrl);
    }

    if (videoFilePath) {
      form.append('video_file', fs.createReadStream(videoFilePath), {
        filename: videoOriginalName || path.basename(videoFilePath),
      });
    }

    form.append('job_id', jobId);
    form.append('num_reels', String(options.num_reels));
    form.append('min_duration', String(options.min_duration));
    form.append('max_duration', String(options.max_duration));
    form.append('resolution', options.resolution);
    form.append('add_captions', String(options.add_captions));
    form.append('caption_font_size', String(options.caption_font_size));
    form.append('caption_color', options.caption_color);

    const response = await axios.post(`${HF_BASE_URL}/generate`, form, {
      headers: form.getHeaders(),
      ...(HF_TOKEN ? { headers: { ...form.getHeaders(), ...getAuthHeaders() } } : {}),
      timeout: GENERATE_TIMEOUT_MS,
      responseType: 'stream',
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      const errorText = await readErrorBody(response.data);
      const syntheticError = new Error(`Upstream responded with ${response.status}`);
      syntheticError.response = {
        status: response.status,
        data: { message: errorText || 'Hugging Face Space returned non-success status' },
      };
      throw syntheticError;
    }

    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    const output = fs.createWriteStream(outputFilePath);
    await pipeline(response.data, output);

    return {
      hfJobId: response.headers['x-job-id'] || jobId,
      outputFilePath,
    };
  };

  try {
    return await withRetry(task);
  } catch (err) {
    throw mapHfError(err, `job ${jobId} generate`);
  }
}

function subscribeToProgress({ jobId, onEvent, onError, maxReconnects = 5, maxNotFoundRetries = 25 }) {
  let stopped = false;
  let reconnects = 0;
  let notFoundRetries = 0;
  let activeStream = null;
  let activeRequest = null;

  const connect = async () => {
    if (stopped) return;

    try {
      const response = await axios.get(`${HF_BASE_URL}/progress/${encodeURIComponent(jobId)}`, {
        responseType: 'stream',
        timeout: PROGRESS_CONNECT_TIMEOUT_MS,
        headers: {
          ...getAuthHeaders(),
        },
        validateStatus: (status) => status === 200 || status === 404,
      });

      if (response.status === 404) {
        // Upstream may not create the job immediately; retry before treating as a hard failure.
        if (notFoundRetries >= maxNotFoundRetries) {
          onError?.({
            status: 404,
            code: 'HF_JOB_NOT_FOUND',
            message: `job ${jobId} progress stream not found`,
            details: 'Unknown upstream job id after retry window',
          });
          return;
        }

        notFoundRetries += 1;
        await sleep(Math.min(8000, 400 * notFoundRetries));
        connect();
        return;
      }

      // Reset not-found retry counter once stream is connected.
      notFoundRetries = 0;

      activeRequest = response.request;
      activeStream = response.data;

      let buffer = '';

      response.data.on('data', (chunk) => {
        if (stopped) return;
        buffer += chunk.toString('utf8');

        const parts = buffer.split('\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;

          const payloadText = line.slice(5).trim();
          if (!payloadText) continue;

          try {
            const payload = JSON.parse(payloadText);
            onEvent?.(payload);
          } catch (_) {
            // Ignore malformed payload rows
          }
        }
      });

      const reconnect = async () => {
        if (stopped) return;
        if (reconnects >= maxReconnects) {
          onError?.({
            status: 502,
            code: 'HF_PROGRESS_STREAM_DISCONNECTED',
            message: `job ${jobId} progress stream disconnected`,
            details: 'Exceeded reconnect limit',
          });
          return;
        }

        reconnects += 1;
        await sleep(Math.min(6000, 700 * reconnects));
        connect();
      };

      response.data.on('end', reconnect);
      response.data.on('error', reconnect);
    } catch (err) {
      if (stopped) return;

      if (reconnects >= maxReconnects) {
        onError?.(mapHfError(err, `job ${jobId} progress stream`));
        return;
      }

      reconnects += 1;
      await sleep(Math.min(6000, 700 * reconnects));
      connect();
    }
  };

  connect();

  return {
    close() {
      stopped = true;
      if (activeStream) {
        try {
          activeStream.destroy();
        } catch (_) {
          // noop
        }
      }
      if (activeRequest && typeof activeRequest.destroy === 'function') {
        try {
          activeRequest.destroy();
        } catch (_) {
          // noop
        }
      }
    },
  };
}

module.exports = {
  checkHealth,
  generateZipToFile,
  subscribeToProgress,
  mapHfError,
};
