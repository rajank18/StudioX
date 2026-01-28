const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const aiTaskRoutes = require('./routes/aiTaskRoutes');
const billingRoutes = require('./routes/billingRoutes');
const videoRoutes = require('./routes/videoRoutes');
const silenceRemoverRoutes = require('./routes/silenceRemoverRoutes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve downloaded files from src/temp/uploads with proper headers
app.use('/uploads', express.static(path.join(__dirname, 'temp', 'uploads'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4') || filePath.endsWith('.webm') || filePath.endsWith('.mov')) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment'); // Force download
    }
  }
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/users', userRoutes);
app.use('/api/tasks', aiTaskRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/video', videoRoutes);
app.use('/api', silenceRemoverRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
