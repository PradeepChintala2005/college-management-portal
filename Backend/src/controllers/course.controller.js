const CourseModel = require('../models/course.model');
const DepartmentModel = require('../models/department.model');

/**
 * Course Controller - Coordinates course CRUD operations
 */
const CourseController = {
  /**
   * Create a new course (Admin only)
   * Route: POST /api/courses
   */
  async create(req, res, next) {
    try {
      const { departmentId, courseCode, title, credits } = req.body;

      // 1. Validation Check: Make sure all required fields are provided
      if (!departmentId || !courseCode || !title || credits === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide departmentId, courseCode, title, and credits.'
        });
      }

      // 2. Data Formatting & Type Check
      const parsedCredits = parseInt(credits, 10);
      if (isNaN(parsedCredits) || parsedCredits < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credits value. Credits must be a positive integer greater than or equal to 1.'
        });
      }

      // 3. Business Integrity Check: Department existence check
      const department = await DepartmentModel.findById(departmentId);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: `Course creation failed. Department ID '${departmentId}' does not exist.`
        });
      }

      // 4. Business Integrity Check: Course code uniqueness check
      const normalizedCode = courseCode.trim().toUpperCase();
      const existingCourse = await CourseModel.findByCourseCode(normalizedCode);
      if (existingCourse) {
        return res.status(400).json({
          success: false,
          message: `Course creation failed. A course with course code '${normalizedCode}' already exists.`
        });
      }

      // 5. Database Save
      const newCourseId = await CourseModel.create({
        departmentId,
        courseCode: normalizedCode,
        title: title.trim(),
        credits: parsedCredits
      });

      // 6. Return successful response
      return res.status(201).json({
        success: true,
        message: 'Course created successfully!',
        data: {
          courseId: newCourseId,
          departmentId,
          courseCode: normalizedCode,
          title: title.trim(),
          credits: parsedCredits
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all courses in the catalog (All authenticated roles)
   * Route: GET /api/courses
   */
  async getAll(req, res, next) {
    try {
      const courses = await CourseModel.findAll();
      
      return res.status(200).json({
        success: true,
        message: 'Course list retrieved successfully.',
        data: {
          courses
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get a single course by its ID (All authenticated roles)
   * Route: GET /api/courses/:id
   */
  async getById(req, res, next) {
    try {
      const courseId = parseInt(req.params.id, 10);

      // Validation Check: Make sure ID is an integer
      if (isNaN(courseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid course ID format. Must be an integer.'
        });
      }

      // Database Fetch
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course with ID '${courseId}' not found.`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Course details retrieved successfully.',
        data: {
          course
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Update course details (Admin only)
   * Route: PUT /api/courses/:id
   */
  async update(req, res, next) {
    try {
      const courseId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(courseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid course ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the course profile exists
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course with ID '${courseId}' not found.`
        });
      }

      const { departmentId, courseCode, title, credits } = req.body;

      // 3. Validation Check: Make sure required fields are provided
      if (!departmentId || !courseCode || !title || credits === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide departmentId, courseCode, title, and credits.'
        });
      }

      // 4. Data Formatting & Type Check
      const parsedCredits = parseInt(credits, 10);
      if (isNaN(parsedCredits) || parsedCredits < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credits value. Credits must be a positive integer greater than or equal to 1.'
        });
      }

      // 5. Business Integrity Check: Department existence check
      const department = await DepartmentModel.findById(departmentId);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: `Update failed. Department ID '${departmentId}' does not exist.`
        });
      }

      // 6. Business Integrity Check: Course code uniqueness check
      const normalizedCode = courseCode.trim().toUpperCase();
      const existingCourse = await CourseModel.findByCourseCode(normalizedCode);
      if (existingCourse && existingCourse.id !== courseId) {
        return res.status(400).json({
          success: false,
          message: `Update failed. Course code '${normalizedCode}' is already assigned to another course.`
        });
      }

      // 7. Database Save
      await CourseModel.update(courseId, {
        departmentId,
        courseCode: normalizedCode,
        title: title.trim(),
        credits: parsedCredits
      });

      // 8. Return successful response (Echo Method)
      return res.status(200).json({
        success: true,
        message: 'Course updated successfully!',
        data: {
          courseId,
          departmentId,
          courseCode: normalizedCode,
          title: title.trim(),
          credits: parsedCredits
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a course catalog entry (Admin only)
   * Route: DELETE /api/courses/:id
   */
  async delete(req, res, next) {
    try {
      const courseId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(courseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid course ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the course profile exists
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course with ID '${courseId}' not found.`
        });
      }

      // 3. Database Delete
      await CourseModel.delete(courseId);

      return res.status(200).json({
        success: true,
        message: 'Course deleted successfully!'
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = CourseController;
