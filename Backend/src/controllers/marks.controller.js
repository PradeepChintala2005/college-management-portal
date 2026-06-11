const MarksModel = require('../models/marks.model');
const StudentModel = require('../models/student.model');
const ClassSectionModel = require('../models/class-section.model');
const EnrollmentModel = require('../models/enrollment.model');

/**
 * Marks Controller - Coordinates student scoring, grade reporting, and roster updates
 */
const MarksController = {
  /**
   * Add assessment marks for a student in a class section (Admin/Faculty only)
   * Route: POST /api/marks
   */
  async create(req, res, next) {
    try {
      const { studentId, classSectionId, examType, marksObtained, maxMarks } = req.body;

      // 1. Validation Check: Make sure required parameters are provided
      if (!studentId || !classSectionId || !examType || marksObtained === undefined || maxMarks === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide studentId, classSectionId, examType, marksObtained, and maxMarks.'
        });
      }

      // 2. Format & Parse assessment parameters
      const parsedStudentId = parseInt(studentId, 10);
      const parsedSectionId = parseInt(classSectionId, 10);
      const parsedObtained = parseFloat(marksObtained);
      const parsedMax = parseFloat(maxMarks);
      const formattedType = examType.trim();

      if (isNaN(parsedStudentId) || isNaN(parsedSectionId) || isNaN(parsedObtained) || isNaN(parsedMax)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input formats. studentId and classSectionId must be integers. marksObtained and maxMarks must be numbers.'
        });
      }

      // 3. Enforce valid exam type options
      const validExamTypes = ['Quiz', 'Midterm', 'Final', 'Assignment'];
      if (!validExamTypes.includes(formattedType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid examType value. Must be one of: 'Quiz', 'Midterm', 'Final', or 'Assignment'."
        });
      }

      // 4. Value constraint check: Max marks must be positive, obtained marks cannot be negative
      if (parsedMax <= 0 || parsedObtained < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid marks values. Obtained marks cannot be negative. Max marks must be greater than zero.'
        });
      }

      // 5. Value constraint check: Obtained marks cannot exceed maximum possible marks
      if (parsedObtained > parsedMax) {
        return res.status(400).json({
          success: false,
          message: `Input error. Obtained score (${parsedObtained}) cannot exceed the maximum score limit (${parsedMax}).`
        });
      }

      // 6. Database Lookup: Verify student exists
      const student = await StudentModel.findById(parsedStudentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Grading failed. Student with profile ID '${parsedStudentId}' not found.`
        });
      }

      // 7. Database Lookup: Verify class section exists
      const section = await ClassSectionModel.findById(parsedSectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Grading failed. Class section with ID '${parsedSectionId}' not found.`
        });
      }

      // 8. Business Integrity Check: Verify student is enrolled in this class roster
      const enrollment = await EnrollmentModel.findByStudentAndSection(parsedStudentId, parsedSectionId);
      if (!enrollment) {
        return res.status(400).json({
          success: false,
          message: `Cannot record marks. Student '${student.first_name} ${student.last_name}' is not enrolled in this class section roster.`
        });
      }

      // 9. Save to Database
      const newMarkId = await MarksModel.create({
        studentId: parsedStudentId,
        classSectionId: parsedSectionId,
        examType: formattedType,
        marksObtained: parsedObtained,
        maxMarks: parsedMax
      });

      return res.status(201).json({
        success: true,
        message: 'Marks recorded successfully!',
        data: {
          markId: newMarkId,
          studentId: parsedStudentId,
          classSectionId: parsedSectionId,
          examType: formattedType,
          marksObtained: parsedObtained,
          maxMarks: parsedMax
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Update details of an existing mark record (Admin/Faculty only)
   * Route: PUT /api/marks/:id
   */
  async update(req, res, next) {
    try {
      const markId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(markId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mark ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the mark record exists
      const markRecord = await MarksModel.findById(markId);
      if (!markRecord) {
        return res.status(404).json({
          success: false,
          message: `Mark record with ID '${markId}' not found.`
        });
      }

      const { examType, marksObtained, maxMarks } = req.body;

      // 3. Validation Check: Make sure required parameters are provided
      if (!examType || marksObtained === undefined || maxMarks === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Make sure to provide examType, marksObtained, and maxMarks.'
        });
      }

      // 4. Format & Parse assessment parameters
      const parsedObtained = parseFloat(marksObtained);
      const parsedMax = parseFloat(maxMarks);
      const formattedType = examType.trim();

      if (isNaN(parsedObtained) || isNaN(parsedMax)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input formats. marksObtained and maxMarks must be numbers.'
        });
      }

      // 5. Enforce valid exam type options
      const validExamTypes = ['Quiz', 'Midterm', 'Final', 'Assignment'];
      if (!validExamTypes.includes(formattedType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid examType value. Must be one of: 'Quiz', 'Midterm', 'Final', or 'Assignment'."
        });
      }

      // 6. Value constraint check: Max marks must be positive, obtained marks cannot be negative
      if (parsedMax <= 0 || parsedObtained < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid marks values. Obtained marks cannot be negative. Max marks must be greater than zero.'
        });
      }

      // 7. Value constraint check: Obtained marks cannot exceed maximum possible marks
      if (parsedObtained > parsedMax) {
        return res.status(400).json({
          success: false,
          message: `Input error. Obtained score (${parsedObtained}) cannot exceed the maximum score limit (${parsedMax}).`
        });
      }

      // 8. Save changes to Database
      await MarksModel.update(markId, {
        examType: formattedType,
        marksObtained: parsedObtained,
        maxMarks: parsedMax
      });

      // 9. Return successful response (Echo Method)
      return res.status(200).json({
        success: true,
        message: 'Marks record updated successfully!',
        data: {
          markId,
          studentId: markRecord.student_id,
          classSectionId: markRecord.class_section_id,
          examType: formattedType,
          marksObtained: parsedObtained,
          maxMarks: parsedMax
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete an existing mark record (Admin/Faculty only)
   * Route: DELETE /api/marks/:id
   */
  async delete(req, res, next) {
    try {
      const markId = parseInt(req.params.id, 10);

      // 1. Validation Check: Make sure ID is an integer
      if (isNaN(markId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mark ID format. Must be an integer.'
        });
      }

      // 2. Database Lookup: Verify the mark record exists
      const markRecord = await MarksModel.findById(markId);
      if (!markRecord) {
        return res.status(404).json({
          success: false,
          message: `Mark record with ID '${markId}' not found.`
        });
      }

      // 3. Delete the record
      await MarksModel.delete(markId);

      return res.status(200).json({
        success: true,
        message: 'Marks record deleted successfully!'
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all marks and grade sheet entries for a student
   * Route: GET /api/marks/student/:studentId
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
      // - Students can ONLY view their own grade report cards.
      // - Admins and Faculty can view any student's grades.
      if (req.user.role === 'student' && student.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view another student\'s grades.'
        });
      }

      // 4. Retrieve grade sheet logs from database
      const grades = await MarksModel.findByStudentId(studentId);

      return res.status(200).json({
        success: true,
        message: 'Student grades report retrieved successfully.',
        data: {
          studentId,
          rollNumber: student.roll_number,
          firstName: student.first_name,
          lastName: student.last_name,
          grades
        }
      });

    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all marks entries for a class section (grading spreadsheet report) (Admin/Faculty only)
   * Route: GET /api/marks/section/:sectionId
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

      // 2. Database Lookup: Verify the section exists
      const section = await ClassSectionModel.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: `Class section with ID '${sectionId}' not found.`
        });
      }

      // 3. SECURITY CHECK:
      // - Students are BLOCKED from reading section grading spreadsheets.
      // - Admins and Faculty are ALLOWED.
      if (req.user.role === 'student') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Students are not authorized to view class section grading spreadsheets.'
        });
      }

      // 4. Query roster scores logs from database
      const scores = await MarksModel.findBySectionId(sectionId);

      return res.status(200).json({
        success: true,
        message: 'Class section grading sheet retrieved successfully.',
        data: {
          sectionId,
          courseCode: section.course_code,
          courseTitle: section.course_title,
          sectionName: section.section_name,
          semester: section.semester,
          grades: scores
        }
      });

    } catch (err) {
      next(err);
    }
  }
};

module.exports = MarksController;
