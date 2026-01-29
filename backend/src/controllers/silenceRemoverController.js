const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const {
    removeSilenceFromAudio,
    getUserSilenceRemoverTasks,
    deleteSilenceRemoverTask,
} = require('../services/silenceRemoverService');

const TEMP_OUTPUTS_DIR = path.join(__dirname, '..', 'temp', 'outputs');

/**
 * POST /api/remove-silence
 * Upload audio file and remove silence
 * Returns download link for processed audio
 */
const removeSilence = async (req, res) => {
    try {
        const userId = req.auth?.userId || req.headers['x-user-id'];
        
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        // Read file buffer
        const fileBuffer = fs.readFileSync(req.file.path);
        const originalFileName = req.file.originalname || 'audio.mp3';

        // Delete uploaded file immediately (we have the buffer)
        fs.unlink(req.file.path, (err) => {
            if (err) logger.error('Error deleting temp upload:', err);
        });

        // Process audio with silence removal
        const { task, outputPath } = await removeSilenceFromAudio({
            userId,
            fileBuffer,
            originalFileName,
        });

        logger.info(`Silence removal completed for user ${userId}, task ${task.id}`);

        // Check if this is a legacy request (looking for file download)
        const isLegacyEndpoint = req.path === '/remove-silence';

        if (isLegacyEndpoint) {
            // Send file directly for backward compatibility
            if (!fs.existsSync(outputPath)) {
                return res.status(404).json({ error: 'Output file not found' });
            }

            res.download(outputPath, 'silence_removed.mp3', (err) => {
                if (err) {
                    logger.error('Error sending file:', err);
                } else {
                    logger.info(`File downloaded for task ${task.id}`);
                }
            });
        } else {
            // Return task details and download URL for new API
            return res.status(200).json({
                message: 'Silence removal completed successfully',
                task: {
                    id: task.id,
                    status: task.status,
                    originalDuration: task.originalDuration,
                    processedDuration: task.processedDuration,
                    silenceRemoved: task.silenceRemoved,
                    accuracy: task.accuracy,
                    createdAt: task.createdAt,
                },
                downloadUrl: `/api/silence-remover/download/${task.id}`,
            });
        }
    } catch (error) {
        logger.error('Error in removeSilence:', error);
        return res.status(500).json({
            error: 'Error processing audio',
            details: error.message,
        });
    }
};

/**
 * GET /api/silence-remover/download/:taskId
 * Download processed audio file
 */
const downloadProcessedAudio = async (req, res) => {
    try {
        const userId = req.auth?.userId || req.headers['x-user-id'];
        const { taskId } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Fetch task from database
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const task = await prisma.silenceRemoverTask.findUnique({
            where: { id: taskId },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (task.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (task.status !== 'completed') {
            return res.status(400).json({ error: 'Task not completed yet' });
        }

        const outputPath = task.outputFilePath;

        // Check if file exists
        if (!fs.existsSync(outputPath)) {
            return res.status(404).json({ error: 'Output file not found' });
        }

        // Send file
        res.download(outputPath, 'silence_removed.mp3', (err) => {
            if (err) {
                logger.error('Error sending file:', err);
            } else {
                logger.info(`File downloaded for task ${taskId}`);
            }
        });
    } catch (error) {
        logger.error('Error in downloadProcessedAudio:', error);
        return res.status(500).json({
            error: 'Error downloading file',
            details: error.message,
        });
    }
};

/**
 * GET /api/silence-remover/tasks
 * Get silence remover task history for user
 */
const getTaskHistory = async (req, res) => {
    try {
        const userId = req.auth?.userId || req.headers['x-user-id'];

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const limit = parseInt(req.query.limit) || 20;

        const tasks = await getUserSilenceRemoverTasks(userId, limit);

        return res.status(200).json({
            message: 'Task history retrieved',
            count: tasks.length,
            tasks,
        });
    } catch (error) {
        logger.error('Error in getTaskHistory:', error);
        return res.status(500).json({
            error: 'Error fetching task history',
            details: error.message,
        });
    }
};

/**
 * GET /api/silence-remover/task/:taskId
 * Get details of a specific silence remover task
 */
const getTaskDetails = async (req, res) => {
    try {
        const userId = req.auth?.userId || req.headers['x-user-id'];
        const { taskId } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const task = await prisma.silenceRemoverTask.findUnique({
            where: { id: taskId },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (task.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        return res.status(200).json({
            message: 'Task details retrieved',
            task,
        });
    } catch (error) {
        logger.error('Error in getTaskDetails:', error);
        return res.status(500).json({
            error: 'Error fetching task details',
            details: error.message,
        });
    }
};

/**
 * DELETE /api/silence-remover/task/:taskId
 * Delete a silence remover task and cleanup files
 */
const deleteTask = async (req, res) => {
    try {
        const userId = req.auth?.userId || req.headers['x-user-id'];
        const { taskId } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        await deleteSilenceRemoverTask(taskId, userId);

        return res.status(200).json({
            message: 'Task deleted successfully',
        });
    } catch (error) {
        logger.error('Error in deleteTask:', error);
        return res.status(500).json({
            error: 'Error deleting task',
            details: error.message,
        });
    }
};

module.exports = {
    removeSilence,
    downloadProcessedAudio,
    getTaskHistory,
    getTaskDetails,
    deleteTask,
};
