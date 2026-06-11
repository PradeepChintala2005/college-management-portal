const http = require('http');
const { fork } = require('child_process');

const testFiles = [
  'test_auth.js',
  'test_students.js',
  'test_faculty.js',
  'test_academics.js',
  'test_enrollments.js',
  'test_attendance.js',
  'test_marks.js',
  'test_coursework.js',
  'test_announcements.js'
];

// Helper to check if the server is online on port 5000
function checkServerOnline() {
  return new Promise((resolve) => {
    http.get('http://localhost:5000/status', (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Helper to spawn a node script as a child process and return its exit code
function runTestFile(fileName) {
  return new Promise((resolve) => {
    console.log(`\n==================================================`);
    console.log(`🚀 SPARKING TEST MODULE: ${fileName}`);
    console.log(`==================================================`);

    // Fork creates a clean isolated Node process running the target script
    const child = fork(fileName, [], { stdio: 'inherit' });

    child.on('close', (code) => {
      resolve(code);
    });
  });
}

async function startTestSuite() {
  console.log('🧪 INITIALIZING MASTER API INTEGRATION TEST SUITE RUNNER...');

  // 1. Verify that server is running
  const isOnline = await checkServerOnline();
  if (!isOnline) {
    console.error('\n❌ ERROR: Backend API server is offline!');
    console.error('👉 Make sure to run the server first: "node server.js" before executing the tests.\n');
    process.exit(1);
  }
  console.log('✅ API Server detected online at http://localhost:5000');

  const results = {};
  let passedCount = 0;

  // 2. Run all tests sequentially
  for (const file of testFiles) {
    const exitCode = await runTestFile(file);
    if (exitCode === 0) {
      results[file] = 'PASS';
      passedCount++;
    } else {
      results[file] = 'FAIL';
    }
  }

  // 3. Output Final Summary Report
  console.log('\n==================================================');
  console.log('📊 COLLEGE PORTAL BACKEND TEST RUNNER SUMMARY');
  console.log('==================================================');
  
  for (const file of testFiles) {
    const status = results[file];
    const dots = '.'.repeat(30 - file.length);
    const colorStatus = status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`${file} ${dots} ${colorStatus}`);
  }

  console.log('==================================================');
  console.log(`Result: ${passedCount} / ${testFiles.length} Test Suites Passed.`);
  console.log('==================================================\n');

  if (passedCount === testFiles.length) {
    console.log('🎉 SYSTEM READY FOR PRODUCTION! ALL VERIFICATIONS ARE GREEN.');
    process.exit(0);
  } else {
    console.error('💥 SYSTEM HAS FAILING TEST SUITES. UNHEALTHY BUILD.');
    process.exit(1);
  }
}

startTestSuite();
