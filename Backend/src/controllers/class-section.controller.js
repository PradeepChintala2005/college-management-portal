const ClassSectionModel = require('../models/class-section.model');
const CourseModel = require('../models/course.model');
const FacultyModel = require('../models/faculty.model');

/**
 * Class Section Controller - Coordinates active course section deliveries
 */
const ClassSectionController = {
  /**
   * Create a new class section (Admin only)
   * Route: POST /api/sections
   */
  async create(req, res, next) {
    try {
      const { courseId, facultyId, sectionName, semester } = req.body;

      // 1. Validation Check: Make sure required parameters are provided
      if (!courseId || !sectionName || !semester) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide courseId, sectionName, and semester.'
        });
      }

      // 2. Parse Foreign Keys
      const parsedCourseId = parseInt(courseId, 10);
      const parsedFacultyId = facultyId ? parseInt(facultyId, 10) : null;

      if (isNaN(parsedCourseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid courseId format. Must be an integer.'
        });
      }

      if (parsedFacultyId !== null && isNaN(parsedFacultyId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid facultyId format. Must be an integer or null.'
        });
      }

      // 3. Business Integrity Check: Course existence check
      const course = await CourseModel.findById(parsedCourseId);
      if (!course) {
        return res.status(400).json({
          success: false,
          message: `Class section creation failed. Course ID '${parsedCourseId}' does not exist.`
        });
      }

      // 4. Business Integrity Check: Faculty existence check (if provided)
      if (parsedFacultyId) {
        const faculty = await FacultyModel.findById(parsedFacultyId);
        if (!faculty) {
          return res.status(400).json({
            success: false,
            message: `Class section creation failed. Faculty ID '${parsedFacultyId}' does not exist.`
          });
        }
      }

      // 5. Database Save
      const newSectionId = await ClassSectionModel.create({
        courseId: parsedCourseId,
        facultyId: parsedFacultyId,
        sectionName: sectionName.trim(),
        semester: semester.trim()
      });

      // 6. Return successful response
      return res.status(201).json({
        success: true,
        message: 'Class section delivery created successfully!',
        data: {
          sectionId: newSectionId,
          courseId: parsedCourseId,
          facultyId: parsedFacultyId,
          sectionName: sectionName.trim(),
          semester: semester.trim()
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all class sections (All authenticated roles)
   * Route: GET /api/sections
   */
  async getAll(req, res, next) {
    try {
      const sections = await ClassSectionModel.findAll();
      
      return res.status(200).json({
        success: true,
        message: 'Class sections list retrieved successfully.',
        data: {
          sections
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get a single class section by its ID (All authenticated roles)
   * Route: GET /api/sections/:id
   */
  async getById(req, res, next) {
    try {
      const sectionId = parseInt(req.params.id, 10);

      // Validation Check: Make sure ID is an integer
      if (isNaN(sectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid section ID format. Must be an integer.'
        });
      }

      // Database Fetch
      const section = await ClassSectionModel.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Class section with ID '${sectionId}' not found.`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Class section details retrieved successfully.',
        data: {
          section
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Update class section parameters (Admin only)
   * Route: PUT /api/sections/:id
   */
  async update(req, res, next) {
    try {
      const sectionId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(sectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid section ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the section exists
      const section = await ClassSectionModel.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Class section with ID '${sectionId}' not found.`
        });
      }

      const { courseId, facultyId, sectionName, semester } = req.body;

      // 3. Validation Check: Make sure required parameters are provided
      if (!courseId || !sectionName || !semester) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide courseId, sectionName, and semester.'
        });
      }

      // 4. Parse Foreign Keys
      const parsedCourseId = parseInt(courseId, 10);
      const parsedFacultyId = facultyId ? parseInt(facultyId, 10) : null;

      if (isNaN(parsedCourseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid courseId format. Must be an integer.'
        });
      }

      if (parsedFacultyId !== null && isNaN(parsedFacultyId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid facultyId format. Must be an integer or null.'
        });
      }

      // 5. Business Integrity Check: Course existence check
      const course = await CourseModel.findById(parsedCourseId);
      if (!course) {
        return res.status(400).json({
          success: false,
          message: `Update failed. Course ID '${parsedCourseId}' does not exist.`
        });
      }

      // 6. Business Integrity Check: Faculty existence check (if provided)
      if (parsedFacultyId) {
        const faculty = await FacultyModel.findById(parsedFacultyId);
        if (!faculty) {
          return res.status(400).json({
            success: false,
            message: `Update failed. Faculty ID '${parsedFacultyId}' does not exist.`
          });
        }
      }

      // 7. Database Save
      await ClassSectionModel.update(sectionId, {
        courseId: parsedCourseId,
        facultyId: parsedFacultyId,
        sectionName: sectionName.trim(),
        semester: semester.trim()
      });

      // 8. Return successful response (Echo Method)
      return res.status(200).json({
        success: true,
        message: 'Class section updated successfully!',
        data: {
          sectionId,
          courseId: parsedCourseId,
          facultyId: parsedFacultyId,
          sectionName: sectionName.trim(),
          semester: semester.trim()
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a class section delivery Batches (Admin only)
   * Route: DELETE /api/sections/:id
   */
  async delete(req, res, next) {
    try {
      const sectionId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(sectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid section ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the section exists
      const section = await ClassSectionModel.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Class section with ID '${sectionId}' not found.`
        });
      }

      // 3. Database Delete
      await ClassSectionModel.delete(sectionId);

      return res.status(200).json({
        success: true,
        message: 'Class section deleted successfully!'
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = ClassSectionController;
