const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });

const { errorHandler } = require('./middleware/errorHandler');
const { clerkAuth, ensureUserExists } = require('./middleware/clerkAuth');
const userRoutes = require('./routes/userRoutes');
const aiTaskRoutes = require('./routes/aiTaskRoutes');
const billingRoutes = require('./routes/billingRoutes');
const videoRoutes = require('./routes/videoRoutes');
const silenceRemoverRoutes = require('./routes/silenceRemoverRoutes');
const videoToGifRoutes = require('./routes/videoToGifRoutes');
const noiseReductionRoutes = require('./routes/noiseReductionRoutes');
const thumbnailRoutes = require('./routes/thumbnailRoutes');
const cropResizeRoutes = require('./routes/cropResizeRoutes');
const aiVideoSummaryRoutes = require('./routes/aiVideoSummaryRoutes');
const aiSubtitleRoutes = require('./routes/aiSubtitleRoutes');
const videoEnhancementRoutes = require('./routes/videoEnhancementRoutes');
const videoCompressorRoutes = require('./routes/videoCompressorRoutes');
const reelCutterRoutes = require('./routes/reelCutterRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

const DEFAULT_LOCAL_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const getAllowedOrigins = () => {
  const rawOrigins = [process.env.FRONTEND_URLS, process.env.FRONTEND_URL]
    .filter(Boolean)
    .join(',');

  const configuredOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const localOrigins = process.env.NODE_ENV === 'production' ? [] : DEFAULT_LOCAL_ORIGINS;

  return Array.from(new Set([...configuredOrigins, ...localOrigins]));
};

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (curl/Postman/server-to-server) with no Origin header.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply Clerk auth middleware
app.use(clerkAuth);
app.use(ensureUserExists);

// Serve uploaded/processed files from both uploads and outputs directories
const os = require('os');
const storageBase = process.env.STORAGE_BASE || path.join(os.tmpdir(), 'studiox');
const uploadsPath = process.env.UPLOAD_DIR || path.join(storageBase, 'uploads');
const outputsPath = process.env.OUTPUT_DIR || path.join(storageBase, 'outputs');

app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4') || filePath.endsWith('.webm') || filePath.endsWith('.mov') || filePath.endsWith('.gif')) {
      res.setHeader('Accept-Ranges', 'bytes');
      if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif');
      } else {
        res.setHeader('Content-Type', 'video/mp4');
      }
      // Allow inline playback, not forced download
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Serve processed files from outputs directory
app.use('/uploads', express.static(outputsPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4') || filePath.endsWith('.webm') || filePath.endsWith('.mov')) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'video/mp4');
      // Allow inline playback, not forced download
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Serve thumbnail frames
app.use('/thumbnails', express.static(path.join(__dirname, 'temp', 'thumbnails'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Download endpoint with forced download headers
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const uploadsPath = path.join(__dirname, 'temp', 'uploads', filename);
  const outputsPath = path.join(__dirname, 'temp', 'outputs', filename);
  
  let filePath;
  if (fs.existsSync(uploadsPath)) {
    filePath = uploadsPath;
  } else if (fs.existsSync(outputsPath)) {
    filePath = outputsPath;
  } else {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.download(filePath);
});

app.use('/api/users', userRoutes);
app.use('/api/tasks', aiTaskRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/video', videoRoutes);
// Video-to-GIF feature routes
app.use('/api/video/to-gif', videoToGifRoutes);
// Noise reduction feature routes
app.use('/api/noise-reduction', noiseReductionRoutes);
// Crop & Resize feature routes
app.use('/api/crop-resize', cropResizeRoutes);
// Video enhancement feature routes
app.use('/api/video-enhancement', videoEnhancementRoutes);
// Video compressor feature routes
app.use('/api/video-compressor', videoCompressorRoutes);
// AI reel cutter feature routes
app.use('/api/reel-cutter', reelCutterRoutes);
// Admin routes
app.use('/api/admin', adminRoutes);
app.use('/api', silenceRemoverRoutes);
// Thumbnail generator routes
app.use('/api/thumbnail', thumbnailRoutes);
// AI Video Summary routes
app.use('/api/ai-video-summary', aiVideoSummaryRoutes);
// AI Subtitle generator routes
app.use('/api/ai-subtitle', aiSubtitleRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
