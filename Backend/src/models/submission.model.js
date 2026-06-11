const db = require('../database/db');

/**
 * Submission Model - Data Access Object for 'submissions' table
 */
const SubmissionModel = {
  /**
   * Insert a new student submission.
   * @returns {Promise<number>} - Newly created submission ID
   */
  create({ assignmentId, studentId, submissionText }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO submissions (assignment_id, student_id, submission_text)
        VALUES (?, ?, ?)
      `;
      
      db.run(
        sql,
        [
          assignmentId,
          studentId,
          submissionText ? submissionText.trim() : null
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
   * Find a submission by its unique ID.
   * Also fetches s.user_id for student ownership checks.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT sub.*, s.user_id
        FROM submissions sub
        INNER JOIN students s ON sub.student_id = s.id
        WHERE sub.id = ?
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
   * Find a student's submission for a specific assignment.
   * Used to check for duplicate submissions.
   * @param {number} assignmentId
   * @param {number} studentId
   * @returns {Promise<object|null>}
   */
  findByAssignmentAndStudent(assignmentId, studentId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM submissions 
        WHERE assignment_id = ? AND student_id = ?
      `;
      
      db.get(sql, [assignmentId, studentId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Retrieve all submissions for a specific assignment (teacher grade roster).
   * Joins student profile names, roll numbers, and emails.
   * @param {number} assignmentId
   * @returns {Promise<Array>}
   */
  findByAssignmentId(assignmentId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          sub.id AS submission_id,
          sub.assignment_id,
          sub.student_id,
          sub.submission_text,
          sub.submitted_at,
          sub.grade,
          s.roll_number,
          s.first_name,
          s.last_name,
          u.email
        FROM submissions sub
        INNER JOIN students s ON sub.student_id = s.id
        INNER JOIN users u ON s.user_id = u.id
        WHERE sub.assignment_id = ?
        ORDER BY s.last_name ASC, s.first_name ASC
      `;
      
      db.all(sql, [assignmentId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  },

  /**
   * Retrieve all submissions made by a student across all subjects.
   * Joins course titles and assignment parameters.
   * @param {number} studentId
   * @returns {Promise<Array>}
   */
  findByStudentId(studentId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          sub.id AS submission_id,
          sub.assignment_id,
          sub.submission_text,
          sub.submitted_at,
          sub.grade,
          a.title AS assignment_title,
          a.due_date AS assignment_due_date,
          cs.section_name,
          c.course_code,
          c.title AS course_title
        FROM submissions sub
        INNER JOIN assignments a ON sub.assignment_id = a.id
        INNER JOIN class_sections cs ON a.class_section_id = cs.id
        INNER JOIN courses c ON cs.course_id = c.id
        WHERE sub.student_id = ?
        ORDER BY sub.id DESC
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
   * Record teacher feedback / grade comment on a submission.
   * @param {number} id - Submission ID
   * @param {string} grade - The feedback evaluation text
   * @returns {Promise<number>} - Number of changed rows
   */
  grade(id, grade) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE submissions
        SET grade = ?
        WHERE id = ?
      `;
      
      db.run(sql, [grade ? grade.trim() : null, id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  },

  /**
   * Delete a student submission.
   * @param {number} id - Submission ID
   * @returns {Promise<number>} - Number of changed rows
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM submissions WHERE id = ?`;
      
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
};

module.exports = SubmissionModel;
