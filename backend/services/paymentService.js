const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getDatabase, getObjectId } = require('../config/database');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize Razorpay client
let razorpayClient = null;

function initializeRazorpay() {
  try {
    const keyId = config.razorpay.keyId;
    const keySecret = config.razorpay.keySecret;

    if (!keyId || !keySecret) {
      logger.warn('⚠ Razorpay credentials not configured');
      return null;
    }

    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    logger.info('✓ Razorpay client initialized');
    return razorpayClient;
  } catch (error) {
    logger.error(`✗ Razorpay initialization failed: ${error.message}`);
    return null;
  }
}

// Initialize on module load
razorpayClient = initializeRazorpay();

class PaymentService {
  /**
   * Create Razorpay order
   */
  static async createOrder(amount, currency = 'INR') {
    // Validate client
    if (!razorpayClient) {
      const client = initializeRazorpay();
      if (!client) {
        throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
      }
      razorpayClient = client;
    }

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Convert to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    try {
      const orderData = {
        amount: amountInPaise,
        currency: currency,
        payment_capture: 1, // Auto-capture payment
        notes: {
          description: 'Monthly Subscription - Jarvis4Everyone'
        }
      };

      logger.info(`Creating Razorpay order: ${amountInPaise} ${currency}`);
      
      const order = await razorpayClient.orders.create(orderData);
      
      logger.info(`✓ Razorpay order created: ${order.id}`);
      
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status
      };
    } catch (error) {
      logger.error(`✗ Razorpay order creation failed`);
      logger.error(`Error: ${error.message}`);
      
      if (error.statusCode === 401) {
        throw new Error('Razorpay authentication failed. Please check your API credentials.');
      }
      
      if (error.error && error.error.description) {
        throw new Error(`Razorpay error: ${error.error.description}`);
      }
      
      throw new Error(`Failed to create payment order: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Create payment record in database
   */
  static async createPaymentRecord(userId, email, amount, currency, razorpayOrderId) {
    try {
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

      logger.info(`✓ Payment record created: ${created._id}`);
      
      return this._formatPayment(created);
    } catch (error) {
      logger.error(`✗ Failed to create payment record: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  static verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    if (!config.razorpay.keySecret) {
      logger.error('Razorpay key secret not configured');
      return false;
    }

    try {
      // Create signature string: order_id|payment_id
      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(payload)
        .digest('hex');

      // Compare signatures (timing-safe)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(razorpaySignature),
        Buffer.from(expectedSignature)
      );

      if (isValid) {
        logger.info(`✓ Payment signature verified: ${razorpayOrderId}`);
        return true;
      } else {
        logger.error(`✗ Payment signature mismatch: ${razorpayOrderId}`);
        return false;
      }
    } catch (error) {
      logger.error(`✗ Signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get payment by order ID
   */
  static async getPaymentByOrderId(razorpayOrderId) {
    try {
      const db = getDatabase();
      const payment = await db.collection('payments').findOne({ 
        razorpay_order_id: razorpayOrderId 
      });

      return payment ? this._formatPayment(payment) : null;
    } catch (error) {
      logger.error(`✗ Failed to get payment: ${error.message}`);
      return null;
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(razorpayOrderId, razorpayPaymentId, razorpaySignature, status) {
    try {
      const db = getDatabase();
      
      const payment = await db.collection('payments').findOne({ 
        razorpay_order_id: razorpayOrderId 
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const updateData = {
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: status,
        updated_at: new Date()
      };

      await db.collection('payments').updateOne(
        { _id: payment._id },
        { $set: updateData }
      );

      const updated = await db.collection('payments').findOne({ _id: payment._id });
      
      logger.info(`✓ Payment status updated: ${razorpayOrderId} -> ${status}`);
      
      return this._formatPayment(updated);
    } catch (error) {
      logger.error(`✗ Failed to update payment status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format payment document
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
      created_at: payment.created_at,
      updated_at: payment.updated_at || null
    };
  }
}

module.exports = PaymentService;
