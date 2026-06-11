const express = require('express');
const router = express.Router();
const SubmissionController = require('../controllers/submission.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Student Submissions & Grading Endpoints
// ==========================================

// Route:   POST /api/submissions
// Desc:    Submit coursework homework answer (Students only)
// Access:  Private (Student only!)
router.post(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('student'),
  SubmissionController.submit
);

// Route:   POST /api/submissions/:id/grade
// Desc:    Grade a student's coursework homework submission (Admin/Faculty only)
// Access:  Private (Admin & Faculty only!)
router.post(
  '/:id/grade',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  SubmissionController.grade
);

// Route:   GET /api/submissions/assignment/:assignmentId
// Desc:    Get all submissions for an assignment (teacher coursework roster) (Admin/Faculty only)
// Access:  Private (Admin & Faculty only!)
router.get(
  '/assignment/:assignmentId',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  SubmissionController.getByAssignmentId
);

// Route:   GET /api/submissions/student/:studentId
// Desc:    Get all homework submissions made by a student (All roles - with student ownership check in controller)
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/student/:studentId',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  SubmissionController.getByStudentId
);

module.exports = router;
