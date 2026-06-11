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
  console.log('🧪 Starting Automated Attendance Management (Phase 8 CRUD & QR) Integration Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.att.${time}@college.edu`;
    const studentAEmail = `student.a.att.${time}@college.edu`;
    const studentBEmail = `student.b.att.${time}@college.edu`;
    const facultyEmail = `prof.att.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Preparing test database records ---');

    // A. Create test department (CSE)
    const deptId = await DepartmentModel.create({
      name: `Computer Science & Engineering ${time}`,
      code: `CSE-${time}`,
      description: 'Department of Computer Science & Engineering'
    });
    console.log(`✅ Test Department created with ID: ${deptId}`);

    // B. Register & Login Admin
    await sendJSON('http://localhost:5000/api/auth/register', 'POST', { email: adminEmail, password, role: 'admin' });
    const adminLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: adminEmail, password });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin credentials ready.');

    // C. Onboard Student A and Student B via Admin
    const onboardA = await sendJSON('http://localhost:5000/api/students', 'POST', {
      email: studentAEmail,
      password: password,
      rollNumber: `ROLL-A-${time}`,
      firstName: 'Alice',
      lastName: 'Smith',
      departmentId: deptId
    }, adminToken);
    const studentAProfileId = onboardA.data.data.studentId;
    console.log(`✅ Student A (Alice) onboarded with Profile ID: ${studentAProfileId}`);

    const onboardB = await sendJSON('http://localhost:5000/api/students', 'POST', {
      email: studentBEmail,
      password: password,
      rollNumber: `ROLL-B-${time}`,
      firstName: 'Bob',
      lastName: 'Jones',
      departmentId: deptId
    }, adminToken);
    const studentBProfileId = onboardB.data.data.studentId;
    console.log(`✅ Student B (Bob) onboarded with Profile ID: ${studentBProfileId}`);

    // D. Onboard Faculty member via Admin
    const facultyOnboard = await sendJSON('http://localhost:5000/api/faculty', 'POST', {
      email: facultyEmail,
      password: password,
      employeeId: `FAC-ATT-${time}`,
      firstName: 'Richard',
      lastName: 'Feynman',
      designation: 'Professor',
      departmentId: deptId
    }, adminToken);
    const facultyProfileId = facultyOnboard.data.data.facultyId;
    console.log(`✅ Faculty member onboarded with Profile ID: ${facultyProfileId}`);

    // E. Retrieve tokens for Student A, Student B, and Faculty
    const studentALogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: studentAEmail, password });
    const studentAToken = studentALogin.data.data.token;
    console.log('✅ Student A logged in successfully.');

    const studentBLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: studentBEmail, password });
    const studentBToken = studentBLogin.data.data.token;
    console.log('✅ Student B logged in successfully.');

    const facultyLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: facultyEmail, password });
    const facultyToken = facultyLogin.data.data.token;
    console.log('✅ Faculty logged in successfully.');

    // F. Create Course & Class Section
    const courseOnboard = await sendJSON('http://localhost:5000/api/courses', 'POST', {
      departmentId: deptId,
      courseCode: `CS-301-${time}`,
      title: 'Database Management Systems',
      credits: 4
    }, adminToken);
    const courseId = courseOnboard.data.data.courseId;
    console.log(`✅ Course created with ID: ${courseId}`);

    const sectionOnboard = await sendJSON('http://localhost:5000/api/sections', 'POST', {
      courseId: courseId,
      facultyId: facultyProfileId,
      sectionName: 'Section-A',
      semester: 'Spring 2026'
    }, adminToken);
    const classSectionId = sectionOnboard.data.data.sectionId;
    console.log(`✅ Class Section created with ID: ${classSectionId}`);

    // G. Enroll Student A into the Section (Leave Student B not enrolled to test validation blocks!)
    await sendJSON('http://localhost:5000/api/enrollments', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId
    }, adminToken);
    console.log('✅ Student A enrolled in the class section.');

    // ==========================================
    // 2. VERIFICATION PHASE: Session Scheduling & RBAC
    // ==========================================
    console.log('\n--- VERIFICATION PHASE A: Session Scheduling & RBAC ---');

    // Test 1: Create Session without Token (401)
    console.log('\nTesting 1: Creating session with NO token...');
    const t1 = await sendJSON('http://localhost:5000/api/attendance/session', 'POST', {
      classSectionId: classSectionId,
      sessionDate: '2026-06-03'
    });
    console.log(`Status: ${t1.statusCode}`);
    if (t1.statusCode !== 401) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Blocked correctly.');

    // Test 2: Create Session as Student A (403)
    console.log('\nTesting 2: Creating session with STUDENT token (RBAC check)...');
    const t2 = await sendJSON('http://localhost:5000/api/attendance/session', 'POST', {
      classSectionId: classSectionId,
      sessionDate: '2026-06-03'
    }, studentAToken);
    console.log(`Status: ${t2.statusCode}`);
    if (t2.statusCode !== 403) {
      throw new Error('Test 2 failed: Student role should be blocked with 403.');
    }
    console.log('✅ Test 2 Passed! Student blocked correctly.');

    // Test 3: Create Session as Faculty (Manual) (Should succeed 201)
    console.log('\nTesting 3: Creating MANUAL attendance session with FACULTY token...');
    const t3 = await sendJSON('http://localhost:5000/api/attendance/session', 'POST', {
      classSectionId: classSectionId,
      sessionDate: '2026-06-03'
    }, facultyToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response:', JSON.stringify(t3.data, null, 2));
    if (t3.statusCode !== 201 || !t3.data.success) {
      throw new Error('Test 3 failed: Faculty should create manual session successfully.');
    }
    const manualSessionId = t3.data.data.sessionId;
    console.log(`✅ Test 3 Passed! Manual Session created with ID: ${manualSessionId}`);

    // Test 4: Create Session as Faculty (QR Enabled, 5 mins window) (Should succeed 201)
    console.log('\nTesting 4: Creating QR attendance session with FACULTY token...');
    const t4 = await sendJSON('http://localhost:5000/api/attendance/session', 'POST', {
      classSectionId: classSectionId,
      sessionDate: '2026-06-03',
      generateQR: true,
      expiresInMinutes: 5
    }, facultyToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 201 || !t4.data.success) {
      throw new Error('Test 4 failed: Faculty should create QR session successfully.');
    }
    const qrSessionId = t4.data.data.sessionId;
    const activeQrToken = t4.data.data.qrCodeToken;
    console.log(`✅ Test 4 Passed! QR Session created with ID: ${qrSessionId}, Token: ${activeQrToken}`);

    // ==========================================
    // 3. VERIFICATION PHASE: Manual Markings
    // ==========================================
    console.log('\n--- VERIFICATION PHASE B: Manual Attendance Entries ---');

    // Test 5: Mark manual as Student (403)
    console.log('\nTesting 5: Student A attempting to mark Student B manually (RBAC check)...');
    const t5 = await sendJSON('http://localhost:5000/api/attendance/mark', 'POST', {
      sessionId: manualSessionId,
      studentId: studentBProfileId,
      status: 'Present'
    }, studentAToken);
    console.log(`Status: ${t5.statusCode}`);
    if (t5.statusCode !== 403) {
      throw new Error('Test 5 failed: Student should be blocked from marking manual records.');
    }
    console.log('✅ Test 5 Passed! Student blocked correctly.');

    // Test 6: Faculty marks Student A manual check-in (Present) (Should succeed 200)
    console.log('\nTesting 6: Faculty manually marking Student A (Alice) as Present...');
    const t6 = await sendJSON('http://localhost:5000/api/attendance/mark', 'POST', {
      sessionId: manualSessionId,
      studentId: studentAProfileId,
      status: 'Present'
    }, facultyToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Response:', JSON.stringify(t6.data, null, 2));
    if (t6.statusCode !== 200 || !t6.data.success) {
      throw new Error('Test 6 failed: Faculty should manually mark student successfully.');
    }
    console.log('✅ Test 6 Passed! Manual entry saved.');

    // Test 7: Faculty marks Student B manual check-in (not enrolled) (Should fail 400)
    console.log('\nTesting 7: Faculty manually marking Student B (Bob - Not Enrolled) as Present...');
    const t7 = await sendJSON('http://localhost:5000/api/attendance/mark', 'POST', {
      sessionId: manualSessionId,
      studentId: studentBProfileId,
      status: 'Present'
    }, facultyToken);
    console.log(`Status: ${t7.statusCode}`);
    console.log('Response:', JSON.stringify(t7.data, null, 2));
    if (t7.statusCode !== 400 || t7.data.success) {
      throw new Error('Test 7 failed: Attempt to mark non-enrolled student should be rejected.');
    }
    console.log('✅ Test 7 Passed! Non-enrolled manual marking rejected correctly.');

    // ==========================================
    // 4. VERIFICATION PHASE: QR Self Check-ins
    // ==========================================
    console.log('\n--- VERIFICATION PHASE C: QR self check-in validation gates ---');

    // Test 8: Student A check-in with valid active QR token (Should succeed 200)
    console.log('\nTesting 8: Student A self-checking in via scan of active QR token...');
    const t8 = await sendJSON('http://localhost:5000/api/attendance/check-in', 'POST', {
      qrCodeToken: activeQrToken
    }, studentAToken);
    console.log(`Status: ${t8.statusCode}`);
    console.log('Response:', JSON.stringify(t8.data, null, 2));
    if (t8.statusCode !== 200 || !t8.data.success) {
      throw new Error('Test 8 failed: Student A should scan and check in successfully.');
    }
    console.log('✅ Test 8 Passed! Self check-in verified.');

    // Test 9: Student B check-in with valid active QR token (not enrolled) (Should fail 403)
    console.log('\nTesting 9: Student B self-checking in via scan of active QR token (Not Enrolled)...');
    const t9 = await sendJSON('http://localhost:5000/api/attendance/check-in', 'POST', {
      qrCodeToken: activeQrToken
    }, studentBToken);
    console.log(`Status: ${t9.statusCode}`);
    console.log('Response:', JSON.stringify(t9.data, null, 2));
    if (t9.statusCode !== 403 || t9.data.success) {
      throw new Error('Test 9 failed: Student B scan should be blocked since not enrolled.');
    }
    console.log('✅ Test 9 Passed! Non-enrolled self scan blocked correctly.');

    // Test 10: QR Self Check-in with Expired Token (Should fail 400)
    console.log('\nTesting 10: Injecting expired token and testing check-in...');
    const expiredToken = `EXPIRED-TOKEN-${time}`;
    // Insert directly to database mock expired session
    const expiredTimestamp = new Date(Date.now() - 10000).toISOString(); // 10 seconds in the past!
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO attendance_sessions (class_section_id, session_date, qr_code_token, token_expires_at)
         VALUES (?, ?, ?, ?)`,
        [classSectionId, '2026-06-03', expiredToken, expiredTimestamp],
        function (err) {
          if (err) return reject(err);
          console.log(`✅ Expired session mock injected with ID: ${this.lastID}`);
          resolve();
        }
      );
    });

    // Student A tries to scan the expired QR code
    const t10 = await sendJSON('http://localhost:5000/api/attendance/check-in', 'POST', {
      qrCodeToken: expiredToken
    }, studentAToken);
    console.log(`Status: ${t10.statusCode}`);
    console.log('Response:', JSON.stringify(t10.data, null, 2));
    if (t10.statusCode !== 400 || t10.data.success) {
      throw new Error('Test 10 failed: Expired QR token check-in must be rejected.');
    }
    console.log('✅ Test 10 Passed! Expired QR scan rejected correctly.');

    // ==========================================
    // 5. VERIFICATION PHASE: Fetch Stats Reports
    // ==========================================
    console.log('\n--- VERIFICATION PHASE D: Fetch reports sheets & stats logs ---');

    // Test 11: Get Student AStats (Present = 2, total = 3 (since manual session marked, QR session marked, and expired session not marked, wait! Manual present + QR present = 2 present. Expired was not marked so total marked is 2).
    console.log('\nTesting 11: Fetching Student A attendance schedule stats logs...');
    const t11 = await sendJSON(`http://localhost:5000/api/attendance/student/${studentAProfileId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t11.statusCode}`);
    console.log('Response:', JSON.stringify(t11.data, null, 2));
    if (t11.statusCode !== 200 || !t11.data.success) {
      throw new Error('Test 11 failed: Student A stats retrieval failed.');
    }
    if (t11.data.data.statistics.percentage !== 100.0) {
      throw new Error('Test 11 failed: Student A has 2 presents out of 2 logs. Percentage should be 100%.');
    }
    console.log('✅ Test 11 Passed! Individual student metrics retrieved successfully.');

    // Test 12: Get Section Roster Stats Spreadsheet
    console.log('\nTesting 12: Fetching Section roster spreadsheet stats...');
    const t12 = await sendJSON(`http://localhost:5000/api/attendance/section/${classSectionId}`, 'GET', null, facultyToken);
    console.log(`Status: ${t12.statusCode}`);
    console.log('Response:', JSON.stringify(t12.data, null, 2));
    if (t12.statusCode !== 200 || !t12.data.success) {
      throw new Error('Test 12 failed: Section stats retrieval failed.');
    }
    const targetStudentRow = t12.data.data.sheet.find(s => s.student_id === studentAProfileId);
    if (!targetStudentRow || targetStudentRow.present_count !== 2 || targetStudentRow.total_sessions !== 3) {
      throw new Error('Test 12 failed: Roster statistics did not match database records count!');
    }
    console.log('✅ Test 12 Passed! Class Section roster spreadsheet generated accurately.');

    // Test 13: Student attempts to fetch section stats spreadsheet (Should fail 403)
    console.log('\nTesting 13: Student A attempting to fetch section stats report...');
    const t13 = await sendJSON(`http://localhost:5000/api/attendance/section/${classSectionId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t13.statusCode}`);
    if (t13.statusCode !== 403) {
      throw new Error('Test 13 failed: Student should be blocked from section roster report.');
    }
    console.log('✅ Test 13 Passed! Blocked correctly.');

    console.log('\n🎉 ALL ATTENDANCE CRUD & SELF QR CHECK-IN TESTS PASSED FLAWLESSLY!');
    db.close();

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    db.close();
    process.exit(1);
  }
}

runTests();
