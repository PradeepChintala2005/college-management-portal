const crypto = require('crypto');
const AttendanceModel = require('../models/attendance.model');
const ClassSectionModel = require('../models/class-section.model');
const StudentModel = require('../models/student.model');
const EnrollmentModel = require('../models/enrollment.model');

/**
 * Attendance Controller - Coordinates teacher session scheduling and student check-ins
 */
const AttendanceController = {
  /**
   * Create a new attendance session (Admin/Faculty only)
   * Route: POST /api/attendance/session
   */
  async createSession(req, res, next) {
    try {
      const { classSectionId, sessionDate, generateQR, expiresInMinutes, qrCodeToken } = req.body;

      // 1. Validation Check: Make sure class section ID is provided
      if (!classSectionId) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide classSectionId.'
        });
      }

      const parsedSectionId = parseInt(classSectionId, 10);
      if (isNaN(parsedSectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid classSectionId format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the class section exists
      const section = await ClassSectionModel.findById(parsedSectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Class section with ID '${parsedSectionId}' not found.`
        });
      }

      // 3. Set default date (today's ISO date string YYYY-MM-DD) if none is provided
      const finalDate = sessionDate ? sessionDate.trim() : new Date().toISOString().split('T')[0];

      // 4. Handle dynamic QR token generation (if requested or passed directly)
      let finalQrCodeToken = null;
      let tokenExpiresAt = null;

      if (qrCodeToken) {
        finalQrCodeToken = qrCodeToken.trim().toUpperCase();
        const timeoutMinutes = parseInt(expiresInMinutes, 10) || 5;
        tokenExpiresAt = new Date(Date.now() + timeoutMinutes * 60000).toISOString();
      } else if (generateQR) {
        // Generate a random, cryptographically secure 16-byte hex token (32 characters)
        finalQrCodeToken = crypto.randomBytes(16).toString('hex').toUpperCase();
        
        // Expiration window defaults to 5 minutes if not specified
        const timeoutMinutes = parseInt(expiresInMinutes, 10) || 5;
        if (isNaN(timeoutMinutes) || timeoutMinutes < 1) {
          return res.status(400).json({
            success: false,
            message: 'Invalid expiresInMinutes value. Must be a positive integer.'
          });
        }
        
        // Calculate expiration timestamp (current system epoch + timeout in ms)
        tokenExpiresAt = new Date(Date.now() + timeoutMinutes * 60000).toISOString();
      }

      // 5. Save session in database
      const newSessionId = await AttendanceModel.createSession({
        classSectionId: parsedSectionId,
        sessionDate: finalDate,
        qrCodeToken: finalQrCodeToken,
        tokenExpiresAt
      });

      // 6. Return successful response
      return res.status(201).json({
        success: true,
        message: 'Attendance session created successfully!',
        data: {
          sessionId: newSessionId,
          classSectionId: parsedSectionId,
          sessionDate: finalDate,
          qrCodeToken: finalQrCodeToken,
          tokenExpiresAt
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Manually mark a student's attendance (Admin/Faculty only)
   * Route: POST /api/attendance/mark
   */
  async markAttendanceManual(req, res, next) {
    try {
      const { sessionId, studentId, status } = req.body;

      // 1. Validation Check: Make sure core fields are provided
      if (!sessionId || !studentId || !status) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide sessionId, studentId, and status.'
        });
      }

      // 2. Format & Parse values
      const parsedSessionId = parseInt(sessionId, 10);
      const parsedStudentId = parseInt(studentId, 10);
      const formattedStatus = status.trim();

      if (isNaN(parsedSessionId) || isNaN(parsedStudentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parameter formats. sessionId and studentId must be integers.'
        });
      }

      // 3. Enforce valid attendance status option
      const validStatuses = ['Present', 'Absent', 'Late'];
      if (!validStatuses.includes(formattedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value. Must be one of: 'Present', 'Absent', or 'Late'."
        });
      }

      // 4. Database Lookup: Verify the attendance session exists
      const session = await AttendanceModel.findSessionById(parsedSessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: `Attendance session with ID '${parsedSessionId}' not found.`
        });
      }

      // 5. Database Lookup: Verify the student exists
      const student = await StudentModel.findById(parsedStudentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student with profile ID '${parsedStudentId}' not found.`
        });
      }

      // 6. Business Integrity Check: Verify student is enrolled in the session's class section
      const enrollment = await EnrollmentModel.findByStudentAndSection(parsedStudentId, session.class_section_id);
      if (!enrollment) {
        return res.status(400).json({
          success: false,
          message: `Cannot mark attendance. Student is not enrolled in this section's class roster.`
        });
      }

      // 7. Save or Update Record
      await AttendanceModel.markRecord({
        sessionId: parsedSessionId,
        studentId: parsedStudentId,
        status: formattedStatus
      });

      return res.status(200).json({
        success: true,
        message: 'Attendance record updated successfully!',
        data: {
          sessionId: parsedSessionId,
          studentId: parsedStudentId,
          status: formattedStatus
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Self check-in via scanning valid dynamic QR Code (Students only)
   * Route: POST /api/attendance/check-in
   */
  async checkInSelfQR(req, res, next) {
    try {
      const { qrCodeToken } = req.body;

      // 1. Validation Check: Make sure token is provided
      if (!qrCodeToken) {
        return res.status(400).json({
          success: false,
          message: 'Required scan payload missing. Make sure to provide qrCodeToken.'
        });
      }

      // 2. Database Lookup: Verify the session matches the QR token
      const session = await AttendanceModel.findSessionByToken(qrCodeToken.trim());
      if (!session) {
        return res.status(400).json({
          success: false,
          message: 'Check-in failed. Invalid QR code token.'
        });
      }

      // 3. Expiration Check: Make sure QR Code has not expired yet
      if (session.token_expires_at) {
        const currentTime = new Date();
        const expirationTime = new Date(session.token_expires_at);

        if (currentTime > expirationTime) {
          return res.status(400).json({
            success: false,
            message: 'Check-in failed. This QR code token has expired. Please scan a fresh code.'
          });
        }
      }

      // 4. Database Lookup: Verify the logged-in user has a student profile
      const student = await StudentModel.findByUserId(req.user.userId);
      if (!student) {
        return res.status(403).json({
          success: false,
          message: 'Check-in failed. Logged-in credentials are not linked to a student profile.'
        });
      }

      // 5. Business Integrity Check: Verify student is registered in this class section
      const enrollment = await EnrollmentModel.findByStudentAndSection(student.id, session.class_section_id);
      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'Check-in failed. You are not enrolled in this class section roster.'
        });
      }

      // 6. Save or Update check-in record as 'Present'
      await AttendanceModel.markRecord({
        sessionId: session.id,
        studentId: student.id,
        status: 'Present'
      });

      return res.status(200).json({
        success: true,
        message: 'Self check-in recorded successfully via QR code scan!',
        data: {
          sessionId: session.id,
          studentId: student.id,
          rollNumber: student.roll_number,
          status: 'Present'
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get attendance reports and logs history for a student
   * Route: GET /api/attendance/student/:studentId
   */
  async getStudentStats(req, res, next) {
    try {
      const studentId = parseInt(req.params.studentId, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify student exists
      const student = await StudentModel.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student with profile ID '${studentId}' not found.`
        });
      }

      // 3. SECURITY CHECK:
      // - Students can ONLY view their own attendance metrics.
      // - Admins and Faculty can view any student's metrics.
      if (req.user.role === 'student' && student.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view another student\'s attendance data.'
        });
      }

      // 4. Query all records from database
      const records = await AttendanceModel.findScheduleStatsByStudentId(studentId);

      // 5. Calculate percentage statistics
      const total = records.length;
      const presentCount = records.filter(r => r.status === 'Present').length;
      const lateCount = records.filter(r => r.status === 'Late').length;
      const absentCount = records.filter(r => r.status === 'Absent').length;

      // Present + Late counts as attended class sessions
      const attendancePercentage = total > 0 
        ? parseFloat(((presentCount + lateCount) / total * 100).toFixed(2)) 
        : 100.0;

      return res.status(200).json({
        success: true,
        message: 'Student attendance statistics retrieved successfully.',
        data: {
          studentId,
          rollNumber: student.roll_number,
          firstName: student.first_name,
          lastName: student.last_name,
          statistics: {
            totalSessions: total,
            present: presentCount,
            late: lateCount,
            absent: absentCount,
            percentage: attendancePercentage
          },
          logs: records
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get attendance sheet spreadsheet summary for all students in a section (Admin/Faculty only)
   * Route: GET /api/attendance/section/:sectionId
   */
  async getSectionStats(req, res, next) {
    try {
      const sectionId = parseInt(req.params.sectionId, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(sectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid section ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the class section exists
      const section = await ClassSectionModel.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Class section with ID '${sectionId}' not found.`
        });
      }

      // 3. Query aggregated database roster calculations
      const rosterStats = await AttendanceModel.findRosterStatsBySectionId(sectionId);

      return res.status(200).json({
        success: true,
        message: 'Class section attendance stats roster retrieved successfully.',
        data: {
          sectionId,
          courseCode: section.course_code,
          courseTitle: section.course_title,
          sectionName: section.section_name,
          semester: section.semester,
          sheet: rosterStats
        }
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = AttendanceController;
