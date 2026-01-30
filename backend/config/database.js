const { MongoClient, ObjectId } = require('mongodb');
const config = require('./index');
const logger = require('../utils/logger');

let client = null;
let database = null;

async function connectToMongo() {
  try {
    logger.info(`📦 Connecting to MongoDB: ${config.mongodb.databaseName}...`);
    
    client = new MongoClient(config.mongodb.url);
    
    await client.connect();
    database = client.db(config.mongodb.databaseName);
    
    logger.info(`✓ Connected to MongoDB database: ${config.mongodb.databaseName}`);
    
    // Create indexes
    await createIndexes();
    
    // Ensure all users have is_admin field (migration)
    await ensureIsAdminField();
    
  } catch (error) {
    logger.error(`✗ Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
}

async function closeMongoConnection() {
  if (client) {
    await client.close();
    logger.info('📦 MongoDB connection closed');
  }
}

async function createIndexes() {
  try {
    logger.debug('🔍 Creating database indexes...');

    // User indexes
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    await database.collection('users').createIndex({ created_at: 1 });

    // Subscription indexes
    await database.collection('subscriptions').createIndex({ user_id: 1 });
    await database.collection('subscriptions').createIndex({ status: 1 });
    await database.collection('subscriptions').createIndex({ end_date: 1 });

    // Payment indexes
    await database.collection('payments').createIndex({ user_id: 1 });
    await database.collection('payments').createIndex({ razorpay_order_id: 1 }, { unique: true });
    
    // Fix razorpay_payment_id index: make it sparse to allow multiple null values
    // Try to drop any existing index on razorpay_payment_id
    try {
      const indexes = await database.collection('payments').indexes();
      for (const index of indexes) {
        if (index.key && index.key.razorpay_payment_id) {
          await database.collection('payments').dropIndex(index.name);
          logger.debug(`⚠ Dropped old razorpay_payment_id index: ${index.name}`);
        }
      }
    } catch (e) {
      // Index doesn't exist or has different name, that's okay
      logger.debug(`Index drop attempt: ${e.message}`);
    }
    
    // Create sparse unique index: only indexes non-null values, allows multiple nulls
    // Sparse index only indexes documents that have the field, so null values are ignored
    try {
      await database.collection('payments').createIndex(
        { razorpay_payment_id: 1 }, 
        { unique: true, sparse: true, name: 'razorpay_payment_id_unique_sparse' }
      );
      logger.debug('✓ Created sparse unique index on razorpay_payment_id');
    } catch (e) {
      // Index might already exist, that's okay
      logger.debug(`Index creation: ${e.message}`);
    }
    
    await database.collection('payments').createIndex({ email: 1 });
    await database.collection('payments').createIndex({ created_at: 1 });

    // Refresh token indexes
    await database.collection('refresh_tokens').createIndex({ user_id: 1 });
    await database.collection('refresh_tokens').createIndex({ token: 1 }, { unique: true });
    await database.collection('refresh_tokens').createIndex({ expires_at: 1 });

    // Contact indexes
    await database.collection('contacts').createIndex({ email: 1 });
    await database.collection('contacts').createIndex({ status: 1 });
    await database.collection('contacts').createIndex({ user_id: 1 });
    await database.collection('contacts').createIndex({ created_at: 1 });

    logger.info('✓ Database indexes created successfully');
  } catch (error) {
    logger.error(`✗ Error creating indexes: ${error.message}`);
  }
}

async function ensureIsAdminField() {
  try {
    const result = await database.collection('users').updateMany(
      { is_admin: { $exists: false } },
      { $set: { is_admin: false } }
    );
    if (result.modifiedCount > 0) {
      logger.info(`⚠ Updated ${result.modifiedCount} users to set is_admin=false`);
    }
    return result.modifiedCount;
  } catch (error) {
    logger.error(`✗ Error ensuring is_admin field: ${error.message}`);
    return 0;
  }
}

function getDatabase() {
  if (!database) {
    throw new Error('Database not connected. Call connectToMongo() first.');
  }
  return database;
}

function getObjectId(id) {
  if (typeof id === 'string') {
    return new ObjectId(id);
  }
  return id;
}

module.exports = {
  connectToMongo,
  closeMongoConnection,
  getDatabase,
  getObjectId,
  ObjectId
};
