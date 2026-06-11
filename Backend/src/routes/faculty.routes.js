const express = require('express');
const router = express.Router();
const FacultyController = require('../controllers/faculty.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Faculty Management Endpoints
// ==========================================

// Route:   POST /api/faculty
// Desc:    Create/Onboard a new faculty member account & profile
// Access:  Private (Admin only!)
router.post(
  '/', 
  AuthMiddleware.authenticateJWT, 
  AuthMiddleware.authorizeRoles('admin'), 
  FacultyController.create
);

// Route:   GET /api/faculty
// Desc:    Get list of all faculty members with credentials & department details
// Access:  Private (Admin & Faculty only!)
router.get(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  FacultyController.getAll
);

// Route:   GET /api/faculty/:id
// Desc:    Get details of a single faculty profile
// Access:  Private (Admin & Faculty only!)
router.get(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  FacultyController.getById
);

// Route:   PUT /api/faculty/:id
// Desc:    Update faculty profile details
// Access:  Private (Admin only!)
router.put(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  FacultyController.update
);

// Route:   DELETE /api/faculty/:id
// Desc:    Delete faculty account & profile
// Access:  Private (Admin only!)
router.delete(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  FacultyController.delete
);

module.exports = router;
