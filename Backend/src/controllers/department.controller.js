const DepartmentModel = require('../models/department.model');

/**
 * Department Controller - Coordinates CRUD operations on departments
 */
const DepartmentController = {
  /**
   * Create a new department (Admin only)
   * Route: POST /api/departments
   */
  async create(req, res, next) {
    try {
      const { name, code, description } = req.body;

      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Please provide both department name and code.'
        });
      }

      const normalizedCode = code.trim().toUpperCase();
      const existingDept = await DepartmentModel.findByCode(normalizedCode);
      if (existingDept) {
        return res.status(400).json({
          success: false,
          message: `Department with code '${normalizedCode}' already exists.`
        });
      }

      const newId = await DepartmentModel.create({
        name: name.trim(),
        code: normalizedCode,
        description: description ? description.trim() : null
      });

      res.status(201).json({
        success: true,
        message: 'Department created successfully!',
        data: {
          id: newId,
          name: name.trim(),
          code: normalizedCode,
          description: description ? description.trim() : null
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all departments
   * Route: GET /api/departments
   */
  async getAll(req, res, next) {
    try {
      const departments = await DepartmentModel.findAll();
      res.status(200).json({
        success: true,
        message: 'Departments list retrieved successfully.',
        data: departments
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get department by ID
   * Route: GET /api/departments/:id
   */
  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID parameter.'
        });
      }

      const department = await DepartmentModel.findById(id);
      if (!department) {
        return res.status(404).json({
          success: false,
          message: `Department with ID ${id} not found.`
        });
      }

      res.status(200).json({
        success: true,
        message: 'Department retrieved successfully.',
        data: department
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update department details (Admin only)
   * Route: PUT /api/departments/:id
   */
  async update(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { name, code, description } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID parameter.'
        });
      }

      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing. Please provide both department name and code.'
        });
      }

      const department = await DepartmentModel.findById(id);
      if (!department) {
        return res.status(404).json({
          success: false,
          message: `Department with ID ${id} not found.`
        });
      }

      const normalizedCode = code.trim().toUpperCase();
      const existingDept = await DepartmentModel.findByCode(normalizedCode);
      if (existingDept && existingDept.id !== id) {
        return res.status(400).json({
          success: false,
          message: `Another department with code '${normalizedCode}' already exists.`
        });
      }

      await DepartmentModel.update(id, {
        name: name.trim(),
        code: normalizedCode,
        description: description ? description.trim() : null
      });

      res.status(200).json({
        success: true,
        message: 'Department updated successfully!',
        data: {
          id,
          name: name.trim(),
          code: normalizedCode,
          description: description ? description.trim() : null
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete department (Admin only)
   * Route: DELETE /api/departments/:id
   */
  async delete(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID parameter.'
        });
      }

      const department = await DepartmentModel.findById(id);
      if (!department) {
        return res.status(404).json({
          success: false,
          message: `Department with ID ${id} not found.`
        });
      }

      await DepartmentModel.delete(id);
      res.status(200).json({
        success: true,
        message: `Department with ID ${id} deleted successfully.`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = DepartmentController;
