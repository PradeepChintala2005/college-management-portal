const db = require('../database/db');

/**
 * Announcement Model - Data Access Object for 'announcements' table
 */
const AnnouncementModel = {
  /**
   * Insert a new announcement bulletin record.
   * @returns {Promise<number>} - Newly created announcement ID
   */
  create({ authorId, departmentId, title, content }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO announcements (author_id, department_id, title, content)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(
        sql,
        [
          authorId,
          departmentId || null,
          title.trim(),
          content.trim()
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
   * Find an announcement by its unique primary key ID.
   * Joins user details and faculty names if available.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          a.id AS announcement_id,
          a.author_id,
          a.department_id,
          a.title,
          a.content,
          a.created_at,
          u.email AS author_email,
          u.role AS author_role,
          d.name AS department_name,
          d.code AS department_code,
          COALESCE(f.first_name || ' ' || f.last_name, 'Administrator') AS author_name
        FROM announcements a
        INNER JOIN users u ON a.author_id = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN faculty f ON u.id = f.user_id
        WHERE a.id = ?
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
   * Retrieve all announcements in the portal (Admin master feed list).
   * @returns {Promise<Array>}
   */
  findAll() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          a.id AS announcement_id,
          a.author_id,
          a.department_id,
          a.title,
          a.content,
          a.created_at,
          u.email AS author_email,
          u.role AS author_role,
          d.name AS department_name,
          d.code AS department_code,
          COALESCE(f.first_name || ' ' || f.last_name, 'Administrator') AS author_name
        FROM announcements a
        INNER JOIN users u ON a.author_id = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN faculty f ON u.id = f.user_id
        ORDER BY a.id DESC
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
   * Retrieve merged feed of general announcements (null dept) and department specific bulletins.
   * @param {number|null} departmentId
   * @returns {Promise<Array>}
   */
  findGeneralAndDepartmentAnnouncements(departmentId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          a.id AS announcement_id,
          a.author_id,
          a.department_id,
          a.title,
          a.content,
          a.created_at,
          u.email AS author_email,
          u.role AS author_role,
          d.name AS department_name,
          d.code AS department_code,
          COALESCE(f.first_name || ' ' || f.last_name, 'Administrator') AS author_name
        FROM announcements a
        INNER JOIN users u ON a.author_id = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN faculty f ON u.id = f.user_id
        WHERE a.department_id IS NULL OR a.department_id = ?
        ORDER BY a.id DESC
      `;
      
      db.all(sql, [departmentId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  },

  /**
   * Update details of an existing announcement.
   * @param {number} id - Announcement ID
   * @returns {Promise<number>} - Number of changed rows
   */
  update(id, { title, content, departmentId }) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE announcements
        SET 
          title = ?,
          content = ?,
          department_id = ?
        WHERE id = ?
      `;
      
      db.run(
        sql,
        [
          title.trim(),
          content.trim(),
          departmentId || null,
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
   * Delete an announcement bulletin.
   * @param {number} id - Announcement ID
   * @returns {Promise<number>} - Number of changed rows
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM announcements WHERE id = ?`;
      
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
};

module.exports = AnnouncementModel;
