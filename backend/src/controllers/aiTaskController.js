const taskService = require('../services/taskService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getFeatureCost } = require('../utils/creditManager');
const logger = require('../utils/logger');

const createTask = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { type, inputData } = req.body;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  if (!type) {
    throw new AppError(400, 'type is required');
  }

  try {
    const task = await taskService.createTask({
      userId,
      type,
      inputData,
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
      creditDeducted: getFeatureCost(type),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient')) {
      throw new AppError(402, error.message);
    }
    throw error;
  }
});

const getTask = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  const task = await taskService.getTaskById(id);

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  if (task.userId !== userId) {
    throw new AppError(403, 'Unauthorized: Cannot access this task');
  }

  res.json({
    success: true,
    task,
  });
});

const getUserTasks = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const limit = parseInt(req.query.limit) || 50;
  const status = req.query.status;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  const tasks = await taskService.getUserTasks(userId, limit, status);

  res.json({
    success: true,
    count: tasks.length,
    tasks,
  });
});

const cancelTask = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { refund = true } = req.body;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  const task = await taskService.getTaskById(id);
  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  if (task.userId !== userId) {
    throw new AppError(403, 'Unauthorized: Cannot cancel this task');
  }

  const updatedTask = await taskService.cancelTask(id, refund);

  res.json({
    success: true,
    message: 'Task cancelled successfully',
    task: updatedTask,
    refundApplied: refund,
  });
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, outputData } = req.body;

  if (!status) {
    throw new AppError(400, 'status is required');
  }

  const validStatuses = ['pending', 'processing', 'done', 'failed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const updatedTask = await taskService.updateTask(id, {
    status,
    outputData,
  });

  res.json({
    success: true,
    message: 'Task updated successfully',
    task: updatedTask,
  });
});

const getTaskStats = asyncHandler(async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    throw new AppError(401, 'User not authenticated');
  }

  const stats = await taskService.getUserTaskStats(userId);

  res.json({
    success: true,
    stats,
  });
});

module.exports = {
  createTask,
  getTask,
  getUserTasks,
  cancelTask,
  updateTaskStatus,
  getTaskStats,
};
