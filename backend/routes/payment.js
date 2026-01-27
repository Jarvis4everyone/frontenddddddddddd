const express = require('express');
const router = express.Router();
const PaymentService = require('../services/paymentService');
const SubscriptionService = require('../services/subscriptionService');
const { getCurrentUser } = require('../middleware/auth');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * POST /api/payments/create-order
 * Create Razorpay order for payment
 * Authentication: Required (Bearer token)
 */
router.post('/create-order', getCurrentUser, async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;

    // Validate input
    if (!amount) {
      return res.status(400).json({ detail: 'Amount is required' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ detail: 'Amount must be a positive number' });
    }

    logger.info(`Creating payment order for ${req.user.email}: ${amount} ${currency}`);

    // Create Razorpay order
    const order = await PaymentService.createOrder(amount, currency);

    // Create payment record in database
    const payment = await PaymentService.createPaymentRecord(
      req.user.id,
      req.user.email,
      amount,
      currency,
      order.id
    );

    logger.info(`✓ Payment order created: ${order.id}`);

    // Return order details for frontend
    res.json({
      order_id: order.id,
      amount: order.amount, // Amount in paise
      currency: order.currency,
      key_id: config.razorpay.keyId,
      payment_id: payment.id
    });
  } catch (error) {
    logger.error(`✗ Payment order creation failed: ${error.message}`);
    
    res.status(500).json({
      detail: error.message || 'Failed to create payment order'
    });
  }
});

/**
 * POST /api/payments/verify
 * Verify payment and activate subscription
 * Authentication: Required (Bearer token)
 */
router.post('/verify', getCurrentUser, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        detail: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required' 
      });
    }

    logger.info(`Verifying payment: ${razorpay_order_id}`);

    // Get payment record
    const payment = await PaymentService.getPaymentByOrderId(razorpay_order_id);
    
    if (!payment) {
      return res.status(404).json({ detail: 'Payment record not found' });
    }

    // Verify payment belongs to user
    if (payment.user_id !== req.user.id) {
      return res.status(403).json({ detail: 'Payment does not belong to current user' });
    }

    // Verify payment signature
    const isValid = PaymentService.verifyPaymentSignature(
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

    // Activate subscription (1 month)
    await SubscriptionService.renewSubscription(req.user.id, 1);

    logger.info(`✓ Payment verified and subscription activated: ${razorpay_order_id}`);

    res.json({
      success: true,
      payment: updatedPayment,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    logger.error(`✗ Payment verification failed: ${error.message}`);
    
    res.status(500).json({
      detail: error.message || 'Failed to verify payment'
    });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Razorpay webhook (for payment status updates)
 * Authentication: Not required (uses signature verification)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get webhook signature from headers
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature) {
      logger.error('✗ Webhook request missing signature');
      return res.status(400).json({ detail: 'Missing webhook signature' });
    }

    // Get request body as string (already parsed as raw by express.raw middleware)
    const body = req.body.toString('utf8');

    // Verify webhook signature
    const isValid = PaymentService.verifyWebhookSignature(body, signature);
    
    if (!isValid) {
      logger.error('✗ Webhook signature verification failed');
      return res.status(400).json({ detail: 'Invalid webhook signature' });
    }

    // Parse webhook payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      logger.error(`✗ Failed to parse webhook payload: ${parseError.message}`);
      return res.status(400).json({ detail: 'Invalid webhook payload' });
    }

    const event = payload.event;
    logger.info(`Received webhook event: ${event}`);

    // Handle payment.captured event
    if (event === 'payment.captured') {
      const paymentData = payload.payload?.payment?.entity || {};
      const orderId = paymentData.order_id;
      const paymentId = paymentData.id;

      if (!orderId || !paymentId) {
        logger.error('✗ Webhook payload missing order_id or payment_id');
        return res.status(400).json({ detail: 'Invalid webhook payload structure' });
      }

      // Get payment record
      const payment = await PaymentService.getPaymentByOrderId(orderId);
      
      if (!payment) {
        logger.warn(`⚠ Payment record not found for order: ${orderId}`);
        return res.status(404).json({ detail: 'Payment record not found' });
      }

      // Only process if payment is still pending (idempotent)
      if (payment.status === 'pending') {
        // Update payment status
        await PaymentService.updatePaymentStatus(
          orderId,
          paymentId,
          signature,
          'completed'
        );

        // Activate subscription if user exists
        if (payment.user_id) {
          await SubscriptionService.renewSubscription(payment.user_id, 1);
          logger.info(`✓ Subscription activated via webhook for user: ${payment.user_id}`);
        }

        logger.info(`✓ Payment processed via webhook: ${orderId}`);
      } else {
        logger.info(`ℹ Payment already processed: ${orderId} (status: ${payment.status})`);
      }
    } else if (event === 'payment.failed') {
      const paymentData = payload.payload?.payment?.entity || {};
      const orderId = paymentData.order_id;

      if (orderId) {
        const payment = await PaymentService.getPaymentByOrderId(orderId);
        if (payment && payment.status === 'pending') {
          await PaymentService.updatePaymentStatus(
            orderId,
            paymentData.id || '',
            signature,
            'failed'
          );
          logger.info(`✓ Payment marked as failed via webhook: ${orderId}`);
        }
      }
    }

    // Always return success to Razorpay (to prevent retries)
    res.json({ status: 'success' });
  } catch (error) {
    logger.error(`✗ Webhook processing error: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    
    // Still return 200 to prevent Razorpay from retrying
    // But log the error for investigation
    res.status(200).json({ 
      status: 'error',
      message: 'Webhook processed with errors'
    });
  }
});

module.exports = router;
