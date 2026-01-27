const { getDatabase, getObjectId } = require('../config/database');
const { calculateEndDate } = require('../utils/subscription');

class SubscriptionService {
  /**
   * Create a new subscription
   */
  static async createSubscription(userId, months = 1, startDate = null) {
    const db = getDatabase();
    const start = startDate || new Date();
    const endDate = calculateEndDate(start, months);
    
    const subscription = {
      user_id: getObjectId(userId),
      plan_id: 'monthly',
      status: 'active',
      start_date: start,
      end_date: endDate,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.collection('subscriptions').insertOne(subscription);
    const created = await db.collection('subscriptions').findOne({ _id: result.insertedId });
    
    return this._formatSubscription(created);
  }

  /**
   * Get active subscription for user
   */
  static async getUserSubscription(userId) {
    const db = getDatabase();
    const subscription = await db.collection('subscriptions').findOne(
      { 
        user_id: getObjectId(userId), 
        status: { $in: ['active', 'expired'] } 
      },
      { sort: { created_at: -1 } }
    );
    
    return subscription ? this._formatSubscription(subscription) : null;
  }

  /**
   * Extend existing subscription
   */
  static async extendSubscription(userId, months) {
    const db = getDatabase();
    const subscription = await db.collection('subscriptions').findOne({
      user_id: getObjectId(userId),
      status: 'active'
    });
    
    if (!subscription) {
      return null;
    }
    
    const currentEndDate = subscription.end_date instanceof Date 
      ? subscription.end_date 
      : new Date(subscription.end_date);
    
    const newEndDate = calculateEndDate(currentEndDate, months);
    
    await db.collection('subscriptions').updateOne(
      { _id: subscription._id },
      { 
        $set: {
          end_date: newEndDate,
          updated_at: new Date()
        }
      }
    );
    
    const updated = await db.collection('subscriptions').findOne({ _id: subscription._id });
    return this._formatSubscription(updated);
  }

  /**
   * Renew subscription (can renew after expiry)
   */
  static async renewSubscription(userId, months) {
    const db = getDatabase();
    
    // Cancel any existing subscriptions
    await db.collection('subscriptions').updateMany(
      { 
        user_id: getObjectId(userId), 
        status: { $in: ['active', 'expired'] } 
      },
      { 
        $set: { 
          status: 'cancelled', 
          cancelled_at: new Date(), 
          updated_at: new Date() 
        } 
      }
    );
    
    // Create new subscription
    return await this.createSubscription(userId, months);
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId) {
    const db = getDatabase();
    const result = await db.collection('subscriptions').updateMany(
      { user_id: getObjectId(userId), status: 'active' },
      { 
        $set: {
          status: 'cancelled',
          cancelled_at: new Date(),
          updated_at: new Date()
        }
      }
    );
    
    return result.modifiedCount > 0;
  }

  /**
   * Get all subscriptions (for admin)
   */
  static async getAllSubscriptions(skip = 0, limit = 100) {
    const db = getDatabase();
    const subscriptions = [];
    const cursor = db.collection('subscriptions').find().skip(skip).limit(limit);
    
    for await (const sub of cursor) {
      subscriptions.push(this._formatSubscription(sub));
    }
    
    return subscriptions;
  }

  /**
   * Admin can activate subscription without payment
   */
  static async activateWithoutPayment(userId, months) {
    const db = getDatabase();
    
    // Cancel any existing subscriptions
    await db.collection('subscriptions').updateMany(
      { 
        user_id: getObjectId(userId), 
        status: { $in: ['active', 'expired'] } 
      },
      { 
        $set: { 
          status: 'cancelled', 
          cancelled_at: new Date(), 
          updated_at: new Date() 
        } 
      }
    );
    
    // Create new active subscription
    return await this.createSubscription(userId, months);
  }

  /**
   * Format subscription document for response
   */
  static _formatSubscription(subscription) {
    if (!subscription) return null;
    
    return {
      id: subscription._id.toString(),
      user_id: subscription.user_id.toString(),
      plan_id: subscription.plan_id,
      status: subscription.status,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
      cancelled_at: subscription.cancelled_at || null
    };
  }
}

module.exports = SubscriptionService;
