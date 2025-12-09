const logger = require('../utils/logger');

class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof SyntaxError) {
    statusCode = 400;
    message = 'Invalid JSON';
  }

  logger.error(`[${statusCode}] ${req.method} ${req.path}`, {
    message: err.message,
    stack: isDev ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    ...(isDev && { stack: err.stack }),
  });
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
};
