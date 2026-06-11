const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Fetch JWT secrets and configurations from env variables
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';
const JWT_EXPIRES_IN = '24h'; // Token is valid for 24 hours

const AuthUtils = {
  /**
   * Securely hash a plain text password using bcrypt.
   * @param {string} password - The plain password.
   * @returns {Promise<string>} - The hashed password string.
   */
  async hashPassword(password) {
    // Salt rounds: 10 is standard (good balance of security and speed)
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  },

  /**
   * Compare a plain text password with a stored hash.
   * @param {string} password - The plain text password.
   * @param {string} hash - The stored bcrypt hash.
   * @returns {Promise<boolean>} - True if matching, false otherwise.
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  },

  /**
   * Generate a secure, signed JWT token.
   * @param {object} payload - The details to lock inside the token (e.g. userId, role).
   * @returns {string} - The signed JWT token string.
   */
  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  },

  /**
   * Verify and decode a JWT token.
   * @param {string} token - The JWT token to verify.
   * @returns {object} - The decoded payload if valid.
   * @throws {Error} - Throws error if token is expired or manipulated.
   */
  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }
};

module.exports = AuthUtils;
