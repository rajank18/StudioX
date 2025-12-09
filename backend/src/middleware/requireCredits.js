const { hasEnoughCredits } = require('../utils/creditManager');
const logger = require('../utils/logger');
const { AppError } = require('./errorHandler');

const requireCredits = (credits) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;

      if (!userId) {
        throw new AppError(401, 'User not authenticated');
      }

      const hasCredits = await hasEnoughCredits(userId, credits);

      if (!hasCredits) {
        logger.warn(`User ${userId} has insufficient credits. Required: ${credits}`);
        throw new AppError(402, `Insufficient credits. Required: ${credits}`);
      }

      req.requiredCredits = credits;
      logger.debug(`User ${userId} has sufficient credits (${credits} required)`);

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        logger.error('Error checking credits', error);
        next(new AppError(500, 'Error checking credits'));
      }
    }
  };
};

module.exports = { requireCredits };
