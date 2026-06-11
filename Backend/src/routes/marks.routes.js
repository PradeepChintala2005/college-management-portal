const express = require('express');
const router = express.Router();
const MarksController = require('../controllers/marks.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Student Marks & Grades Catalog Endpoints
// ==========================================

// Route:   POST /api/marks
// Desc:    Record assessment score marks for a student (Admin/Faculty only)
// Access:  Private (Admin & Faculty only!)
router.post(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  MarksController.create
);

// Route:   PUT /api/marks/:id
// Desc:    Update details of an existing marks record (Admin/Faculty only)
// Access:  Private (Admin & Faculty only!)
router.put(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  MarksController.update
);

// Route:   DELETE /api/marks/:id
// Desc:    Remove an existing marks record (Admin/Faculty only)
// Access:  Private (Admin & Faculty only!)
router.delete(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  MarksController.delete
);

// Route:   GET /api/marks/student/:studentId
// Desc:    Retrieve entire grading report card logs for a student
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/student/:studentId',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  MarksController.getByStudentId
);

// Route:   GET /api/marks/section/:sectionId
// Desc:    Retrieve sheet report of student scores in a class section (Admin/Faculty only)
// Access:  Private (Admin & Faculty only!)
router.get(
  '/section/:sectionId',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  MarksController.getBySectionId
);

module.exports = router;
