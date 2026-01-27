const express = require('express');
const router = express.Router();
const SubscriptionService = require('../services/subscriptionService');
const { getCurrentUser } = require('../middleware/auth');
const config = require('../config');

/**
 * Get subscription price (public endpoint, no auth required)
 */
router.get('/price', async (req, res) => {
  res.json({
    price: config.subscription.price,
    currency: 'INR',
    price_in_paise: Math.round(config.subscription.price * 100)
  });
});

/**
 * Get current user's subscription
 * Returns null if no subscription found (200 status) instead of 404
 */
router.get('/me', getCurrentUser, async (req, res, next) => {
  try {
    const subscription = await SubscriptionService.getUserSubscription(req.user.id);
    // Return 200 with null instead of 404 - this is expected for users without subscription
    res.json(subscription || null);
  } catch (error) {
    next(error);
  }
});

/**
 * Renew subscription (can renew after expiry)
 */
router.post('/renew', getCurrentUser, async (req, res, next) => {
  try {
    const { months = 1 } = req.body;
    const subscription = await SubscriptionService.renewSubscription(req.user.id, months);
    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel current user's subscription
 */
router.post('/cancel', getCurrentUser, async (req, res, next) => {
  try {
    const success = await SubscriptionService.cancelSubscription(req.user.id);
    if (!success) {
      return res.status(404).json({ detail: 'Active subscription not found' });
    }
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
