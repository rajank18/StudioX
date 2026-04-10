const { AppError } = require('./errorHandler');
const { verifyAdminToken } = require('../utils/adminAuth');

const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing admin authorization token'));
  }

  const token = authHeader.slice(7).trim();
  const result = verifyAdminToken(token);

  if (!result.valid) {
    return next(new AppError(401, 'Invalid or expired admin token'));
  }

  req.admin = {
    email: result.payload.email,
    exp: result.payload.exp,
  };

  next();
};

module.exports = {
  requireAdminAuth,
};
