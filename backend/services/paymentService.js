const Razorpay = require('razorpay');
const { getDatabase, getObjectId } = require('../config/database');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize Razorpay client with validation
let razorpayClient = null;

try {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    logger.warn('⚠ Razorpay credentials not configured. Payment features will not work.');
  } else {
    razorpayClient = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret
    });
    logger.info('✓ Razorpay client initialized successfully');
  }
} catch (error) {
  logger.error(`✗ Failed to initialize Razorpay client: ${error.message}`);
}

class PaymentService {
  /**
   * Create Razorpay order
   */
  static async createOrder(amount, currency = 'INR') {
    if (!razorpayClient) {
      throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }

    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      throw new Error('Razorpay credentials are missing. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    try {
      const orderData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency,
        payment_capture: 1
      };
      
      logger.info(`Creating Razorpay order: ${orderData.amount} ${currency}`);
      const order = await razorpayClient.orders.create(orderData);
      logger.info(`✓ Razorpay order created: ${order.id}`);
      return order;
    } catch (error) {
      logger.error(`✗ Failed to create Razorpay order: ${error.message}`);
      logger.error(`Error details: ${JSON.stringify(error)}`);
      throw new Error(`Failed to create payment order: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Create payment record in database
   */
  static async createPaymentRecord(userId, email, amount, currency, razorpayOrderId) {
    const db = getDatabase();
    const payment = {
      user_id: getObjectId(userId),
      email: email,
      plan_id: 'monthly',
      amount: amount,
      currency: currency,
      razorpay_order_id: razorpayOrderId,
      status: 'pending',
      created_at: new Date()
    };
    
    const result = await db.collection('payments').insertOne(payment);
    const created = await db.collection('payments').findOne({ _id: result.insertedId });
    
    return this._formatPayment(created);
  }

  /**
   * Verify Razorpay payment signature
   */
  static async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    if (!razorpayClient) {
      logger.error('Razorpay client not initialized');
      return false;
    }

    try {
      const params = {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature
      };
      
      razorpayClient.utility.verify_payment_signature(params);
      return true;
    } catch (error) {
      logger.error(`Payment verification failed for order ${razorpayOrderId}: ${error?.message || error}`);
      return false;
    }
  }

  /**
   * Update payment status after verification
   */
  static async updatePaymentStatus(razorpayOrderId, razorpayPaymentId, razorpaySignature, status) {
    const db = getDatabase();
    const payment = await db.collection('payments').findOne({ razorpay_order_id: razorpayOrderId });
    
    if (!payment) {
      return null;
    }
    
    const updateData = {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: status
    };
    
    await db.collection('payments').updateOne(
      { _id: payment._id },
      { $set: updateData }
    );
    
    const updated = await db.collection('payments').findOne({ _id: payment._id });
    return this._formatPayment(updated);
  }

  /**
   * Get payment by Razorpay order ID
   */
  static async getPaymentByOrderId(razorpayOrderId) {
    const db = getDatabase();
    const payment = await db.collection('payments').findOne({ razorpay_order_id: razorpayOrderId });
    return payment ? this._formatPayment(payment) : null;
  }

  /**
   * Get all payments (for admin)
   */
  static async getAllPayments(skip = 0, limit = 100) {
    const db = getDatabase();
    const payments = [];
    const cursor = db.collection('payments')
      .find()
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);
    
    for await (const payment of cursor) {
      payments.push(this._formatPayment(payment));
    }
    
    return payments;
  }

  /**
   * Verify Razorpay webhook signature
   */
  static async verifyWebhookSignature(payload, signature) {
    if (!razorpayClient) {
      logger.error('Razorpay client not initialized');
      return false;
    }

    try {
      razorpayClient.utility.verify_webhook_signature(
        payload,
        signature,
        config.razorpay.webhookSecret
      );
      return true;
    } catch (error) {
      logger.error(`Webhook signature verification failed: ${error?.message || error}`);
      return false;
    }
  }

  /**
   * Format payment document for response
   */
  static _formatPayment(payment) {
    if (!payment) return null;
    
    return {
      id: payment._id.toString(),
      user_id: payment.user_id ? payment.user_id.toString() : null,
      email: payment.email,
      plan_id: payment.plan_id,
      amount: payment.amount,
      currency: payment.currency,
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id || null,
      razorpay_signature: payment.razorpay_signature || null,
      status: payment.status,
      created_at: payment.created_at
    };
  }
}

module.exports = PaymentService;
