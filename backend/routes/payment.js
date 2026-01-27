const express = require('express');
const router = express.Router();
const PaymentService = require('../services/paymentService');
const SubscriptionService = require('../services/subscriptionService');
const { getCurrentUser } = require('../middleware/auth');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * POST /api/payments/create-order
 * Create Razorpay order
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
      amount: order.amount,
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

module.exports = router;
