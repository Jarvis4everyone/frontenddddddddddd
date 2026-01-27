const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Verify a password against its hash
 */
function verifyPassword(plainPassword, hashedPassword) {
  try {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  } catch (error) {
    return false;
  }
}

/**
 * Hash a password using bcrypt
 */
function getPasswordHash(password) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

/**
 * Create JWT access token
 */
function createAccessToken(data, expiresDelta = null) {
  const payload = { ...data };
  const expiresIn = expiresDelta 
    ? Math.floor(expiresDelta / 1000) // Convert milliseconds to seconds
    : config.jwt.accessTokenExpireMinutes * 60; // Convert minutes to seconds
  
  payload.exp = Math.floor(Date.now() / 1000) + expiresIn;
  payload.type = 'access';
  
  return jwt.sign(payload, config.jwt.secretKey, {
    algorithm: config.jwt.algorithm
  });
}

/**
 * Create JWT refresh token
 */
function createRefreshToken(data) {
  const payload = { ...data };
  const expiresIn = config.jwt.refreshTokenExpireDays * 24 * 60 * 60; // Convert days to seconds
  
  payload.exp = Math.floor(Date.now() / 1000) + expiresIn;
  payload.type = 'refresh';
  
  return jwt.sign(payload, config.jwt.secretKey, {
    algorithm: config.jwt.algorithm
  });
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token, tokenType = 'access') {
  try {
    const payload = jwt.verify(token, config.jwt.secretKey, {
      algorithms: [config.jwt.algorithm]
    });
    
    if (payload.type !== tokenType) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

module.exports = {
  verifyPassword,
  getPasswordHash,
  createAccessToken,
  createRefreshToken,
  verifyToken
};
