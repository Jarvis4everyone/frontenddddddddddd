const { verifyToken } = require('../utils/security');
const UserService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * Get current authenticated user from JWT token
 */
async function getCurrentUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        detail: 'Invalid authentication credentials'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token, 'access');
    
    if (!payload) {
      return res.status(401).json({
        detail: 'Invalid authentication credentials'
      });
    }
    
    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({
        detail: 'Invalid token payload'
      });
    }
    
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(401).json({
        detail: 'User not found'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({
      detail: 'Invalid authentication credentials'
    });
  }
}

/**
 * Get current admin user
 */
async function getCurrentAdmin(req, res, next) {
  try {
    // First check if user is authenticated
    // We need to manually check auth since we can't easily chain async middleware
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        detail: 'Invalid authentication credentials'
      });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token, 'access');
    
    if (!payload) {
      return res.status(401).json({
        detail: 'Invalid authentication credentials'
      });
    }
    
    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({
        detail: 'Invalid token payload'
      });
    }
    
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(401).json({
        detail: 'User not found'
      });
    }
    
    // Check if user is admin
    if (!user.is_admin) {
      return res.status(403).json({
        detail: 'Admin access required'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Admin authentication error: ${error.message}`);
    return res.status(403).json({
      detail: 'Admin access required'
    });
  }
}

/**
 * Get refresh token from cookie
 */
function getRefreshTokenFromCookie(req, res, next) {
  const refreshToken = req.cookies?.refresh_token;
  
  if (!refreshToken) {
    return res.status(401).json({
      detail: 'Refresh token not found'
    });
  }
  
  req.refreshToken = refreshToken;
  next();
}

/**
 * Optional authentication - get user if token is present, otherwise continue
 */
async function getOptionalUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token, 'access');
    
    if (!payload) {
      req.user = null;
      return next();
    }
    
    const userId = payload.sub;
    if (!userId) {
      req.user = null;
      return next();
    }
    
    const user = await UserService.getUserById(userId);
    req.user = user || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

module.exports = {
  getCurrentUser,
  getCurrentAdmin,
  getRefreshTokenFromCookie,
  getOptionalUser
};
