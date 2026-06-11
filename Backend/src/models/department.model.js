const db = require('../database/db');

/**
 * Department Model - Data Access Object for 'departments' table
 */
const DepartmentModel = {
  /**
   * Find a department by its unique ID.
   * Used to check if a department exists.
   * @param {number} id - Department ID
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM departments WHERE id = ?`;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Find a department by its unique code.
   * @param {string} code - Department Code (e.g. CSE)
   */
  findByCode(code) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM departments WHERE code = ?`;
      db.get(sql, [code], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  },

  /**
   * Get all departments in the system.
   */
  findAll() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM departments ORDER BY name ASC`;
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  /**
   * Update details of an existing department.
   */
  update(id, { name, code, description }) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE departments
        SET name = ?, code = ?, description = ?
        WHERE id = ?
      `;
      db.run(sql, [name, code, description, id], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  },

  /**
   * Delete a department from the system.
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM departments WHERE id = ?`;
      db.run(sql, [id], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  },

  /**
   * Quick utility to insert a test department.
   * Useful for testing onboarding without manual inserts.
   */
  create({ name, code, description }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO departments (name, code, description)
        VALUES (?, ?, ?)
      `;
      db.run(sql, [name, code, description], function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });
  }
};

module.exports = DepartmentModel;
