const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 1. Determine the path to our SQLite database file
// In our .env, DATABASE_URL is "src/database/college.db"
const dbRelativePath = process.env.DATABASE_URL || 'src/database/college.db';
const dbPath = path.resolve(__dirname, '../../', dbRelativePath);

// 2. Safety Check: Ensure the target directory exists!
// If the "src/database" folder doesn't exist, SQLite will crash with "CANTOPEN" error.
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`🔌 Attempting to connect to SQLite at: ${dbPath}`);

// 3. Establish the connection to the database file
// The flags "sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE" tells it to open the file if it exists,
// or automatically create an empty file if it's not there!
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to open SQLite Database connection:', err.message);
    process.exit(1);
  }
  console.log('✅ SQLite Database connection successfully established!');
});

// 4. Critical Step: Enable Foreign Key Constraints!
// By default, SQLite turns foreign key checks OFF. We must execute this command on startup
// to ensure cascading deletes and relations work safely.
db.run('PRAGMA foreign_keys = ON;', (err) => {
  if (err) {
    console.error('❌ Failed to enable PRAGMA foreign_keys:', err.message);
  } else {
    console.log('🛡️ SQLite Foreign Key constraints are now active!');
  }
});

module.exports = db;
