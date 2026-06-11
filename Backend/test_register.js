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
          headers: res.headers,
          data: JSON.parse(body)
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated Registration API Verification...');

  try {
    // 1. Test 1: Register a new student
    console.log('\nTesting: Registering "alice@college.edu" as a Student...');
    const res1 = await postJSON('http://localhost:5000/api/auth/register', {
      email: 'alice@college.edu',
      password: 'password123',
      role: 'student'
    });
    
    console.log(`Status Code: ${res1.statusCode}`);
    console.log('Response Body:', JSON.stringify(res1.data, null, 2));

    if (res1.statusCode !== 201 || !res1.data.success) {
      throw new Error('Test 1 failed: Registration should have returned 201 Success.');
    }
    console.log('✅ Test 1: Successful Registration Passed!');

    // 2. Test 2: Attempt duplicate registration (should fail)
    console.log('\nTesting: Registering "alice@college.edu" again (Duplicate prevention check)...');
    const res2 = await postJSON('http://localhost:5000/api/auth/register', {
      email: 'alice@college.edu',
      password: 'password123',
      role: 'student'
    });

    console.log(`Status Code: ${res2.statusCode}`);
    console.log('Response Body:', JSON.stringify(res2.data, null, 2));

    if (res2.statusCode !== 400 || res2.data.success) {
      throw new Error('Test 2 failed: Duplicate registration should have returned 400 Failure.');
    }
    console.log('✅ Test 2: Duplicate Prevention Check Passed!');

    // 3. Test 3: Validate short password
    console.log('\nTesting: Registering with short password (password < 6 chars)...');
    const res3 = await postJSON('http://localhost:5000/api/auth/register', {
      email: 'bob@college.edu',
      password: '123',
      role: 'faculty'
    });

    console.log(`Status Code: ${res3.statusCode}`);
    console.log('Response Body:', JSON.stringify(res3.data, null, 2));

    if (res3.statusCode !== 400 || res3.data.success) {
      throw new Error('Test 3 failed: Short password should have returned 400 Failure.');
    }
    console.log('✅ Test 3: Password Validation Check Passed!');

    console.log('\n🎉 ALL REGISTRATION API TESTS COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    process.exit(1);
  }
}

// Run the testing suite
runTests();
