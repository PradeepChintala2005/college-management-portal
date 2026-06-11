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
  console.log('🧪 Starting Automated Authentication (Login + JWT) Verification...');

  try {
    const testEmail = `charlie.${Date.now()}@college.edu`; // Dynamic email to avoid duplicate error on multiple runs!
    const testPassword = 'securepassword123';

    // 1. Step 1: Register the new test user
    console.log(`\nTesting: Registering dynamic user: "${testEmail}"...`);
    const regRes = await postJSON('http://localhost:5000/api/auth/register', {
      email: testEmail,
      password: testPassword,
      role: 'faculty'
    });
    
    console.log(`Status Code: ${regRes.statusCode}`);
    console.log('Response:', JSON.stringify(regRes.data, null, 2));

    if (regRes.statusCode !== 201 || !regRes.data.success) {
      throw new Error('Test failed: User registration should have returned 201.');
    }
    console.log('✅ User registered successfully!');

    // 2. Step 2: Test Successful Login with CORRECT credentials
    console.log(`\nTesting: Logging in with CORRECT password...`);
    const loginRes1 = await postJSON('http://localhost:5000/api/auth/login', {
      email: testEmail,
      password: testPassword
    });

    console.log(`Status Code: ${loginRes1.statusCode}`);
    console.log('Response:', JSON.stringify(loginRes1.data, null, 2));

    if (loginRes1.statusCode !== 200 || !loginRes1.data.success) {
      throw new Error('Test failed: Login should have returned 200 Success.');
    }
    if (!loginRes1.data.data.token) {
      throw new Error('Test failed: JWT Token is missing in response payload!');
    }
    console.log('✅ Successful Login Check Passed! JWT Token received!');

    // 3. Step 3: Test Login failure with WRONG password
    console.log(`\nTesting: Logging in with WRONG password...`);
    const loginRes2 = await postJSON('http://localhost:5000/api/auth/login', {
      email: testEmail,
      password: 'wrongpassword!!!'
    });

    console.log(`Status Code: ${loginRes2.statusCode}`);
    console.log('Response:', JSON.stringify(loginRes2.data, null, 2));

    if (loginRes2.statusCode !== 401 || loginRes2.data.success) {
      throw new Error('Test failed: Mismatched password should have returned 401 Unauthorized.');
    }
    if (loginRes2.data.message !== 'Invalid email or password.') {
      throw new Error('Test failed: Generic error message was not returned.');
    }
    console.log('✅ Incorrect Password Check Passed! Request blocked correctly.');

    // 4. Step 4: Test Login failure with NON-EXISTING email (Security Check)
    console.log(`\nTesting: Logging in with NON-EXISTING email (Security check)...`);
    const loginRes3 = await postJSON('http://localhost:5000/api/auth/login', {
      email: 'nonexistent.ghost.user@college.edu',
      password: 'somepassword'
    });

    console.log(`Status Code: ${loginRes3.statusCode}`);
    console.log('Response:', JSON.stringify(loginRes3.data, null, 2));

    if (loginRes3.statusCode !== 401 || loginRes3.data.success) {
      throw new Error('Test failed: Ghost email should have returned 401 Unauthorized.');
    }
    if (loginRes3.data.message !== 'Invalid email or password.') {
      throw new Error('Test failed: Error message leaked email existence check details.');
    }
    console.log('✅ Email Harvesting Security Check Passed! generic error returned.');

    console.log('\n🎉 ALL LOGIN & JWT API TESTS PASSED FLAWLESSLY!');
    
  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    process.exit(1);
  }
}

// Run the testing suite
runTests();
