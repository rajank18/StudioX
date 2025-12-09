require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');
const logger = require('./utils/logger');
const { startMonthlyCreditResetWorker, startTaskProcessingWorker } = require('./workers/monthlyCreditReset');

const PORT = process.env.PORT || 3000;

let server;

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    startMonthlyCreditResetWorker();
    startTaskProcessingWorker();

    logger.info('All workers initialized');
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await prisma.$disconnect();
        logger.info('Prisma disconnected');
      } catch (error) {
        logger.error('Error disconnecting Prisma', error);
      }

      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    logger.error('Force shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  gracefulShutdown('uncaughtException');
});

startServer();
