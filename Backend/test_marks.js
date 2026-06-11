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
  console.log('🧪 Starting Automated Marks & Grades Management (Phase 9 CRUD) Integration Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.grades.${time}@college.edu`;
    const studentAEmail = `student.a.grades.${time}@college.edu`;
    const studentBEmail = `student.b.grades.${time}@college.edu`;
    const facultyEmail = `prof.grades.${time}@college.edu`;
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
      employeeId: `FAC-GRADES-${time}`,
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

    // G. Enroll Student A into the Section (Leave Student B not enrolled to test validation checks!)
    await sendJSON('http://localhost:5000/api/enrollments', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId
    }, adminToken);
    console.log('✅ Student A enrolled in the class section.');

    // ==========================================
    // 2. VERIFICATION PHASE: Grading & RBAC
    // ==========================================
    console.log('\n--- VERIFICATION PHASE A: Grading Roster Logs & RBAC ---');

    // Test 1: Record marks without Token (401)
    console.log('\nTesting 1: Recording marks with NO token...');
    const t1 = await sendJSON('http://localhost:5000/api/marks', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId,
      examType: 'Midterm',
      marksObtained: 85,
      maxMarks: 100
    });
    console.log(`Status: ${t1.statusCode}`);
    if (t1.statusCode !== 401) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Blocked correctly.');

    // Test 2: Record marks as Student A (403)
    console.log('\nTesting 2: Recording marks with STUDENT token (RBAC check)...');
    const t2 = await sendJSON('http://localhost:5000/api/marks', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId,
      examType: 'Midterm',
      marksObtained: 85,
      maxMarks: 100
    }, studentAToken);
    console.log(`Status: ${t2.statusCode}`);
    if (t2.statusCode !== 403) {
      throw new Error('Test 2 failed: Student role should be blocked with 403.');
    }
    console.log('✅ Test 2 Passed! Student blocked correctly.');

    // Test 3: Record marks as Faculty for Student A (enrolled) (Should succeed 201)
    console.log('\nTesting 3: Faculty recording Midterm score (85/100) for Student A (Alice)...');
    const t3 = await sendJSON('http://localhost:5000/api/marks', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId,
      examType: 'Midterm',
      marksObtained: 85,
      maxMarks: 100
    }, facultyToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response:', JSON.stringify(t3.data, null, 2));
    if (t3.statusCode !== 201 || !t3.data.success) {
      throw new Error('Test 3 failed: Faculty should record marks successfully.');
    }
    const markId = t3.data.data.markId;
    console.log(`✅ Test 3 Passed! Mark record saved with ID: ${markId}`);

    // Test 4: Record marks as Faculty for Student B (not enrolled) (Should fail 400)
    console.log('\nTesting 4: Faculty recording Midterm score for Student B (Bob - Not Enrolled)...');
    const t4 = await sendJSON('http://localhost:5000/api/marks', 'POST', {
      studentId: studentBProfileId,
      classSectionId: classSectionId,
      examType: 'Midterm',
      marksObtained: 85,
      maxMarks: 100
    }, facultyToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 400 || t4.data.success) {
      throw new Error('Test 4 failed: Grading non-enrolled student should fail with 400.');
    }
    console.log('✅ Test 4 Passed! Enrolment check successfully blocked grading.');

    // Test 5: Record marks with obtained > max (Should fail 400)
    console.log('\nTesting 5: Recording score exceeding max limit (e.g. 105/100)...');
    const t5 = await sendJSON('http://localhost:5000/api/marks', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId,
      examType: 'Quiz',
      marksObtained: 105, // score > max
      maxMarks: 100
    }, facultyToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 400 || t5.data.success) {
      throw new Error('Test 5 failed: Scores exceeding maximum must be blocked with 400.');
    }
    console.log('✅ Test 5 Passed! Score limits validation blocked write.');

    // Test 6: Record marks with negative obtained (Should fail 400)
    console.log('\nTesting 6: Recording negative score (e.g. -5/100)...');
    const t6 = await sendJSON('http://localhost:5000/api/marks', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId,
      examType: 'Quiz',
      marksObtained: -5, // negative score
      maxMarks: 100
    }, facultyToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Response:', JSON.stringify(t6.data, null, 2));
    if (t6.statusCode !== 400 || t6.data.success) {
      throw new Error('Test 6 failed: Negative scores must be blocked with 400.');
    }
    console.log('✅ Test 6 Passed! Negative scores blocked correctly.');

    // ==========================================
    // 3. VERIFICATION PHASE: Retrieve Reports
    // ==========================================
    console.log('\n--- VERIFICATION PHASE B: Retrieving Grades sheets & score cards ---');

    // Test 7: Student A retrieves their own scorecard (Should succeed 200)
    console.log('\nTesting 7: Student A retrieving their grades report card...');
    const t7 = await sendJSON(`http://localhost:5000/api/marks/student/${studentAProfileId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t7.statusCode}`);
    console.log('Response (Card verification):', JSON.stringify(t7.data, null, 2));
    if (t7.statusCode !== 200 || !t7.data.success) {
      throw new Error('Test 7 failed: Student should retrieve their scorecard.');
    }
    const scorecardItem = t7.data.data.grades[0];
    if (!scorecardItem.course_code || !scorecardItem.course_title || scorecardItem.marks_obtained !== 85) {
      throw new Error('Test 7 failed: Grades detail missing matching course joins/marks details!');
    }
    console.log('✅ Test 7 Passed! Scorecard retrieved with detailed database joins.');

    // Test 8: Student A attempts to view Student B scorecard (Should fail 403)
    console.log('\nTesting 8: Student A attempting to view Student B\'s report card...');
    const t8 = await sendJSON(`http://localhost:5000/api/marks/student/${studentBProfileId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t8.statusCode}`);
    if (t8.statusCode !== 403) {
      throw new Error('Test 8 failed: Student should be blocked from viewing other student scorecards.');
    }
    console.log('✅ Test 8 Passed! Blocked correctly.');

    // Test 9: Faculty retrieves Section grading spreadsheet (Should succeed 200)
    console.log('\nTesting 9: Faculty fetching Section grading spreadsheet report...');
    const t9 = await sendJSON(`http://localhost:5000/api/marks/section/${classSectionId}`, 'GET', null, facultyToken);
    console.log(`Status: ${t9.statusCode}`);
    console.log('Response (Spreadsheet verification):', JSON.stringify(t9.data, null, 2));
    if (t9.statusCode !== 200 || !t9.data.success) {
      throw new Error('Test 9 failed: Faculty should retrieve section grading sheet.');
    }
    const scoreItem = t9.data.data.grades[0];
    if (!scoreItem.roll_number || !scoreItem.first_name || !scoreItem.email) {
      throw new Error('Test 9 failed: Grading roster details missing student profile/credentials joins!');
    }
    console.log('✅ Test 9 Passed! Section grading spreadsheet retrieved with detailed profile joins.');

    // Test 10: Student A attempts to view Section grading spreadsheet (Should fail 403)
    console.log('\nTesting 10: Student A attempting to view section grading spreadsheet...');
    const t10 = await sendJSON(`http://localhost:5000/api/marks/section/${classSectionId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t10.statusCode}`);
    if (t10.statusCode !== 403) {
      throw new Error('Test 10 failed: Student must be blocked from grading spreadsheets.');
    }
    console.log('✅ Test 10 Passed! Blocked correctly.');

    // ==========================================
    // 4. VERIFICATION PHASE: Updates & Deletes
    // ==========================================
    console.log('\n--- VERIFICATION PHASE C: Grades Corrections & Drops ---');

    // Test 11: Update mark record (85 -> 90) (Should succeed 200)
    console.log('\nTesting 11: Faculty updating Student A Midterm score to 90...');
    const t11 = await sendJSON(`http://localhost:5000/api/marks/${markId}`, 'PUT', {
      examType: 'Midterm',
      marksObtained: 90, // score increased
      maxMarks: 100
    }, facultyToken);
    console.log(`Status: ${t11.statusCode}`);
    console.log('Response:', JSON.stringify(t11.data, null, 2));
    if (t11.statusCode !== 200 || !t11.data.success) {
      throw new Error('Test 11 failed: Faculty should update marks successfully.');
    }
    console.log('✅ Test 11 Passed! Score correction saved.');

    // Verify change in report card
    const checkReport = await sendJSON(`http://localhost:5000/api/marks/student/${studentAProfileId}`, 'GET', null, studentAToken);
    if (checkReport.data.data.grades[0].marks_obtained !== 90) {
      throw new Error('Verification failed: Score should be 90.');
    }
    console.log('✅ Verified report card updated to 90.');

    // Test 12: Delete mark record (Should succeed 200)
    console.log('\nTesting 12: Faculty deleting Student A Midterm mark record...');
    const t12 = await sendJSON(`http://localhost:5000/api/marks/${markId}`, 'DELETE', null, facultyToken);
    console.log(`Status: ${t12.statusCode}`);
    if (t12.statusCode !== 200 || !t12.data.success) {
      throw new Error('Test 12 failed: Faculty should delete marks record.');
    }
    console.log('✅ Test 12 Passed! Mark record deleted.');

    // Verify deletion
    const checkReportAfterDelete = await sendJSON(`http://localhost:5000/api/marks/student/${studentAProfileId}`, 'GET', null, studentAToken);
    console.log('Grades count after delete:', checkReportAfterDelete.data.data.grades.length);
    if (checkReportAfterDelete.data.data.grades.length !== 0) {
      throw new Error('Verification failed: Scorecard should be empty.');
    }
    console.log('✅ Verified scorecard is empty.');

    console.log('\n🎉 ALL MARKS & GRADES CRUD OPERATIONS TESTS PASSED SUCCESSFULLY!');
    db.close();

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    db.close();
    process.exit(1);
  }
}

runTests();
