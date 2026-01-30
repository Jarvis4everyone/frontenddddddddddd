const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const SubscriptionService = require('../services/subscriptionService');
const { getCurrentUser } = require('../middleware/auth');
const { isSubscriptionActive } = require('../utils/subscription');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Resolve file path, checking multiple possible locations
 */
function resolveFilePath(configPath) {
  // Get the project root directory (where server.js is located)
  const projectRoot = path.resolve(__dirname, '../..');
  
  // Try absolute path first
  if (path.isAbsolute(configPath)) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  
  // List of possible locations to check
  const possiblePaths = [];
  
  // 1. Relative to project root (e.g., ./downloads or ./.downloads)
  const projectRelative = path.join(projectRoot, configPath.replace(/^\.\//, ''));
  possiblePaths.push(projectRelative);
  
  // 2. In backend folder
  const backendFolder = path.join(projectRoot, 'backend');
  const backendRelative = path.join(backendFolder, configPath.replace(/^\.\//, ''));
  possiblePaths.push(backendRelative);
  
  // 3. Try with .downloads if downloads is in path
  if (configPath.includes('downloads') && !configPath.startsWith('.')) {
    const hiddenPath = configPath.replace('downloads', '.downloads');
    possiblePaths.push(path.join(projectRoot, hiddenPath));
    possiblePaths.push(path.join(backendFolder, hiddenPath));
  }
  
  // 4. Try original path as-is
  if (fs.existsSync(configPath)) {
    possiblePaths.unshift(path.resolve(configPath));
  }
  
  // Check all possible paths
  for (const filePath of possiblePaths) {
    const absPath = path.resolve(filePath);
    if (fs.existsSync(absPath)) {
      return absPath;
    }
  }
  
  // Return the first attempted path for error message
  return path.resolve(possiblePaths[0] || configPath);
}

/**
 * Download Jarvis4Everyone .zip file (requires active subscription)
 */
router.get('/file', getCurrentUser, async (req, res, next) => {
  try {
    logger.info(`📥 Download request from user: ${req.user.email} (ID: ${req.user.id})`);
    
    // Get user's subscription
    const subscription = await SubscriptionService.getUserSubscription(req.user.id);
    
    if (!subscription) {
      logger.warn(`⚠ Download denied - No subscription for user: ${req.user.email}`);
      return res.status(403).json({
        detail: 'No subscription found. Please purchase a subscription to download.'
      });
    }
    
    // Check if subscription is active
    if (!isSubscriptionActive(subscription)) {
      logger.warn(`⚠ Download denied - Expired subscription for user: ${req.user.email}`);
      return res.status(403).json({
        detail: 'Your subscription has expired. Please renew to download.'
      });
    }
    
    // Resolve file path
    const filePath = resolveFilePath(config.download.filePath);
    
    if (!fs.existsSync(filePath)) {
      logger.error(`✗ Download file not found at: ${filePath}`);
      return res.status(500).json({ detail: 'Download file not available' });
    }
    
    logger.info(`✓ File download started for user: ${req.user.email} (Path: ${filePath})`);
    
    // Return the file
    res.download(filePath, 'jarvis4everyone.zip', (err) => {
      if (err) {
        logger.error(`Download error: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ detail: 'Error downloading file' });
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
