const userService = require('../services/userService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  const user = await userService.getUserById(userId);

  if (!user) {
    const createdUser = await userService.createOrUpdateUser(userId, req.body?.email || '');
    return res.status(201).json({
      success: true,
      message: 'User created',
      user: createdUser,
    });
  }

  res.json({
    success: true,
    user,
  });
});

const getUserCredits = asyncHandler(async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  const credits = await userService.getUserCredits(userId);

  if (!credits) {
    throw new AppError(404, 'User not found');
  }

  res.json({
    success: true,
    credits,
  });
});

const getTransactions = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const limit = parseInt(req.query.limit) || 50;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  const transactions = await userService.getUserTransactions(userId, limit);

  res.json({
    success: true,
    count: transactions.length,
    transactions,
  });
});

const upgradePlan = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { planName } = req.body;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  if (!planName) {
    throw new AppError(400, 'planName is required');
  }

  const validPlans = ['Free', 'Standard', 'Advanced'];
  if (!validPlans.includes(planName)) {
    throw new AppError(400, `Invalid plan. Must be one of: ${validPlans.join(', ')}`);
  }

  const { updateUserPlan } = require('../utils/planManager');
  const updatedUser = await updateUserPlan(userId, planName);

  logger.info(`User ${userId} upgraded to ${planName}`);

  res.json({
    success: true,
    message: `Upgraded to ${planName} plan`,
    user: updatedUser,
  });
});

const initializeUser = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { email } = req.body;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  if (!email) {
    throw new AppError(400, 'email is required');
  }

  const user = await userService.createOrUpdateUser(userId, email);

  res.status(201).json({
    success: true,
    message: 'User initialized',
    user,
  });
});

module.exports = {
  getCurrentUser,
  getUserCredits,
  getTransactions,
  upgradePlan,
  initializeUser,
};
