const prisma = require('../config/prisma');
const logger = require('./logger');

const PLAN_CREDITS = {
  Free: 10000,
  Standard: 100000,
  Advanced: 500000,
};

const getPlanCredits = (planName) => {
  return PLAN_CREDITS[planName] || 0;
};

const isPlanUnlimited = (planName) => {
  return planName === 'Advanced';
};

const getUserPlan = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });
    return user?.plan || null;
  } catch (error) {
    logger.error('Error fetching user plan', error);
    throw error;
  }
};

const updateUserPlan = async (userId, planName) => {
  try {
    let plan = await prisma.plan.findUnique({
      where: { name: planName },
    });

    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: planName,
          monthlyCredits: getPlanCredits(planName),
          isUnlimited: isPlanUnlimited(planName),
        },
      });
    }

    const monthlyCredits = getPlanCredits(planName);
    const nextResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        planId: plan.id,
        currentCredits: monthlyCredits,
        creditResetAt: nextResetDate,
      },
      include: { plan: true },
    });

    logger.info(`User ${userId} upgraded to ${planName} plan`);
    return updatedUser;
  } catch (error) {
    logger.error('Error updating user plan', error);
    throw error;
  }
};

const resetUserCredits = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });

    if (!user || !user.plan) {
      logger.warn(`Cannot reset credits for user ${userId}: user or plan not found`);
      return null;
    }

    const monthlyCredits = PLAN_CREDITS[user.plan.name];
    const nextResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        currentCredits: monthlyCredits,
        creditResetAt: nextResetDate,
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: 'monthly_reset',
        amount: monthlyCredits,
        description: `Monthly credit reset for ${user.plan.name} plan`,
      },
    });

    logger.info(`Credits reset for user ${userId}: ${monthlyCredits} credits`);
    return updatedUser;
  } catch (error) {
    logger.error('Error resetting user credits', error);
    throw error;
  }
};

module.exports = {
  PLAN_CREDITS,
  getPlanCredits,
  isPlanUnlimited,
  getUserPlan,
  updateUserPlan,
  resetUserCredits,
};
