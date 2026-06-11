const db = require('../database/db');

/**
 * User Model - Data Access Object for 'users' table
 */
const UserModel = {
  /**
   * Find a user record by their email address.
   * @param {string} email - The email to search for.
   * @returns {Promise<object|null>} - Returns user object or null if not found.
   */
  findByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE email = ?`;
      
      db.get(sql, [email], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Insert a new user into the 'users' table.
   * @param {object} userData - Object containing email, passwordHash, and role.
   * @returns {Promise<number>} - Returns the auto-incremented ID of the new user.
   */
  create({ email, passwordHash, role }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (email, password_hash, role)
        VALUES (?, ?, ?)
      `;
      
      db.run(sql, [email, passwordHash, role], function (err) {
        if (err) {
          return reject(err);
        }
        // "this.lastID" is a special property in sqlite3 that holds the ID of the newly inserted row!
        resolve(this.lastID);
      });
    });
  },

  /**
   * Delete a user account from the users table.
   * Due to ON DELETE CASCADE constraints, this automatically deletes their profile in students or faculty!
   * @param {number} id - User ID
   * @returns {Promise<number>} - Returns the number of rows changed
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM users WHERE id = ?`;
      
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
};

module.exports = UserModel;
