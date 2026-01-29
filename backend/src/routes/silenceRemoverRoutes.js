const express = require('express');
const multer = require('multer');
const path = require('path');
const {
    removeSilence,
    downloadProcessedAudio,
    getTaskHistory,
    getTaskDetails,
    deleteTask,
} = require('../controllers/silenceRemoverController');

const router = express.Router();

// Configure multer for audio upload
const upload = multer({
    dest: path.join(__dirname, '../temp/uploads'),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept audio files
        const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Please upload an audio file.'));
        }
    },
});

/**
 * POST /api/remove-silence (legacy endpoint for backward compatibility)
 * POST /api/silence-remover/remove
 * Upload audio and remove silence
 */
router.post('/remove-silence', upload.single('audio'), removeSilence);
router.post('/silence-remover/remove', upload.single('audio'), removeSilence);

/**
 * GET /api/silence-remover/download/:taskId
 * Download processed audio file
 */
router.get('/silence-remover/download/:taskId', downloadProcessedAudio);

/**
 * GET /api/silence-remover/tasks
 * Get user's silence remover task history
 */
router.get('/silence-remover/tasks', getTaskHistory);

/**
 * GET /api/silence-remover/task/:taskId
 * Get details of a specific task
 */
router.get('/silence-remover/task/:taskId', getTaskDetails);

/**
 * DELETE /api/silence-remover/task/:taskId
 * Delete a task and cleanup files
 */
router.delete('/silence-remover/task/:taskId', deleteTask);

module.exports = router;