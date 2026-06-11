const http = require('http');
const db = require('./src/database/db');
const DepartmentModel = require('./src/models/department.model');

// Helper function to send requests (POST, PUT, DELETE)
function sendJSON(url, method, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: method,
      headers: {}
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

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
    if (data) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated Student Update & Delete (ACID CRUD) Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.mod.${time}@college.edu`;
    const studentEmail = `student.mod.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Creating test database records ---');

    // A. Create test departments
    const deptId = await DepartmentModel.create({
      name: `Mechanical Engineering ${time}`,
      code: `ME-${time}`,
      description: 'Department of Mechanical Engineering'
    });
    console.log(`✅ Test Department created with ID: ${deptId}`);

    // B. Register & Login Admin
    await sendJSON('http://localhost:5000/api/auth/register', 'POST', { email: adminEmail, password, role: 'admin' });
    const adminLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: adminEmail, password });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin credentials ready.');

    // C. Register & Login a Student (to test role blockages)
    await sendJSON('http://localhost:5000/api/auth/register', 'POST', { email: studentEmail, password, role: 'student' });
    const studentLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: studentEmail, password });
    const studentToken = studentLogin.data.data.token;
    console.log('✅ Student credentials ready.');

    // D. Onboard Target Student to be updated and deleted
    const targetEmail = `target.${time}@college.edu`;
    const targetRoll = `ROLL-X-${time}`;
    const onboard1 = await sendJSON('http://localhost:5000/api/students', 'POST', {
      email: targetEmail,
      rollNumber: targetRoll,
      firstName: 'OriginalName',
      lastName: 'OriginalLastName',
      departmentId: deptId
    }, adminToken);
    const targetStudentId = onboard1.data.data.studentId;
    console.log(`✅ Target Student (OriginalName) onboarded with ID: ${targetStudentId}`);

    // E. Onboard a Second Student to test duplicate roll number checks during updates
    const secondRoll = `ROLL-Y-${time}`;
    await sendJSON('http://localhost:5000/api/students', 'POST', {
      email: `another.${time}@college.edu`,
      rollNumber: secondRoll,
      firstName: 'SecondName',
      lastName: 'SecondLastName',
      departmentId: deptId
    }, adminToken);
    console.log('✅ Second student onboarded (to test unique roll protection).');

    // ==========================================
    // 2. VERIFICATION PHASE
    // ==========================================
    console.log('\n--- VERIFICATION PHASE ---');

    // Test 1: Access PUT /api/students/:id (Update) with NO Token (Should fail with 401)
    console.log('\nTesting: Updating student profile with NO token...');
    const t1 = await sendJSON(`http://localhost:5000/api/students/${targetStudentId}`, 'PUT', {
      rollNumber: targetRoll,
      firstName: 'NewName',
      lastName: 'NewLastName'
    });
    console.log(`Status: ${t1.statusCode}`);
    console.log('Response:', JSON.stringify(t1.data, null, 2));
    if (t1.statusCode !== 401 || t1.data.success) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Request blocked correctly.');

    // Test 2: Access PUT /api/students/:id with STUDENT Token (Should fail 403)
    console.log('\nTesting: Updating student profile with STUDENT token (Security check)...');
    const t2 = await sendJSON(`http://localhost:5000/api/students/${targetStudentId}`, 'PUT', {
      rollNumber: targetRoll,
      firstName: 'NewName',
      lastName: 'NewLastName'
    }, studentToken);
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 403 || t2.data.success) {
      throw new Error('Test 2 failed: Student role should be blocked with 403.');
    }
    console.log('✅ Test 2 Passed! Student role blocked correctly.');

    // Test 3: Access PUT /api/students/:id with ADMIN Token (Valid Update, Should return 200)
    console.log('\nTesting: Updating student profile successfully with ADMIN token...');
    const t3 = await sendJSON(`http://localhost:5000/api/students/${targetStudentId}`, 'PUT', {
      rollNumber: targetRoll,
      firstName: 'UpdatedName',
      lastName: 'UpdatedLastName',
      departmentId: deptId,
      phone: '999-888-7777',
      dateOfBirth: '2004-12-05'
    }, adminToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response:', JSON.stringify(t3.data, null, 2));
    if (t3.statusCode !== 200 || !t3.data.success) {
      throw new Error('Test 3 failed: Admin should update student successfully.');
    }
    console.log('✅ Test 3 Passed! Student profile updated successfully!');

    // Test 4: Access PUT /api/students/:id with duplicate ROLL number (Should fail 400)
    console.log('\nTesting: Updating student profile to a duplicate ROLL number...');
    const t4 = await sendJSON(`http://localhost:5000/api/students/${targetStudentId}`, 'PUT', {
      rollNumber: secondRoll, // duplicate roll number!
      firstName: 'UpdatedName',
      lastName: 'UpdatedLastName',
      departmentId: deptId
    }, adminToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 400 || t4.data.success) {
      throw new Error('Test 4 failed: Duplicate roll number update should be blocked with 400.');
    }
    console.log('✅ Test 4 Passed! Duplicate roll number blocked correctly.');

    // Test 5: Access DELETE /api/students/:id with STUDENT Token (Should fail 403)
    console.log('\nTesting: Deleting student with STUDENT token (Security check)...');
    const t5 = await sendJSON(`http://localhost:5000/api/students/${targetStudentId}`, 'DELETE', null, studentToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 403 || t5.data.success) {
      throw new Error('Test 5 failed: Student role should be blocked with 403.');
    }
    console.log('✅ Test 5 Passed! Student blocked from delete route correctly.');

    // Test 6: Access DELETE /api/students/:id with ADMIN Token (Valid Delete, Should return 200)
    console.log('\nTesting: Deleting student profile successfully with ADMIN token...');
    const t6 = await sendJSON(`http://localhost:5000/api/students/${targetStudentId}`, 'DELETE', null, adminToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Response:', JSON.stringify(t6.data, null, 2));
    if (t6.statusCode !== 200 || !t6.data.success) {
      throw new Error('Test 6 failed: Admin should delete student successfully.');
    }
    console.log('✅ Test 6 Passed! Parent user account deleted successfully.');

    // Test 7: Verify Cascading Delete (Check if child student profile has been wiped out from DB)
    console.log('\nVerifying Cascading Delete: Checking if student profile still exists in students table...');
    const checkSql = `SELECT * FROM students WHERE id = ?`;
    
    db.get(checkSql, [targetStudentId], (dbErr, row) => {
      if (dbErr) {
        console.error('Database query error:', dbErr.message);
        process.exit(1);
      }
      
      console.log('Query Row Result (Should be undefined):', row);
      if (row) {
        console.error('❌ CASCADING DELETE FAILURE: Child student profile was left behind in the database!');
        db.close();
        process.exit(1);
      } else {
        console.log('✅ CASCADING DELETE VERIFIED! SQLite cleanly wiped the student profile via ON DELETE CASCADE!');
        
        // Test 8: Request deleted student ID (Should return 404)
        console.log('\nTesting: Requesting profile details of deleted student...');
        sendJSON(`http://localhost:5000/api/students/${targetStudentId}`, 'GET', null, adminToken).then((t8) => {
          console.log(`Status: ${t8.statusCode}`);
          console.log('Response:', JSON.stringify(t8.data, null, 2));
          if (t8.statusCode !== 404) {
            console.error('❌ Test 8 failed: Requesting deleted ID should have returned 404.');
            process.exit(1);
          }
          console.log('✅ Test 8 Passed! Deleted ID returns clean 404.');
          console.log('\n🎉 ALL UPDATE, DELETE, AND CASCADING RELATIONAL TESTS PASSED SUCCESSFULLY!');
          db.close();
        });
      }
    });

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    db.close();
    process.exit(1);
  }
}

runTests();
