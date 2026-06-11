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
  console.log('🧪 Starting Automated Student Course Enrollment (Phase 7 CRUD) Integration Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.enroll.${time}@college.edu`;
    const studentAEmail = `student.a.enroll.${time}@college.edu`;
    const studentBEmail = `student.b.enroll.${time}@college.edu`;
    const facultyEmail = `prof.enroll.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Creating test database records ---');

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

    // C. Onboard Student A and Student B via Admin POST /api/students
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

    // D. Onboard Faculty member via Admin POST /api/faculty
    const facultyOnboard = await sendJSON('http://localhost:5000/api/faculty', 'POST', {
      email: facultyEmail,
      password: password,
      employeeId: `FAC-ENROLL-${time}`,
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

    // ==========================================
    // 2. VERIFICATION PHASE: Course Registration
    // ==========================================
    console.log('\n--- VERIFICATION PHASE A: Course Enrollments & Security ---');

    // Test 1: Create Enrollment without token (401)
    console.log('\nTesting 1: Creating enrollment with NO token...');
    const t1 = await sendJSON('http://localhost:5000/api/enrollments', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId
    });
    console.log(`Status: ${t1.statusCode}`);
    if (t1.statusCode !== 401 || t1.data.success) {
      throw new Error('Test 1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test 1 Passed! Blocked correctly.');

    // Test 2: Student A self-enrollment (Should succeed 201)
    console.log('\nTesting 2: Student A self-registering for Class Section (Self-service)...');
    const t2 = await sendJSON('http://localhost:5000/api/enrollments', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId
    }, studentAToken);
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 201 || !t2.data.success) {
      throw new Error('Test 2 failed: Student should self-enroll successfully.');
    }
    const studentAEnrollmentId = t2.data.data.enrollmentId;
    console.log(`✅ Test 2 Passed! Student A enrolled with Enrollment ID: ${studentAEnrollmentId}`);

    // Test 3: Student A attempts to enroll Student B (Should fail 403)
    console.log('\nTesting 3: Student A attempting to enroll Student B (Ownership Validation)...');
    const t3 = await sendJSON('http://localhost:5000/api/enrollments', 'POST', {
      studentId: studentBProfileId,
      classSectionId: classSectionId
    }, studentAToken);
    console.log(`Status: ${t3.statusCode}`);
    console.log('Response:', JSON.stringify(t3.data, null, 2));
    if (t3.statusCode !== 403 || t3.data.success) {
      throw new Error('Test 3 failed: Student A must be blocked from enrolling Student B.');
    }
    console.log('✅ Test 3 Passed! Blocked correctly.');

    // Test 4: Faculty attempts to enroll Student B (Should fail 403)
    console.log('\nTesting 4: Faculty attempting to enroll Student B (Role validation)...');
    const t4 = await sendJSON('http://localhost:5000/api/enrollments', 'POST', {
      studentId: studentBProfileId,
      classSectionId: classSectionId
    }, facultyToken);
    console.log(`Status: ${t4.statusCode}`);
    if (t4.statusCode !== 403 || t4.data.success) {
      throw new Error('Test 4 failed: Faculty must be blocked from enrolling students.');
    }
    console.log('✅ Test 4 Passed! Faculty role blocked correctly.');

    // Test 5: Admin enrolls Student B (Should succeed 201)
    console.log('\nTesting 5: Admin enrolling Student B successfully...');
    const t5 = await sendJSON('http://localhost:5000/api/enrollments', 'POST', {
      studentId: studentBProfileId,
      classSectionId: classSectionId
    }, adminToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log('Response:', JSON.stringify(t5.data, null, 2));
    if (t5.statusCode !== 201 || !t5.data.success) {
      throw new Error('Test 5 failed: Admin should enroll Student B successfully.');
    }
    const studentBEnrollmentId = t5.data.data.enrollmentId;
    console.log(`✅ Test 5 Passed! Student B enrolled with Enrollment ID: ${studentBEnrollmentId}`);

    // Test 6: Double Enrollment Protection (Should fail 400)
    console.log('\nTesting 6: Attempting duplicate enrollment for Student A...');
    const t6 = await sendJSON('http://localhost:5000/api/enrollments', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId
    }, studentAToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Response:', JSON.stringify(t6.data, null, 2));
    if (t6.statusCode !== 400 || t6.data.success) {
      throw new Error('Test 6 failed: Duplicate enrollment should return 400 Bad Request.');
    }
    console.log('✅ Test 6 Passed! Double enrollment blocked correctly.');

    // ==========================================
    // 3. VERIFICATION PHASE: Retrieve Schedule & Rosters
    // ==========================================
    console.log('\n--- VERIFICATION PHASE B: Retrieving schedules and rosters ---');

    // Test 7: Student A retrieves their own course list (Should succeed, verify SQL joins)
    console.log('\nTesting 7: Student A fetching their course schedule list...');
    const t7 = await sendJSON(`http://localhost:5000/api/enrollments/student/${studentAProfileId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t7.statusCode}`);
    console.log('Schedule details (SQL Joins verification):', JSON.stringify(t7.data, null, 2));
    if (t7.statusCode !== 200 || !t7.data.success) {
      throw new Error('Test 7 failed: Student should retrieve their schedule.');
    }
    const scheduleItem = t7.data.data.enrollments[0];
    if (!scheduleItem.course_code || !scheduleItem.course_title || !scheduleItem.faculty_first_name || !scheduleItem.department_name) {
      throw new Error('Test 7 failed: Enrollment details missing critical SQL join properties!');
    }
    console.log('✅ Test 7 Passed! Schedule details retrieved with all matching course and faculty joins.');

    // Test 8: Student A attempts to retrieve Student B's schedule (Should fail 403)
    console.log('\nTesting 8: Student A attempting to view Student B\'s schedule...');
    const t8 = await sendJSON(`http://localhost:5000/api/enrollments/student/${studentBProfileId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t8.statusCode}`);
    if (t8.statusCode !== 403 || t8.data.success) {
      throw new Error('Test 8 failed: Student A must be blocked from reading Student B schedule.');
    }
    console.log('✅ Test 8 Passed! Blocked correctly.');

    // Test 9: Faculty retrieves Student A's schedule (Should succeed 200)
    console.log('\nTesting 9: Faculty viewing Student A\'s schedule...');
    const t9 = await sendJSON(`http://localhost:5000/api/enrollments/student/${studentAProfileId}`, 'GET', null, facultyToken);
    console.log(`Status: ${t9.statusCode}`);
    if (t9.statusCode !== 200 || !t9.data.success) {
      throw new Error('Test 9 failed: Faculty should be authorized to view schedules.');
    }
    console.log('✅ Test 9 Passed! Faculty authorized.');

    // Test 10: Faculty retrieves section roster (Should succeed 200, verify SQL joins)
    console.log('\nTesting 10: Faculty viewing Class Section student roster roster list...');
    const t10 = await sendJSON(`http://localhost:5000/api/enrollments/section/${classSectionId}`, 'GET', null, facultyToken);
    console.log(`Status: ${t10.statusCode}`);
    console.log('Roster details (SQL Joins verification):', JSON.stringify(t10.data, null, 2));
    if (t10.statusCode !== 200 || !t10.data.success) {
      throw new Error('Test 10 failed: Faculty should retrieve section roster.');
    }
    const rosterItem = t10.data.data.roster[0];
    if (!rosterItem.roll_number || !rosterItem.email || !rosterItem.first_name) {
      throw new Error('Test 10 failed: Student roster list missing matching profiles/credentials!');
    }
    console.log('✅ Test 10 Passed! Section roster retrieved with all profiles and credentials joins.');

    // Test 11: Student A attempts to view section roster (Should fail 403)
    console.log('\nTesting 11: Student A attempting to view class section roster...');
    const t11 = await sendJSON(`http://localhost:5000/api/enrollments/section/${classSectionId}`, 'GET', null, studentAToken);
    console.log(`Status: ${t11.statusCode}`);
    if (t11.statusCode !== 403 || t11.data.success) {
      throw new Error('Test 11 failed: Student must be blocked from reading rosters.');
    }
    console.log('✅ Test 11 Passed! Blocked correctly.');

    // ==========================================
    // 4. VERIFICATION PHASE: Drops & Deletes
    // ==========================================
    console.log('\n--- VERIFICATION PHASE C: Course withdrawal and cascades ---');

    // Test 12: Student A attempts to drop Student B's enrollment (Should fail 403)
    console.log('\nTesting 12: Student A attempting to drop Student B\'s enrollment...');
    const t12 = await sendJSON(`http://localhost:5000/api/enrollments/${studentBEnrollmentId}`, 'DELETE', null, studentAToken);
    console.log(`Status: ${t12.statusCode}`);
    if (t12.statusCode !== 403 || t12.data.success) {
      throw new Error('Test 12 failed: Student A must be blocked from dropping Student B course.');
    }
    console.log('✅ Test 12 Passed! Blocked correctly.');

    // Test 13: Student A drops their own enrollment (Should succeed 200)
    console.log('\nTesting 13: Student A dropping their own enrollment (Self-service drop)...');
    const t13 = await sendJSON(`http://localhost:5000/api/enrollments/${studentAEnrollmentId}`, 'DELETE', null, studentAToken);
    console.log(`Status: ${t13.statusCode}`);
    if (t13.statusCode !== 200 || !t13.data.success) {
      throw new Error('Test 13 failed: Student A should drop course successfully.');
    }
    console.log('✅ Test 13 Passed! Course dropped successfully.');

    // Verify Student A schedule is empty
    const checkSchedule = await sendJSON(`http://localhost:5000/api/enrollments/student/${studentAProfileId}`, 'GET', null, adminToken);
    console.log('Student A schedule count after drop:', checkSchedule.data.data.enrollments.length);
    if (checkSchedule.data.data.enrollments.length !== 0) {
      throw new Error('Verification failed: Student A schedule should be empty.');
    }
    console.log('✅ Schedule drop verified.');

    // Test 14: Relational Cascade (Delete Student -> check enrollment deleted)
    console.log('\nTesting 14: Testing cascade wipe on student delete (Student B)...');
    // Delete Student B via Admin
    const deleteStudent = await sendJSON(`http://localhost:5000/api/students/${studentBProfileId}`, 'DELETE', null, adminToken);
    console.log(`Delete student status: ${deleteStudent.statusCode}`);
    
    // Check SQLite if enrollment is gone
    const checkEnrollSql = `SELECT * FROM enrollments WHERE id = ?`;
    await new Promise((resolve, reject) => {
      db.get(checkEnrollSql, [studentBEnrollmentId], (err, row) => {
        if (err) return reject(err);
        console.log('Query row result for Student B enrollment (Should be undefined):', row);
        if (row) {
          reject(new Error('Cascade deletion failed! Enrollment remained in database after student delete.'));
        } else {
          console.log('✅ CASCADING STUDENT DELETE VERIFIED! Enrollment wiped automatically!');
          resolve();
        }
      });
    });

    // Test 15: Relational Cascade (Delete Class Section -> check enrollment deleted)
    console.log('\nTesting 15: Testing cascade wipe on section delete...');
    // Re-enroll Student A to Class Section (use Admin to do it since we deleted Student A before, wait! We deleted Student B, Student A was just dropped!)
    // Let's re-enroll Student A via Admin
    const reEnroll = await sendJSON('http://localhost:5000/api/enrollments', 'POST', {
      studentId: studentAProfileId,
      classSectionId: classSectionId
    }, adminToken);
    const activeEnrollmentId = reEnroll.data.data.enrollmentId;
    console.log(`Re-enrolled Student A with enrollment ID: ${activeEnrollmentId}`);

    // Delete the Class Section
    const deleteSection = await sendJSON(`http://localhost:5000/api/sections/${classSectionId}`, 'DELETE', null, adminToken);
    console.log(`Delete section status: ${deleteSection.statusCode}`);

    // Check SQLite if enrollment is gone
    await new Promise((resolve, reject) => {
      db.get(checkEnrollSql, [activeEnrollmentId], (err, row) => {
        if (err) return reject(err);
        console.log('Query row result for active enrollment (Should be undefined):', row);
        if (row) {
          reject(new Error('Cascade deletion failed! Enrollment remained in database after section delete.'));
        } else {
          console.log('✅ CASCADING SECTION DELETE VERIFIED! Enrollment wiped automatically!');
          resolve();
        }
      });
    });

    console.log('\n🎉 ALL STUDENT COURSE ENROLLMENT CRUD & CASCADE TESTS PASSED SUCCESSFULLY!');
    db.close();

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    db.close();
    process.exit(1);
  }
}

runTests();
