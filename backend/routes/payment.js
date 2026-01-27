const express = require('express');
const router = express.Router();
const PaymentService = require('../services/paymentService');
const SubscriptionService = require('../services/subscriptionService');
const { getCurrentUser } = require('../middleware/auth');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Create Razorpay order for payment
 */
router.post('/create-order', getCurrentUser, async (req, res, next) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    
    if (!amount) {
      return res.status(400).json({ detail: 'Amount is required' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ detail: 'Amount must be a positive number' });
    }
    
    logger.info(`Creating payment order for user ${req.user.email}: ${amount} ${currency}`);
    
    // Create Razorpay order
    const order = await PaymentService.createOrder(amount, currency);
    
    // Create payment record
    const payment = await PaymentService.createPaymentRecord(
      req.user.id,
      req.user.email,
      amount,
      currency,
      order.id
    );
    
    logger.info(`✓ Payment order created successfully: ${order.id}`);
    
    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: config.razorpay.keyId,
      payment_id: payment.id
    });
  } catch (error) {
    logger.error(`Error creating payment order: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    
    // Return more detailed error message
    const errorMessage = error.message || 'Failed to create payment order';
    res.status(500).json({ 
      detail: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Verify Razorpay payment and activate subscription
 */
router.post('/verify', getCurrentUser, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ detail: 'All payment fields are required' });
    }
    
    // Get payment record
    const payment = await PaymentService.getPaymentByOrderId(razorpay_order_id);
    if (!payment) {
      return res.status(404).json({ detail: 'Payment record not found' });
    }
    
    // Verify payment belongs to current user (compare as strings)
    const paymentUserId = payment.user_id?.toString();
    const currentUserId = req.user.id?.toString();
    if (paymentUserId !== currentUserId) {
      logger.warn(`Payment user mismatch: payment.user_id=${paymentUserId}, req.user.id=${currentUserId}`);
      return res.status(403).json({ detail: 'Payment does not belong to current user' });
    }
    
    // Verify payment signature
    const isValid = await PaymentService.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    
    if (!isValid) {
      return res.status(400).json({ detail: 'Invalid payment signature' });
    }
    
    // Update payment status
    const updatedPayment = await PaymentService.updatePaymentStatus(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      'completed'
    );
    
    // Activate subscription (1 month for now)
    await SubscriptionService.renewSubscription(req.user.id, 1);
    
    res.json(updatedPayment);
  } catch (error) {
    next(error);
  }
});

/**
 * Handle Razorpay webhook (for payment status updates)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    // Get webhook signature from headers
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ detail: 'Missing webhook signature' });
    }
    
    // Get request body as string
    const bodyStr = req.body.toString('utf-8');
    
    // Verify webhook signature
    const isValid = await PaymentService.verifyWebhookSignature(bodyStr, signature);
    if (!isValid) {
      return res.status(400).json({ detail: 'Invalid webhook signature' });
    }
    
    // Parse webhook payload
    const payload = JSON.parse(bodyStr);
    const event = payload.event;
    
    if (event === 'payment.captured') {
      // Payment successful
      const paymentData = payload.payload?.payment?.entity || {};
      const orderId = paymentData.order_id;
      
      if (orderId) {
        const payment = await PaymentService.getPaymentByOrderId(orderId);
        if (payment && payment.status === 'pending') {
          await PaymentService.updatePaymentStatus(
            orderId,
            paymentData.id || '',
            signature,
            'completed'
          );
          
          // Activate subscription if user exists
          if (payment.user_id) {
            await SubscriptionService.renewSubscription(payment.user_id, 1);
          }
        }
      }
    }
    
    res.json({ status: 'success' });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`);
    next(error);
  }
});

module.exports = router;
