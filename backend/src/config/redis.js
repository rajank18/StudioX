const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let redisInitPromise = null;
let redisDisabled = false;
let hasLoggedRedisError = false;

const isRedisConfigured = () => Boolean(process.env.REDIS_URL);

const formatError = (error) => {
  if (!error) return 'Unknown Redis error';
  if (typeof error === 'string' && error.trim()) return error;
  if (error.message && String(error.message).trim()) return String(error.message);
  return String(error);
};

const logRedisWarningOnce = (message, error) => {
  if (hasLoggedRedisError) return;
  hasLoggedRedisError = true;
  logger.warn(message, { error: formatError(error) });
};

async function getRedisClient() {
  if (!isRedisConfigured() || redisDisabled) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  if (!redisInitPromise) {
    redisInitPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: false,
        },
      });

      client.on('error', (error) => {
        logRedisWarningOnce('Redis client error; cache disabled', error);
      });

      try {
        await client.connect();
        logger.info('Redis connected');
        redisClient = client;
      } catch (error) {
        logRedisWarningOnce('Redis connection failed; continuing without cache', error);
        redisClient = null;
        redisDisabled = true;
        try {
          await client.quit();
        } catch (_) {
          // ignore cleanup errors
        }
      }

      return redisClient;
    })();
  }

  return redisInitPromise;
}

async function getJsonCache(key) {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    const value = await client.get(key);
    if (!value) return null;

    return JSON.parse(value);
  } catch (error) {
    logger.warn('Redis get cache failed', { key, error: error.message });
    return null;
  }
}

async function setJsonCache(key, value, ttlSeconds = 60) {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  } catch (error) {
    logger.warn('Redis set cache failed', { key, error: error.message });
  }
}

async function deleteCache(key) {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.del(key);
  } catch (error) {
    logger.warn('Redis delete cache failed', { key, error: error.message });
  }
}

module.exports = {
  getJsonCache,
  setJsonCache,
  deleteCache,
};
