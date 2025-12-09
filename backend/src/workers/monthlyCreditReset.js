const cron = require('node-cron');
const prisma = require('../config/prisma');
const { resetUserCredits } = require('../utils/planManager');
const logger = require('../utils/logger');

const startMonthlyCreditResetWorker = () => {
  const job = cron.schedule('0 2 * * *', async () => {
    logger.info('Starting monthly credit reset job...');

    try {
      const now = new Date();

      const usersToReset = await prisma.user.findMany({
        where: {
          creditResetAt: {
            lte: now,
          },
        },
        include: { plan: true },
      });

      if (usersToReset.length === 0) {
        logger.info('No users need credit reset');
        return;
      }

      logger.info(`Found ${usersToReset.length} users to reset`);

      let successCount = 0;
      let failureCount = 0;

      for (const user of usersToReset) {
        try {
          await resetUserCredits(user.id);
          successCount++;
        } catch (error) {
          logger.error(`Failed to reset credits for user ${user.id}`, error);
          failureCount++;
        }
      }

      logger.info(`Credit reset job completed. Success: ${successCount}, Failed: ${failureCount}`);
    } catch (error) {
      logger.error('Monthly credit reset job failed', error);
    }
  });

  logger.info('Monthly credit reset worker scheduled for daily 2:00 AM');

  return job;
};

const triggerCreditReset = async () => {
  logger.info('Manually triggering credit reset...');

  try {
    const now = new Date();

    const usersToReset = await prisma.user.findMany({
      where: {
        creditResetAt: {
          lte: now,
        },
      },
    });

    let successCount = 0;

    for (const user of usersToReset) {
      try {
        await resetUserCredits(user.id);
        successCount++;
      } catch (error) {
        logger.error(`Failed to reset credits for user ${user.id}`, error);
      }
    }

    logger.info(`Manual credit reset completed. Users reset: ${successCount}`);
    return successCount;
  } catch (error) {
    logger.error('Manual credit reset failed', error);
    throw error;
  }
};

const startTaskProcessingWorker = () => {
  const job = cron.schedule('* * * * *', async () => {
    try {
      const pendingTasks = await prisma.aiTask.findMany({
        where: { status: 'pending' },
        take: 10,
      });

      if (pendingTasks.length === 0) return;

      logger.debug(`Processing ${pendingTasks.length} pending tasks`);

      for (const task of pendingTasks) {
        try {
          await prisma.aiTask.update({
            where: { id: task.id },
            data: { status: 'processing' },
          });

          logger.debug(`Task ${task.id} moved to processing`);
        } catch (error) {
          logger.error(`Error processing task ${task.id}`, error);
        }
      }
    } catch (error) {
      logger.error('Task processing worker error', error);
    }
  });

  logger.info('Task processing worker started');
  return job;
};

module.exports = {
  startMonthlyCreditResetWorker,
  triggerCreditReset,
  startTaskProcessingWorker,
};
