const db = require('../database/db');
const UserModel = require('../models/user.model');
const StudentModel = require('../models/student.model');
const DepartmentModel = require('../models/department.model');
const AuthUtils = require('../utils/auth.utils');

/**
 * Student Controller - Coordinates student operations
 */
const StudentController = {
  /**
   * Add a new student (Admin only)
   * Route: POST /api/students
   */
  async create(req, res, next) {
    try {
      const { 
        email, 
        password, 
        departmentId, 
        rollNumber, 
        firstName, 
        lastName, 
        phone, 
        dateOfBirth 
      } = req.body;

      // ==========================================
      // 1. Core Inputs Validation
      // ==========================================
      if (!email || !rollNumber || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide email, rollNumber, firstName, and lastName.'
        });
      }

      // ==========================================
      // 2. Business Integrity Checks
      // ==========================================

      // A. Verify that email is not already registered in users table
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await UserModel.findByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: `Registration failed. A user account with email '${normalizedEmail}' already exists.`
        });
      }

      // B. Verify that roll number is unique in students table
      const existingRoll = await StudentModel.findByRollNumber(rollNumber.trim().toUpperCase());
      if (existingRoll) {
        return res.status(400).json({
          success: false,
          message: `Registration failed. Roll number '${rollNumber.trim().toUpperCase()}' is already assigned to another student.`
        });
      }

      // C. If a department ID is specified, verify it is a real department in our records
      if (departmentId) {
        const dept = await DepartmentModel.findById(departmentId);
        if (!dept) {
          return res.status(400).json({
            success: false,
            message: `Registration failed. Department ID '${departmentId}' does not exist.`
          });
        }
      }

      // ==========================================
      // 3. Security: Password Prep
      // ==========================================
      // Default to "Welcome@123" if the administrator did not specify a custom student password
      const studentPassword = password || 'Welcome@123';
      const passwordHash = await AuthUtils.hashPassword(studentPassword);

      // ==========================================
      // 4. Safe Database Transaction
      // ==========================================
      // Since onboarding requires inserting into both 'users' and 'students' tables,
      // we must run a Transaction. If the student insert fails, we rollback (erase) the user insert
      // to prevent creating a useless, orphaned user account!
      
      db.serialize(() => {
        // A. Start Transaction
        db.run('BEGIN TRANSACTION;', (txErr) => {
          if (txErr) {
            return res.status(500).json({
              success: false,
              message: 'Failed to initiate secure registration transaction.',
              error: txErr.message
            });
          }

          // B. Action 1: Create the User account record
          const insertUserSql = `INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`;
          db.run(insertUserSql, [normalizedEmail, passwordHash, 'student'], function (userErr) {
            if (userErr) {
              console.error('TX_ERR (users):', userErr.message);
              return db.run('ROLLBACK;', () => {
                res.status(500).json({
                  success: false,
                  message: 'Failed to create student authentication account.',
                  error: userErr.message
                });
              });
            }

            const newUserId = this.lastID; // The newly generated user ID!

            // C. Action 2: Create the Student profile record linking to that User ID
            const insertStudentSql = `
              INSERT INTO students (user_id, department_id, roll_number, first_name, last_name, phone, date_of_birth)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(
              insertStudentSql,
              [
                newUserId,
                departmentId || null,
                rollNumber.trim().toUpperCase(),
                firstName.trim(),
                lastName.trim(),
                phone || null,
                dateOfBirth || null
              ],
              function (studentErr) {
                if (studentErr) {
                  console.error('TX_ERR (students):', studentErr.message);
                  // Rollback automatically erases the user account created in Action 1!
                  return db.run('ROLLBACK;', () => {
                    res.status(500).json({
                      success: false,
                      message: 'Failed to create student profile. Authentication creation rolled back.',
                      error: studentErr.message
                    });
                  });
                }

                const newStudentId = this.lastID; // The new student profile ID!

                // D. Action 3: All succeeded! Commit the transaction permanently to disk!
                db.run('COMMIT;', (commitErr) => {
                  if (commitErr) {
                    console.error('TX_ERR (commit):', commitErr.message);
                    return db.run('ROLLBACK;', () => {
                      res.status(500).json({
                        success: false,
                        message: 'Failed to commit registration records to disk.',
                        error: commitErr.message
                      });
                    });
                  }

                  // E. Success Response returned to client
                  return res.status(201).json({
                    success: true,
                    message: 'Student onboarded and linked successfully!',
                    data: {
                      studentId: newStudentId,
                      userId: newUserId,
                      email: normalizedEmail,
                      rollNumber: rollNumber.trim().toUpperCase(),
                      firstName: firstName.trim(),
                      lastName: lastName.trim(),
                      departmentId: departmentId || null
                    }
                  });
                });
              }
            );
          });
        });
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all student records (Admin & Faculty only)
   * Route: GET /api/students
   */
  async getAll(req, res, next) {
    try {
      // Ask the model to query the database using the SQL JOINs
      const students = await StudentModel.findAll();
      
      return res.status(200).json({
        success: true,
        message: 'Students list retrieved successfully.',
        data: {
          students
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get a single student's profile details by ID
   * Secured: Admin and Faculty can view any student. A Student can ONLY view their own profile!
   * Route: GET /api/students/:id
   */
  async getById(req, res, next) {
    try {
      const studentId = parseInt(req.params.id, 10);
      
      // Validation Check: Make sure ID is a number
      if (isNaN(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID format. Must be an integer.'
        });
      }

      // Query database for the student details
      const student = await StudentModel.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student with profile ID '${studentId}' not found.`
        });
      }

      // ==========================================
      // SECURITY GATE: Data-Level Authorization
      // ==========================================
      // If the logged-in traveler is a student, we check if the profile they are requesting
      // actually belongs to them! We compare the student profile's user_id with req.user.userId.
      if (req.user.role === 'student' && student.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view another student\'s profile details.'
        });
      }

      // Authorized! Return student details
      return res.status(200).json({
        success: true,
        message: 'Student profile retrieved successfully.',
        data: {
          student
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Update student profile details (Admin only)
   * Route: PUT /api/students/:id
   */
  async update(req, res, next) {
    try {
      const studentId = parseInt(req.params.id, 10);
      
      // 1. Validation Check: Make sure ID is a number
      if (isNaN(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the student exists
      const student = await StudentModel.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student with profile ID '${studentId}' not found.`
        });
      }

      const { 
        departmentId, 
        rollNumber, 
        firstName, 
        lastName, 
        phone, 
        dateOfBirth 
      } = req.body;

      // 3. Core Inputs Validation
      if (!rollNumber || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide rollNumber, firstName, and lastName.'
        });
      }

      // 4. Business Integrity checks
      
      // A. If a department ID is specified, verify it exists
      if (departmentId) {
        const dept = await DepartmentModel.findById(departmentId);
        if (!dept) {
          return res.status(400).json({
            success: false,
            message: `Update failed. Department ID '${departmentId}' does not exist.`
          });
        }
      }

      // B. Roll number uniqueness check:
      // If the admin is changing the roll number, check if the new roll number is already used by *another* student.
      const existingRoll = await StudentModel.findByRollNumber(rollNumber.trim().toUpperCase());
      if (existingRoll && existingRoll.id !== studentId) {
        return res.status(400).json({
          success: false,
          message: `Update failed. Roll number '${rollNumber.trim().toUpperCase()}' is already assigned to another student.`
        });
      }

      // 5. Save updates to database
      await StudentModel.update(studentId, {
        departmentId: departmentId || null,
        rollNumber,
        firstName,
        lastName,
        phone,
        dateOfBirth
      });

      // 6. Return successful response
      return res.status(200).json({
        success: true,
        message: 'Student profile updated successfully!',
        data: {
          studentId,
          rollNumber: rollNumber.trim().toUpperCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          departmentId: departmentId || null,
          phone,
          dateOfBirth
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete student account and profile (Admin only)
   * Route: DELETE /api/students/:id
   */
  async delete(req, res, next) {
    try {
      const studentId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is a number
      if (isNaN(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the student exists
      const student = await StudentModel.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student with profile ID '${studentId}' not found.`
        });
      }

      // 3. Trigger Cascading Delete:
      // The student profile (child table) points back to the user login (parent table) with ON DELETE CASCADE.
      // Therefore, if we delete the parent user record, SQLite automatically deletes the child student profile!
      // This is clean, safe, and prevents leftover orphan user logins!
      await UserModel.delete(student.user_id);

      return res.status(200).json({
        success: true,
        message: 'Student authentication account and profile deleted successfully!'
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = StudentController;


