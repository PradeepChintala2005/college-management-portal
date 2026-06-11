const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendance.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Attendance Management Endpoints
// ==========================================

// Route:   POST /api/attendance/session
// Desc:    Create a new attendance class session (Manual or QR-based)
// Access:  Private (Admin & Faculty only!)
router.post(
  '/session',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  AttendanceController.createSession
);

// Route:   POST /api/attendance/mark
// Desc:    Manually log attendance status for a student (Admin/Faculty manual entry)
// Access:  Private (Admin & Faculty only!)
router.post(
  '/mark',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  AttendanceController.markAttendanceManual
);

// Route:   POST /api/attendance/check-in
// Desc:    Self check-in for a student via scanning a valid QR code token
// Access:  Private (Student only!)
router.post(
  '/check-in',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('student'),
  AttendanceController.checkInSelfQR
);

// Route:   GET /api/attendance/student/:studentId
// Desc:    Retrieve attendance stats logs and percentage for a student
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/student/:studentId',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  AttendanceController.getStudentStats
);

// Route:   GET /api/attendance/section/:sectionId
// Desc:    Retrieve sheet report of attendance summaries for all students in a section
// Access:  Private (Admin & Faculty only!)
router.get(
  '/section/:sectionId',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  AttendanceController.getSectionStats
);

module.exports = router;
