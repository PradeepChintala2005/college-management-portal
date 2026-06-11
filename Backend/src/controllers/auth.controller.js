const UserModel = require('../models/user.model');
const AuthUtils = require('../utils/auth.utils');

/**
 * Authentication Controller - Coordinates signup/login logic
 */
const AuthController = {
  /**
   * Handle user registration (Sign Up)
   * Route: POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, role } = req.body;

      // ==========================================
      // 1. Inputs Validation Checks
      // ==========================================
      
      // Check if any required field is missing
      if (!email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'All fields (email, password, role) are required.'
        });
      }

      // Validate email format using simple regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.'
        });
      }

      // Enforce strong password rules (minimum 6 characters)
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long.'
        });
      }

      // Enforce valid user roles
      const validRoles = ['admin', 'faculty', 'student'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }

      // ==========================================
      // 2. Business Logic Checks
      // ==========================================

      // Check if a user with this email is already registered in our DB
      const existingUser = await UserModel.findByEmail(email.toLowerCase().trim());
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered.'
        });
      }

      // ==========================================
      // 3. Security: Hash Password & Save
      // ==========================================

      // Transform plain text password (e.g. "secret123") into secure bcrypt hash
      const passwordHash = await AuthUtils.hashPassword(password);

      // Create new record in 'users' table
      const newUserId = await UserModel.create({
        email: email.toLowerCase().trim(),
        passwordHash,
        role
      });

      // ==========================================
      // 4. Return Successful Response
      // ==========================================
      return res.status(201).json({
        success: true,
        message: 'User registered successfully!',
        data: {
          userId: newUserId,
          email: email.toLowerCase().trim(),
          role
        }
      });

    } catch (err) {
      // In case of any unhandled errors, pass them to our Global Error Handler in app.js
      next(err);
    }
  },

  /**
   * Handle user login (Sign In)
   * Route: POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // ==========================================
      // 1. Inputs Validation Checks
      // ==========================================
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Both email and password are required.'
        });
      }

      // ==========================================
      // 2. Database Lookup
      // ==========================================
      const user = await UserModel.findByEmail(email.toLowerCase().trim());
      if (!user) {
        // SECURITY TIP: Return generic error. Never tell the user "Email not found".
        // That allows malicious hackers to harvest registered emails!
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // ==========================================
      // 3. Password Verification (Bcrypt Compare)
      // ==========================================
      const isPasswordValid = await AuthUtils.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // ==========================================
      // 4. Token Issuance (Stateless Signed JWT)
      // ==========================================
      
      // Define the payload to store inside the token
      // SECURITY TIP: Never store passwords inside JWT payload! It is only base64 encoded, not encrypted.
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      // Sign the token using our secret key
      const token = AuthUtils.generateToken(tokenPayload);

      // Resolve role-specific profile IDs dynamically
      let profileDetails = {};
      if (user.role === 'student') {
        const StudentModel = require('../models/student.model');
        const student = await StudentModel.findByUserId(user.id);
        if (student) {
          profileDetails = {
            studentId: student.id,
            departmentId: student.department_id,
            firstName: student.first_name,
            lastName: student.last_name
          };
        }
      } else if (user.role === 'faculty') {
        const FacultyModel = require('../models/faculty.model');
        const faculty = await FacultyModel.findByUserId(user.id);
        if (faculty) {
          profileDetails = {
            facultyId: faculty.id,
            departmentId: faculty.department_id,
            firstName: faculty.first_name,
            lastName: faculty.last_name
          };
        }
      }

      // ==========================================
      // 5. Successful Response
      // ==========================================
      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            ...profileDetails
          }
        }
      });

    } catch (err) {
      // Pass any unexpected database or runtime errors to our Global Error Net
      next(err);
    }
  },

  /**
   * Get user profile details (Protected)
   * Route: GET /api/auth/profile
   */
  async getProfile(req, res, next) {
    try {
      // req.user has already been attached by the authenticateJWT middleware!
      return res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully.',
        data: {
          user: req.user
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuthController;


