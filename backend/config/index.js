require('dotenv').config();

module.exports = {
  // MongoDB Configuration
  mongodb: {
    url: process.env.MONGODB_URL || '',
    databaseName: process.env.DATABASE_NAME || 'saas_subscription_db'
  },

  // JWT Configuration
  jwt: {
    secretKey: process.env.JWT_SECRET_KEY || '',
    algorithm: 'HS256',
    accessTokenExpireMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '15', 10),
    refreshTokenExpireDays: parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || '7', 10)
  },

  // Razorpay Configuration
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
  },

  // Application Configuration
  app: {
    name: 'Jarvis4Everyone Backend',
    debug: process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production',
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // CORS Configuration
  cors: {
    origins: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173'
  },

  // Download Configuration
  download: {
    filePath: process.env.DOWNLOAD_FILE_PATH || './.downloads/jarvis4everyone.zip'
  },

  // Subscription Configuration
  subscription: {
    price: parseFloat(process.env.SUBSCRIPTION_PRICE || '299.0')
  }
};
