const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const aiTaskRoutes = require('./routes/aiTaskRoutes');
const billingRoutes = require('./routes/billingRoutes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/users', userRoutes);
app.use('/api/tasks', aiTaskRoutes);
app.use('/api/billing', billingRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
