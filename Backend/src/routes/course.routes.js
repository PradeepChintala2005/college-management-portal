const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/course.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Course Catalog Endpoints (REST API)
// ==========================================

// Route:   POST /api/courses
// Desc:    Create a new course catalog syllabus
// Access:  Private (Admin only!)
router.post(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  CourseController.create
);

// Route:   GET /api/courses
// Desc:    Retrieve list of all courses in system
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  CourseController.getAll
);

// Route:   GET /api/courses/:id
// Desc:    Retrieve syllabus details for a single course
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  CourseController.getById
);

// Route:   PUT /api/courses/:id
// Desc:    Update details of an existing course syllabus
// Access:  Private (Admin only!)
router.put(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  CourseController.update
);

// Route:   DELETE /api/courses/:id
// Desc:    Remove a course catalog entry
// Access:  Private (Admin only!)
router.delete(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  CourseController.delete
);

module.exports = router;
