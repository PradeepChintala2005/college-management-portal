const db = require('../database/db');

/**
 * Assignment Model - Data Access Object for 'assignments' table
 */
const AssignmentModel = {
  /**
   * Insert a new assignment record.
   * @returns {Promise<number>} - Newly created assignment ID
   */
  create({ classSectionId, title, description, dueDate }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO assignments (class_section_id, title, description, due_date)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(
        sql,
        [
          classSectionId,
          title.trim(),
          description ? description.trim() : null,
          dueDate.trim()
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
   * Find an assignment by its unique ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM assignments WHERE id = ?`;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Find all assignments for a class section.
   * Joins course and section parameters.
   * @param {number} classSectionId
   * @returns {Promise<Array>}
   */
  findBySectionId(classSectionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          a.id AS assignment_id,
          a.class_section_id,
          a.title,
          a.description,
          a.due_date,
          cs.section_name,
          cs.semester,
          c.course_code,
          c.title AS course_title
        FROM assignments a
        INNER JOIN class_sections cs ON a.class_section_id = cs.id
        INNER JOIN courses c ON cs.course_id = c.id
        WHERE a.class_section_id = ?
        ORDER BY a.id DESC
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
   * Update details of an existing assignment.
   * @param {number} id - Assignment ID
   * @returns {Promise<number>} - Number of changed rows
   */
  update(id, { title, description, dueDate }) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE assignments
        SET 
          title = ?,
          description = ?,
          due_date = ?
        WHERE id = ?
      `;
      
      db.run(
        sql,
        [
          title.trim(),
          description ? description.trim() : null,
          dueDate.trim(),
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
   * Delete an assignment.
   * @param {number} id - Assignment ID
   * @returns {Promise<number>} - Number of changed rows
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM assignments WHERE id = ?`;
      
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
};

module.exports = AssignmentModel;
