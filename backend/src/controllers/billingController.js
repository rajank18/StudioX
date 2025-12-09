const creditService = require('../services/creditService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const purchaseCredits = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { amount, paymentMethodId } = req.body;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  if (!amount || amount <= 0) {
    throw new AppError(400, 'amount must be greater than 0');
  }

  const validAmounts = [1000, 5000, 10000, 50000];
  if (!validAmounts.includes(amount)) {
    throw new AppError(400, `Invalid amount. Valid options: ${validAmounts.join(', ')}`);
  }

  try {
    const result = await creditService.purchaseCredits(userId, amount, paymentMethodId);

    res.json({
      success: true,
      message: result.message,
      creditsPurchased: amount,
      newBalance: result.newBalance,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(400, error.message);
    }
    throw error;
  }
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
      monthlyCredits: 10000,
      isUnlimited: false,
      price: 0,
      features: [
        '10,000 credits/month',
        'Basic video editing',
        'Community support',
        'Watermark on exports',
      ],
    },
    {
      name: 'Standard',
      monthlyCredits: 100000,
      isUnlimited: false,
      price: 29,
      features: [
        '100,000 credits/month',
        'All editing tools',
        'Priority support',
        'No watermark',
        'Cloud storage (50GB)',
        'Batch processing',
      ],
    },
    {
      name: 'Advanced',
      monthlyCredits: 500000,
      isUnlimited: true,
      price: 79,
      features: [
        'Unlimited credits',
        'Everything in Standard',
        'API access',
        'Team collaboration',
        'Cloud storage (500GB)',
        '4K export quality',
        'Dedicated support',
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
