const db = require('../database/db');

/**
 * Course Model - Data Access Object for 'courses' table
 */
const CourseModel = {
  /**
   * Find a course by its unique course code.
   * Used to check for duplicate codes before saving.
   * @param {string} courseCode - The unique identifier (e.g. CS-301)
   * @returns {Promise<object|null>}
   */
  findByCourseCode(courseCode) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM courses WHERE course_code = ?`;
      
      db.get(sql, [courseCode], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Insert a new course record into the database.
   * @param {object} courseData
   * @returns {Promise<number>} - Newly generated Course ID
   */
  create({ departmentId, courseCode, title, credits }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO courses (department_id, course_code, title, credits)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(
        sql,
        [
          departmentId,
          courseCode.trim().toUpperCase(),
          title.trim(),
          credits
        ],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve(this.lastID);
        }
      );
    });
  },

  /**
   * Retrieve all courses with matching department details.
   * @returns {Promise<Array>}
   */
  findAll() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          c.id,
          c.department_id,
          c.course_code,
          c.title,
          c.credits,
          d.name AS department_name,
          d.code AS department_code
        FROM courses c
        INNER JOIN departments d ON c.department_id = d.id
        ORDER BY c.id ASC
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
   * Find a single course by its unique ID.
   * @param {number} id - Course profile ID
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          c.id,
          c.department_id,
          c.course_code,
          c.title,
          c.credits,
          d.name AS department_name,
          d.code AS department_code
        FROM courses c
        INNER JOIN departments d ON c.department_id = d.id
        WHERE c.id = ?
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
   * Update course details in the database.
   * @param {number} id - Course ID
   * @param {object} updateData
   * @returns {Promise<number>} - Number of changed rows
   */
  update(id, { departmentId, courseCode, title, credits }) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE courses
        SET 
          department_id = ?,
          course_code = ?,
          title = ?,
          credits = ?
        WHERE id = ?
      `;
      
      db.run(
        sql,
        [
          departmentId,
          courseCode.trim().toUpperCase(),
          title.trim(),
          credits,
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
   * Delete a course from the database.
   * @param {number} id - Course ID
   * @returns {Promise<number>} - Number of changed rows
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM courses WHERE id = ?`;
      
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
};

module.exports = CourseModel;
