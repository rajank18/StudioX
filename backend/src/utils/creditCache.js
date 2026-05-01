const { getJsonCache, setJsonCache, deleteCache } = require('../config/redis');

const USER_CREDITS_CACHE_TTL_SECONDS = parseInt(process.env.USER_CREDITS_CACHE_TTL_SECONDS || '60', 10);

const getUserCreditsCacheKey = (userId) => `credits:user:${String(userId || '').trim()}`;

const getCachedUserCredits = async (userId) => {
  const key = getUserCreditsCacheKey(userId);
  return getJsonCache(key);
};

const setCachedUserCredits = async (userId, creditsPayload) => {
  const key = getUserCreditsCacheKey(userId);
  await setJsonCache(key, creditsPayload, USER_CREDITS_CACHE_TTL_SECONDS);
};

const invalidateUserCreditsCache = async (userId) => {
  const key = getUserCreditsCacheKey(userId);
  await deleteCache(key);
};

module.exports = {
  getCachedUserCredits,
  setCachedUserCredits,
  invalidateUserCreditsCache,
};
