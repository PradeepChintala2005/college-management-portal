const AnnouncementModel = require('../models/announcement.model');
const FacultyModel = require('../models/faculty.model');
const StudentModel = require('../models/student.model');
const DepartmentModel = require('../models/department.model');

/**
 * Announcement Controller - Coordinates notice board bulletins and role-based feeds
 */
const AnnouncementController = {
  /**
   * Create a new announcement notice (Admin & Faculty only)
   * Route: POST /api/announcements
   */
  async create(req, res, next) {
    try {
      const { title, content, departmentId } = req.body;

      // 1. Validation Check: Make sure required parameters are provided
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide title and content.'
        });
      }

      let targetDepartmentId = null;

      // 2. Role Verification and Department Resolution
      if (req.user.role === 'faculty') {
        // Faculty: Automatically fetch their department profile to restrict their announcements
        const faculty = await FacultyModel.findByUserId(req.user.userId); 
        if (!faculty) {
          return res.status(403).json({
            success: false,
            message: 'Announcement posting blocked. Logged-in credentials are not linked to a faculty profile.'
          });
        }
        // Force the department to be the faculty's assigned department
        targetDepartmentId = faculty.department_id;
      } else if (req.user.role === 'admin') {
        // Admin: Unrestricted, can target any department or leave null for general bulletin
        if (departmentId) {
          targetDepartmentId = parseInt(departmentId, 10);
          if (isNaN(targetDepartmentId)) {
            return res.status(400).json({
              success: false,
              message: 'Invalid departmentId format. Must be an integer.'
            });
          }

          // Verify department exists
          const department = await DepartmentModel.findById(targetDepartmentId);
          if (!department) {
            return res.status(400).json({
              success: false,
              message: `Creation failed. Department ID '${targetDepartmentId}' does not exist.`
            });
          }
        }
      }

      // 3. Save to database
      const newAnnouncementId = await AnnouncementModel.create({
        authorId: req.user.userId,
        departmentId: targetDepartmentId,
        title,
        content
      });

      return res.status(201).json({
        success: true,
        message: 'Announcement bulletin created successfully!',
        data: {
          announcementId: newAnnouncementId,
          authorId: req.user.userId,
          departmentId: targetDepartmentId,
          title: title.trim(),
          content: content.trim()
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all announcements based on user role filters (All authenticated roles)
   * Route: GET /api/announcements
   */
  async getAll(req, res, next) {
    try {
      let announcements = [];

      // Determine appropriate feed lists depending on the user role
      if (req.user.role === 'student') {
        const student = await StudentModel.findByUserId(req.user.userId);
        const deptId = student ? student.department_id : null;
        announcements = await AnnouncementModel.findGeneralAndDepartmentAnnouncements(deptId);
      } else if (req.user.role === 'faculty') {
        const faculty = await FacultyModel.findByUserId(req.user.userId);
        const deptId = faculty ? faculty.department_id : null;
        announcements = await AnnouncementModel.findGeneralAndDepartmentAnnouncements(deptId);
      } else if (req.user.role === 'admin') {
        // Admin is unrestricted and can filter by query parameter departmentId
        const queryDeptId = req.query.departmentId ? parseInt(req.query.departmentId, 10) : null;
        if (queryDeptId && !isNaN(queryDeptId)) {
          announcements = await AnnouncementModel.findGeneralAndDepartmentAnnouncements(queryDeptId);
        } else {
          announcements = await AnnouncementModel.findAll();
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Announcements feed retrieved successfully.',
        data: {
          announcements
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get details of a specific announcement (All authenticated roles - with boundary check)
   * Route: GET /api/announcements/:id
   */
  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid announcement ID format. Must be an integer.'
        });
      }

      const announcement = await AnnouncementModel.findById(id);
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: `Announcement bulletin with ID '${id}' not found.`
        });
      }

      // Security Boundary: Students and Faculty can only view if general (null) or matches their department
      if (announcement.department_id !== null) {
        if (req.user.role === 'student') {
          const student = await StudentModel.findByUserId(req.user.userId);
          if (!student || student.department_id !== announcement.department_id) {
            return res.status(403).json({
              success: false,
              message: 'Access denied. You are not authorized to view department bulletins outside your enrolled department.'
            });
          }
        } else if (req.user.role === 'faculty') {
          const faculty = await FacultyModel.findByUserId(req.user.userId);
          if (!faculty || faculty.department_id !== announcement.department_id) {
            return res.status(403).json({
              success: false,
              message: 'Access denied. You are not authorized to view department bulletins outside your department.'
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Announcement bulletin retrieved successfully.',
        data: {
          announcement
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Update an existing announcement (Admin & Faculty author only)
   * Route: PUT /api/announcements/:id
   */
  async update(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid announcement ID format. Must be an integer.'
        });
      }

      // 1. Verify existence of the announcement
      const announcement = await AnnouncementModel.findById(id);
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: `Announcement bulletin with ID '${id}' not found.`
        });
      }

      // 2. Ownership / Role Validation Gate
      if (req.user.role === 'faculty' && announcement.author_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only edit announcements you personally posted.'
        });
      }

      const { title, content, departmentId } = req.body;
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Title and content cannot be empty.'
        });
      }

      let targetDepartmentId = announcement.department_id;

      if (req.user.role === 'admin') {
        // Admin can re-assign departments
        if (departmentId !== undefined) {
          if (departmentId === null) {
            targetDepartmentId = null;
          } else {
            const parsedDeptId = parseInt(departmentId, 10);
            if (isNaN(parsedDeptId)) {
              return res.status(400).json({
                success: false,
                message: 'Invalid departmentId format. Must be an integer.'
              });
            }
            const department = await DepartmentModel.findById(parsedDeptId);
            if (!department) {
              return res.status(400).json({
                success: false,
                message: `Update failed. Department ID '${parsedDeptId}' does not exist.`
              });
            }
            targetDepartmentId = parsedDeptId;
          }
        }
      } else if (req.user.role === 'faculty') {
        // Faculty is always forced to keep their own department assignment
        const faculty = await FacultyModel.findByUserId(req.user.userId);
        targetDepartmentId = faculty ? faculty.department_id : null;
      }

      // 3. Update database
      await AnnouncementModel.update(id, {
        title,
        content,
        departmentId: targetDepartmentId
      });

      return res.status(200).json({
        success: true,
        message: 'Announcement bulletin updated successfully!',
        data: {
          announcementId: id,
          authorId: announcement.author_id,
          departmentId: targetDepartmentId,
          title: title.trim(),
          content: content.trim()
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete an announcement (Admin & Faculty author only)
   * Route: DELETE /api/announcements/:id
   */
  async delete(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid announcement ID format. Must be an integer.'
        });
      }

      // 1. Verify existence of the announcement
      const announcement = await AnnouncementModel.findById(id);
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: `Announcement bulletin with ID '${id}' not found.`
        });
      }

      // 2. Ownership / Role Validation Gate
      if (req.user.role === 'faculty' && announcement.author_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete announcements you personally posted.'
        });
      }

      // 3. Delete from database
      await AnnouncementModel.delete(id);

      return res.status(200).json({
        success: true,
        message: 'Announcement bulletin deleted successfully!'
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = AnnouncementController;
