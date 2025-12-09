const prisma = require('../config/prisma');
const { useCredits, getFeatureCost } = require('../utils/creditManager');
const logger = require('../utils/logger');

const createTask = async (input) => {
  try {
    const { userId, type, inputData } = input;

    const creditCost = getFeatureCost(type);

    const deductionResult = await useCredits(userId, creditCost, type);

    if (!deductionResult.success) {
      logger.warn(`Cannot create task: ${deductionResult.message}`);
      throw new Error(deductionResult.message);
    }

    const task = await prisma.aiTask.create({
      data: {
        userId,
        type,
        inputData: inputData || {},
        status: 'pending',
      },
    });

    logger.info(`Task created: ${task.id} (type: ${type})`);
    return task;
  } catch (error) {
    logger.error('Error creating task', error);
    throw error;
  }
};

const getTaskById = async (taskId) => {
  try {
    const task = await prisma.aiTask.findUnique({
      where: { id: taskId },
    });
    return task;
  } catch (error) {
    logger.error('Error fetching task', error);
    throw error;
  }
};

const getUserTasks = async (userId, limit = 50, status = null) => {
  try {
    const tasks = await prisma.aiTask.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return tasks;
  } catch (error) {
    logger.error('Error fetching user tasks', error);
    throw error;
  }
};

const updateTask = async (taskId, input) => {
  try {
    const task = await prisma.aiTask.update({
      where: { id: taskId },
      data: {
        status: input.status,
        outputData: input.outputData,
      },
    });

    logger.info(`Task updated: ${taskId} (status: ${input.status})`);
    return task;
  } catch (error) {
    logger.error('Error updating task', error);
    throw error;
  }
};

const cancelTask = async (taskId, refundCredits = true) => {
  try {
    const task = await prisma.aiTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status === 'done' || task.status === 'failed') {
      throw new Error(`Cannot cancel ${task.status} task`);
    }

    const updatedTask = await prisma.aiTask.update({
      where: { id: taskId },
      data: { status: 'cancelled' },
    });

    if (refundCredits) {
      const creditCost = getFeatureCost(task.type);
      await prisma.user.update({
        where: { id: task.userId },
        data: {
          currentCredits: {
            increment: creditCost,
          },
        },
      });

      await prisma.transaction.create({
        data: {
          userId: task.userId,
          type: 'refund',
          amount: creditCost,
          description: `Refund for cancelled task ${taskId}`,
        },
      });

      logger.info(`Task cancelled and refunded: ${taskId}`);
    }

    return updatedTask;
  } catch (error) {
    logger.error('Error cancelling task', error);
    throw error;
  }
};

const getUserTaskStats = async (userId) => {
  try {
    const tasks = await prisma.aiTask.findMany({
      where: { userId },
    });

    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      processing: tasks.filter((t) => t.status === 'processing').length,
      done: tasks.filter((t) => t.status === 'done').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
      byType: groupTasksByType(tasks),
    };

    return stats;
  } catch (error) {
    logger.error('Error fetching task stats', error);
    throw error;
  }
};

const groupTasksByType = (tasks) => {
  return tasks.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {});
};

module.exports = {
  createTask,
  getTaskById,
  getUserTasks,
  updateTask,
  cancelTask,
  getUserTaskStats,
};
