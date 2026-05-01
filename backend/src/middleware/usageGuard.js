const buckets = new Map();

function nowMs() {
  return Date.now();
}

function getRequestKey(req) {
  const userId = req.auth?.userId || req.headers['x-user-id'];
  if (userId) return `u:${String(userId)}`;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  return `ip:${String(ip)}`;
}

function createRateLimiter({ windowMs, maxRequests, message }) {
  const safeWindowMs = Math.max(1000, Number(windowMs) || 60000);
  const safeMaxRequests = Math.max(1, Number(maxRequests) || 30);

  return (req, res, next) => {
    const key = getRequestKey(req);
    const currentTime = nowMs();

    const existing = buckets.get(key);
    if (!existing || currentTime > existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: currentTime + safeWindowMs });
      return next();
    }

    if (existing.count >= safeMaxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: message || 'Too many requests. Please try again shortly.',
      });
    }

    existing.count += 1;
    buckets.set(key, existing);
    return next();
  };
}

const aiInfoRateLimit = createRateLimiter({
  windowMs: Number(process.env.AI_INFO_WINDOW_MS || 60 * 1000),
  maxRequests: Number(process.env.AI_INFO_MAX_REQUESTS || 20),
  message: 'Too many info requests. Please wait a moment and retry.',
});

const aiGenerateRateLimit = createRateLimiter({
  windowMs: Number(process.env.AI_GENERATE_WINDOW_MS || 60 * 1000),
  maxRequests: Number(process.env.AI_GENERATE_MAX_REQUESTS || 8),
  message: 'Too many generate requests. Please wait before starting another one.',
});

module.exports = {
  aiInfoRateLimit,
  aiGenerateRateLimit,
};
