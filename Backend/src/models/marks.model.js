const db = require('../database/db');

/**
 * Marks Model - Data Access Object for 'marks' table
 */
const MarksModel = {
  /**
   * Insert a new mark record into the database.
   * @returns {Promise<number>} - Newly created mark record ID
   */
  create({ studentId, classSectionId, examType, marksObtained, maxMarks }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO marks (student_id, class_section_id, exam_type, marks_obtained, max_marks)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      db.run(
        sql,
        [
          studentId,
          classSectionId,
          examType.trim(),
          marksObtained,
          maxMarks
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
   * Find a mark record by its unique ID.
   * Also fetches s.user_id to perform ownership validations.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT m.*, s.user_id
        FROM marks m
        INNER JOIN students s ON m.student_id = s.id
        WHERE m.id = ?
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
   * Find all grade/marks records for a specific student.
   * Joins section and course details.
   * @param {number} studentId
   * @returns {Promise<Array>}
   */
  findByStudentId(studentId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          m.id AS mark_id,
          m.class_section_id,
          m.exam_type,
          m.marks_obtained,
          m.max_marks,
          cs.section_name,
          cs.semester,
          c.course_code,
          c.title AS course_title,
          c.credits
        FROM marks m
        INNER JOIN class_sections cs ON m.class_section_id = cs.id
        INNER JOIN courses c ON cs.course_id = c.id
        WHERE m.student_id = ?
        ORDER BY m.id DESC
      `;
      
      db.all(sql, [studentId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  },

  /**
   * Find all marks entries for a specific class section (grading spreadsheet).
   * Joins student names and roll numbers.
   * @param {number} classSectionId
   * @returns {Promise<Array>}
   */
  findBySectionId(classSectionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          m.id AS mark_id,
          m.student_id,
          m.exam_type,
          m.marks_obtained,
          m.max_marks,
          s.roll_number,
          s.first_name,
          s.last_name,
          u.email
        FROM marks m
        INNER JOIN students s ON m.student_id = s.id
        INNER JOIN users u ON s.user_id = u.id
        WHERE m.class_section_id = ?
        ORDER BY s.last_name ASC, s.first_name ASC, m.id DESC
      `;
      
      db.all(sql, [classSectionId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  },

  /**
   * Update details of an existing mark entry.
   * @param {number} id - Mark record ID
   * @returns {Promise<number>} - Number of changed rows
   */
  update(id, { examType, marksObtained, maxMarks }) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE marks
        SET 
          exam_type = ?,
          marks_obtained = ?,
          max_marks = ?
        WHERE id = ?
      `;
      
      db.run(
        sql,
        [
          examType.trim(),
          marksObtained,
          maxMarks,
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
   * Delete an assessment mark entry.
   * @param {number} id - Mark record ID
   * @returns {Promise<number>} - Number of changed rows
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM marks WHERE id = ?`;
      
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
};

module.exports = MarksModel;
