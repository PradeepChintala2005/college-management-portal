const db = require('../database/db');

/**
 * Class Section Model - Data Access Object for 'class_sections' table
 */
const ClassSectionModel = {
  /**
   * Insert a new class section into the database.
   * @param {object} sectionData
   * @returns {Promise<number>} - Newly generated Section ID
   */
  create({ courseId, facultyId, sectionName, semester }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO class_sections (course_id, faculty_id, section_name, semester)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(
        sql,
        [
          courseId,
          facultyId || null,
          sectionName.trim(),
          semester.trim()
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
   * Retrieve all class sections with course and faculty teacher details.
   * @returns {Promise<Array>}
   */
  findAll() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          cs.id,
          cs.course_id,
          cs.faculty_id,
          cs.section_name,
          cs.semester,
          c.course_code,
          c.title AS course_title,
          f.employee_id AS faculty_employee_id,
          f.first_name AS faculty_first_name,
          f.last_name AS faculty_last_name
        FROM class_sections cs
        INNER JOIN courses c ON cs.course_id = c.id
        LEFT JOIN faculty f ON cs.faculty_id = f.id
        ORDER BY cs.id ASC
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
   * Find a single class section by its unique ID.
   * @param {number} id - Class Section ID
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          cs.id,
          cs.course_id,
          cs.faculty_id,
          cs.section_name,
          cs.semester,
          c.course_code,
          c.title AS course_title,
          f.employee_id AS faculty_employee_id,
          f.first_name AS faculty_first_name,
          f.last_name AS faculty_last_name
        FROM class_sections cs
        INNER JOIN courses c ON cs.course_id = c.id
        LEFT JOIN faculty f ON cs.faculty_id = f.id
        WHERE cs.id = ?
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
   * Update class section parameters inside the database.
   * @param {number} id - Section ID
   * @param {object} updateData
   * @returns {Promise<number>} - Number of changed rows
   */
  update(id, { courseId, facultyId, sectionName, semester }) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE class_sections
        SET 
          course_id = ?,
          faculty_id = ?,
          section_name = ?,
          semester = ?
        WHERE id = ?
      `;
      
      db.run(
        sql,
        [
          courseId,
          facultyId || null,
          sectionName.trim(),
          semester.trim(),
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
   * Delete a class section from the database.
   * @param {number} id - Section ID
   * @returns {Promise<number>} - Number of changed rows
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM class_sections WHERE id = ?`;
      
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
};

module.exports = ClassSectionModel;
