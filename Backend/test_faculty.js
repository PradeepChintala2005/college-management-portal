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
  console.log('🧪 Starting Automated Faculty Onboarding Integration Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.faculty.${time}@college.edu`;
    const studentEmail = `student.faculty.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Creating test database records ---');
    
    // A. Create a test department (Electrical Engineering)
    const deptId = await DepartmentModel.create({
      name: `Electrical Engineering ${time}`,
      code: `EE-${time}`,
      description: 'Department of Electrical Engineering'
    });
    console.log(`✅ Test Department created with ID: ${deptId}`);

    // B. Register & Login an Admin
    await postJSON('http://localhost:5000/api/auth/register', { email: adminEmail, password, role: 'admin' });
    const adminLogin = await postJSON('http://localhost:5000/api/auth/login', { email: adminEmail, password });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin credentials ready.');

    // C. Register & Login a Student (to test role blockages)
    await postJSON('http://localhost:5000/api/auth/register', { email: studentEmail, password, role: 'student' });
    const studentLogin = await postJSON('http://localhost:5000/api/auth/login', { email: studentEmail, password });
    const studentToken = studentLogin.data.data.token;
    console.log('✅ Student credentials ready.');

    // ==========================================
    // 2. VERIFICATION PHASE
    // ==========================================
    console.log('\n--- VERIFICATION PHASE ---');

    // Test 1: Access POST /api/faculty with NO Token
    console.log('\nTesting: Onboarding teacher with NO token...');
    const t1 = await postJSON('http://localhost:5000/api/faculty', {
      email: `teacher1.${time}@college.edu`,
      employeeId: `FAC-EE-${time}`,
      firstName: 'John',
      lastName: 'Doe'
    });
    console.log(`Status: ${t1.statusCode}`);
    console.log('Response:', JSON.stringify(t1.data, null, 2));
    if (t1.statusCode !== 401 || t1.data.success) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Unauthenticated block active.');

    // Test 2: Access POST /api/faculty with STUDENT Token (Role check)
    console.log('\nTesting: Onboarding teacher using STUDENT token (Security check)...');
    const t2 = await postJSON('http://localhost:5000/api/faculty', {
      email: `teacher2.${time}@college.edu`,
      employeeId: `FAC-EE-B-${time}`,
      firstName: 'Jane',
      lastName: 'Smith'
    }, studentToken);
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 403 || t2.data.success) {
      throw new Error('Test 2 failed: Student role should be blocked with 403.');
    }
    console.log('✅ Test 2 Passed! Student role restricted correctly.');

    // Test 3: Access POST /api/faculty with ADMIN Token, missing fields
    console.log('\nTesting: Onboarding teacher with ADMIN token, missing required fields...');
    const t3 = await postJSON('http://localhost:5000/api/faculty', {
      email: `teacher3.${time}@college.edu`,
      firstName: 'Richard' // missing employeeId and lastName
    }, adminToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response:', JSON.stringify(t3.data, null, 2));
    if (t3.statusCode !== 400 || t3.data.success) {
      throw new Error('Test 3 failed: Missing required fields should return 400.');
    }
    console.log('✅ Test 3 Passed! Input validation checks active.');

    // Test 4: Access POST /api/faculty with ADMIN Token (Valid onboarding)
    console.log('\nTesting: Onboarding teacher successfully with ADMIN token...');
    const targetEmail = `prof.walter.${time}@college.edu`;
    const targetEmpId = `FAC-EE-W-${time}`;
    const t4 = await postJSON('http://localhost:5000/api/faculty', {
      email: targetEmail,
      employeeId: targetEmpId,
      firstName: 'Walter',
      lastName: 'White',
      designation: 'Professor',
      departmentId: deptId,
      phone: '555-019-9191'
    }, adminToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 201 || !t4.data.success) {
      throw new Error('Test 4 failed: Onboarding should have returned 201 Success.');
    }
    console.log('✅ Test 4 Passed! Professor Walter White onboarded successfully!');

    // Test 5: Attempt duplicate Employee ID (should fail)
    console.log('\nTesting: Onboarding duplicate teacher with same EMPLOYEE ID...');
    const t5 = await postJSON('http://localhost:5000/api/faculty', {
      email: `anotherprof.${time}@college.edu`,
      employeeId: targetEmpId, // duplicate employee ID!
      firstName: 'Duplicate',
      lastName: 'Teacher',
      departmentId: deptId
    }, adminToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 400 || t5.data.success) {
      throw new Error('Test 5 failed: Duplicate employee ID should be blocked with 400.');
    }
    console.log('✅ Test 5 Passed! Duplicate employee ID blocked correctly.');

    // Test 6: Verify Transaction Rollback (Onboarding with nonexistent department)
    console.log('\nTesting: Transaction Rollback (Onboarding with a non-existent department)...');
    const rollbackEmail = `rollback.prof.${time}@college.edu`;
    const t6 = await postJSON('http://localhost:5000/api/faculty', {
      email: rollbackEmail,
      employeeId: `FAC-EE-F-${time}`,
      firstName: 'Failure',
      lastName: 'Rollback',
      departmentId: 99999 // nonexistent department ID!
    }, adminToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Response:', JSON.stringify(t6.data, null, 2));

    if (t6.statusCode !== 400 || t6.data.success) {
      throw new Error('Test 6 failed: Onboarding with nonexistent department should fail with 400.');
    }

    // Search the database to confirm that the user account 'rollbackEmail' was NOT created
    console.log(`\nVerifying rollback: Checking if user account '${rollbackEmail}' exists in the database...`);
    const checkSql = `SELECT * FROM users WHERE email = ?`;
    
    db.get(checkSql, [rollbackEmail], (dbErr, row) => {
      if (dbErr) {
        console.error('Database query error during verification:', dbErr.message);
        process.exit(1);
      }
      
      console.log('Query Row Result:', row);
      if (row) {
        console.error('❌ ROLLBACK FAILURE: Orphan teacher login account was left behind!');
        process.exit(1);
      } else {
        console.log('✅ TRANSACTION ROLLBACK VERIFIED! No orphan user account was left in the database!');
        console.log('\n🎉 ALL FACULTY ONBOARDING TESTS COMPLETED SUCCESSFULLY!');
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
