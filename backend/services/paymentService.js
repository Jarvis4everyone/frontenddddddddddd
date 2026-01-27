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
   * @param {number} amount - Amount in rupees (e.g., 299.00)
   * @param {string} currency - Currency code (default: 'INR')
   * @returns {Promise<Object>} Razorpay order object
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
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {number} amount - Amount in rupees
   * @param {string} currency - Currency code
   * @param {string} razorpayOrderId - Razorpay order ID
   * @returns {Promise<Object>} Payment record
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
        razorpay_payment_id: null,
        razorpay_signature: null,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
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
   * @param {string} razorpayOrderId - Order ID
   * @param {string} razorpayPaymentId - Payment ID
   * @param {string} razorpaySignature - Payment signature
   * @returns {boolean} True if signature is valid
   */
  static verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    if (!config.razorpay.keySecret) {
      logger.error('Razorpay key secret not configured');
      return false;
    }

    try {
      // Create signature string: order_id|payment_id
      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;

      // Generate expected signature using HMAC SHA256
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(payload)
        .digest('hex');

      // Compare signatures (timing-safe comparison)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(razorpaySignature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
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
   * Verify Razorpay webhook signature
   * @param {string} payload - Raw request body as string
   * @param {string} signature - Webhook signature from headers
   * @returns {boolean} True if signature is valid
   */
  static verifyWebhookSignature(payload, signature) {
    if (!config.razorpay.webhookSecret) {
      logger.error('Razorpay webhook secret not configured');
      return false;
    }

    try {
      // Generate expected signature using HMAC SHA256
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.webhookSecret)
        .update(payload)
        .digest('hex');

      // Compare signatures (timing-safe comparison)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );

      if (isValid) {
        logger.info(`✓ Webhook signature verified`);
        return true;
      } else {
        logger.error(`✗ Webhook signature mismatch`);
        return false;
      }
    } catch (error) {
      logger.error(`✗ Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get payment by order ID
   * @param {string} razorpayOrderId - Razorpay order ID
   * @returns {Promise<Object|null>} Payment record or null
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
   * Get payment by payment ID
   * @param {string} razorpayPaymentId - Razorpay payment ID
   * @returns {Promise<Object|null>} Payment record or null
   */
  static async getPaymentByPaymentId(razorpayPaymentId) {
    try {
      const db = getDatabase();
      const payment = await db.collection('payments').findOne({ 
        razorpay_payment_id: razorpayPaymentId 
      });

      return payment ? this._formatPayment(payment) : null;
    } catch (error) {
      logger.error(`✗ Failed to get payment by payment ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Update payment status
   * @param {string} razorpayOrderId - Order ID to find payment
   * @param {string} razorpayPaymentId - Payment ID to store
   * @param {string} razorpaySignature - Signature to store
   * @param {string} status - New status ('completed', 'failed', 'refunded')
   * @returns {Promise<Object>} Updated payment record
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
   * Get all payments (for admin)
   * @param {number} skip - Number of records to skip
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} Array of payment records
   */
  static async getAllPayments(skip = 0, limit = 100) {
    try {
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
    } catch (error) {
      logger.error(`✗ Failed to get all payments: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format payment document for response
   * @param {Object} payment - MongoDB payment document
   * @returns {Object} Formatted payment object
   */
  static _formatPayment(payment) {
    if (!payment) return null;

    return {
      id: payment._id.toString(),
      user_id: payment.user_id ? payment.user_id.toString() : null,
      email: payment.email,
      plan_id: payment.plan_id || 'monthly',
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
