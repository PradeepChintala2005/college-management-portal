const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const AuthMiddleware = require('../middleware/auth.middleware');

// ==========================================
// Authentication Endpoints
// ==========================================

// Route:   POST /api/auth/register
// Desc:    Register a new user (Admin, Faculty, or Student)
// Access:  Public
router.post('/register', AuthController.register);

// Route:   POST /api/auth/seed
// Desc:    Reset and seed database with default accounts
// Access:  Public
router.post('/seed', AuthController.seedDatabase);

// Route:   POST /api/auth/login
// Desc:    Authenticate user credentials and return secure JWT
// Access:  Public
router.post('/login', AuthController.login);

// ==========================================
// Protected Verification Endpoints
// ==========================================

// Route:   GET /api/auth/profile
// Desc:    Get authenticated user's profile details
// Access:  Private (All authenticated users: student, faculty, admin)
router.get('/profile', AuthMiddleware.authenticateJWT, AuthController.getProfile);

// Route:   GET /api/auth/admin-only
// Desc:    Test route to verify Admin Role Authorization
// Access:  Private (Admin role only!)
router.get(
  '/admin-only', 
  AuthMiddleware.authenticateJWT, 
  AuthMiddleware.authorizeRoles('admin'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted! Welcome, Head Admin!'
    });
  }
);

module.exports = router;
