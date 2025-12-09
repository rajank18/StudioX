const prisma = require('../config/prisma');
const { addCredits } = require('../utils/creditManager');
const { updateUserPlan } = require('../utils/planManager');
const logger = require('../utils/logger');

const purchaseCredits = async (userId, amount, paymentMethodId) => {
  try {
    const newCredits = await addCredits(userId, amount, `Credit purchase: ${amount} credits`);

    await prisma.transaction.create({
      data: {
        userId,
        type: 'credit_purchase',
        amount,
        description: `Purchased ${amount} credits`,
      },
    });

    logger.info(`Credits purchased for user ${userId}: ${amount}`);

    return {
      success: true,
      message: 'Credits purchased successfully',
      newBalance: newCredits,
    };
  } catch (error) {
    logger.error('Error purchasing credits', error);
    throw error;
  }
};

const upgradePlan = async (userId, planName) => {
  try {
    const validPlans = ['Free', 'Standard', 'Advanced'];
    if (!validPlans.includes(planName)) {
      throw new Error(`Invalid plan: ${planName}`);
    }

    const updatedUser = await updateUserPlan(userId, planName);

    logger.info(`User ${userId} upgraded to ${planName} plan`);

    return {
      success: true,
      message: `Upgraded to ${planName} plan`,
      user: updatedUser,
    };
  } catch (error) {
    logger.error('Error upgrading plan', error);
    throw error;
  }
};

const handleStripeWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        logger.info('Subscription event received', event);
        break;

      case 'customer.subscription.deleted':
        logger.info('Subscription cancelled', event);
        break;

      case 'charge.succeeded':
        logger.info('Payment succeeded', event);
        break;

      default:
        logger.warn(`Unhandled webhook event: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    logger.error('Error handling Stripe webhook', error);
    throw error;
  }
};

const getUserBillingHistory = async (userId, limit = 100) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: {
          in: ['credit_purchase', 'credit_add', 'credit_use'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions;
  } catch (error) {
    logger.error('Error fetching billing history', error);
    throw error;
  }
};

const getNextBillingDate = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.creditResetAt) {
      return null;
    }

    return user.creditResetAt;
  } catch (error) {
    logger.error('Error calculating next billing date', error);
    throw error;
  }
};

module.exports = {
  purchaseCredits,
  upgradePlan,
  handleStripeWebhook,
  getUserBillingHistory,
  getNextBillingDate,
};
