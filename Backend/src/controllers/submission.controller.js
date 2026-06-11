const SubmissionModel = require('../models/submission.model');
const AssignmentModel = require('../models/assignment.model');
const StudentModel = require('../models/student.model');
const EnrollmentModel = require('../models/enrollment.model');

/**
 * Submission Controller - Coordinates student homework uploads and teacher grading feedback
 */
const SubmissionController = {
  /**
   * Submit coursework homework answer (Students only)
   * Route: POST /api/submissions
   */
  async submit(req, res, next) {
    try {
      const { assignmentId, submissionText } = req.body;

      // 1. Validation Check: Make sure required parameters are provided
      if (!assignmentId || !submissionText) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide assignmentId and submissionText.'
        });
      }

      const parsedAssignmentId = parseInt(assignmentId, 10);
      if (isNaN(parsedAssignmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignmentId format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the assignment exists
      const assignment = await AssignmentModel.findById(parsedAssignmentId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: `Submission failed. Coursework assignment with ID '${parsedAssignmentId}' not found.`
        });
      }

      // 3. Database Lookup: Resolve student profile belonging to logged-in user
      const student = await StudentModel.findByUserId(req.user.userId);
      if (!student) {
        return res.status(403).json({
          success: false,
          message: 'Submission failed. Logged-in credentials are not linked to a student profile.'
        });
      }

      // 4. Business Integrity Check: Verify student is enrolled in the assignment's class section
      const enrollment = await EnrollmentModel.findByStudentAndSection(student.id, assignment.class_section_id);
      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'Submission failed. You are not enrolled in the class section roster for this assignment.'
        });
      }

      // 5. Business Integrity Check: Verify student has not already submitted homework for this task
      const existingSubmission = await SubmissionModel.findByAssignmentAndStudent(parsedAssignmentId, student.id);
      if (existingSubmission) {
        return res.status(400).json({
          success: false,
          message: 'Submission failed. You have already submitted coursework for this assignment.'
        });
      }

      // 6. Save to Database
      const newSubmissionId = await SubmissionModel.create({
        assignmentId: parsedAssignmentId,
        studentId: student.id,
        submissionText: submissionText.trim()
      });

      return res.status(201).json({
        success: true,
        message: 'Homework coursework submitted successfully!',
        data: {
          submissionId: newSubmissionId,
          assignmentId: parsedAssignmentId,
          studentId: student.id,
          submissionText: submissionText.trim()
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Grade a student's coursework homework submission (Admin/Faculty only)
   * Route: POST /api/submissions/:id/grade
   */
  async grade(req, res, next) {
    try {
      const submissionId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(submissionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid submission ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the submission exists
      const submission = await SubmissionModel.findById(submissionId);
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: `Grading failed. Submission record with ID '${submissionId}' not found.`
        });
      }

      const { grade } = req.body;

      // 3. Validation Check: Make sure grade is provided
      if (!grade) {
        return res.status(400).json({
          success: false,
          message: 'Required evaluation payload missing. Make sure to provide grade.'
        });
      }

      // 4. Save evaluation feedback to Database
      await SubmissionModel.grade(submissionId, grade.trim());

      return res.status(200).json({
        success: true,
        message: 'Coursework submission graded successfully!',
        data: {
          submissionId,
          assignmentId: submission.assignment_id,
          studentId: submission.student_id,
          grade: grade.trim()
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all submissions for an assignment (teacher coursework roster) (Admin/Faculty only)
   * Route: GET /api/submissions/assignment/:assignmentId
   */
  async getByAssignmentId(req, res, next) {
    try {
      const assignmentId = parseInt(req.params.assignmentId, 10);

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
          message: `Assignment coursework with ID '${assignmentId}' not found.`
        });
      }

      // 3. Query roster submissions list from database
      const roster = await SubmissionModel.findByAssignmentId(assignmentId);

      return res.status(200).json({
        success: true,
        message: 'Assignment submissions roster list retrieved successfully.',
        data: {
          assignmentId,
          roster
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all homework submissions made by a student (All roles)
   * Route: GET /api/submissions/student/:studentId
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

      // 2. Database Lookup: Verify student exists
      const student = await StudentModel.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student with profile ID '${studentId}' not found.`
        });
      }

      // 3. SECURITY CHECK:
      // - Students can ONLY view their own homework submission logs history.
      // - Admins and Faculty can view any student's submissions history list.
      if (req.user.role === 'student' && student.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view another student\'s submissions logs.'
        });
      }

      // 4. Query schedule reports logs from database
      const logs = await SubmissionModel.findByStudentId(studentId);

      return res.status(200).json({
        success: true,
        message: 'Student homework submissions logs retrieved successfully.',
        data: {
          studentId,
          rollNumber: student.roll_number,
          firstName: student.first_name,
          lastName: student.last_name,
          submissions: logs
        }
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = SubmissionController;
