const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/student.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Student Management Endpoints
// ==========================================

// Route:   POST /api/students
// Desc:    Create/Onboard a new student account & profile
// Access:  Private (Admin only!)
router.post(
  '/', 
  AuthMiddleware.authenticateJWT, 
  AuthMiddleware.authorizeRoles('admin'), 
  StudentController.create
);

// Route:   GET /api/students
// Desc:    Get list of all students with credentials & department details
// Access:  Private (Admin & Faculty only!)
router.get(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  StudentController.getAll
);

// Route:   GET /api/students/:id
// Desc:    Get details of a single student profile
// Access:  Private (Admin, Faculty, and the Owner Student themselves!)
router.get(
  '/:id',
  AuthMiddleware.authenticateJWT,
  StudentController.getById
);

// Route:   PUT /api/students/:id
// Desc:    Update student profile details
// Access:  Private (Admin only!)
router.put(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  StudentController.update
);

// Route:   DELETE /api/students/:id
// Desc:    Delete student account and profile (Cascading delete active)
// Access:  Private (Admin only!)
router.delete(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  StudentController.delete
);

module.exports = router;
