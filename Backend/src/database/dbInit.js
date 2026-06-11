const fs = require('fs');
const path = require('path');
const db = require('./db');

/**
 * Initializes the database tables by reading and executing the schema.sql script.
 * Returns a Promise to allow synchronization with server startup.
 */
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // 1. Locate and read the schema.sql blueprint file
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    console.log(`📖 Reading database blueprint from: ${schemaPath}`);
    
    fs.readFile(schemaPath, 'utf8', (err, sqlSchemaContent) => {
      if (err) {
        console.error('❌ Failed to read schema.sql file:', err.message);
        return reject(err);
      }

      console.log('🏗️ Building tables inside SQLite database...');

      // 2. Execute all SQL queries inside schema.sql sequentially.
      // db.exec() allows running multiple SQL queries separated by semicolons at once!
      // db.serialize() ensures SQLite runs them in sequential order (important for Foreign Keys!).
      db.serialize(() => {
        db.exec(sqlSchemaContent, (execErr) => {
          if (execErr) {
            console.error('❌ Database Initialization Failed during execution:', execErr.message);
            return reject(execErr);
          }
          
          console.log('✅ ALL DATABASE TABLES SUCCESSFULLY CREATED OR VERIFIED!');
          resolve();
        });
      });
    });
  });
}

// If this file is executed directly (e.g. "node src/database/dbInit.js"), run initialization immediately.
if (require.main === module) {
  // Load environment variables in case this is executed stand-alone
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization complete. Closing connection.');
      db.close();
    })
    .catch((err) => {
      console.error('💥 Execution failed:', err);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
