const db = require('../database/db');
const UserModel = require('../models/user.model');
const FacultyModel = require('../models/faculty.model');
const DepartmentModel = require('../models/department.model');
const AuthUtils = require('../utils/auth.utils');

/**
 * Faculty Controller - Coordinates teacher onboarding operations
 */
const FacultyController = {
  /**
   * Add a new faculty member (Admin only)
   * Route: POST /api/faculty
   */
  async create(req, res, next) {
    try {
      const { 
        email, 
        password, 
        departmentId, 
        employeeId, 
        firstName, 
        lastName, 
        designation, 
        phone 
      } = req.body;

      // ==========================================
      // 1. Core Inputs Validation
      // ==========================================
      if (!email || !employeeId || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide email, employeeId, firstName, and lastName.'
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
          message: `Onboarding failed. A user account with email '${normalizedEmail}' already exists.`
        });
      }

      // B. Verify that employee ID is unique in faculty table
      const existingEmpId = await FacultyModel.findByEmployeeId(employeeId.trim().toUpperCase());
      if (existingEmpId) {
        return res.status(400).json({
          success: false,
          message: `Onboarding failed. Employee ID '${employeeId.trim().toUpperCase()}' is already assigned to another teacher.`
        });
      }

      // C. If a department ID is specified, verify it exists in our records
      if (departmentId) {
        const dept = await DepartmentModel.findById(departmentId);
        if (!dept) {
          return res.status(400).json({
            success: false,
            message: `Onboarding failed. Department ID '${departmentId}' does not exist.`
          });
        }
      }

      // ==========================================
      // 3. Security: Password Prep
      // ==========================================
      // Default to "Welcome@123" if the administrator did not specify a custom teacher password
      const teacherPassword = password || 'Welcome@123';
      const passwordHash = await AuthUtils.hashPassword(teacherPassword);

      // ==========================================
      // 4. Safe Database Transaction
      // ==========================================
      // Onboarding requires inserting into both 'users' and 'faculty' tables.
      // We must run a Transaction: if the faculty profile creation fails, we rollback (erase)
      // the user insert, preventing orphaned logins!
      
      db.serialize(() => {
        // A. Start Transaction
        db.run('BEGIN TRANSACTION;', (txErr) => {
          if (txErr) {
            return res.status(500).json({
              success: false,
              message: 'Failed to initiate secure teacher onboarding transaction.',
              error: txErr.message
            });
          }

          // B. Action 1: Create the User account record
          const insertUserSql = `INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`;
          db.run(insertUserSql, [normalizedEmail, passwordHash, 'faculty'], function (userErr) {
            if (userErr) {
              console.error('TX_ERR (faculty_users):', userErr.message);
              return db.run('ROLLBACK;', () => {
                res.status(500).json({
                  success: false,
                  message: 'Failed to create teacher authentication account.',
                  error: userErr.message
                });
              });
            }

            const newUserId = this.lastID; // The newly generated user ID!

            // C. Action 2: Create the Faculty profile record linking to that User ID
            const insertFacultySql = `
              INSERT INTO faculty (user_id, department_id, employee_id, first_name, last_name, designation, phone)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(
              insertFacultySql,
              [
                newUserId,
                departmentId || null,
                employeeId.trim().toUpperCase(),
                firstName.trim(),
                lastName.trim(),
                designation || null,
                phone || null
              ],
              function (facultyErr) {
                if (facultyErr) {
                  console.error('TX_ERR (faculty):', facultyErr.message);
                  // Rollback automatically erases the user account created in Action 1!
                  return db.run('ROLLBACK;', () => {
                    res.status(500).json({
                      success: false,
                      message: 'Failed to create teacher profile. Authentication creation rolled back.',
                      error: facultyErr.message
                    });
                  });
                }

                const newFacultyId = this.lastID; // The new faculty profile ID!

                // D. Action 3: Commit transaction to disk permanently
                db.run('COMMIT;', (commitErr) => {
                  if (commitErr) {
                    console.error('TX_ERR (faculty_commit):', commitErr.message);
                    return db.run('ROLLBACK;', () => {
                      res.status(500).json({
                        success: false,
                        message: 'Failed to commit teacher records to disk.',
                        error: commitErr.message
                      });
                    });
                  }

                  // E. Success Response returned to client
                  return res.status(201).json({
                    success: true,
                    message: 'Faculty member onboarded and linked successfully!',
                    data: {
                      facultyId: newFacultyId,
                      userId: newUserId,
                      email: normalizedEmail,
                      employeeId: employeeId.trim().toUpperCase(),
                      firstName: firstName.trim(),
                      lastName: lastName.trim(),
                      designation: designation || null,
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
   * Get list of all faculty members (Admin & Faculty only)
   * Route: GET /api/faculty
   */
  async getAll(req, res, next) {
    try {
      const faculty = await FacultyModel.findAll();
      
      return res.status(200).json({
        success: true,
        message: 'Faculty list retrieved successfully.',
        data: {
          faculty
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get details of a single faculty profile by ID
   * Route: GET /api/faculty/:id
   */
  async getById(req, res, next) {
    try {
      const facultyId = parseInt(req.params.id, 10);

      // Validation Check: Make sure ID is a number
      if (isNaN(facultyId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid faculty ID format. Must be an integer.'
        });
      }

      const facultyMember = await FacultyModel.findById(facultyId);
      if (!facultyMember) {
        return res.status(404).json({
          success: false,
          message: `Faculty member with ID '${facultyId}' not found.`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Faculty profile retrieved successfully.',
        data: {
          faculty: facultyMember
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Update faculty profile details (Admin only)
   * Route: PUT /api/faculty/:id
   */
  async update(req, res, next) {
    try {
      const facultyId = parseInt(req.params.id, 10);
      
      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(facultyId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid faculty ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the faculty profile exists
      const faculty = await FacultyModel.findById(facultyId);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: `Faculty member with ID '${facultyId}' not found.`
        });
      }

      const { 
        departmentId, 
        employeeId, 
        firstName, 
        lastName, 
        designation, 
        phone 
      } = req.body;

      // 3. Core Inputs Validation
      if (!employeeId || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide employeeId, firstName, and lastName.'
        });
      }

      // 4. Business Integrity Checks
      
      // A. If a department ID is specified, verify it exists in our records
      if (departmentId) {
        const dept = await DepartmentModel.findById(departmentId);
        if (!dept) {
          return res.status(400).json({
            success: false,
            message: `Update failed. Department ID '${departmentId}' does not exist.`
          });
        }
      }

      // B. Employee ID uniqueness check:
      // If the admin is changing the employee ID, verify it is not already used by another teacher.
      const existingEmpId = await FacultyModel.findByEmployeeId(employeeId.trim().toUpperCase());
      if (existingEmpId && existingEmpId.id !== facultyId) {
        return res.status(400).json({
          success: false,
          message: `Update failed. Employee ID '${employeeId.trim().toUpperCase()}' is already assigned to another teacher.`
        });
      }

      // 5. Save updates to database
      await FacultyModel.update(facultyId, {
        departmentId: departmentId || null,
        employeeId,
        firstName,
        lastName,
        designation,
        phone
      });

      // 6. Return successful response
      return res.status(200).json({
        success: true,
        message: 'Faculty profile updated successfully!',
        data: {
          facultyId,
          employeeId: employeeId.trim().toUpperCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          departmentId: departmentId || null,
          designation: designation || null,
          phone: phone || null
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete faculty account and profile (Admin only)
   * Route: DELETE /api/faculty/:id
   */
  async delete(req, res, next) {
    try {
      const facultyId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(facultyId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid faculty ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the faculty member exists
      const faculty = await FacultyModel.findById(facultyId);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: `Faculty member with ID '${facultyId}' not found.`
        });
      }

      // 3. Trigger Cascading Delete:
      // The faculty profile (child) references the user login (parent) via ON DELETE CASCADE.
      // So, deleting the user account automatically cleans up the faculty profile record!
      await UserModel.delete(faculty.user_id);

      return res.status(200).json({
        success: true,
        message: 'Faculty authentication account and profile deleted successfully!'
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = FacultyController;

