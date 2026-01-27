const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const SubscriptionService = require('../services/subscriptionService');
const PaymentService = require('../services/paymentService');
const { getCurrentAdmin } = require('../middleware/auth');
const { isSubscriptionActive } = require('../utils/subscription');
const logger = require('../utils/logger');

// User Management

/**
 * Get all users with subscription information (admin only)
 */
router.get('/users', getCurrentAdmin, async (req, res, next) => {
  try {
    const skip = parseInt(req.query.skip || '0', 10);
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    
    logger.info(`👥 Admin ${req.user.email} requested users list (skip=${skip}, limit=${limit})`);
    
    const users = await UserService.getAllUsers(skip, limit);
    
    // Enhance each user with subscription information
    const enhancedUsers = [];
    for (const user of users) {
      const subscription = await SubscriptionService.getUserSubscription(user.id);
      
      const userData = {
        ...user,
        subscription: subscription,
        has_subscription: subscription !== null,
        has_active_subscription: false
      };
      
      if (subscription) {
        userData.has_active_subscription = isSubscriptionActive(subscription);
      }
      
      enhancedUsers.push(userData);
    }
    
    logger.info(`✓ Returned ${enhancedUsers.length} users with subscription info`);
    res.json(enhancedUsers);
  } catch (error) {
    next(error);
  }
});

/**
 * Get user by ID (admin only)
 */
router.get('/users/:userId', getCurrentAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new user (admin only)
 */
router.post('/users', getCurrentAdmin, async (req, res, next) => {
  try {
    const { name, email, contact_number, password, is_admin = false } = req.body;
    
    if (!name || !email || !contact_number || !password) {
      return res.status(400).json({ detail: 'All fields are required' });
    }
    
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ detail: 'Email already registered' });
    }
    
    const user = await UserService.createUser({
      name,
      email,
      contact_number,
      password,
      is_admin
    });
    
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * Update user (admin only)
 */
router.put('/users/:userId', getCurrentAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updateData = { ...req.body };
    
    // Remove password from update data if present (use reset-password endpoint instead)
    delete updateData.password;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ detail: 'No fields to update' });
    }
    
    // Check email uniqueness if updating email
    if (updateData.email) {
      const existingUser = await UserService.getUserByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ detail: 'Email already registered' });
      }
    }
    
    const user = await UserService.updateUser(userId, updateData);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * Reset user password (admin only) - logs user out everywhere
 */
router.post('/users/:userId/reset-password', getCurrentAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { new_password } = req.body;
    
    if (!new_password) {
      return res.status(400).json({ detail: 'New password is required' });
    }
    
    const success = await UserService.resetPassword(userId, new_password);
    if (!success) {
      return res.status(404).json({ detail: 'User not found' });
    }
    
    res.json({ message: 'Password reset successfully. User logged out everywhere.' });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete user (admin only) - keeps payments with email snapshot
 */
router.delete('/users/:userId', getCurrentAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.id) {
      return res.status(400).json({ detail: 'Cannot delete yourself' });
    }
    
    const success = await UserService.deleteUser(userId);
    if (!success) {
      return res.status(404).json({ detail: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Subscription Management

/**
 * Get all subscriptions (admin only)
 */
router.get('/subscriptions', getCurrentAdmin, async (req, res, next) => {
  try {
    const skip = parseInt(req.query.skip || '0', 10);
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    
    const subscriptions = await SubscriptionService.getAllSubscriptions(skip, limit);
    res.json(subscriptions);
  } catch (error) {
    next(error);
  }
});

/**
 * Activate subscription without payment (admin only)
 */
router.post('/subscriptions/activate', getCurrentAdmin, async (req, res, next) => {
  try {
    const { user_id, months = 1 } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ detail: 'user_id is required' });
    }
    
    const subscription = await SubscriptionService.activateWithoutPayment(user_id, months);
    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

/**
 * Extend user subscription (admin only)
 */
router.post('/subscriptions/:userId/extend', getCurrentAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { months = 1 } = req.body;
    
    const subscription = await SubscriptionService.extendSubscription(userId, months);
    if (!subscription) {
      return res.status(404).json({ detail: 'Active subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel user subscription (admin only)
 */
router.post('/subscriptions/:userId/cancel', getCurrentAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const success = await SubscriptionService.cancelSubscription(userId);
    if (!success) {
      return res.status(404).json({ detail: 'Active subscription not found' });
    }
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

// Payment Viewing

/**
 * Get all payments (admin only)
 */
router.get('/payments', getCurrentAdmin, async (req, res, next) => {
  try {
    const skip = parseInt(req.query.skip || '0', 10);
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    
    const payments = await PaymentService.getAllPayments(skip, limit);
    res.json(payments);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
