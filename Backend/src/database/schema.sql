-- ==========================================
-- 🎓 COLLEGE MANAGEMENT SYSTEM DATABASE SCHEMA (3NF)
-- ==========================================

-- 1. USERS (Core Authentication Details)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. DEPARTMENTS (Academic Wings)
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT
);

-- 3. STUDENTS (Profile details linked to User and Department)
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    department_id INTEGER,
    roll_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    date_of_birth TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 4. FACULTY (Profile details linked to User and Department)
CREATE TABLE IF NOT EXISTS faculty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    department_id INTEGER,
    employee_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    designation TEXT,
    phone TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 5. COURSES (Subjects syllabus)
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER NOT NULL,
    course_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK(credits >= 1),
    FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- 6. CLASS SECTIONS (Specific deliveries of courses taught by faculty)
CREATE TABLE IF NOT EXISTS class_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    faculty_id INTEGER,
    section_name TEXT NOT NULL,
    semester TEXT NOT NULL,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY(faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
);

-- 7. ENROLLMENTS (Bridging Students and Class Sections - Many-to-Many)
CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_section_id INTEGER NOT NULL,
    enrollment_date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE,
    UNIQUE(student_id, class_section_id) -- Avoids double enrollment in same class!
);

-- 8. ATTENDANCE SESSIONS (Specific classes scheduled by teachers)
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_section_id INTEGER NOT NULL,
    session_date TEXT NOT NULL,
    qr_code_token TEXT UNIQUE,
    token_expires_at TEXT,
    FOREIGN KEY(class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE
);

-- 9. ATTENDANCE RECORDS (Logs status of students in a session)
CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Late')),
    marked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(session_id, student_id) -- Ensures a student can only submit attendance once per session!
);

-- 10. ASSIGNMENTS (Home work)
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_section_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT NOT NULL,
    FOREIGN KEY(class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE
);

-- 11. SUBMISSIONS (Student assignment answers)
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    submission_text TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    grade TEXT,
    FOREIGN KEY(assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(assignment_id, student_id) -- Allows only one submission per assignment
);

-- 12. MARKS (Exam assessments)
CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_section_id INTEGER NOT NULL,
    exam_type TEXT NOT NULL CHECK(exam_type IN ('Quiz', 'Midterm', 'Final', 'Assignment')),
    marks_obtained REAL NOT NULL,
    max_marks REAL NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE
);

-- 13. ANNOUNCEMENTS (General and department postings)
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER,
    department_id INTEGER, -- NULL means a general announcement for all departments!
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);
