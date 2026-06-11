const express = require('express');
const cors = require('cors');

// Initialize the Express app
const app = express();

// ==========================================
// Global Middleware Setup
// ==========================================

// 1. Enable Cross-Origin Resource Sharing (CORS)
// This allows our React frontend (running on another port like 5173) to communicate with this API.
app.use(cors());

// 2. Parse incoming JSON payloads
// This replaces the old body-parser. It reads the incoming request body and parses it into a JS object under req.body.
app.use(express.json());

// 3. Parse URL-encoded payloads
// Useful for standard HTML form submissions if needed.
app.use(express.urlencoded({ extended: true }));

// ==========================================
// Base Status Route
// ==========================================
app.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'College Management API is online and fully functional!'
  });
});


// ==========================================
// API Routes Configuration
// ==========================================
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/students', require('./routes/student.routes'));
app.use('/api/faculty', require('./routes/faculty.routes'));
app.use('/api/courses', require('./routes/course.routes'));
app.use('/api/departments', require('./routes/department.routes'));
app.use('/api/sections', require('./routes/class-section.routes'));
app.use('/api/enrollments', require('./routes/enrollment.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/marks', require('./routes/marks.routes'));
app.use('/api/assignments', require('./routes/assignment.routes'));
app.use('/api/submissions', require('./routes/submission.routes'));
app.use('/api/announcements', require('./routes/announcement.routes'));

// ==========================================
// Global 404 Route (Not Found Handler)
// ==========================================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot find requested URL: ${req.originalUrl}`
  });
});

// ==========================================
// Global Error Handling Middleware
// ==========================================
// In Express, any middleware with exactly 4 parameters (err, req, res, next) is treated as an Error Handler.
app.use((err, req, res, next) => {
  console.error('SERVER_ERROR:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only show stack trace during development to protect sensitive information in production
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

module.exports = app;
