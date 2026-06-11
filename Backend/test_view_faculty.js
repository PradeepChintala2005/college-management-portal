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
  console.log('🧪 Starting Automated Faculty Retrieval (View API with SQL JOINs) Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.view.fac.${time}@college.edu`;
    const studentEmail = `student.view.fac.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Preparing test database records ---');

    // A. Create a test department (Electrical Engineering)
    const deptId = await DepartmentModel.create({
      name: `Chemical Engineering ${time}`,
      code: `CH-${time}`,
      description: 'Department of Chemical Engineering'
    });
    console.log(`✅ Test Department created with ID: ${deptId}`);

    // B. Register & Login Admin
    await postJSON('http://localhost:5000/api/auth/register', { email: adminEmail, password, role: 'admin' });
    const adminLogin = await postJSON('http://localhost:5000/api/auth/login', { email: adminEmail, password });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin credentials ready.');

    // C. Register & Login a Student
    await postJSON('http://localhost:5000/api/auth/register', { email: studentEmail, password, role: 'student' });
    const studentLogin = await postJSON('http://localhost:5000/api/auth/login', { email: studentEmail, password });
    const studentToken = studentLogin.data.data.token;
    console.log('✅ Student credentials ready.');

    // D. Onboard Faculty A via Admin
    const facultyAEmail = `prof.a.${time}@college.edu`;
    const facultyAEmpId = `FAC-CH-A-${time}`;
    const onboardA = await postJSON('http://localhost:5000/api/faculty', {
      email: facultyAEmail,
      password: 'password123',
      employeeId: facultyAEmpId,
      firstName: 'Albert',
      lastName: 'Einstein',
      designation: 'Professor',
      departmentId: deptId
    }, adminToken);
    const facultyAProfileId = onboardA.data.data.facultyId;
    console.log(`✅ Faculty A (Albert) onboarded with Profile ID: ${facultyAProfileId}`);

    // E. Onboard Faculty B via Admin
    const facultyBEmail = `prof.b.${time}@college.edu`;
    const facultyBEmpId = `FAC-CH-B-${time}`;
    const onboardB = await postJSON('http://localhost:5000/api/faculty', {
      email: facultyBEmail,
      password: 'password123',
      employeeId: facultyBEmpId,
      firstName: 'Marie',
      lastName: 'Curie',
      designation: 'Professor',
      departmentId: deptId
    }, adminToken);
    const facultyBProfileId = onboardB.data.data.facultyId;
    console.log(`✅ Faculty B (Marie) onboarded with Profile ID: ${facultyBProfileId}`);

    // F. Login Faculty A to get their token
    const facultyALogin = await postJSON('http://localhost:5000/api/auth/login', { email: facultyAEmail, password: 'password123' });
    const facultyAToken = facultyALogin.data.data.token;
    console.log('✅ Faculty A logged in successfully.');

    // ==========================================
    // 2. VERIFICATION PHASE
    // ==========================================
    console.log('\n--- VERIFICATION PHASE ---');

    // Test 1: Access GET /api/faculty with NO Token (Should fail with 401)
    console.log('\nTesting: Get all faculty with NO token...');
    const t1 = await getJSON('http://localhost:5000/api/faculty');
    console.log(`Status: ${t1.statusCode}`);
    console.log('Response:', JSON.stringify(t1.data, null, 2));
    if (t1.statusCode !== 401 || t1.data.success) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Request blocked correctly.');

    // Test 2: Access GET /api/faculty with Student Token (Should fail with 403 - unauthorized role)
    console.log('\nTesting: Get all faculty with Student token (Security check)...');
    const t2 = await getJSON('http://localhost:5000/api/faculty', studentToken);
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 403 || t2.data.success) {
      throw new Error('Test 2 failed: Student should be blocked from viewing faculty directory.');
    }
    console.log('✅ Test 2 Passed! Student role blocked correctly.');

    // Test 3: Access GET /api/faculty with Faculty A Token (Should succeed with 200 and show list)
    console.log('\nTesting: Get all faculty with Faculty A token (SQL JOIN Check)...');
    const t3 = await getJSON('http://localhost:5000/api/faculty', facultyAToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response Items Count:', t3.data.data.faculty.length);
    console.log('Sample Faculty details (SQL JOIN result):', JSON.stringify(t3.data.data.faculty[t3.data.data.faculty.length - 1], null, 2));
    if (t3.statusCode !== 200 || !t3.data.success) {
      throw new Error('Test 3 failed: Faculty should retrieve faculty list successfully.');
    }
    const sample = t3.data.data.faculty[t3.data.data.faculty.length - 1];
    if (!sample.email || !sample.department_name || !sample.department_code) {
      throw new Error('Test 3 failed: SQL JOIN details (email, department_name, department_code) are missing!');
    }
    console.log('✅ Test 3 Passed! SQL JOIN retrieved credentials and department details successfully!');

    // Test 4: Access GET /api/faculty/:id with Student Token (Should fail 403)
    console.log(`\nTesting: Student attempting to access Faculty A\'s profile (ID: ${facultyAProfileId}) (Security Check)...`);
    const t4 = await getJSON(`http://localhost:5000/api/faculty/${facultyAProfileId}`, studentToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 403 || t4.data.success) {
      throw new Error('Test 4 failed: Student should be blocked from reading faculty details.');
    }
    console.log('✅ Test 4 Passed! Student blocked correctly.');

    // Test 5: Access GET /api/faculty/:id with Faculty A Token for Faculty B profile (Should succeed)
    console.log(`\nTesting: Faculty A accessing Faculty B\'s profile (ID: ${facultyBProfileId})...`);
    const t5 = await getJSON(`http://localhost:5000/api/faculty/${facultyBProfileId}`, facultyAToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 200 || !t5.data.success) {
      throw new Error('Test 5 failed: Faculty should access any other teacher profile successfully.');
    }
    console.log('✅ Test 5 Passed! Teacher detail retrieval authorized.');

    // Test 6: Access GET /api/faculty/:id with nonexistent ID (Should return 404)
    console.log('\nTesting: Requesting non-existent faculty ID 999...');
    const t6 = await getJSON('http://localhost:5000/api/faculty/999', adminToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Response:', JSON.stringify(t6.data, null, 2));
    if (t6.statusCode !== 404 || t6.data.success) {
      throw new Error('Test 6 failed: Requesting ghost ID should return 404 Not Found.');
    }
    console.log('✅ Test 6 Passed! 404 Not Found works perfectly.');

    console.log('\n🎉 ALL FACULTY RETRIEVAL & SQL JOIN TESTS PASSED FLAWLESSLY!');

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    process.exit(1);
  }
}

runTests();
