const EnrollmentModel = require('../models/enrollment.model');
const StudentModel = require('../models/student.model');
const ClassSectionModel = require('../models/class-section.model');

/**
 * Enrollment Controller - Coordinates student course registrations and drop workflows
 */
const EnrollmentController = {
  /**
   * Enroll a student in a class section (Admin can enroll any student; Student can enroll self)
   * Route: POST /api/enrollments
   */
  async create(req, res, next) {
    try {
      const { studentId, classSectionId } = req.body;

      // 1. Validation Check: Make sure required parameters are provided
      if (!studentId || !classSectionId) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide studentId and classSectionId.'
        });
      }

      // 2. Parse parameters to integers
      const parsedStudentId = parseInt(studentId, 10);
      const parsedSectionId = parseInt(classSectionId, 10);

      if (isNaN(parsedStudentId) || isNaN(parsedSectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input format. studentId and classSectionId must be integers.'
        });
      }

      // 3. Database Lookup: Verify the student profile exists
      const student = await StudentModel.findById(parsedStudentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Enrollment failed. Student with profile ID '${parsedStudentId}' not found.`
        });
      }

      // 4. SECURITY CHECK: Authorization check
      // - Students can ONLY enroll themselves.
      // - Faculty are BLOCKED from enrolling students.
      // - Admins are ALLOWED to enroll any student.
      if (req.user.role === 'student' && student.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to enroll another student.'
        });
      }

      if (req.user.role === 'faculty') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Faculty members are not authorized to register students for courses.'
        });
      }

      // 5. Database Lookup: Verify the class section exists
      const section = await ClassSectionModel.findById(parsedSectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Enrollment failed. Class section with ID '${parsedSectionId}' not found.`
        });
      }

      // 6. Double Enrollment Check: Verify the student is not already registered for this section
      const existingEnrollment = await EnrollmentModel.findByStudentAndSection(parsedStudentId, parsedSectionId);
      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: 'Enrollment failed. Student is already enrolled in this class section.'
        });
      }

      // 7. Save to Database
      const newEnrollmentId = await EnrollmentModel.create({
        studentId: parsedStudentId,
        classSectionId: parsedSectionId
      });

      // 8. Return success response
      return res.status(201).json({
        success: true,
        message: 'Student enrolled in class section successfully!',
        data: {
          enrollmentId: newEnrollmentId,
          studentId: parsedStudentId,
          classSectionId: parsedSectionId,
          rollNumber: student.roll_number,
          courseCode: section.course_code,
          sectionName: section.section_name,
          semester: section.semester
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all course enrollments for a specific student
   * Route: GET /api/enrollments/student/:studentId
   */
  async getByStudentId(req, res, next) {
    try {
      const studentId = parseInt(req.params.studentId, 10);

      // 1. Validation Check: Make sure ID is an integer
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

      // 3. SECURITY CHECK:
      // - Students can ONLY view their own schedules.
      // - Admins and Faculty can view any student's schedule.
      if (req.user.role === 'student' && student.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view another student\'s enrollment list.'
        });
      }

      // 4. Retrieve schedule from database
      const schedule = await EnrollmentModel.findByStudentId(studentId);

      return res.status(200).json({
        success: true,
        message: 'Student course schedule retrieved successfully.',
        data: {
          studentId,
          rollNumber: student.roll_number,
          firstName: student.first_name,
          lastName: student.last_name,
          enrollments: schedule
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get the roster of all enrolled students for a specific class section
   * Route: GET /api/enrollments/section/:sectionId
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

      // 2. Database Lookup: Verify the class section exists
      const section = await ClassSectionModel.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Class section with ID '${sectionId}' not found.`
        });
      }

      // 3. SECURITY CHECK:
      // - Students are BLOCKED from viewing class section rosters.
      // - Admins and Faculty are ALLOWED.
      if (req.user.role === 'student') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Students are not authorized to view class section roster lists.'
        });
      }

      // 4. Retrieve roster from database
      const roster = await EnrollmentModel.findBySectionId(sectionId);

      return res.status(200).json({
        success: true,
        message: 'Class section roster list retrieved successfully.',
        data: {
          sectionId,
          courseCode: section.course_code,
          courseTitle: section.course_title,
          sectionName: section.section_name,
          semester: section.semester,
          roster
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Drop/Withdraw a student from a course section (Admin can drop anyone; Student can drop self)
   * Route: DELETE /api/enrollments/:id
   */
  async delete(req, res, next) {
    try {
      const enrollmentId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(enrollmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid enrollment ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the enrollment record exists
      const enrollment = await EnrollmentModel.findById(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: `Drop failed. Enrollment record with ID '${enrollmentId}' not found.`
        });
      }

      // 3. SECURITY CHECK:
      // - Students can ONLY drop their own courses.
      // - Faculty are BLOCKED from dropping students.
      // - Admins are ALLOWED to drop any enrollment.
      if (req.user.role === 'student' && enrollment.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to drop a course for another student.'
        });
      }

      if (req.user.role === 'faculty') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Faculty members are not authorized to drop students from courses.'
        });
      }

      // 4. Delete/Drop the record
      await EnrollmentModel.delete(enrollmentId);

      return res.status(200).json({
        success: true,
        message: 'Student successfully dropped from the class section!'
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = EnrollmentController;
