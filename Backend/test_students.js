const http = require('http');
const db = require('./src/database/db');
const DepartmentModel = require('./src/models/department.model');

// Helper function to send POST requests with custom headers
function postJSON(url, data, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = JSON.stringify(data);
    
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated Student Onboarding Integration Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.onboard.${time}@college.edu`;
    const studentEmail = `student.onboard.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Creating test database records ---');
    
    // A. Create a test department (Computer Science)
    const deptId = await DepartmentModel.create({
      name: `Computer Science ${time}`,
      code: `CSE-${time}`,
      description: 'Department of Computer Science & Engineering'
    });
    console.log(`✅ Test Department created with ID: ${deptId}`);

    // B. Register & Login an Admin to get their token
    await postJSON('http://localhost:5000/api/auth/register', { email: adminEmail, password, role: 'admin' });
    const adminLogin = await postJSON('http://localhost:5000/api/auth/login', { email: adminEmail, password });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin credentials ready.');

    // C. Register & Login a Student to get their token
    await postJSON('http://localhost:5000/api/auth/register', { email: studentEmail, password, role: 'student' });
    const studentLogin = await postJSON('http://localhost:5000/api/auth/login', { email: studentEmail, password });
    const studentToken = studentLogin.data.data.token;
    console.log('✅ Standard student credentials ready (for security checks).');

    // ==========================================
    // 2. VERIFICATION PHASE
    // ==========================================
    console.log('\n--- VERIFICATION PHASE ---');

    // Test 1: Access POST /api/students with NO Token
    console.log('\nTesting: Onboarding student with NO token...');
    const t1 = await postJSON('http://localhost:5000/api/students', {
      email: `newstudent1.${time}@college.edu`,
      rollNumber: `ROLL-A-${time}`,
      firstName: 'Alice',
      lastName: 'Smith'
    });
    console.log(`Status: ${t1.statusCode}`);
    console.log('Response:', JSON.stringify(t1.data, null, 2));
    if (t1.statusCode !== 401 || t1.data.success) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Unauthenticated block active.');

    // Test 2: Access POST /api/students with STUDENT Token (Role authorization check)
    console.log('\nTesting: Onboarding student using STUDENT token (Security check)...');
    const t2 = await postJSON('http://localhost:5000/api/students', {
      email: `newstudent2.${time}@college.edu`,
      rollNumber: `ROLL-B-${time}`,
      firstName: 'Bob',
      lastName: 'Jones'
    }, studentToken);
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 403 || t2.data.success) {
      throw new Error('Test 2 failed: Student role should be blocked with 403.');
    }
    console.log('✅ Test 2 Passed! Student role restricted correctly.');

    // Test 3: Access POST /api/students with ADMIN Token, missing required fields
    console.log('\nTesting: Onboarding student with ADMIN token, missing required fields...');
    const t3 = await postJSON('http://localhost:5000/api/students', {
      email: `newstudent3.${time}@college.edu`,
      firstName: 'Charlie' // missing rollNumber and lastName
    }, adminToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response:', JSON.stringify(t3.data, null, 2));
    if (t3.statusCode !== 400 || t3.data.success) {
      throw new Error('Test 3 failed: Missing required fields should return 400 Bad Request.');
    }
    console.log('✅ Test 3 Passed! Input validations block bad payload.');

    // Test 4: Access POST /api/students with ADMIN Token (Valid onboarding)
    console.log('\nTesting: Onboarding student successfully with ADMIN token...');
    const targetEmail = `newstudent4.${time}@college.edu`;
    const targetRoll = `ROLL-D-${time}`;
    const t4 = await postJSON('http://localhost:5000/api/students', {
      email: targetEmail,
      rollNumber: targetRoll,
      firstName: 'Danielle',
      lastName: 'Vance',
      departmentId: deptId,
      phone: '123-456-7890',
      dateOfBirth: '2005-08-15'
    }, adminToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 201 || !t4.data.success) {
      throw new Error('Test 4 failed: Onboarding should have returned 201 Success.');
    }
    console.log('✅ Test 4 Passed! Danielle onboarded successfully!');

    // Test 5: Attempt duplicate roll number (should fail)
    console.log('\nTesting: Onboarding duplicate student with same ROLL number...');
    const t5 = await postJSON('http://localhost:5000/api/students', {
      email: `anotherstudent.${time}@college.edu`,
      rollNumber: targetRoll, // duplicate roll number
      firstName: 'Duplicate',
      lastName: 'Student',
      departmentId: deptId
    }, adminToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 400 || t5.data.success) {
      throw new Error('Test 5 failed: Duplicate roll number should be blocked with 400.');
    }
    console.log('✅ Test 5 Passed! Duplicate roll number blocked correctly.');

    // Test 6: Verify Transaction Rollback (Onboarding with a NON-EXISTING department ID)
    // The email check will pass, but the student profile creation will fail due to the invalid department check.
    // If the transaction rolls back successfully, the user account should NOT exist in the users table!
    console.log('\nTesting: Transaction Rollback (Onboarding with a non-existent department ID)...');
    const rollbackEmail = `rollback.${time}@college.edu`;
    const t6 = await postJSON('http://localhost:5000/api/students', {
      email: rollbackEmail,
      rollNumber: `ROLL-F-${time}`,
      firstName: 'Failure',
      lastName: 'Rollback',
      departmentId: 99999 // non-existent department ID!
    }, adminToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Response:', JSON.stringify(t6.data, null, 2));

    if (t6.statusCode !== 400 || t6.data.success) {
      throw new Error('Test 6 failed: Onboarding with non-existent department should fail with 400.');
    }

    // Now, search the database to confirm that the user 'rollbackEmail' was NOT created
    console.log(`\nVerifying rollback: Checking if user account '${rollbackEmail}' exists in the database...`);
    const checkSql = `SELECT * FROM users WHERE email = ?`;
    
    db.get(checkSql, [rollbackEmail], (dbErr, row) => {
      if (dbErr) {
        console.error('Database query error during verification:', dbErr.message);
        process.exit(1);
      }
      
      console.log('Query Row Result:', row);
      if (row) {
        console.error('❌ ROLLBACK FAILURE: Orphan user account was created despite student insert failing!');
        process.exit(1);
      } else {
        console.log('✅ TRANSACTION ROLLBACK VERIFIED! No orphan user account was left in the database!');
        console.log('\n🎉 ALL STUDENT ONBOARDING TESTS COMPLETED SUCCESSFULLY!');
        db.close();
      }
    });

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    db.close();
    process.exit(1);
  }
}

runTests();
