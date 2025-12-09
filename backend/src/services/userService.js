const prisma = require('../config/prisma');
const logger = require('../utils/logger');

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
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      let freePlan = await prisma.plan.findUnique({
        where: { name: 'Free' },
      });

      if (!freePlan) {
        freePlan = await prisma.plan.create({
          data: {
            name: 'Free',
            monthlyCredits: 10000,
            isUnlimited: false,
          },
        });
      }

      user = await prisma.user.create({
        data: {
          id: userId,
          email,
          planId: freePlan.id,
          currentCredits: 10000,
          creditResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        include: { plan: true },
      });

      logger.info(`New user created: ${userId}`);
    }

    return user;
  } catch (error) {
    logger.error('Error creating/updating user', error);
    throw error;
  }
};

const getUserCredits = async (userId) => {
  try {
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

    return {
      userId,
      currentCredits: user.currentCredits,
      monthlyAllowance: user.plan?.monthlyCredits || 0,
      planName: user.plan?.name || 'None',
      isUnlimited: user.plan?.isUnlimited || false,
      creditsUsedThisMonth: totalUsed,
      creditResetAt: user.creditResetAt,
    };
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
