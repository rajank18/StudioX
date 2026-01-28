const express = require('express');
const multer = require('multer');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
let ffmpegPath;
try {
    ffmpegPath = require('ffmpeg-static');
} catch (e) {
    ffmpegPath = null;
}

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../', 'uploads') });

router.post('/remove-silence', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    const inputFile = req.file.path;
    const outputFile = path.join(path.dirname(inputFile), `processed_${Date.now()}.mp3`);

    // Use execFile instead of exec for better security and Windows compatibility
    // Prefer bundled ffmpeg binary (ffmpeg-static) when available
    const ffmpegExec = ffmpegPath || 'ffmpeg';
    if (!ffmpegPath) logger.warn('ffmpeg-static not found; relying on system ffmpeg in PATH');

    execFile(ffmpegExec, [
        '-i', inputFile,
        '-af', 'silenceremove=start_periods=1:start_duration=1:start_threshold=-50dB:stop_periods=1:stop_duration=1:stop_threshold=-50dB',
        '-y', // Overwrite output file
        outputFile
    ], (error, stdout, stderr) => {
        // Clean up input file
        fs.unlink(inputFile, (err) => {
            if (err) logger.error('Error deleting input file:', err);
        });

        if (error) {
            logger.error('FFmpeg error:', stderr || error.message);
            // Clean up output file if it was partially created
            fs.unlink(outputFile, (err) => {
                if (err) logger.error('Error deleting output file:', err);
            });
            return res.status(500).json({ 
                error: 'Error processing audio. Make sure FFmpeg is installed and available in PATH.',
                details: stderr 
            });
        }

        // Check if output file exists
        if (!fs.existsSync(outputFile)) {
            logger.error('Output file was not created');
            return res.status(500).json({ error: 'Error processing audio - output file not created' });
        }

        // Send file and clean up after download
        res.download(outputFile, 'processed_audio.mp3', (err) => {
            if (err) {
                logger.error('Error sending file:', err);
            }
            fs.unlink(outputFile, (unlinkErr) => {
                if (unlinkErr) logger.error('Error deleting output file:', unlinkErr);
            });
        });
    });
});

module.exports = router;