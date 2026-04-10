const creditService = require('../services/creditService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { PLAN_DEFINITIONS } = require('../config/creditPolicy');

const purchaseCredits = asyncHandler(async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  throw new AppError(400, 'Top-up credits are currently disabled. Please upgrade your plan.');
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

  const validPlans = ['Free', 'Standard', 'Pro'];
  if (!validPlans.includes(planName)) {
    throw new AppError(400, `Invalid plan. Must be one of: ${validPlans.join(', ')}`);
  }

  try {
    const result = await creditService.upgradePlan(userId, planName);

    res.json({
      success: true,
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(400, error.message);
    }
    throw error;
  }
});

const getBillingHistory = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const limit = parseInt(req.query.limit) || 100;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  const history = await creditService.getUserBillingHistory(userId, limit);

  res.json({
    success: true,
    count: history.length,
    transactions: history,
  });
});

const getNextBillingDate = asyncHandler(async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  const nextDate = await creditService.getNextBillingDate(userId);

  res.json({
    success: true,
    nextBillingDate: nextDate,
    daysUntilReset: nextDate
      ? Math.ceil((new Date(nextDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  });
});

const stripeWebhook = asyncHandler(async (req, res) => {
  const event = req.body;

  if (!event.type) {
    throw new AppError(400, 'event.type is required');
  }

  try {
    await creditService.handleStripeWebhook(event);

    res.json({
      success: true,
      received: true,
    });
  } catch (error) {
    logger.error('Webhook processing error', error);
    throw new AppError(500, 'Webhook processing failed');
  }
});

const getPlans = asyncHandler(async (req, res) => {
  const plans = [
    {
      name: 'Free',
      monthlyCredits: PLAN_DEFINITIONS.Free.monthlyCredits,
      isUnlimited: false,
      price: PLAN_DEFINITIONS.Free.priceUsd,
      features: [
        '100 credits/month',
        'Access to AI tools with fixed per-run credits',
        'All basic tools are free',
      ],
    },
    {
      name: 'Standard',
      monthlyCredits: PLAN_DEFINITIONS.Standard.monthlyCredits,
      isUnlimited: false,
      price: PLAN_DEFINITIONS.Standard.priceUsd,
      features: [
        '500 credits/month',
        'Best for regular AI usage',
        'All basic tools remain free',
      ],
    },
    {
      name: 'Pro',
      monthlyCredits: PLAN_DEFINITIONS.Pro.monthlyCredits,
      isUnlimited: false,
      price: PLAN_DEFINITIONS.Pro.priceUsd,
      features: [
        '2000 credits/month',
        'High-volume AI usage',
        'All basic tools remain free',
      ],
    },
  ];

  res.json({
    success: true,
    plans,
  });
});

module.exports = {
  purchaseCredits,
  upgradePlan,
  getBillingHistory,
  getNextBillingDate,
  stripeWebhook,
  getPlans,
};
