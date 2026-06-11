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
  console.log('🧪 Starting Automated Announcements & Notice Board (Phase 11) Integration Tests...');

  try {
    const time = Date.now();
    const adminEmail = `admin.notice.${time}@college.edu`;
    const studentAEmail = `student.a.notice.${time}@college.edu`;
    const studentBEmail = `student.b.notice.${time}@college.edu`;
    const facultyAEmail = `prof.a.notice.${time}@college.edu`;
    const facultyBEmail = `prof.b.notice.${time}@college.edu`;
    const password = 'password123';

    // ==========================================
    // 1. SETUP PHASE: Create Departments & Roles
    // ==========================================
    console.log('\n--- SETUP PHASE: Preparing test database records ---');

    // Clear announcements table to ensure test idempotency
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM announcements', (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    console.log('✅ Cleaned up old announcements from DB.');

    // A. Create two test departments: CSE & ECE
    const cseDeptId = await DepartmentModel.create({
      name: `Computer Science & Eng Notice ${time}`,
      code: `CSE-N-${time}`,
      description: 'CSE department'
    });
    console.log(`✅ CSE Department created with ID: ${cseDeptId}`);

    const eceDeptId = await DepartmentModel.create({
      name: `Electronics & Comm Notice ${time}`,
      code: `ECE-N-${time}`,
      description: 'ECE department'
    });
    console.log(`✅ ECE Department created with ID: ${eceDeptId}`);

    // B. Register & Login Admin
    await sendJSON('http://localhost:5000/api/auth/register', 'POST', { email: adminEmail, password, role: 'admin' });
    const adminLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: adminEmail, password });
    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin credentials ready.');

    // C. Onboard Student A (CSE) and Student B (ECE)
    const onboardA = await sendJSON('http://localhost:5000/api/students', 'POST', {
      email: studentAEmail,
      password: password,
      rollNumber: `ROLL-CSE-${time}`,
      firstName: 'Alice',
      lastName: 'Smith',
      departmentId: cseDeptId
    }, adminToken);
    const studentAProfileId = onboardA.data.data.studentId;
    console.log(`✅ Student A (Alice, CSE) onboarded with Profile ID: ${studentAProfileId}`);

    const onboardB = await sendJSON('http://localhost:5000/api/students', 'POST', {
      email: studentBEmail,
      password: password,
      rollNumber: `ROLL-ECE-${time}`,
      firstName: 'Bob',
      lastName: 'Jones',
      departmentId: eceDeptId
    }, adminToken);
    const studentBProfileId = onboardB.data.data.studentId;
    console.log(`✅ Student B (Bob, ECE) onboarded with Profile ID: ${studentBProfileId}`);

    // D. Onboard Faculty A (CSE) and Faculty B (ECE)
    const onboardFacA = await sendJSON('http://localhost:5000/api/faculty', 'POST', {
      email: facultyAEmail,
      password: password,
      employeeId: `FAC-CSE-N-${time}`,
      firstName: 'Richard',
      lastName: 'Feynman',
      designation: 'Professor',
      departmentId: cseDeptId
    }, adminToken);
    const facultyAProfileId = onboardFacA.data.data.facultyId;
    console.log(`✅ Faculty A (Feynman, CSE) onboarded with Profile ID: ${facultyAProfileId}`);

    const onboardFacB = await sendJSON('http://localhost:5000/api/faculty', 'POST', {
      email: facultyBEmail,
      password: password,
      employeeId: `FAC-ECE-N-${time}`,
      firstName: 'Marie',
      lastName: 'Curie',
      designation: 'Professor',
      departmentId: eceDeptId
    }, adminToken);
    const facultyBProfileId = onboardFacB.data.data.facultyId;
    console.log(`✅ Faculty B (Curie, ECE) onboarded with Profile ID: ${facultyBProfileId}`);

    // E. Retrieve tokens for all users
    const studentALogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: studentAEmail, password });
    const studentAToken = studentALogin.data.data.token;

    const studentBLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: studentBEmail, password });
    const studentBToken = studentBLogin.data.data.token;

    const facultyALogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: facultyAEmail, password });
    const facultyAToken = facultyALogin.data.data.token;

    const facultyBLogin = await sendJSON('http://localhost:5000/api/auth/login', 'POST', { email: facultyBEmail, password });
    const facultyBToken = facultyBLogin.data.data.token;
    console.log('✅ Tokens for Students and Faculty members ready.');

    // ==========================================
    // 2. VERIFICATION PHASE A: Announcement Posts & RBAC
    // ==========================================
    console.log('\n--- VERIFICATION PHASE A: Posting announcements & RBAC checks ---');

    // Test 1: Student attempts to post an announcement (403)
    console.log('Testing 1: Student trying to post a notice...');
    const t1 = await sendJSON('http://localhost:5000/api/announcements', 'POST', {
      title: 'Hackathon Event',
      content: 'Join the annual coding hackathon.'
    }, studentAToken);
    console.log(`Status: ${t1.statusCode}`);
    if (t1.statusCode !== 403) {
      throw new Error('Test 1 failed: Student role should be blocked from creating announcements.');
    }
    console.log('✅ Test 1 Passed! Student role blocked correctly.');

    // Test 2: Admin posts general announcement (201)
    console.log('\nTesting 2: Admin posting general (school-wide) announcement...');
    const t2 = await sendJSON('http://localhost:5000/api/announcements', 'POST', {
      title: 'Welcome Notice Spring 2026',
      content: 'Welcome back students! Keep checking this board for updates.',
      departmentId: null
    }, adminToken);
    console.log(`Status: ${t2.statusCode}`);
    console.log('Response:', JSON.stringify(t2.data, null, 2));
    if (t2.statusCode !== 201 || !t2.data.success) {
      throw new Error('Test 2 failed: Admin should post a general announcement.');
    }
    const generalAnnId = t2.data.data.announcementId;
    console.log(`✅ Test 2 Passed! General announcement posted with ID: ${generalAnnId}`);

    // Test 3: Admin posts department specific announcement for CSE (201)
    console.log('\nTesting 3: Admin posting CSE department specific announcement...');
    const t3 = await sendJSON('http://localhost:5000/api/announcements', 'POST', {
      title: 'CSE Lab Maintenance',
      content: 'CSE Lab 4 will be offline on Friday for upgrades.',
      departmentId: cseDeptId
    }, adminToken);
    console.log(`Status: ${t3.statusCode}`);
    if (t3.statusCode !== 201 || !t3.data.success) {
      throw new Error('Test 3 failed: Admin should post a department specific announcement.');
    }
    const cseAnnIdByAdmin = t3.data.data.announcementId;
    console.log(`✅ Test 3 Passed! CSE announcement posted with ID: ${cseAnnIdByAdmin}`);

    // Test 4: Faculty A (CSE) posts announcement (Should automatically bind to CSE department) (201)
    console.log('\nTesting 4: Faculty A (CSE) posting notice (should auto-assign to CSE)...');
    const t4 = await sendJSON('http://localhost:5000/api/announcements', 'POST', {
      title: 'AOS Assignment Due Notice',
      content: 'Make sure to submit AOS Lab Assignment 1 by June 15.'
    }, facultyAToken);
    console.log(`Status: ${t4.statusCode}`);
    console.log('Response:', JSON.stringify(t4.data, null, 2));
    if (t4.statusCode !== 201 || !t4.data.success || t4.data.data.departmentId !== cseDeptId) {
      throw new Error('Test 4 failed: Faculty announcement should succeed and auto-bind to their department ID.');
    }
    const cseAnnIdByFac = t4.data.data.announcementId;
    console.log(`✅ Test 4 Passed! Faculty notice published for department ID: ${cseDeptId} (auto-assigned)`);

    // ==========================================
    // 3. VERIFICATION PHASE B: Feeds filtering
    // ==========================================
    console.log('\n--- VERIFICATION PHASE B: Feeds filtering logic ---');

    // Test 5: Admin retrieves announcements feed (gets everything)
    console.log('Testing 5: Admin retrieving notice board...');
    const t5 = await sendJSON('http://localhost:5000/api/announcements', 'GET', null, adminToken);
    console.log(`Status: ${t5.statusCode}`);
    console.log(`Number of notices returned for Admin: ${t5.data.data.announcements.length}`);
    if (t5.statusCode !== 200 || t5.data.data.announcements.length < 3) {
      throw new Error('Test 5 failed: Admin feed should return all announcements.');
    }
    console.log('✅ Test 5 Passed! Admin fetched global notice feed.');

    // Test 6: Student A (CSE) retrieves feed (gets general + CSE notices)
    console.log('\nTesting 6: Student A (CSE) retrieving notice board...');
    const t6 = await sendJSON('http://localhost:5000/api/announcements', 'GET', null, studentAToken);
    console.log(`Status: ${t6.statusCode}`);
    console.log('Notices returned for CSE Student:', JSON.stringify(t6.data.data.announcements, null, 2));
    // Should have: Welcome Notice (general), CSE Lab Maintenance (CSE-Admin), AOS Due Notice (CSE-Fac)
    const titles = t6.data.data.announcements.map((a) => a.title);
    if (!titles.includes('Welcome Notice Spring 2026') || !titles.includes('CSE Lab Maintenance') || !titles.includes('AOS Assignment Due Notice')) {
      throw new Error('Test 6 failed: CSE Student did not receive general or CSE specific notices.');
    }
    console.log('✅ Test 6 Passed! CSE Student feed contains only CSE + General bulletins.');

    // Test 7: Student B (ECE) retrieves feed (gets general bulletins only, no CSE notices!)
    console.log('\nTesting 7: Student B (ECE) retrieving notice board...');
    const t7 = await sendJSON('http://localhost:5000/api/announcements', 'GET', null, studentBToken);
    console.log(`Status: ${t7.statusCode}`);
    console.log('Notices returned for ECE Student:', JSON.stringify(t7.data.data.announcements, null, 2));
    const eceTitles = t7.data.data.announcements.map((a) => a.title);
    if (!eceTitles.includes('Welcome Notice Spring 2026')) {
      throw new Error('Test 7 failed: ECE Student should see general announcements.');
    }
    if (eceTitles.includes('CSE Lab Maintenance') || eceTitles.includes('AOS Assignment Due Notice')) {
      throw new Error('Test 7 failed: ECE Student should NOT see CSE specific notices.');
    }
    console.log('✅ Test 7 Passed! Feed correctly filters out CSE bulletins for ECE Student.');

    // Test 8: Student B attempts to fetch CSE notice by ID directly (403)
    console.log('\nTesting 8: Student B (ECE) attempting to fetch CSE notice directly by ID...');
    const t8 = await sendJSON(`http://localhost:5000/api/announcements/${cseAnnIdByFac}`, 'GET', null, studentBToken);
    console.log(`Status: ${t8.statusCode}`);
    console.log('Response:', JSON.stringify(t8.data, null, 2));
    if (t8.statusCode !== 403 || t8.data.success) {
      throw new Error('Test 8 failed: Access boundary should block ECE Student from viewing CSE notice directly with 403.');
    }
    console.log('✅ Test 8 Passed! Access control boundary correctly blocked cross-department read.');

    // ==========================================
    // 4. VERIFICATION PHASE C: Ownership & Updates
    // ==========================================
    console.log('\n--- VERIFICATION PHASE C: Ownership boundaries & updates ---');

    // Test 9: Faculty B (ECE) attempts to edit Faculty A's (CSE) notice (403)
    console.log('Testing 9: Faculty B (Curie) trying to edit Faculty A\'s (Feynman) notice...');
    const t9 = await sendJSON(`http://localhost:5000/api/announcements/${cseAnnIdByFac}`, 'PUT', {
      title: 'Feynman Notice Edited by Curie',
      content: 'This edit should be blocked.'
    }, facultyBToken);
    console.log(`Status: ${t9.statusCode}`);
    if (t9.statusCode !== 403 || t9.data.success) {
      throw new Error('Test 9 failed: Faculty B should be forbidden from editing Faculty A\'s announcement.');
    }
    console.log('✅ Test 9 Passed! Faculty restricted from modifying other teachers\' notices.');

    // Test 10: Faculty A (CSE) edits their own notice (200)
    console.log('\nTesting 10: Faculty A (Feynman) editing their own notice...');
    const t10 = await sendJSON(`http://localhost:5000/api/announcements/${cseAnnIdByFac}`, 'PUT', {
      title: 'AOS Assignment Extended Due Notice',
      content: 'Make sure to submit AOS Lab Assignment 1 by June 20 (extended).'
    }, facultyAToken);
    console.log(`Status: ${t10.statusCode}`);
    console.log('Response:', JSON.stringify(t10.data, null, 2));
    if (t10.statusCode !== 200 || !t10.data.success) {
      throw new Error('Test 10 failed: Faculty A should edit their own notice successfully.');
    }
    console.log('✅ Test 10 Passed! Notice updated.');

    // Test 11: Admin edits Faculty A's notice (200 override)
    console.log('\nTesting 11: Admin editing Faculty A\'s notice (administrative override)...');
    const t11 = await sendJSON(`http://localhost:5000/api/announcements/${cseAnnIdByFac}`, 'PUT', {
      title: 'AOS Notice (Admin Edited)',
      content: 'Notice modified by the admin panel.'
    }, adminToken);
    console.log(`Status: ${t11.statusCode}`);
    if (t11.statusCode !== 200 || !t11.data.success) {
      throw new Error('Test 11 failed: Admin should override and edit other notices.');
    }
    console.log('✅ Test 11 Passed! Admin override updated the notice.');

    // ==========================================
    // 5. VERIFICATION PHASE D: Deletions
    // ==========================================
    console.log('\n--- VERIFICATION PHASE D: Deletions & Cleanup ---');

    // Test 12: Faculty B attempts to delete Faculty A's notice (403)
    console.log('Testing 12: Faculty B (Curie) trying to delete Faculty A\'s notice...');
    const t12 = await sendJSON(`http://localhost:5000/api/announcements/${cseAnnIdByFac}`, 'DELETE', null, facultyBToken);
    console.log(`Status: ${t12.statusCode}`);
    if (t12.statusCode !== 403 || t12.data.success) {
      throw new Error('Test 12 failed: Faculty B should be blocked from deleting Faculty A\'s notice.');
    }
    console.log('✅ Test 12 Passed! Faculty blocked from deleting peer bulletin.');

    // Test 13: Faculty A deletes their own notice (200)
    console.log('\nTesting 13: Faculty A (Feynman) deleting their own notice...');
    const t13 = await sendJSON(`http://localhost:5000/api/announcements/${cseAnnIdByFac}`, 'DELETE', null, facultyAToken);
    console.log(`Status: ${t13.statusCode}`);
    if (t13.statusCode !== 200 || !t13.data.success) {
      throw new Error('Test 13 failed: Faculty A should delete their own notice.');
    }
    console.log('✅ Test 13 Passed! Faculty notice deleted.');

    // Test 14: Admin deletes CSE notice (200 override)
    console.log('\nTesting 14: Admin deleting CSE Lab notice (Admin override)...');
    const t14 = await sendJSON(`http://localhost:5000/api/announcements/${cseAnnIdByAdmin}`, 'DELETE', null, adminToken);
    console.log(`Status: ${t14.statusCode}`);
    if (t14.statusCode !== 200 || !t14.data.success) {
      throw new Error('Test 14 failed: Admin should delete notice.');
    }
    console.log('✅ Test 14 Passed! CSE Notice deleted by Admin.');

    // Confirm feed count
    const tCheck = await sendJSON('http://localhost:5000/api/announcements', 'GET', null, adminToken);
    console.log(`\nRemaining notices count (Admin global feed): ${tCheck.data.data.announcements.length}`);
    if (tCheck.data.data.announcements.length !== 1) {
      throw new Error('Verification failed: Only general notice should remain.');
    }
    console.log('✅ Correct! Only 1 notice (Welcome notice) remains.');

    console.log('\n🎉 ALL PHASE 11 ANNOUNCEMENTS & NOTICE BOARD TESTS PASSED SUCCESSFULLY!');
    db.close();

  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error.message);
    db.close();
    process.exit(1);
  }
}

runTests();
