const express = require('express');
const router = express.Router();
const AnnouncementController = require('../controllers/announcement.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Announcements Notice Board Endpoints
// ==========================================

// Route:   POST /api/announcements
// Desc:    Create a new announcement bulletin (Admin/Faculty only)
// Access:  Private (Admin & Faculty only!)
router.post(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  AnnouncementController.create
);

// Route:   GET /api/announcements
// Desc:    Retrieve list of bulletins appropriate for user role
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  AnnouncementController.getAll
);

// Route:   GET /api/announcements/:id
// Desc:    Retrieve a specific announcement bulletin
// Access:  Private (Admin, Faculty, & Student)
router.get(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty', 'student'),
  AnnouncementController.getById
);

// Route:   PUT /api/announcements/:id
// Desc:    Update details of an announcement (Admin & Faculty author only)
// Access:  Private (Admin & Faculty only!)
router.put(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  AnnouncementController.update
);

// Route:   DELETE /api/announcements/:id
// Desc:    Remove an existing announcement bulletin (Admin & Faculty author only)
// Access:  Private (Admin & Faculty only!)
router.delete(
  '/:id',
  AuthMiddleware.authenticateJWT,
  AuthMiddleware.authorizeRoles('admin', 'faculty'),
  AnnouncementController.delete
);

module.exports = router;
