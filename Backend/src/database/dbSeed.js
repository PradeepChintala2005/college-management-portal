const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'college.db');
const schemaPath = path.resolve(__dirname, 'schema.sql');

async function seed() {
  console.log('🧹 Preparing to reset and seed SQLite database...');
  
  // 1. Delete old database file if it exists to ensure a clean slate
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log('🗑️ Deleted old college.db file.');
    } catch (err) {
      console.error('❌ Failed to delete old database file:', err.message);
      process.exit(1);
    }
  }

  // 2. Open new database connection
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Failed to connect to SQLite:', err.message);
      process.exit(1);
    }
    console.log('🔌 Connected to fresh college.db SQLite database.');
  });

  // 3. Read schema blueprint
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found at: ${schemaPath}`);
    db.close();
    process.exit(1);
  }

  const sqlSchema = fs.readFileSync(schemaPath, 'utf8');

  // 4. Execute schema to create tables
  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.exec(sqlSchema, (err) => {
        if (err) {
          console.error('❌ Failed to construct tables:', err.message);
          db.close();
          return reject(err);
        }
        console.log('🏗️ Recreated clean database tables.');
        resolve();
      });
    });
  });

  // 5. Seed default records
  console.log('🌱 Seeding clean records...');
  
  try {
    const passwordHash = await bcrypt.hash('password123', 10);

    db.serialize(() => {
      db.run('BEGIN TRANSACTION;');

      // A. Seed Departments
      const insertDept = 'INSERT INTO departments (name, code, description) VALUES (?, ?, ?)';
      db.run(insertDept, ['Computer Science & Engineering', 'CSE', 'Academic division of CSE'], function(err) {
        if (err) throw err;
        const cseDeptId = this.lastID;

        db.run(insertDept, ['Electronics & Communication Engineering', 'ECE', 'Academic division of ECE'], function(err) {
          if (err) throw err;
          const eceDeptId = this.lastID;

          // B. Seed Admin User
          const insertUser = 'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)';
          db.run(insertUser, ['admin@college.edu', passwordHash, 'admin'], function(err) {
            if (err) throw err;
            console.log('✅ Registered Admin: admin@college.edu | Password: password123');

            // C. Seed Faculty User & Profile
            db.run(insertUser, ['prof.cse@college.edu', passwordHash, 'faculty'], function(err) {
              if (err) throw err;
              const profUserId = this.lastID;

              const insertFaculty = 'INSERT INTO faculty (user_id, department_id, employee_id, first_name, last_name, designation) VALUES (?, ?, ?, ?, ?, ?)';
              db.run(insertFaculty, [profUserId, cseDeptId, 'EMP-CSE-01', 'Richard', 'Feynman', 'Professor'], function(err) {
                if (err) throw err;
                console.log('✅ Registered Faculty: prof.cse@college.edu | Password: password123 (CSE Professor)');

                // D. Seed Student User & Profile
                db.run(insertUser, ['student.cse@college.edu', passwordHash, 'student'], function(err) {
                  if (err) throw err;
                  const studentUserId = this.lastID;

                  const insertStudent = 'INSERT INTO students (user_id, department_id, roll_number, first_name, last_name) VALUES (?, ?, ?, ?, ?)';
                  db.run(insertStudent, [studentUserId, cseDeptId, 'ROLL-CSE-01', 'Alice', 'Smith'], function(err) {
                    if (err) throw err;
                    console.log('✅ Registered Student: student.cse@college.edu | Password: password123 (CSE Student)');

                    // Commit Transaction
                    db.run('COMMIT;', (commitErr) => {
                      if (commitErr) {
                        console.error('❌ Failed to commit seed transaction:', commitErr.message);
                        db.close();
                        process.exit(1);
                      }
                      console.log('🎉 Seed operations completed successfully! Connection closed.');
                      db.close();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    db.run('ROLLBACK;');
    db.close();
    process.exit(1);
  }
}

seed();
