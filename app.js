/**
 * Express application (exported separately from server.js so tests can use it
 * with Supertest without opening a network port).
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const env = require('./config/env');
require('./config/database'); // opens the DB and creates tables on startup

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(helmet()); // secure HTTP headers
app.use(
  cors({
    origin: env.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => res.status(200).json({ success: true, message: 'API is running.' }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
