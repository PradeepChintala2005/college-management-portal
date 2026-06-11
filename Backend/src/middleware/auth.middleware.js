const AuthUtils = require('../utils/auth.utils');

/**
 * Authentication & Authorization Middlewares
 */
const AuthMiddleware = {
  /**
   * JWT Verification Middleware (Authentication - Who are you?)
   * Intercepts request, checks the Authorization header, verifies JWT, and attaches user to req.user.
   */
  authenticateJWT(req, res, next) {
    try {
      // 1. Get the Authorization header from incoming HTTP request
      const authHeader = req.headers.authorization;

      // 2. Check if the header exists and starts with "Bearer "
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No authentication token provided.'
        });
      }

      // 3. Extract the actual token from "Bearer <TOKEN_STRING>"
      // Splitting by space gives: ['Bearer', '<TOKEN_STRING>']
      const token = authHeader.split(' ')[1];

      // 4. Verify and decode the token
      const decodedPayload = AuthUtils.verifyToken(token);

      // 5. Attach decoded user details (userId, email, role) to the request object
      // This makes req.user available to all subsequent controller functions!
      req.user = decodedPayload;

      // 6. Give the green light to proceed to the next function in the chain!
      next();

    } catch (err) {
      // If token verification fails (expired, modified, or forged)
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Invalid or expired token.'
      });
    }
  },

  /**
   * Role-Based Access Control Middleware (Authorization - What are you allowed to do?)
   * Restricts route access to specific roles (e.g. only 'admin' or 'faculty').
   * Uses Currying (a function that returns a middleware function).
   * @param {...string} allowedRoles - Array of roles permitted to access the route.
   */
  authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
      // 1. Double check if user is authenticated (req.user must exist)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. User is not authenticated.'
        });
      }

      // 2. Check if the authenticated user's role is in our allowed list
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Your role '${req.user.role}' is not authorized to access this resource.`
        });
      }

      // 3. Allowed! Proceed to the controller handler
      next();
    };
  }
};

module.exports = AuthMiddleware;
