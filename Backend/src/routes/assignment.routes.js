const express = require('express');
const router = express.Router();
const AssignmentController = require('../controllers/assignment.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Coursework Assignments Catalog Endpoints
// ==========================================

// Route:   POST /api/assignments
// Desc:    Create a new coursework task assignment (Admin/Faculty only)
// Access:  Private (Admin & Faculty only!)
router.post(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  AssignmentController.create
);

// Route:   PUT /api/assignments/:id
// Desc:    Update details of an existing assignment (Admin/Faculty only)
// Access:  Private (Admin & Faculty only!)
router.put(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  AssignmentController.update
);

// Route:   DELETE /api/assignments/:id
// Desc:    Remove an assignment (subsequent submissions cascade delete)
// Access:  Private (Admin & Faculty only!)
router.delete(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  AssignmentController.delete
);

// Route:   GET /api/assignments/section/:sectionId
// Desc:    Retrieve list of all assignments for a class section batch
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/section/:sectionId',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  AssignmentController.getBySectionId
);

module.exports = router;
