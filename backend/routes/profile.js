const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const SubscriptionService = require('../services/subscriptionService');
const { getCurrentUser } = require('../middleware/auth');
const { isSubscriptionActive } = require('../utils/subscription');
const logger = require('../utils/logger');

/**
 * Get current user's profile
 */
router.get('/me', getCurrentUser, async (req, res, next) => {
  try {
    logger.info(`👤 Profile request from user: ${req.user.email} (ID: ${req.user.id})`);
    res.json(req.user);
  } catch (error) {
    next(error);
  }
});

/**
 * Update current user's profile (name, contact_number only)
 */
router.put('/me', getCurrentUser, async (req, res, next) => {
  try {
    logger.info(`✏️ Profile update request from user: ${req.user.email}`);
    
    const { name, contact_number } = req.body;
    const updateData = {};
    
    // Only allow updating name and contact_number for regular users
    // Email and is_admin cannot be changed by user themselves
    if (name !== undefined) updateData.name = name;
    if (contact_number !== undefined) updateData.contact_number = contact_number;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ detail: 'No valid fields to update' });
    }
    
    const user = await UserService.updateUser(req.user.id, updateData);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }
    
    logger.info(`✓ Profile updated successfully for user: ${req.user.email}`);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * Get current user's subscription status
 */
router.get('/subscription', getCurrentUser, async (req, res, next) => {
  try {
    logger.info(`📋 Subscription status request from user: ${req.user.email}`);
    
    const subscription = await SubscriptionService.getUserSubscription(req.user.id);
    if (!subscription) {
      return res.status(404).json({ detail: 'No subscription found' });
    }
    
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

/**
 * Get complete dashboard data (profile + subscription)
 */
router.get('/dashboard', getCurrentUser, async (req, res, next) => {
  try {
    logger.info(`📊 Dashboard data request from user: ${req.user.email}`);
    
    // Get subscription
    const subscription = await SubscriptionService.getUserSubscription(req.user.id);
    
    // Prepare dashboard data
    const dashboardData = {
      user: req.user,
      subscription: subscription,
      has_active_subscription: false
    };
    
    if (subscription) {
      dashboardData.has_active_subscription = isSubscriptionActive(subscription);
    }
    
    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
