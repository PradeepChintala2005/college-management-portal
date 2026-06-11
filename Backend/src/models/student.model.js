const db = require('../database/db');

/**
 * Student Model - Data Access Object for 'students' table
 */
const StudentModel = {
  /**
   * Find a student record by their academic roll number.
   * Used to check for roll number duplicates.
   * @param {string} rollNumber - The roll number to search for (e.g., CSE-2026-001).
   * @returns {Promise<object|null>}
   */
  findByRollNumber(rollNumber) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM students WHERE roll_number = ?`;
      
      db.get(sql, [rollNumber], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Retrieve all students in the portal with their email and department details.
   * @returns {Promise<Array>}
   */
  findAll() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          s.id,
          s.user_id,
          s.department_id,
          s.roll_number,
          s.first_name,
          s.last_name,
          s.phone,
          s.date_of_birth,
          u.email,
          d.name AS department_name,
          d.code AS department_code
        FROM students s
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN departments d ON s.department_id = d.id
        ORDER BY s.id ASC
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
   * Find a single student by their unique student ID.
   * @param {number} id - Student profile ID
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          s.id,
          s.user_id,
          s.department_id,
          s.roll_number,
          s.first_name,
          s.last_name,
          s.phone,
          s.date_of_birth,
          u.email,
          d.name AS department_name,
          d.code AS department_code
        FROM students s
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.id = ?
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
   * Find a student profile by their authentication user ID.
   * @param {number} userId - The foreign user account ID
   * @returns {Promise<object|null>}
   */
  findByUserId(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM students WHERE user_id = ?
      `;
      
      db.get(sql, [userId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Update student profile fields inside the database.
   * @param {number} id - Student profile ID
   * @param {object} updateData - Object containing updated fields
   * @returns {Promise<number>} - Returns the number of changed rows
   */
  update(id, { departmentId, rollNumber, firstName, lastName, phone, dateOfBirth }) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE students
        SET 
          department_id = ?,
          roll_number = ?,
          first_name = ?,
          last_name = ?,
          phone = ?,
          date_of_birth = ?
        WHERE id = ?
      `;
      
      db.run(
        sql,
        [
          departmentId || null,
          rollNumber.trim().toUpperCase(),
          firstName.trim(),
          lastName.trim(),
          phone || null,
          dateOfBirth || null,
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
  }
};

module.exports = StudentModel;
