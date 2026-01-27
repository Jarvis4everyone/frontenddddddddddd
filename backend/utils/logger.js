const config = require('../config');

// Simple logger implementation
const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, Object.keys(meta).length > 0 ? meta : '');
  },

  error: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, Object.keys(meta).length > 0 ? meta : '');
  },

  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, Object.keys(meta).length > 0 ? meta : '');
  },

  debug: (message, meta = {}) => {
    if (config.app.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [DEBUG] ${message}`, Object.keys(meta).length > 0 ? meta : '');
    }
  }
};

module.exports = logger;
