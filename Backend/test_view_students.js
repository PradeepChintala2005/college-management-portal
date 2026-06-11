const http = require('http');
const DepartmentModel = require('./src/models/department.model');

// Helper function to send POST requests
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
        resolve({
          statusCode: res.statusCode,
          data: JSON.parse(body)
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

// Helper function to send GET requests with custom headers
function getJSON(url, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'GET',
      headers: {}
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
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated Student Retrieval (View API with SQL JOINs) Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.view.${time}@college.edu`;
    const facultyEmail = `faculty.view.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Preparing test database records ---');

    // A. Create a test department (Computer Science)
    const deptId = await DepartmentModel.create({
      name: `Information Technology ${time}`,
      code: `IT-${time}`,
      description: 'Department of Information Technology'
    });
    console.log(`✅ Test Department created with ID: ${deptId}`);

    // B. Register & Login Admin
    await postJSON('http://localhost:5000/api/auth/register', { email: adminEmail, password, role: 'admin' });
    const adminLogin = await postJSON('http://localhost:5000/api/auth/login', { email: adminEmail, password });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin credentials ready.');

    // C. Register & Login Faculty
    await postJSON('http://localhost:5000/api/auth/register', { email: facultyEmail, password, role: 'faculty' });
    const facultyLogin = await postJSON('http://localhost:5000/api/auth/login', { email: facultyEmail, password });
    const facultyToken = facultyLogin.data.data.token;
    console.log('✅ Faculty credentials ready.');

    // D. Onboard Student A via Admin
    const studentAEmail = `student.a.${time}@college.edu`;
    const studentARoll = `ROLL-A-${time}`;
    const studentAOnboard = await postJSON('http://localhost:5000/api/students', {
      email: studentAEmail,
      password: 'password123',
      rollNumber: studentARoll,
      firstName: 'Alice',
      lastName: 'Adams',
      departmentId: deptId
    }, adminToken);
    const studentAProfileId = studentAOnboard.data.data.studentId;
    console.log(`✅ Student A (Alice) onboarded with Profile ID: ${studentAProfileId}`);

    // E. Onboard Student B via Admin
    const studentBEmail = `student.b.${time}@college.edu`;
    const studentBRoll = `ROLL-B-${time}`;
    const studentBOnboard = await postJSON('http://localhost:5000/api/students', {
      email: studentBEmail,
      password: 'password123',
      rollNumber: studentBRoll,
      firstName: 'Bob',
      lastName: 'Baker',
      departmentId: deptId
    }, adminToken);
    const studentBProfileId = studentBOnboard.data.data.studentId;
    console.log(`✅ Student B (Bob) onboarded with Profile ID: ${studentBProfileId}`);

    // F. Login Student A to get their token
    const studentALogin = await postJSON('http://localhost:5000/api/auth/login', { email: studentAEmail, password: 'password123' });
    const studentAToken = studentALogin.data.data.token;
    console.log('✅ Student A logged in successfully.');

    // G. Login Student B to get their token
    const studentBLogin = await postJSON('http://localhost:5000/api/auth/login', { email: studentBEmail, password: 'password123' });
    const studentBToken = studentBLogin.data.data.token;
    console.log('✅ Student B logged in successfully.');

    // ==========================================
    // 2. VERIFICATION PHASE
    // ==========================================
    console.log('\n--- VERIFICATION PHASE ---');

    // Test 1: Access GET /api/students with NO Token (Should fail with 401)
    console.log('\nTesting: Get all students with NO token...');
    const t1 = await getJSON('http://localhost:5000/api/students');
    console.log(`Status: ${t1.statusCode}`);
    console.log('Response:', JSON.stringify(t1.data, null, 2));
    if (t1.statusCode !== 401 || t1.data.success) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Request blocked correctly.');

    // Test 2: Access GET /api/students with Student A Token (Should fail with 403 - unauthorized role)
    console.log('\nTesting: Get all students with Student A token (Security check)...');
    const t2 = await getJSON('http://localhost:5000/api/students', studentAToken);
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 403 || t2.data.success) {
      throw new Error('Test 2 failed: Student should be blocked from viewing all students.');
    }
    console.log('✅ Test 2 Passed! Student role restricted correctly.');

    // Test 3: Access GET /api/students with Faculty Token (Should succeed with 200 and show list)
    console.log('\nTesting: Get all students with Faculty token (SQL JOIN Check)...');
    const t3 = await getJSON('http://localhost:5000/api/students', facultyToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response Items Count:', t3.data.data.students.length);
    console.log('Sample Student details (SQL JOIN result):', JSON.stringify(t3.data.data.students[t3.data.data.students.length - 1], null, 2));
    if (t3.statusCode !== 200 || !t3.data.success) {
      throw new Error('Test 3 failed: Faculty should retrieve students list successfully.');
    }
    const sample = t3.data.data.students[t3.data.data.students.length - 1];
    if (!sample.email || !sample.department_name || !sample.department_code) {
      throw new Error('Test 3 failed: SQL JOIN details (email, department_name, department_code) are missing!');
    }
    console.log('✅ Test 3 Passed! SQL JOIN retrieved credentials and department details successfully!');

    // Test 4: Access GET /api/students/:id with Student A Token for Student A profile (Should succeed)
    console.log(`\nTesting: Student A accessing THEIR OWN profile (ID: ${studentAProfileId})...`);
    const t4 = await getJSON(`http://localhost:5000/api/students/${studentAProfileId}`, studentAToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 200 || !t4.data.success) {
      throw new Error('Test 4 failed: Student should access their own profile successfully.');
    }
    console.log('✅ Test 4 Passed! Self-profile retrieval authorized.');

    // Test 5: Access GET /api/students/:id with Student A Token for Student B profile (Should fail 403)
    console.log(`\nTesting: Student A attempting to access Student B\'s profile (ID: ${studentBProfileId}) (Security Check)...`);
    const t5 = await getJSON(`http://localhost:5000/api/students/${studentBProfileId}`, studentAToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 403 || t5.data.success) {
      throw new Error('Test 5 failed: Student should be blocked from reading another student\'s profile.');
    }
    console.log('✅ Test 5 Passed! Data-level owner authorization successfully blocked unauthorized access!');

    // Test 6: Access GET /api/students/:id with Faculty Token for Student A profile (Should succeed)
    console.log(`\nTesting: Faculty accessing Student A\'s profile (ID: ${studentAProfileId})...`);
    const t6 = await getJSON(`http://localhost:5000/api/students/${studentAProfileId}`, facultyToken);
    console.log(`Status: ${t6.statusCode}`);
    if (t6.statusCode !== 200 || !t6.data.success) {
      throw new Error('Test 6 failed: Faculty should access any student profile successfully.');
    }
    console.log('✅ Test 6 Passed! Faculty access granted.');

    // Test 7: Access GET /api/students/:id with nonexistent ID
    console.log('\nTesting: Requesting non-existent student ID 999...');
    const t7 = await getJSON('http://localhost:5000/api/students/999', adminToken);
    console.log(`Status: ${t7.statusCode}`);
    console.log('Response:', JSON.stringify(t7.data, null, 2));
    if (t7.statusCode !== 404 || t7.data.success) {
      throw new Error('Test 7 failed: Requesting ghost ID should return 404 Not Found.');
    }
    console.log('✅ Test 7 Passed! 404 Not Found works perfectly.');

    console.log('\n🎉 ALL STUDENT RETRIEVAL & SQL JOIN TESTS PASSED FLAWLESSLY!');

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    process.exit(1);
  }
}

runTests();
