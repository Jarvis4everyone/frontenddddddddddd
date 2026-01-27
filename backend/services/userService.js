const { getDatabase, getObjectId } = require('../config/database');
const { getPasswordHash, verifyPassword } = require('../utils/security');
const { checkSubscriptionExpiry } = require('../utils/subscription');
const logger = require('../utils/logger');

class UserService {
  /**
   * Create a new user
   */
  static async createUser(userData) {
    const db = getDatabase();
    const user = {
      ...userData,
      password_hash: getPasswordHash(userData.password),
      is_admin: userData.is_admin !== undefined ? userData.is_admin : false,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    delete user.password;
    
    const result = await db.collection('users').insertOne(user);
    const createdUser = await db.collection('users').findOne({ _id: result.insertedId });
    
    return this._formatUser(createdUser);
  }

  /**
   * Ensure all users have is_admin field set (migration)
   */
  static async ensureIsAdminField() {
    const db = getDatabase();
    const result = await db.collection('users').updateMany(
      { is_admin: { $exists: false } },
      { $set: { is_admin: false } }
    );
    
    if (result.modifiedCount > 0) {
      logger.info(`⚠ Updated ${result.modifiedCount} users to set is_admin=false`);
    }
    
    return result.modifiedCount;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email) {
    const db = getDatabase();
    const user = await db.collection('users').findOne({ email });
    return user ? this._formatUser(user) : null;
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    const db = getDatabase();
    const user = await db.collection('users').findOne({ _id: getObjectId(userId) });
    return user ? this._formatUser(user) : null;
  }

  /**
   * Verify user credentials
   */
  static async verifyUser(email, password) {
    const db = getDatabase();
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      return null;
    }
    
    if (!verifyPassword(password, user.password_hash)) {
      return null;
    }
    
    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { last_login: new Date() } }
    );
    
    // Check subscription expiry on login
    const subscription = await db.collection('subscriptions').findOne({
      user_id: user._id,
      status: 'active'
    });
    
    if (subscription && checkSubscriptionExpiry(subscription)) {
      await db.collection('subscriptions').updateOne(
        { _id: subscription._id },
        { $set: { status: 'expired', updated_at: new Date() } }
      );
    }
    
    return this._formatUser(user);
  }

  /**
   * Get all users (for admin)
   */
  static async getAllUsers(skip = 0, limit = 100) {
    const db = getDatabase();
    const users = [];
    const cursor = db.collection('users').find().skip(skip).limit(limit);
    
    for await (const user of cursor) {
      users.push(this._formatUser(user, true)); // true = include password_hash removal
    }
    
    return users;
  }

  /**
   * Update user
   */
  static async updateUser(userId, updateData) {
    const db = getDatabase();
    updateData.updated_at = new Date();
    
    if (updateData.password) {
      updateData.password_hash = getPasswordHash(updateData.password);
      delete updateData.password;
    }
    
    const result = await db.collection('users').updateOne(
      { _id: getObjectId(userId) },
      { $set: updateData }
    );
    
    if (result.modifiedCount) {
      return await this.getUserById(userId);
    }
    
    return null;
  }

  /**
   * Reset user password and invalidate all refresh tokens
   */
  static async resetPassword(userId, newPassword) {
    const db = getDatabase();
    const passwordHash = getPasswordHash(newPassword);
    
    const result = await db.collection('users').updateOne(
      { _id: getObjectId(userId) },
      { $set: { password_hash: passwordHash, updated_at: new Date() } }
    );
    
    if (result.modifiedCount) {
      // Delete all refresh tokens for this user (logout everywhere)
      await db.collection('refresh_tokens').deleteMany({ user_id: getObjectId(userId) });
      return true;
    }
    
    return false;
  }

  /**
   * Delete user, subscriptions, and refresh tokens. Keep payments with email snapshot.
   */
  static async deleteUser(userId) {
    const db = getDatabase();
    const user = await this.getUserById(userId);
    
    if (!user) {
      return false;
    }
    
    // Delete user
    await db.collection('users').deleteOne({ _id: getObjectId(userId) });
    
    // Delete subscriptions
    await db.collection('subscriptions').deleteMany({ user_id: getObjectId(userId) });
    
    // Delete refresh tokens
    await db.collection('refresh_tokens').deleteMany({ user_id: getObjectId(userId) });
    
    // Payments are kept with email snapshot (user_id is already optional)
    return true;
  }

  /**
   * Format user document for response
   */
  static _formatUser(user, removePasswordHash = false) {
    if (!user) return null;
    
    const formatted = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      contact_number: user.contact_number,
      is_admin: user.is_admin !== undefined ? user.is_admin : false,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login || null
    };
    
    if (removePasswordHash && user.password_hash) {
      // Don't include password_hash in response
    }
    
    return formatted;
  }
}

module.exports = UserService;
