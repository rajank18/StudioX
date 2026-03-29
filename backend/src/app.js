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

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply Clerk auth middleware
app.use(clerkAuth);
app.use(ensureUserExists);

// Serve uploaded/processed files from both uploads and outputs directories
app.use('/uploads', express.static(path.join(__dirname, 'temp', 'uploads'), {
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
app.use('/uploads', express.static(path.join(__dirname, 'temp', 'outputs'), {
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
