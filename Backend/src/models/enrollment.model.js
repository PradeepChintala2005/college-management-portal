const db = require('../database/db');

/**
 * Enrollment Model - Data Access Object for 'enrollments' table (Many-to-Many bridge)
 */
const EnrollmentModel = {
  /**
   * Find an enrollment record by its unique ID.
   * Also fetches s.user_id to perform ownership validations during drops.
   * @param {number} id - The enrollment primary key ID
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT e.*, s.user_id 
        FROM enrollments e
        INNER JOIN students s ON e.student_id = s.id
        WHERE e.id = ?
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
   * Find an enrollment record matching studentId and classSectionId.
   * Used to check for duplicate enrollments.
   * @param {number} studentId
   * @param {number} classSectionId
   * @returns {Promise<object|null>}
   */
  findByStudentAndSection(studentId, classSectionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM enrollments 
        WHERE student_id = ? AND class_section_id = ?
      `;
      
      db.get(sql, [studentId, classSectionId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Enroll a student in a class section.
   * @param {object} enrollmentData
   * @returns {Promise<number>} - Newly created enrollment ID
   */
  create({ studentId, classSectionId }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO enrollments (student_id, class_section_id)
        VALUES (?, ?)
      `;
      
      db.run(sql, [studentId, classSectionId], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.lastID);
      });
    });
  },

  /**
   * Find all enrollments (class sections) for a specific student.
   * Bundles full course and faculty details using SQL JOINs.
   * @param {number} studentId
   * @returns {Promise<Array>}
   */
  findByStudentId(studentId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          e.id AS enrollment_id,
          e.student_id,
          e.class_section_id,
          e.enrollment_date,
          cs.section_name,
          cs.semester,
          c.id AS course_id,
          c.course_code,
          c.title AS course_title,
          c.credits,
          d.name AS department_name,
          d.code AS department_code,
          f.first_name AS faculty_first_name,
          f.last_name AS faculty_last_name,
          f.employee_id AS faculty_employee_id
        FROM enrollments e
        INNER JOIN class_sections cs ON e.class_section_id = cs.id
        INNER JOIN courses c ON cs.course_id = c.id
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN faculty f ON cs.faculty_id = f.id
        WHERE e.student_id = ?
        ORDER BY e.id ASC
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
   * Find all student enrollments for a specific class section (roster).
   * Bundles student names, roll numbers, emails, and department details.
   * @param {number} classSectionId
   * @returns {Promise<Array>}
   */
  findBySectionId(classSectionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          e.id AS enrollment_id,
          e.student_id,
          e.class_section_id,
          e.enrollment_date,
          s.roll_number,
          s.first_name,
          s.last_name,
          s.phone,
          u.email,
          d.name AS department_name,
          d.code AS department_code
        FROM enrollments e
        INNER JOIN students s ON e.student_id = s.id
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE e.class_section_id = ?
        ORDER BY s.last_name ASC, s.first_name ASC
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
   * Remove/drop an enrollment record.
   * @param {number} id - Enrollment ID
   * @returns {Promise<number>} - Number of changed rows
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM enrollments WHERE id = ?`;
      
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
};

module.exports = EnrollmentModel;
