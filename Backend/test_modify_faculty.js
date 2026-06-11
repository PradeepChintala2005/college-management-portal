const http = require('http');
const db = require('./src/database/db');
const DepartmentModel = require('./src/models/department.model');

// Helper function to send requests (POST, PUT, DELETE, GET)
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
  console.log('🧪 Starting Automated Faculty Update & Delete (ACID CRUD) Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.mod.fac.${time}@college.edu`;
    const studentEmail = `student.mod.fac.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Creating test database records ---');

    // A. Create a test department (Chemical Engineering)
    const deptId = await DepartmentModel.create({
      name: `Chemical Engineering ${time}`,
      code: `CH-${time}`,
      description: 'Department of Chemical Engineering'
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

    // D. Onboard Target Faculty member to be updated and deleted
    const targetEmail = `prof.mod.target.${time}@college.edu`;
    const targetEmpId = `FAC-MOD-T-${time}`;
    const onboard1 = await sendJSON('http://localhost:5000/api/faculty', 'POST', {
      email: targetEmail,
      employeeId: targetEmpId,
      firstName: 'Albert',
      lastName: 'Einstein',
      designation: 'Associate Professor',
      departmentId: deptId
    }, adminToken);
    const targetFacultyId = onboard1.data.data.facultyId;
    console.log(`✅ Target Faculty (Albert) onboarded with Profile ID: ${targetFacultyId}`);

    // E. Onboard a Second Faculty member to test duplicate employee ID checks during updates
    const secondEmpId = `FAC-MOD-ALT-${time}`;
    await sendJSON('http://localhost:5000/api/faculty', 'POST', {
      email: `prof.mod.alt.${time}@college.edu`,
      employeeId: secondEmpId,
      firstName: 'Marie',
      lastName: 'Curie',
      designation: 'Professor',
      departmentId: deptId
    }, adminToken);
    console.log('✅ Second faculty member onboarded (to test unique employee ID protection).');

    // ==========================================
    // 2. VERIFICATION PHASE
    // ==========================================
    console.log('\n--- VERIFICATION PHASE ---');

    // Test 1: Access PUT /api/faculty/:id (Update) with NO Token (Should fail with 401)
    console.log('\nTesting: Updating faculty profile with NO token...');
    const t1 = await sendJSON(`http://localhost:5000/api/faculty/${targetFacultyId}`, 'PUT', {
      employeeId: targetEmpId,
      firstName: 'NewAlbert',
      lastName: 'NewEinstein'
    });
    console.log(`Status: ${t1.statusCode}`);
    console.log('Response:', JSON.stringify(t1.data, null, 2));
    if (t1.statusCode !== 401 || t1.data.success) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Request blocked correctly.');

    // Test 2: Access PUT /api/faculty/:id with STUDENT Token (Should fail 403)
    console.log('\nTesting: Updating faculty profile with STUDENT token (Security check)...');
    const t2 = await sendJSON(`http://localhost:5000/api/faculty/${targetFacultyId}`, 'PUT', {
      employeeId: targetEmpId,
      firstName: 'NewAlbert',
      lastName: 'NewEinstein'
    }, studentToken);
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 403 || t2.data.success) {
      throw new Error('Test 2 failed: Student role should be blocked with 403.');
    }
    console.log('✅ Test 2 Passed! Student role blocked correctly.');

    // Test 3: Access PUT /api/faculty/:id with ADMIN Token (Valid Update, Should return 200)
    console.log('\nTesting: Updating faculty profile successfully with ADMIN token...');
    const t3 = await sendJSON(`http://localhost:5000/api/faculty/${targetFacultyId}`, 'PUT', {
      employeeId: targetEmpId,
      firstName: 'Albert (Updated)',
      lastName: 'Einstein (Updated)',
      departmentId: deptId,
      designation: 'Professor & Chair',
      phone: '123-456-7890'
    }, adminToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response:', JSON.stringify(t3.data, null, 2));
    if (t3.statusCode !== 200 || !t3.data.success) {
      throw new Error('Test 3 failed: Admin should update faculty profile successfully.');
    }
    console.log('✅ Test 3 Passed! Faculty profile updated successfully!');

    // Test 4: Access PUT /api/faculty/:id with duplicate Employee ID (Should fail 400)
    console.log('\nTesting: Updating faculty profile to a duplicate Employee ID...');
    const t4 = await sendJSON(`http://localhost:5000/api/faculty/${targetFacultyId}`, 'PUT', {
      employeeId: secondEmpId, // duplicate Employee ID!
      firstName: 'Albert (Updated)',
      lastName: 'Einstein (Updated)',
      departmentId: deptId
    }, adminToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 400 || t4.data.success) {
      throw new Error('Test 4 failed: Duplicate Employee ID update should be blocked with 400.');
    }
    console.log('✅ Test 4 Passed! Duplicate Employee ID blocked correctly.');

    // Test 5: Access DELETE /api/faculty/:id with STUDENT Token (Should fail 403)
    console.log('\nTesting: Deleting faculty with STUDENT token (Security check)...');
    const t5 = await sendJSON(`http://localhost:5000/api/faculty/${targetFacultyId}`, 'DELETE', null, studentToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 403 || t5.data.success) {
      throw new Error('Test 5 failed: Student role should be blocked with 403.');
    }
    console.log('✅ Test 5 Passed! Student blocked from delete route correctly.');

    // Test 6: Access DELETE /api/faculty/:id with ADMIN Token (Valid Delete, Should return 200)
    console.log('\nTesting: Deleting faculty profile successfully with ADMIN token...');
    const t6 = await sendJSON(`http://localhost:5000/api/faculty/${targetFacultyId}`, 'DELETE', null, adminToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Response:', JSON.stringify(t6.data, null, 2));
    if (t6.statusCode !== 200 || !t6.data.success) {
      throw new Error('Test 6 failed: Admin should delete faculty successfully.');
    }
    console.log('✅ Test 6 Passed! Parent user account deleted successfully.');

    // Test 7: Verify Cascading Delete (Check if child faculty profile has been wiped out from DB)
    console.log('\nVerifying Cascading Delete: Checking if faculty profile still exists in faculty table...');
    const checkSql = `SELECT * FROM faculty WHERE id = ?`;
    
    db.get(checkSql, [targetFacultyId], (dbErr, row) => {
      if (dbErr) {
        console.error('Database query error:', dbErr.message);
        process.exit(1);
      }
      
      console.log('Query Row Result (Should be undefined):', row);
      if (row) {
        console.error('❌ CASCADING DELETE FAILURE: Child faculty profile was left behind in the database!');
        db.close();
        process.exit(1);
      } else {
        console.log('✅ CASCADING DELETE VERIFIED! SQLite cleanly wiped the faculty profile via ON DELETE CASCADE!');
        
        // Test 8: Request deleted faculty ID (Should return 404)
        console.log('\nTesting: Requesting profile details of deleted faculty...');
        sendJSON(`http://localhost:5000/api/faculty/${targetFacultyId}`, 'GET', null, adminToken).then((t8) => {
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
