const AssignmentModel = require('../models/assignment.model');
const ClassSectionModel = require('../models/class-section.model');

/**
 * Assignment Controller - Coordinates creation and updates of course assignments/coursework
 */
const AssignmentController = {
  /**
   * Create a new coursework assignment (Admin/Faculty only)
   * Route: POST /api/assignments
   */
  async create(req, res, next) {
    try {
      const { classSectionId, title, description, dueDate } = req.body;

      // 1. Validation Check: Make sure required parameters are provided
      if (!classSectionId || !title || !dueDate) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide classSectionId, title, and dueDate.'
        });
      }

      // 2. Parse section parameter
      const parsedSectionId = parseInt(classSectionId, 10);
      if (isNaN(parsedSectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid classSectionId format. Must be an integer.'
        });
      }

      // 3. Database Lookup: Verify the class section exists
      const section = await ClassSectionModel.findById(parsedSectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Coursework creation failed. Class section with ID '${parsedSectionId}' not found.`
        });
      }

      // 4. Save to Database
      const newAssignmentId = await AssignmentModel.create({
        classSectionId: parsedSectionId,
        title: title.trim(),
        description: description ? description.trim() : null,
        dueDate: dueDate.trim()
      });

      return res.status(201).json({
        success: true,
        message: 'Assignment coursework created successfully!',
        data: {
          assignmentId: newAssignmentId,
          classSectionId: parsedSectionId,
          title: title.trim(),
          description: description ? description.trim() : null,
          dueDate: dueDate.trim()
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Update details of an existing coursework assignment (Admin/Faculty only)
   * Route: PUT /api/assignments/:id
   */
  async update(req, res, next) {
    try {
      const assignmentId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignment ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the assignment exists
      const assignment = await AssignmentModel.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: `Assignment with ID '${assignmentId}' not found.`
        });
      }

      const { title, description, dueDate } = req.body;

      // 3. Validation Check: Make sure required parameters are provided
      if (!title || !dueDate) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide title and dueDate.'
        });
      }

      // 4. Save changes to Database
      await AssignmentModel.update(assignmentId, {
        title: title.trim(),
        description: description ? description.trim() : null,
        dueDate: dueDate.trim()
      });

      return res.status(200).json({
        success: true,
        message: 'Assignment coursework updated successfully!',
        data: {
          assignmentId,
          classSectionId: assignment.class_section_id,
          title: title.trim(),
          description: description ? description.trim() : null,
          dueDate: dueDate.trim()
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete coursework assignment (Admin/Faculty only)
   * Route: DELETE /api/assignments/:id
   */
  async delete(req, res, next) {
    try {
      const assignmentId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignment ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the assignment exists
      const assignment = await AssignmentModel.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: `Assignment with ID '${assignmentId}' not found.`
        });
      }

      // 3. Delete the record (subsequent submissions automatically cascade wipe)
      await AssignmentModel.delete(assignmentId);

      return res.status(200).json({
        success: true,
        message: 'Assignment coursework and matching submissions deleted successfully!'
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all assignments for a class section (All roles)
   * Route: GET /api/assignments/section/:sectionId
   */
  async getBySectionId(req, res, next) {
    try {
      const sectionId = parseInt(req.params.sectionId, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(sectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid section ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify class section exists
      const section = await ClassSectionModel.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Class section with ID '${sectionId}' not found.`
        });
      }

      // 3. Query all assignment coursework from database
      const assignments = await AssignmentModel.findBySectionId(sectionId);

      return res.status(200).json({
        success: true,
        message: 'Coursework assignments retrieved successfully.',
        data: {
          classSectionId: sectionId,
          courseCode: section.course_code,
          courseTitle: section.course_title,
          sectionName: section.section_name,
          semester: section.semester,
          assignments
        }
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = AssignmentController;
