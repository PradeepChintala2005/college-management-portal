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
  },

  /**
   * Reset and seed database (Public Helper for deployed environments)
   * Route: POST /api/auth/seed
   */
  async seedDatabase(req, res, next) {
    try {
      const db = require('../database/db');
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('password123', 10);

      db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        // Delete existing data safely
        db.run('DELETE FROM attendance_records;');
        db.run('DELETE FROM attendance_sessions;');
        db.run('DELETE FROM submissions;');
        db.run('DELETE FROM assignments;');
        db.run('DELETE FROM marks;');
        db.run('DELETE FROM enrollments;');
        db.run('DELETE FROM class_sections;');
        db.run('DELETE FROM courses;');
        db.run('DELETE FROM faculty;');
        db.run('DELETE FROM students;');
        db.run('DELETE FROM departments;');
        db.run('DELETE FROM announcements;');
        db.run('DELETE FROM users;');
        db.run('DELETE FROM sqlite_sequence;');

        // A. Seed Departments
        const insertDept = 'INSERT INTO departments (name, code, description) VALUES (?, ?, ?)';
        db.run(insertDept, ['Computer Science & Engineering', 'CSE', 'Academic division of CSE'], function(err) {
          if (err) {
            db.run('ROLLBACK;');
            return res.status(500).json({ success: false, message: err.message });
          }
          const cseDeptId = this.lastID;

          db.run(insertDept, ['Electronics & Communication Engineering', 'ECE', 'Academic division of ECE'], function(err) {
            if (err) {
              db.run('ROLLBACK;');
              return res.status(500).json({ success: false, message: err.message });
            }
            const eceDeptId = this.lastID;

            // B. Seed Admin User
            const insertUser = 'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)';
            db.run(insertUser, ['admin@college.edu', passwordHash, 'admin'], function(err) {
              if (err) {
                db.run('ROLLBACK;');
                return res.status(500).json({ success: false, message: err.message });
              }

              // C. Seed Faculty User & Profile
              db.run(insertUser, ['prof.cse@college.edu', passwordHash, 'faculty'], function(err) {
                if (err) {
                  db.run('ROLLBACK;');
                  return res.status(500).json({ success: false, message: err.message });
                }
                const profUserId = this.lastID;

                const insertFaculty = 'INSERT INTO faculty (user_id, department_id, employee_id, first_name, last_name, designation) VALUES (?, ?, ?, ?, ?, ?)';
                db.run(insertFaculty, [profUserId, cseDeptId, 'EMP-CSE-01', 'Richard', 'Feynman', 'Professor'], function(err) {
                  if (err) {
                    db.run('ROLLBACK;');
                    return res.status(500).json({ success: false, message: err.message });
                  }

                  // D. Seed Student User & Profile
                  db.run(insertUser, ['student.cse@college.edu', passwordHash, 'student'], function(err) {
                    if (err) {
                      db.run('ROLLBACK;');
                      return res.status(500).json({ success: false, message: err.message });
                    }
                    const studentUserId = this.lastID;

                    const insertStudent = 'INSERT INTO students (user_id, department_id, roll_number, first_name, last_name) VALUES (?, ?, ?, ?, ?)';
                    db.run(insertStudent, [studentUserId, cseDeptId, 'ROLL-CSE-01', 'Alice', 'Smith'], function(err) {
                      if (err) {
                        db.run('ROLLBACK;');
                        return res.status(500).json({ success: false, message: err.message });
                      }

                      // Commit Transaction
                      db.run('COMMIT;', (commitErr) => {
                        if (commitErr) {
                          db.run('ROLLBACK;');
                          return res.status(500).json({
                            success: false,
                            message: 'Failed to commit seed transaction: ' + commitErr.message
                          });
                        }
                        res.status(200).json({
                          success: true,
                          message: 'Database seeded successfully with default accounts!',
                          data: {
                            admin: 'admin@college.edu',
                            faculty: 'prof.cse@college.edu',
                            student: 'student.cse@college.edu',
                            password: 'password123'
                          }
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = AuthController;


