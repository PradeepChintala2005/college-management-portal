const db = require('../database/db');

/**
 * Faculty Model - Data Access Object for 'faculty' table
 */
const FacultyModel = {
  /**
   * Find a faculty record by their unique employee ID.
   * Used to check for employee ID duplicate conflicts.
   * @param {string} employeeId - Faculty corporate identifier (e.g. FAC-CSE-001)
   * @returns {Promise<object|null>}
   */
  findByEmployeeId(employeeId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM faculty WHERE employee_id = ?`;
      
      db.get(sql, [employeeId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Retrieve all faculty records with credentials and department details.
   * @returns {Promise<Array>}
   */
  findAll() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          f.id,
          f.user_id,
          f.department_id,
          f.employee_id,
          f.first_name,
          f.last_name,
          f.designation,
          f.phone,
          u.email,
          d.name AS department_name,
          d.code AS department_code
        FROM faculty f
        INNER JOIN users u ON f.user_id = u.id
        LEFT JOIN departments d ON f.department_id = d.id
        ORDER BY f.id ASC
      `;
      
      db.all(sql, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  },

  /**
   * Find a single faculty profile by its unique ID.
   * @param {number} id - Faculty profile ID
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          f.id,
          f.user_id,
          f.department_id,
          f.employee_id,
          f.first_name,
          f.last_name,
          f.designation,
          f.phone,
          u.email,
          d.name AS department_name,
          d.code AS department_code
        FROM faculty f
        INNER JOIN users u ON f.user_id = u.id
        LEFT JOIN departments d ON f.department_id = d.id
        WHERE f.id = ?
      `;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Update faculty profile fields inside the database.
   * @param {number} id - Faculty profile ID
   * @param {object} updateData - Object containing updated fields
   * @returns {Promise<number>} - Returns the number of changed rows
   */
  update(id, { departmentId, employeeId, firstName, lastName, designation, phone }) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE faculty
        SET 
          department_id = ?,
          employee_id = ?,
          first_name = ?,
          last_name = ?,
          designation = ?,
          phone = ?
        WHERE id = ?
      `;
      
      db.run(
        sql,
        [
          departmentId || null,
          employeeId.trim().toUpperCase(),
          firstName.trim(),
          lastName.trim(),
          designation || null,
          phone || null,
          id
        ],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve(this.changes);
        }
      );
    });
  },

  /**
   * Find a faculty profile by their user account ID.
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  findByUserId(userId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM faculty WHERE user_id = ?`;
      
      db.get(sql, [userId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }
};

module.exports = FacultyModel;
