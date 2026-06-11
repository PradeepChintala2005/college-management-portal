const express = require('express');
const router = express.Router();
const ClassSectionController = require('../controllers/class-section.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Class Section Active Deliveries Endpoints
// ==========================================

// Route:   POST /api/sections
// Desc:    Create a new class section batch delivery
// Access:  Private (Admin only!)
router.post(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  ClassSectionController.create
);

// Route:   GET /api/sections
// Desc:    Retrieve list of all active class sections in system
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  ClassSectionController.getAll
);

// Route:   GET /api/sections/:id
// Desc:    Retrieve details of a specific class section
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  ClassSectionController.getById
);

// Route:   PUT /api/sections/:id
// Desc:    Update parameters of a class section batch delivery
// Access:  Private (Admin only!)
router.put(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  ClassSectionController.update
);

// Route:   DELETE /api/sections/:id
// Desc:    Remove an active class section batch delivery
// Access:  Private (Admin only!)
router.delete(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin'),
  ClassSectionController.delete
);

module.exports = router;
