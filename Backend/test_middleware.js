const http = require('http');

// Helper function to send POST requests
function postJSON(url, data) {
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
  console.log('🧪 Starting Automated Middleware & JWT Verification tests...');

  try {
    const time = Date.now();
    const studentEmail = `student.${time}@college.edu`;
    const adminEmail = `admin.${time}@college.edu`;
    const password = 'password123';

    // 1. Setup Phase: Onboard a Student and an Admin
    console.log('\n--- SETUP PHASE: Registering accounts ---');
    await postJSON('http://localhost:5000/api/auth/register', { email: studentEmail, password, role: 'student' });
    const studentLogin = await postJSON('http://localhost:5000/api/auth/login', { email: studentEmail, password });
    const studentToken = studentLogin.data.data.token;
    console.log('✅ Student onboarded and logged in.');

    await postJSON('http://localhost:5000/api/auth/register', { email: adminEmail, password, role: 'admin' });
    const adminLogin = await postJSON('http://localhost:5000/api/auth/login', { email: adminEmail, password });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin onboarded and logged in.');

    console.log('\n--- VERIFICATION PHASE ---');

    // 2. Test 1: Access /profile with NO Token (Should return 401)
    console.log('\nTesting: Accessing /profile with NO authentication token...');
    const t1 = await getJSON('http://localhost:5000/api/auth/profile');
    console.log(`Status: ${t1.statusCode}`);
    console.log('Response:', JSON.stringify(t1.data, null, 2));
    if (t1.statusCode !== 401 || t1.data.success) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Request blocked correctly.');

    // 3. Test 2: Access /profile with INVALID Token (Should return 401)
    console.log('\nTesting: Accessing /profile with INVALID token ("Bearer forged-token-abc")...');
    const t2 = await getJSON('http://localhost:5000/api/auth/profile', 'forged-token-abc');
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 401 || t2.data.success) {
      throw new Error('Test 2 failed: Request with faked token should be blocked with 401.');
    }
    console.log('✅ Test 2 Passed! Forged token blocked correctly.');

    // 4. Test 3: Access /profile with VALID Student Token (Should return 200)
    console.log('\nTesting: Accessing /profile with VALID Student token...');
    const t3 = await getJSON('http://localhost:5000/api/auth/profile', studentToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response:', JSON.stringify(t3.data, null, 2));
    if (t3.statusCode !== 200 || !t3.data.success) {
      throw new Error('Test 3 failed: Valid token should retrieve user profile successfully.');
    }
    if (t3.data.data.user.email !== studentEmail || t3.data.data.user.role !== 'student') {
      throw new Error('Test 3 failed: Decoded req.user metadata is incorrect.');
    }
    console.log('✅ Test 3 Passed! Profile retrieved successfully.');

    // 5. Test 4: Access Admin-Only route with Student Token (Should return 403 Forbidden)
    console.log('\nTesting: Accessing /admin-only with STUDENT token (RBAC Check)...');
    const t4 = await getJSON('http://localhost:5000/api/auth/admin-only', studentToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 403 || t4.data.success) {
      throw new Error('Test 4 failed: Student should be blocked with 403 from admin routes.');
    }
    console.log('✅ Test 4 Passed! Student blocked from admin route correctly (RBAC Active).');

    // 6. Test 5: Access Admin-Only route with Admin Token (Should return 200 OK)
    console.log('\nTesting: Accessing /admin-only with ADMIN token (RBAC Check)...');
    const t5 = await getJSON('http://localhost:5000/api/auth/admin-only', adminToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 200 || !t5.data.success) {
      throw new Error('Test 5 failed: Admin should access /admin-only successfully.');
    }
    console.log('✅ Test 5 Passed! Admin access granted successfully.');

    console.log('\n🎉 ALL MIDDLEWARE & ROLE-BASED ACCESS CONTROL TESTS PASSED SUCCESSFULLY!');

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    process.exit(1);
  }
}

runTests();
