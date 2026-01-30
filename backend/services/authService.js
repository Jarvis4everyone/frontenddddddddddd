const { getDatabase, getObjectId } = require('../config/database');
const { createAccessToken, createRefreshToken, verifyToken } = require('../utils/security');
const config = require('../config');

class AuthService {
  /**
   * Store refresh token in database
   */
  static async storeRefreshToken(userId, token) {
    const db = getDatabase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshTokenExpireDays);
    
    const refreshToken = {
      user_id: getObjectId(userId),
      token: token,
      expires_at: expiresAt,
      created_at: new Date()
    };
    
    await db.collection('refresh_tokens').insertOne(refreshToken);
  }

  /**
   * Get refresh token from database
   */
  static async getRefreshToken(token) {
    const db = getDatabase();
    const refreshToken = await db.collection('refresh_tokens').findOne({ token });
    
    if (!refreshToken) {
      return null;
    }
    
    // Check if expired
    const expiresAt = refreshToken.expires_at instanceof Date 
      ? refreshToken.expires_at 
      : new Date(refreshToken.expires_at);
    
    if (new Date() > expiresAt) {
      await db.collection('refresh_tokens').deleteOne({ _id: refreshToken._id });
      return null;
    }
    
    return {
      id: refreshToken._id.toString(),
      user_id: refreshToken.user_id.toString(),
      token: refreshToken.token,
      expires_at: expiresAt,
      created_at: refreshToken.created_at
    };
  }

  /**
   * Delete refresh token
   */
  static async deleteRefreshToken(token) {
    const db = getDatabase();
    const result = await db.collection('refresh_tokens').deleteOne({ token });
    return result.deletedCount > 0;
  }

  /**
   * Delete all refresh tokens for a user
   */
  static async deleteAllUserTokens(userId) {
    const db = getDatabase();
    await db.collection('refresh_tokens').deleteMany({ user_id: getObjectId(userId) });
  }

  /**
   * Generate new access token from refresh token
   */
  static async refreshAccessToken(refreshToken) {
    // Verify token
    const payload = verifyToken(refreshToken, 'refresh');
    if (!payload) {
      return null;
    }
    
    // Check if token exists in database
    const tokenRecord = await AuthService.getRefreshToken(refreshToken);
    if (!tokenRecord) {
      return null;
    }
    
    const userId = payload.sub;
    if (!userId) {
      return null;
    }
    
    // Create new access token
    const accessToken = createAccessToken({ sub: userId });
    
    return {
      access_token: accessToken,
      token_type: 'bearer'
    };
  }
}

module.exports = AuthService;
