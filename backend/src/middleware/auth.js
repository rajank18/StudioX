const logger = require('../utils/logger');
const { AppError } = require('./errorHandler');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new AppError(401, 'Invalid token');
    }

    // TODO: Verify Clerk JWT token properly
    // For now, extract userId from token
    req.auth = {
      userId: token,
    };

    logger.debug('Auth middleware processing token');
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Auth error', error);
      next(new AppError(401, 'Unauthorized'));
    }
  }
};

const attachUserId = (req, res, next) => {
  try {
    if (req.auth?.userId) {
      req.userId = req.auth.userId;
      logger.debug(`User authenticated: ${req.userId}`);
      next();
    } else {
      next(new AppError(401, 'Unauthorized: No user ID found'));
    }
  } catch (error) {
    logger.error('Error attaching userId', error);
    next(new AppError(401, 'Unauthorized'));
  }
};

module.exports = {
  authMiddleware,
  attachUserId,
};
