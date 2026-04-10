const prisma = require('../config/prisma');
const logger = require('./logger');
const { isPlanUnlimited } = require('./planManager');
const { AI_FEATURE_CREDITS, isCreditExemptEmail } = require('../config/creditPolicy');
const { invalidateUserCreditsCache } = require('./creditCache');

const hasEnoughCredits = async (userId, requiredCredits) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });

    if (!user) {
      logger.warn(`User ${userId} not found`);
      return false;
    }

    if (isCreditExemptEmail(user.email)) {
      return true;
    }

    if (!user.plan) {
      logger.warn(`User ${userId} plan not found`);
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

    if (!user) {
      return {
        success: false,
        remainingCredits: 0,
        charged: false,
        message: 'User not found',
      };
    }

    if (isCreditExemptEmail(user.email)) {
      await prisma.usageLog.create({
        data: {
          userId,
          feature,
          creditsUsed: 0,
        },
      });

      await invalidateUserCreditsCache(userId);

      return {
        success: true,
        remainingCredits: user.currentCredits,
        charged: false,
        message: 'Credit-exempt user. No credits deducted.',
      };
    }

    if (!user.plan) {
      return {
        success: false,
        remainingCredits: user.currentCredits,
        charged: false,
        message: 'User plan not found',
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

      await invalidateUserCreditsCache(userId);

      logger.info(`Unlimited user ${userId} used ${amount} credits for ${feature}`);

      return {
        success: true,
        remainingCredits: user.currentCredits,
        charged: false,
        message: 'Operation completed (unlimited plan)',
      };
    }

    if (user.currentCredits < amount) {
      return {
        success: false,
        remainingCredits: user.currentCredits,
        charged: false,
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

    await invalidateUserCreditsCache(userId);

    logger.info(`User ${userId} deducted ${amount} credits for ${feature}`);

    return {
      success: true,
      remainingCredits: updatedUser.currentCredits,
      charged: true,
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

    await invalidateUserCreditsCache(userId);

    logger.info(`User ${userId} added ${amount} credits: ${description}`);

    return updatedUser.currentCredits;
  } catch (error) {
    logger.error('Error adding credits', error);
    throw error;
  }
};

const getFeatureCost = (feature) => {
  const featureCosts = {
    ai_video_summary: AI_FEATURE_CREDITS.AI_VIDEO_SUMMARY,
    ai_video_summary_generator: AI_FEATURE_CREDITS.AI_VIDEO_SUMMARY,
    ai_video_summary_youtube: AI_FEATURE_CREDITS.AI_VIDEO_SUMMARY,
    'ai-video-summary': AI_FEATURE_CREDITS.AI_VIDEO_SUMMARY,
    subtitle_generator: AI_FEATURE_CREDITS.AI_SUBTITLE_GENERATOR,
    ai_subtitle_generator: AI_FEATURE_CREDITS.AI_SUBTITLE_GENERATOR,
    'ai-subtitle-generator': AI_FEATURE_CREDITS.AI_SUBTITLE_GENERATOR,
    reel_cutter: AI_FEATURE_CREDITS.AI_REEL_CUTTER_BASE,
    ai_reel_cutter: AI_FEATURE_CREDITS.AI_REEL_CUTTER_BASE,
    'reel-cutter': AI_FEATURE_CREDITS.AI_REEL_CUTTER_BASE,
  };

  return featureCosts[feature] || 0;
};

const getReelCutterCost = ({ addCaptions = true } = {}) => {
  return AI_FEATURE_CREDITS.AI_REEL_CUTTER_BASE + (addCaptions ? AI_FEATURE_CREDITS.AI_REEL_CUTTER_CAPTION_ADDON : 0);
};

module.exports = {
  hasEnoughCredits,
  getRemainingCredits,
  useCredits,
  addCredits,
  getFeatureCost,
  getReelCutterCost,
};
