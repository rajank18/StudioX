const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { PLAN_DEFINITIONS } = require('../config/creditPolicy');
const { isCreditExemptEmail } = require('../config/creditPolicy');
const { getCachedUserCredits, setCachedUserCredits } = require('../utils/creditCache');

const getUserById = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });
    return user;
  } catch (error) {
    logger.error('Error fetching user', error);
    throw error;
  }
};

const createOrUpdateUser = async (userId, email) => {
  try {
    if (!email || !email.trim()) {
      throw new Error('Email is required to create/update user');
    }

    let freePlan = await prisma.plan.findUnique({
      where: { name: 'Free' },
    });

    if (!freePlan) {
      freePlan = await prisma.plan.create({
        data: {
          name: 'Free',
          monthlyCredits: PLAN_DEFINITIONS.Free.monthlyCredits,
          isUnlimited: false,
        },
      });
    }

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: email.trim(),
      },
      create: {
        id: userId,
        email: email.trim(),
        planId: freePlan.id,
        currentCredits: PLAN_DEFINITIONS.Free.monthlyCredits,
        creditResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: { plan: true },
    });

    logger.info(`User upserted: ${userId} with email: ${email}`);
    return user;
  } catch (error) {
    logger.error('Error creating/updating user', error);
    throw error;
  }
};

const getUserCredits = async (userId) => {
  try {
    const cachedCredits = await getCachedUserCredits(userId);
    if (cachedCredits) {
      return cachedCredits;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });

    if (!user) {
      return null;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usageLogs = await prisma.usageLog.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const totalUsed = usageLogs.reduce((sum, log) => sum + log.creditsUsed, 0);
    const exempt = isCreditExemptEmail(user.email);

    const creditsPayload = {
      userId,
      currentCredits: user.currentCredits,
      monthlyAllowance: user.plan?.monthlyCredits || 0,
      planName: user.plan?.name || 'None',
      isUnlimited: user.plan?.isUnlimited || false,
      isCreditExempt: exempt,
      creditsUsedThisMonth: totalUsed,
      creditResetAt: user.creditResetAt,
    };

    await setCachedUserCredits(userId, creditsPayload);
    return creditsPayload;
  } catch (error) {
    logger.error('Error fetching user credits', error);
    throw error;
  }
};

const getUserTransactions = async (userId, limit = 50) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions;
  } catch (error) {
    logger.error('Error fetching transactions', error);
    throw error;
  }
};

module.exports = {
  getUserById,
  createOrUpdateUser,
  getUserCredits,
  getUserTransactions,
};
