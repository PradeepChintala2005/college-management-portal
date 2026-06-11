const db = require('../database/db');

/**
 * Attendance Model - Data Access Object for 'attendance_sessions' and 'attendance_records'
 */
const AttendanceModel = {
  /**
   * Create a new attendance session (class slot).
   * @returns {Promise<number>} - Newly created session ID
   */
  createSession({ classSectionId, sessionDate, qrCodeToken, tokenExpiresAt }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO attendance_sessions (class_section_id, session_date, qr_code_token, token_expires_at)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(
        sql,
        [
          classSectionId,
          sessionDate,
          qrCodeToken || null,
          tokenExpiresAt || null
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
   * Find an attendance session by its primary key ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  findSessionById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM attendance_sessions WHERE id = ?`;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Find an attendance session by its dynamic QR code token.
   * @param {string} token
   * @returns {Promise<object|null>}
   */
  findSessionByToken(token) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM attendance_sessions WHERE qr_code_token = ?`;
      
      db.get(sql, [token], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Mark a student's attendance. Uses ON CONFLICT to update status if already logged.
   * @returns {Promise<number>} - Number of changed rows
   */
  markRecord({ sessionId, studentId, status }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO attendance_records (session_id, student_id, status)
        VALUES (?, ?, ?)
        ON CONFLICT(session_id, student_id) DO UPDATE SET
          status = excluded.status,
          marked_at = CURRENT_TIMESTAMP
      `;
      
      db.run(sql, [sessionId, studentId, status], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  },

  /**
   * Find an attendance record for a student in a specific session.
   * @param {number} sessionId
   * @param {number} studentId
   * @returns {Promise<object|null>}
   */
  findRecordBySessionAndStudent(sessionId, studentId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM attendance_records 
        WHERE session_id = ? AND student_id = ?
      `;
      
      db.get(sql, [sessionId, studentId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Find all attendance records for a specific student.
   * Joins session details, section details, and course title.
   * @param {number} studentId
   * @returns {Promise<Array>}
   */
  findScheduleStatsByStudentId(studentId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          ar.id AS record_id,
          ar.status,
          ar.marked_at,
          as_sess.session_date,
          cs.section_name,
          cs.semester,
          c.course_code,
          c.title AS course_title
        FROM attendance_records ar
        INNER JOIN attendance_sessions as_sess ON ar.session_id = as_sess.id
        INNER JOIN class_sections cs ON as_sess.class_section_id = cs.id
        INNER JOIN courses c ON cs.course_id = c.id
        WHERE ar.student_id = ?
        ORDER BY as_sess.session_date DESC, ar.id DESC
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
   * Find attendance summaries for all students enrolled in a class section.
   * Counts total Present, Absent, and Late records per student.
   * @param {number} sectionId
   * @returns {Promise<Array>}
   */
  findRosterStatsBySectionId(sectionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          s.id AS student_id,
          s.roll_number,
          s.first_name,
          s.last_name,
          u.email,
          COALESCE(SUM(CASE WHEN ar.status = 'Present' THEN 1 ELSE 0 END), 0) AS total_present,
          COALESCE(SUM(CASE WHEN ar.status = 'Absent' THEN 1 ELSE 0 END), 0) AS total_absent,
          COALESCE(SUM(CASE WHEN ar.status = 'Late' THEN 1 ELSE 0 END), 0) AS total_late,
          COUNT(ar.id) AS total_marked,
          (SELECT COUNT(*) FROM attendance_sessions WHERE class_section_id = ?) AS total_sessions
        FROM enrollments e
        INNER JOIN students s ON e.student_id = s.id
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN attendance_sessions as_sess ON e.class_section_id = as_sess.class_section_id
        LEFT JOIN attendance_records ar ON as_sess.id = ar.session_id AND s.id = ar.student_id
        WHERE e.class_section_id = ?
        GROUP BY s.id
        ORDER BY s.last_name ASC, s.first_name ASC
      `;
      
      db.all(sql, [sectionId, sectionId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  },

  /**
   * Delete an attendance session.
   * @param {number} id
   * @returns {Promise<number>} - Number of changed rows
   */
  deleteSession(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM attendance_sessions WHERE id = ?`;
      
      db.run(sql, [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
};

module.exports = AttendanceModel;
