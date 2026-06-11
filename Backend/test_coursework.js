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
  console.log('🧪 Starting Automated Coursework Assignment & Submission (Phase 10) Integration Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.coursework.${time}@college.edu`;
    const studentAEmail = `student.a.coursework.${time}@college.edu`;
    const studentBEmail = `student.b.coursework.${time}@college.edu`;
    const facultyEmail = `prof.coursework.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Preparing test database records ---');

    // A. Create test department (CSE)
    const deptId = await DepartmentModel.create({
      name: `Computer Science Department ${time}`,
      code: `CSD-${time}`,
      description: 'Department of Computer Science & Engineering for coursework'
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
      rollNumber: `ROLL-A-CW-${time}`,
      firstName: 'Alice',
      lastName: 'Smith',
      departmentId: deptId
    }, adminToken);
    const studentAProfileId = onboardA.data.data.studentId;
    console.log(`✅ Student A (Alice) onboarded with Profile ID: ${studentAProfileId}`);

    const onboardB = await sendJSON('http://localhost:5000/api/students', 'POST', {
      email: studentBEmail,
      password: password,
      rollNumber: `ROLL-B-CW-${time}`,
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
      employeeId: `FAC-CW-${time}`,
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
    console.log('✅ Student A logged in.');

    const studentBLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: studentBEmail, password });
    const studentBToken = studentBLogin.data.data.token;
    console.log('✅ Student B logged in.');

    const facultyLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: facultyEmail, password });
    const facultyToken = facultyLogin.data.data.token;
    console.log('✅ Faculty logged in.');

    // F. Create Course & Class Section
    const courseOnboard = await sendJSON('http://localhost:5000/api/courses', 'POST', {
      departmentId: deptId,
      courseCode: `CS-402-${time}`,
      title: 'Advanced Operating Systems',
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
    console.log('✅ Student A enrolled in Class Section.');

    // ==========================================
    // 2. VERIFICATION PHASE: Assignment Publishing
    // ==========================================
    console.log('\n--- VERIFICATION PHASE A: Assignment Publishing & RBAC ---');

    // Test 1: Student attempts to publish an assignment (403)
    console.log('Testing 1: Student trying to post a coursework assignment...');
    const t1 = await sendJSON('http://localhost:5000/api/assignments', 'POST', {
      classSectionId: classSectionId,
      title: 'AOS Lab Assignment 1',
      description: 'Write a custom shell in C',
      dueDate: '2026-06-15'
    }, studentAToken);
    console.log(`Status: ${t1.statusCode}`);
    if (t1.statusCode !== 403) {
      throw new Error('Test 1 failed: Student role should be blocked from publishing assignments.');
    }
    console.log('✅ Test 1 Passed! Student role correctly blocked.');

    // Test 2: Faculty publishes coursework assignment (201)
    console.log('\nTesting 2: Faculty publishing assignment (AOS Lab 1)...');
    const t2 = await sendJSON('http://localhost:5000/api/assignments', 'POST', {
      classSectionId: classSectionId,
      title: 'AOS Lab Assignment 1',
      description: 'Write a custom shell in C',
      dueDate: '2026-06-15'
    }, facultyToken);
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 201 || !t2.data.success) {
      throw new Error('Test 2 failed: Faculty should be able to create coursework.');
    }
    const assignmentId = t2.data.data.assignmentId;
    console.log(`✅ Test 2 Passed! Assignment created with ID: ${assignmentId}`);

    // Test 3: List assignments for section (200)
    console.log('\nTesting 3: Student listing assignments for section...');
    const t3 = await sendJSON(`http://localhost:5000/api/assignments/section/${classSectionId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response:', JSON.stringify(t3.data, null, 2));
    if (t3.statusCode !== 200 || !t3.data.success) {
      throw new Error('Test 3 failed: Student should retrieve assignment list.');
    }
    const assignmentItem = t3.data.data.assignments[0];
    if (assignmentItem.title !== 'AOS Lab Assignment 1' || !assignmentItem.course_code) {
      throw new Error('Test 3 failed: Assignment joins or data values are incorrect.');
    }
    console.log('✅ Test 3 Passed! Assignments list retrieved with detailed joins.');

    // ==========================================
    // 3. VERIFICATION PHASE: Student Homework Submissions
    // ==========================================
    console.log('\n--- VERIFICATION PHASE B: Homework Submissions & Integrity checks ---');

    // Test 4: Enrolled Student A submits homework (201)
    console.log('Testing 4: Student A (enrolled) submitting AOS Lab Assignment 1 response...');
    const t4 = await sendJSON('http://localhost:5000/api/submissions', 'POST', {
      assignmentId: assignmentId,
      submissionText: 'https://github.com/alice/aos-shell-project.git - Finished implement fork and pipes.'
    }, studentAToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 201 || !t4.data.success) {
      throw new Error('Test 4 failed: Enrolled student should be allowed to submit homework.');
    }
    const submissionId = t4.data.data.submissionId;
    console.log(`✅ Test 4 Passed! Submission created with ID: ${submissionId}`);

    // Test 5: Non-enrolled Student B attempts to submit homework (403)
    console.log('\nTesting 5: Student B (NOT enrolled) attempting to submit AOS Lab Assignment 1 response...');
    const t5 = await sendJSON('http://localhost:5000/api/submissions', 'POST', {
      assignmentId: assignmentId,
      submissionText: 'https://github.com/bob/aos-shell-project.git'
    }, studentBToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 403 || t5.data.success) {
      throw new Error('Test 5 failed: Roster enrollment check should block Student B submission with 403.');
    }
    console.log('✅ Test 5 Passed! Enrollment verification block succeeded.');

    // Test 6: Enrolled Student A attempts duplicate submission (400)
    console.log('\nTesting 6: Student A (enrolled) attempting duplicate submission for AOS Lab Assignment 1...');
    const t6 = await sendJSON('http://localhost:5000/api/submissions', 'POST', {
      assignmentId: assignmentId,
      submissionText: 'Duplicate text check'
    }, studentAToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Response:', JSON.stringify(t6.data, null, 2));
    if (t6.statusCode !== 400 || t6.data.success) {
      throw new Error('Test 6 failed: Duplicate submission check should block student with 400.');
    }
    console.log('✅ Test 6 Passed! Double submission prevention block succeeded.');

    // ==========================================
    // 4. VERIFICATION PHASE: Grading & Reviews
    // ==========================================
    console.log('\n--- VERIFICATION PHASE C: Grading Submissions & Roster views ---');

    // Test 7: Faculty retrieves submission roster for assignment (200)
    console.log('Testing 7: Faculty retrieving submission roster for AOS Lab Assignment 1...');
    const t7 = await sendJSON(`http://localhost:5000/api/submissions/assignment/${assignmentId}`, 'GET', null, facultyToken);
    console.log(`Status: ${t7.statusCode}`);
    console.log('Response:', JSON.stringify(t7.data, null, 2));
    if (t7.statusCode !== 200 || !t7.data.success) {
      throw new Error('Test 7 failed: Faculty should be allowed to view assignment submissions roster.');
    }
    const subItem = t7.data.data.roster[0];
    if (subItem.roll_number !== `ROLL-A-CW-${time}` || subItem.first_name !== 'Alice') {
      throw new Error('Test 7 failed: Submission profile details joins are missing.');
    }
    console.log('✅ Test 7 Passed! Submission roster retrieved with detailed profile/credential joins.');

    // Test 8: Student attempts to retrieve submission roster (403)
    console.log('\nTesting 8: Student A attempting to retrieve assignment submissions roster...');
    const t8 = await sendJSON(`http://localhost:5000/api/submissions/assignment/${assignmentId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t8.statusCode}`);
    if (t8.statusCode !== 403) {
      throw new Error('Test 8 failed: Student role should be blocked from retrieving roster with 403.');
    }
    console.log('✅ Test 8 Passed! Student blocked from roster review.');

    // Test 9: Faculty grades Student A's submission (200)
    console.log('\nTesting 9: Faculty grading Student A\'s submission...');
    const t9 = await sendJSON(`http://localhost:5000/api/submissions/${submissionId}/grade`, 'POST', {
      grade: 'Grade: A | Excellent custom shell with clean pipe implementation.'
    }, facultyToken);
    console.log(`Status: ${t9.statusCode}`);
    console.log('Response:', JSON.stringify(t9.data, null, 2));
    if (t9.statusCode !== 200 || !t9.data.success) {
      throw new Error('Test 9 failed: Faculty should grade submission successfully.');
    }
    console.log('✅ Test 9 Passed! Homework submission evaluated.');

    // Test 10: Student A retrieves their own submission history (200) and Student B fails to retrieve Student A's (403)
    console.log('\nTesting 10 (Part 1): Student A retrieving their own submissions history...');
    const t10a = await sendJSON(`http://localhost:5000/api/submissions/student/${studentAProfileId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t10a.statusCode}`);
    console.log('Response:', JSON.stringify(t10a.data, null, 2));
    if (t10a.statusCode !== 200 || !t10a.data.success) {
      throw new Error('Test 10 (Part 1) failed: Student A should retrieve their own history.');
    }
    const histItem = t10a.data.data.submissions[0];
    if (histItem.grade !== 'Grade: A | Excellent custom shell with clean pipe implementation.' || !histItem.course_title) {
      throw new Error('Test 10 (Part 1) failed: Retreived history missing grade details or course joins.');
    }
    console.log('✅ Test 10 (Part 1) Passed! Student A checked own report card.');

    console.log('\nTesting 10 (Part 2): Student B trying to retrieve Student A\'s submissions history...');
    const t10b = await sendJSON(`http://localhost:5000/api/submissions/student/${studentAProfileId}`, 'GET', null, studentBToken);
    console.log(`Status: ${t10b.statusCode}`);
    if (t10b.statusCode !== 403) {
      throw new Error('Test 10 (Part 2) failed: Student should be blocked from viewing another student submissions logs.');
    }
    console.log('✅ Test 10 (Part 2) Passed! Blocked cross-student logs leaks.');

    // ==========================================
    // 5. VERIFICATION PHASE: Cascade Deletes
    // ==========================================
    console.log('\n--- VERIFICATION PHASE D: Cascade Deletions check ---');

    // Test 11: Delete Assignment and confirm submissions are cascade deleted from database
    console.log('Testing 11: Faculty deleting the parent Coursework Assignment...');
    const t11 = await sendJSON(`http://localhost:5000/api/assignments/${assignmentId}`, 'DELETE', null, facultyToken);
    console.log(`Status: ${t11.statusCode}`);
    if (t11.statusCode !== 200 || !t11.data.success) {
      throw new Error('Test 11 failed: Faculty should be able to delete coursework assignment.');
    }
    console.log('✅ Assignment deleted. Now verifying DB cascade wipe of submissions...');

    // Wait a brief moment and check if submission is gone from database
    await new Promise((resolve) => {
      db.get('SELECT * FROM submissions WHERE id = ?', [submissionId], (err, row) => {
        if (err) {
          throw err;
        }
        if (row) {
          throw new Error('Cascade deletion failed! Submission record still exists in the database.');
        }
        console.log('✅ Cascade deletion verified: Submissions associated with deleted assignment are wiped.');
        resolve();
      });
    });
    console.log('✅ Test 11 Passed! Cascade verification complete.');

    console.log('\n🎉 ALL PHASE 10 COURSEWORK ASSIGNMENT & SUBMISSION TESTS PASSED SUCCESSFULLY!');
    db.close();

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    db.close();
    process.exit(1);
  }
}

runTests();
