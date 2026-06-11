const express = require('express');
const router = express.Router();
const EnrollmentController = require('../controllers/enrollment.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Student Course Enrollment Endpoints
// ==========================================

// Route:   POST /api/enrollments
// Desc:    Enroll a student in a class section (Admin or Student self-enrollment)
// Access:  Private (Admin & Student only!)
router.post(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'student'),
  EnrollmentController.create
);

// Route:   GET /api/enrollments/student/:studentId
// Desc:    Get all course registrations for a student (schedule)
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/student/:studentId',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  EnrollmentController.getByStudentId
);

// Route:   GET /api/enrollments/section/:sectionId
// Desc:    Get the roster of students enrolled in a class section
// Access:  Private (Admin & Faculty only!)
router.get(
  '/section/:sectionId',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  EnrollmentController.getBySectionId
);

// Route:   DELETE /api/enrollments/:id
// Desc:    Drop/Withdraw a student from a course section
// Access:  Private (Admin & Student only!)
router.delete(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'student'),
  EnrollmentController.delete
);

module.exports = router;
