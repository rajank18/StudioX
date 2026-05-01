const prisma = require('../config/prisma');
const logger = require('./logger');
const { PLAN_DEFINITIONS } = require('../config/creditPolicy');
const { invalidateUserCreditsCache } = require('./creditCache');

const PLAN_CREDITS = {
  Free: PLAN_DEFINITIONS.Free.monthlyCredits,
  Standard: PLAN_DEFINITIONS.Standard.monthlyCredits,
  Pro: PLAN_DEFINITIONS.Pro.monthlyCredits,
  // Legacy compatibility for existing rows
  Advanced: PLAN_DEFINITIONS.Pro.monthlyCredits,
};

const getPlanCredits = (planName) => {
  return PLAN_CREDITS[planName] || PLAN_DEFINITIONS.Free.monthlyCredits;
};

const isPlanUnlimited = (planName) => {
  return false;
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

    await invalidateUserCreditsCache(userId);

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

    const monthlyCredits = getPlanCredits(user.plan.name);
    const nextResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        currentCredits: monthlyCredits,
        creditResetAt: nextResetDate,
      },
    });

    await invalidateUserCreditsCache(userId);

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
