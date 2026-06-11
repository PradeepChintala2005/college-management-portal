const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/department.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Department Management Endpoints (REST API)
// ==========================================

// Route:   POST /api/departments
// Desc:    Create a new department
// Access:  Private (Admin only!)
router.post(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  DepartmentController.create
);

// Route:   GET /api/departments
// Desc:    Get all departments
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  DepartmentController.getAll
);

// Route:   GET /api/departments/:id
// Desc:    Get department details by ID
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  DepartmentController.getById
);

// Route:   PUT /api/departments/:id
// Desc:    Update details of a department
// Access:  Private (Admin only!)
router.put(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  DepartmentController.update
);

// Route:   DELETE /api/departments/:id
// Desc:    Remove a department
// Access:  Private (Admin only!)
router.delete(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  DepartmentController.delete
);

module.exports = router;
