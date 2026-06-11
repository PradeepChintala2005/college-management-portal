// Load environment variables from .env file
require('dotenv').config();

const app = require('./src/app');
const initializeDatabase = require('./src/database/dbInit');

// Retrieve the PORT from environment variables, defaulting to 5000 if not configured
const PORT = process.env.PORT || 5000;

let server;

// Initialize database tables before turning on the engine!
initializeDatabase()
  .then(() => {
    // Start the server listening process
    server = app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`  🎓 COLLEGE MANAGEMENT SYSTEM SERVER STARTED`);
      console.log(`  🌐 Environment: ${process.env.NODE_ENV}`);
      console.log(`  🚀 Server is running on: http://localhost:${PORT}`);
      console.log(`=================================================`);
    });
  })
  .catch((err) => {
    console.error('💥 Critical Error: Database initialization failed. Exiting server.');
    process.exit(1);
  });

// Handle unhandled promise rejections (e.g. database connection failures)
process.on('unhandledRejection', (err) => {
  console.error(`💥 Unhandled Promise Rejection: ${err.message}`);
  // Gracefully shut down the server if it has started listening
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

