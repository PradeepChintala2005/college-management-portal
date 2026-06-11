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
  console.log('🧪 Starting Automated Academic Catalog & Section CRUD Integration Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.acad.${time}@college.edu`;
    const studentEmail = `student.acad.${time}@college.edu`;
    const facultyEmail = `prof.acad.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE
    // ==========================================
    console.log('\n--- SETUP PHASE: Creating test database records ---');

    // A. Create test department (Computer Science)
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

    // C. Register & Login Student (to test role blockages)
    await sendJSON('http://localhost:5000/api/auth/register', 'POST', { email: studentEmail, password, role: 'student' });
    const studentLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: studentEmail, password });
    const studentToken = studentLogin.data.data.token;
    console.log('✅ Student credentials ready.');

    // D. Onboard a Faculty member (to link to class sections)
    const facultyEmpId = `FAC-ACAD-${time}`;
    const facultyOnboard = await sendJSON('http://localhost:5000/api/faculty', 'POST', {
      email: facultyEmail,
      employeeId: facultyEmpId,
      firstName: 'Richard',
      lastName: 'Feynman',
      designation: 'Professor',
      departmentId: deptId
    }, adminToken);
    const facultyProfileId = facultyOnboard.data.data.facultyId;
    console.log(`✅ Faculty member onboarded with ID: ${facultyProfileId}`);

    // Login Faculty member to get their token
    const facultyLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: facultyEmail, password: 'Welcome@123' });
    const facultyToken = facultyLogin.data.data.token;
    console.log('✅ Faculty credentials ready.');

    // ==========================================
    // 2. VERIFICATION PHASE: Course CRUD & RBAC
    // ==========================================
    console.log('\n--- VERIFICATION PHASE A: Course Catalog CRUD & RBAC ---');

    // Test A1: Create Course with NO token (Should fail with 401)
    console.log('\nTesting A1: Creating course with NO token...');
    const tA1 = await sendJSON('http://localhost:5000/api/courses', 'POST', {
      departmentId: deptId,
      courseCode: `CS-101-${time}`,
      title: 'Intro to Computer Programming',
      credits: 4
    });
    console.log(`Status: ${tA1.statusCode}`);
    if (tA1.statusCode !== 401 || tA1.data.success) {
      throw new Error('Test A1 failed: Request without token should be blocked with 401.');
    }
    console.log('✅ Test A1 Passed! Blocked correctly.');

    // Test A2: Create Course with Student Token (Should fail 403)
    console.log('\nTesting A2: Creating course with STUDENT token (Security Check)...');
    const tA2 = await sendJSON('http://localhost:5000/api/courses', 'POST', {
      departmentId: deptId,
      courseCode: `CS-101-${time}`,
      title: 'Intro to Computer Programming',
      credits: 4
    }, studentToken);
    console.log(`Status: ${tA2.statusCode}`);
    if (tA2.statusCode !== 403 || tA2.data.success) {
      throw new Error('Test A2 failed: Student should be blocked with 403.');
    }
    console.log('✅ Test A2 Passed! Blocked correctly.');

    // Test A3: Create Course with Admin Token (Should succeed 201)
    console.log('\nTesting A3: Creating course successfully with ADMIN token...');
    const courseCode1 = `CS-101-${time}`;
    const tA3 = await sendJSON('http://localhost:5000/api/courses', 'POST', {
      departmentId: deptId,
      courseCode: courseCode1,
      title: 'Intro to Computer Programming',
      credits: 4
    }, adminToken);
    console.log(`Status: ${tA3.statusCode}`);
    console.log('Response:', JSON.stringify(tA3.data, null, 2));
    if (tA3.statusCode !== 201 || !tA3.data.success) {
      throw new Error('Test A3 failed: Admin should create course successfully.');
    }
    const courseId1 = tA3.data.data.courseId;
    console.log(`✅ Test A3 Passed! Course 1 created with ID: ${courseId1}`);

    // Test A4: Create Duplicate Course Code (Should fail 400)
    console.log('\nTesting A4: Creating duplicate course code...');
    const tA4 = await sendJSON('http://localhost:5000/api/courses', 'POST', {
      departmentId: deptId,
      courseCode: courseCode1, // duplicate code!
      title: 'Duplicate Computer Programming Course',
      credits: 3
    }, adminToken);
    console.log(`Status: ${tA4.statusCode}`);
    console.log('Response:', JSON.stringify(tA4.data, null, 2));
    if (tA4.statusCode !== 400 || tA4.data.success) {
      throw new Error('Test A4 failed: Duplicate course codes should be blocked.');
    }
    console.log('✅ Test A4 Passed! Duplicate blocked correctly.');

    // Test A5: Create Course with Credits < 1 (Should fail 400)
    console.log('\nTesting A5: Creating course with 0 credits...');
    const tA5 = await sendJSON('http://localhost:5000/api/courses', 'POST', {
      departmentId: deptId,
      courseCode: `CS-ZERO-${time}`,
      title: 'Ghost Credits Course',
      credits: 0 // invalid credits!
    }, adminToken);
    console.log(`Status: ${tA5.statusCode}`);
    console.log('Response:', JSON.stringify(tA5.data, null, 2));
    if (tA5.statusCode !== 400 || tA5.data.success) {
      throw new Error('Test A5 failed: Credits < 1 should be blocked.');
    }
    console.log('✅ Test A5 Passed! Invalid credits blocked correctly.');

    // Test A6: Retrieve Courses (Should succeed 200 for Student/Faculty)
    console.log('\nTesting A6: Student retrieving course list (SQL JOIN Check)...');
    const tA6 = await sendJSON('http://localhost:5000/api/courses', 'GET', null, studentToken);
    console.log(`Status: ${tA6.statusCode}`);
    console.log('Total Courses:', tA6.data.data.courses.length);
    const sampleCourse = tA6.data.data.courses[tA6.data.data.courses.length - 1];
    console.log('Sample Course details:', JSON.stringify(sampleCourse, null, 2));
    if (tA6.statusCode !== 200 || !tA6.data.success) {
      throw new Error('Test A6 failed: Student should retrieve course list.');
    }
    if (!sampleCourse.department_name || !sampleCourse.department_code) {
      throw new Error('Test A6 failed: Department details missing from course query output.');
    }
    console.log('✅ Test A6 Passed! Courses with department details retrieved successfully.');

    // Test A7: Update Course (Should succeed 200)
    console.log('\nTesting A7: Admin updating Course 1 credits and title...');
    const tA7 = await sendJSON(`http://localhost:5000/api/courses/${courseId1}`, 'PUT', {
      departmentId: deptId,
      courseCode: courseCode1,
      title: 'Intro to Computer Programming (Honors)',
      credits: 5 // increased credits
    }, adminToken);
    console.log(`Status: ${tA7.statusCode}`);
    console.log('Response:', JSON.stringify(tA7.data, null, 2));
    if (tA7.statusCode !== 200 || !tA7.data.success) {
      throw new Error('Test A7 failed: Admin should update course details successfully.');
    }
    console.log('✅ Test A7 Passed! Course updated successfully.');

    // Test A8: Update to duplicate code (Should fail 400)
    console.log('\nTesting A8: Creating Course 2 and updating Course 1 to its code...');
    const courseCode2 = `CS-102-${time}`;
    const onboard2 = await sendJSON('http://localhost:5000/api/courses', 'POST', {
      departmentId: deptId,
      courseCode: courseCode2,
      title: 'Data Structures',
      credits: 4
    }, adminToken);
    const courseId2 = onboard2.data.data.courseId;
    console.log(`✅ Course 2 created with ID: ${courseId2}`);

    // Try to update Course 1 to Course 2's code (CS-102)
    const tA8 = await sendJSON(`http://localhost:5000/api/courses/${courseId1}`, 'PUT', {
      departmentId: deptId,
      courseCode: courseCode2, // conflicting code!
      title: 'Intro to Computer Programming (Honors)',
      credits: 5
    }, adminToken);
    console.log(`Status: ${tA8.statusCode}`);
    console.log('Response:', JSON.stringify(tA8.data, null, 2));
    if (tA8.statusCode !== 400 || tA8.data.success) {
      throw new Error('Test A8 failed: Course update to duplicate code should be rejected.');
    }
    console.log('✅ Test A8 Passed! Duplicate update blocked correctly.');


    // ==========================================
    // 3. VERIFICATION PHASE: Class Section CRUD
    // ==========================================
    console.log('\n--- VERIFICATION PHASE B: Class Section CRUD & Relational Integrity ---');

    // Test B1: Create Section with Student Token (Should fail 403)
    console.log('\nTesting B1: Creating class section with STUDENT token (Security Check)...');
    const tB1 = await sendJSON('http://localhost:5000/api/sections', 'POST', {
      courseId: courseId1,
      facultyId: facultyProfileId,
      sectionName: 'Section-A',
      semester: 'Spring 2026'
    }, studentToken);
    console.log(`Status: ${tB1.statusCode}`);
    if (tB1.statusCode !== 403 || tB1.data.success) {
      throw new Error('Test B1 failed: Student should be blocked with 403.');
    }
    console.log('✅ Test B1 Passed! Student blocked correctly.');

    // Test B2: Create Section with Admin Token (Should succeed 201)
    console.log('\nTesting B2: Creating class section successfully with ADMIN token...');
    const tB2 = await sendJSON('http://localhost:5000/api/sections', 'POST', {
      courseId: courseId1,
      facultyId: facultyProfileId,
      sectionName: 'Section-A',
      semester: 'Spring 2026'
    }, adminToken);
    console.log(`Status: ${tB2.statusCode}`);
    console.log('Response:', JSON.stringify(tB2.data, null, 2));
    if (tB2.statusCode !== 201 || !tB2.data.success) {
      throw new Error('Test B2 failed: Admin should create class section successfully.');
    }
    const sectionId = tB2.data.data.sectionId;
    console.log(`✅ Test B2 Passed! Class Section created with ID: ${sectionId}`);

    // Test B3: Create Section with non-existent Course (Should fail 400)
    console.log('\nTesting B3: Creating class section for non-existent Course ID...');
    const tB3 = await sendJSON('http://localhost:5000/api/sections', 'POST', {
      courseId: 9999, // nonexistent course!
      facultyId: facultyProfileId,
      sectionName: 'Section-X',
      semester: 'Spring 2026'
    }, adminToken);
    console.log(`Status: ${tB3.statusCode}`);
    console.log('Response:', JSON.stringify(tB3.data, null, 2));
    if (tB3.statusCode !== 400 || tB3.data.success) {
      throw new Error('Test B3 failed: Nonexistent course ID should be blocked.');
    }
    console.log('✅ Test B3 Passed! Blocked correctly.');

    // Test B4: Create Section with non-existent Faculty (Should fail 400)
    console.log('\nTesting B4: Creating class section for non-existent Faculty ID...');
    const tB4 = await sendJSON('http://localhost:5000/api/sections', 'POST', {
      courseId: courseId1,
      facultyId: 9999, // nonexistent faculty!
      sectionName: 'Section-Y',
      semester: 'Spring 2026'
    }, adminToken);
    console.log(`Status: ${tB4.statusCode}`);
    console.log('Response:', JSON.stringify(tB4.data, null, 2));
    if (tB4.statusCode !== 400 || tB4.data.success) {
      throw new Error('Test B4 failed: Nonexistent faculty ID should be blocked.');
    }
    console.log('✅ Test B4 Passed! Blocked correctly.');

    // Test B5: Retrieve Class Sections (Should succeed 200, SQL JOIN check)
    console.log('\nTesting B5: Retrieving class sections (Checking SQL JOIN details)...');
    const tB5 = await sendJSON('http://localhost:5000/api/sections', 'GET', null, facultyToken);
    console.log(`Status: ${tB5.statusCode}`);
    console.log('Total Class Sections:', tB5.data.data.sections.length);
    const sampleSection = tB5.data.data.sections[tB5.data.data.sections.length - 1];
    console.log('Sample Class Section details:', JSON.stringify(sampleSection, null, 2));
    if (tB5.statusCode !== 200 || !tB5.data.success) {
      throw new Error('Test B5 failed: Faculty should retrieve class sections list.');
    }
    if (!sampleSection.course_code || !sampleSection.course_title || !sampleSection.faculty_first_name || !sampleSection.faculty_last_name) {
      throw new Error('Test B5 failed: Course/Faculty detailed joins are missing from query result!');
    }
    console.log('✅ Test B5 Passed! Class sections fetched with comprehensive joins.');

    // Test B6: Update Class Section (Should succeed 200)
    console.log('\nTesting B6: Updating class section details (Changing section name to B)...');
    const tB6 = await sendJSON(`http://localhost:5000/api/sections/${sectionId}`, 'PUT', {
      courseId: courseId1,
      facultyId: facultyProfileId,
      sectionName: 'Section-B', // updated name
      semester: 'Spring 2026'
    }, adminToken);
    console.log(`Status: ${tB6.statusCode}`);
    console.log('Response:', JSON.stringify(tB6.data, null, 2));
    if (tB6.statusCode !== 200 || !tB6.data.success) {
      throw new Error('Test B6 failed: Admin should update class section details.');
    }
    console.log('✅ Test B6 Passed! Section updated successfully.');


    // ==========================================
    // 4. VERIFICATION PHASE: Relational Cascades
    // ==========================================
    console.log('\n--- VERIFICATION PHASE C: Relational Cascades ---');

    // Test C1: Delete parent course and verify section cascade wipe
    console.log(`\nTesting C1: Deleting parent Course ID '${courseId1}'...`);
    const tC1 = await sendJSON(`http://localhost:5000/api/courses/${courseId1}`, 'DELETE', null, adminToken);
    console.log(`Status: ${tC1.statusCode}`);
    console.log('Response:', JSON.stringify(tC1.data, null, 2));
    if (tC1.statusCode !== 200 || !tC1.data.success) {
      throw new Error('Test C1 failed: Course deletion failed.');
    }
    console.log('✅ Course deleted successfully from database catalog.');

    // Check database if the child section has been wiped out
    console.log(`\nChecking cascade wipe: Checking if Section ID '${sectionId}' is still in SQLite...`);
    const checkSql = `SELECT * FROM class_sections WHERE id = ?`;
    
    db.get(checkSql, [sectionId], (dbErr, row) => {
      if (dbErr) {
        console.error('Database check error:', dbErr.message);
        process.exit(1);
      }
      
      console.log('Query Row Result (Should be undefined):', row);
      if (row) {
        console.error('❌ CASCADING DELETE FAILURE: Class section child row was left orphaned in database!');
        db.close();
        process.exit(1);
      } else {
        console.log('✅ CASCADING DELETE VERIFIED! Section was wiped automatically by SQLite!');
        
        // Request the deleted section ID (Should return 404)
        console.log('\nRequesting deleted Section details...');
        sendJSON(`http://localhost:5000/api/sections/${sectionId}`, 'GET', null, adminToken).then((tC2) => {
          console.log(`Status: ${tC2.statusCode}`);
          console.log('Response:', JSON.stringify(tC2.data, null, 2));
          if (tC2.statusCode !== 404) {
            console.error('❌ Cascade test failed: Requesting deleted section should have returned 404.');
            process.exit(1);
          }
          console.log('✅ Requesting deleted section returned clean 404.');
          console.log('\n🎉 ALL ACADEMICS AND CLASS SECTION CASCADE TESTS PASSED SUCCESSFULLY!');
          db.close();
        });
      }
    });

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    db.close();
    process.exit(1);
  }
}

runTests();
