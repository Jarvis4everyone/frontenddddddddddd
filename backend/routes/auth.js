const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const AuthService = require('../services/authService');
const { createAccessToken, createRefreshToken } = require('../utils/security');
const { getCurrentUser, getRefreshTokenFromCookie } = require('../middleware/auth');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, contact_number, password } = req.body;
    
    if (!name || !email || !contact_number || !password) {
      return res.status(400).json({ detail: 'All fields are required' });
    }
    
    logger.info(`📝 Registration attempt for email: ${email}`);
    
    // Check if user already exists
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      logger.warn(`⚠ Registration failed - Email already exists: ${email}`);
      return res.status(400).json({ detail: 'Email already registered' });
    }
    
    // Create user
    const user = await UserService.createUser({
      name,
      email,
      contact_number,
      password
    });
    
    logger.info(`✓ User registered successfully: ${email} (ID: ${user.id})`);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * Login user and return access token, set refresh token in cookie
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }
    
    logger.info(`🔐 Login attempt for email: ${email}`);
    
    // Verify credentials
    const user = await UserService.verifyUser(email, password);
    if (!user) {
      logger.warn(`⚠ Login failed - Invalid credentials for: ${email}`);
      return res.status(401).json({ detail: 'Incorrect email or password' });
    }
    
    // Create tokens
    const accessToken = createAccessToken({ sub: user.id });
    const refreshToken = createRefreshToken({ sub: user.id });
    
    // Store refresh token in database
    await AuthService.storeRefreshToken(user.id, refreshToken);
    
    // Set refresh token in HttpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: !config.app.debug, // Use secure in production
      sameSite: 'lax',
      maxAge: config.jwt.refreshTokenExpireDays * 24 * 60 * 60 * 1000 // Convert days to milliseconds
    });
    
    const adminStatus = user.is_admin ? 'ADMIN' : 'User';
    logger.info(`✓ Login successful: ${adminStatus} ${email} (ID: ${user.id})`);
    
    res.json({
      access_token: accessToken,
      token_type: 'bearer'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Refresh access token using refresh token from cookie
 */
router.post('/refresh', getRefreshTokenFromCookie, async (req, res, next) => {
  try {
    logger.debug('🔄 Token refresh attempt');
    
    const result = await AuthService.refreshAccessToken(req.refreshToken);
    if (!result) {
      logger.warn('⚠ Token refresh failed - Invalid or expired token');
      return res.status(401).json({ detail: 'Invalid or expired refresh token' });
    }
    
    logger.debug('✓ Token refreshed successfully');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
