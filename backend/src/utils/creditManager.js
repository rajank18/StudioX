const prisma = require('../config/prisma');
const logger = require('./logger');
const { isPlanUnlimited } = require('./planManager');

const hasEnoughCredits = async (userId, requiredCredits) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });

    if (!user || !user.plan) {
      logger.warn(`User ${userId} or plan not found`);
      return false;
    }

    if (user.plan.isUnlimited) {
      return true;
    }

    return user.currentCredits >= requiredCredits;
  } catch (error) {
    logger.error('Error checking credits', error);
    throw error;
  }
};

const getRemainingCredits = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn(`User ${userId} not found`);
      return 0;
    }

    return user.currentCredits;
  } catch (error) {
    logger.error('Error fetching remaining credits', error);
    throw error;
  }
};

const useCredits = async (userId, amount, feature) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });

    if (!user || !user.plan) {
      return {
        success: false,
        remainingCredits: 0,
        message: 'User or plan not found',
      };
    }

    if (user.plan.isUnlimited) {
      await prisma.usageLog.create({
        data: {
          userId,
          feature,
          creditsUsed: amount,
        },
      });

      logger.info(`Unlimited user ${userId} used ${amount} credits for ${feature}`);

      return {
        success: true,
        remainingCredits: user.currentCredits,
        message: 'Operation completed (unlimited plan)',
      };
    }

    if (user.currentCredits < amount) {
      return {
        success: false,
        remainingCredits: user.currentCredits,
        message: `Insufficient credits. Required: ${amount}, Available: ${user.currentCredits}`,
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        currentCredits: {
          decrement: amount,
        },
      },
    });

    await prisma.usageLog.create({
      data: {
        userId,
        feature,
        creditsUsed: amount,
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: 'credit_use',
        amount: -amount,
        description: `${feature} usage`,
      },
    });

    logger.info(`User ${userId} deducted ${amount} credits for ${feature}`);

    return {
      success: true,
      remainingCredits: updatedUser.currentCredits,
      message: `${amount} credits deducted successfully`,
    };
  } catch (error) {
    logger.error('Error deducting credits', error);
    throw error;
  }
};

const addCredits = async (userId, amount, description) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        currentCredits: {
          increment: amount,
        },
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: 'credit_add',
        amount,
        description,
      },
    });

    logger.info(`User ${userId} added ${amount} credits: ${description}`);

    return updatedUser.currentCredits;
  } catch (error) {
    logger.error('Error adding credits', error);
    throw error;
  }
};

const getFeatureCost = (feature) => {
  const featureCosts = {
    ai_video: 500,
    subtitle_generator: 200,
    silence_remover: 150,
    reel_cutter: 300,
    quality_enhancer: 250,
    noise_reduction: 200,
    video_to_gif: 100,
    thumbnail_generator: 150,
    chapter_generation: 100,
    youtube_downloader: 50,
  };

  return featureCosts[feature] || 100;
};

module.exports = {
  hasEnoughCredits,
  getRemainingCredits,
  useCredits,
  addCredits,
  getFeatureCost,
};
