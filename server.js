const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { connectToMongo, closeMongoConnection } = require('./backend/config/database');
const logger = require('./backend/utils/logger');

// Import routes
const authRoutes = require('./backend/routes/auth');
const profileRoutes = require('./backend/routes/profile');
const subscriptionRoutes = require('./backend/routes/subscription');
const paymentRoutes = require('./backend/routes/payment');
const downloadRoutes = require('./backend/routes/download');
const contactRoutes = require('./backend/routes/contact');
const adminRoutes = require('./backend/routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['*'],
  maxAge: 3600
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint (root level for monitoring)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Jarvis4Everyone Backend API',
    version: '1.0.0',
    docs: '/api/docs'
  });
});

// CORS info endpoint (for debugging)
app.get('/cors-info', (req, res) => {
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];
  
  res.json({
    cors_origins: process.env.CORS_ORIGINS,
    cors_origins_list: corsOrigins,
    allowed_origins_count: corsOrigins.length
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// API health check (for consistency with other API endpoints)
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Jarvis4Everyone Backend API',
    version: '1.0.0',
    docs: '/api/docs'
  });
});

// Serve static files from React app (if dist folder exists - production build)
const distPath = path.join(__dirname, 'dist');
const fs = require('fs');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve React app for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ detail: 'API endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  logger.info('✓ Frontend static files enabled (dist folder found)');
} else {
  logger.warn('⚠ Frontend dist folder not found - API only mode');
}

// Error handling middleware
app.use((err, req, res, next) => {
  const errorMessage = err?.message || err?.toString() || 'Internal server error';
  const errorStack = err?.stack || 'No stack trace available';
  
  logger.error(`Error: ${errorMessage}`, { stack: errorStack });
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ detail: 'CORS policy violation' });
  }
  
  res.status(err.status || 500).json({
    detail: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ detail: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    await connectToMongo();
    logger.info('✓ Connected to MongoDB');
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('⚠ Shutting down application...');
  await closeMongoConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('⚠ Shutting down application...');
  await closeMongoConnection();
  process.exit(0);
});

startServer();

module.exports = app;
