import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminCourses() {
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' or 'sections'
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  // Course Form States
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCredits, setCourseCredits] = useState('');
  const [courseDeptId, setCourseDeptId] = useState('');

  // Class Section Form States
  const [secCourseId, setSecCourseId] = useState('');
  const [secFacultyId, setSecFacultyId] = useState('');
  const [secName, setSecName] = useState('');
  const [secSemester, setSecSemester] = useState('');

  // Error/Success status messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingItem, setEditingItem] = useState(null); // holds course or section object if editing

  // Fetch departments list
  const fetchDepartments = async () => {
    try {
      const res = await api.get('/api/departments');
      if (res.data && res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch faculty list
  const fetchFaculty = async () => {
    try {
      const res = await api.get('/api/faculty');
      if (res.data && res.data.success) {
        setFaculty(res.data.data.faculty || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch courses list
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/courses');
      if (res.data && res.data.success) {
        setCourses(res.data.data.courses || []);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      setErrorMsg('Failed to load courses catalog database.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch class sections list
  const fetchSections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/sections');
      if (res.data && res.data.success) {
        setSections(res.data.data.sections || []);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
      setErrorMsg('Failed to load class sections registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchFaculty();
    if (activeTab === 'courses') {
      fetchCourses();
    } else {
      fetchSections();
      fetchCourses(); // Needed to populate course dropdown in section scheduler
    }
    clearForm();
    setErrorMsg('');
    setSuccessMsg('');
  }, [activeTab]);

  // Handle Course or Class Section Submit (Add / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (activeTab === 'courses') {
        // Validation
        if (!courseCode || !courseTitle || !courseCredits || !courseDeptId) {
          setErrorMsg('All course catalog fields are required.');
          return;
        }

        const payload = {
          courseCode: courseCode.trim().toUpperCase(),
          title: courseTitle.trim(),
          credits: parseInt(courseCredits, 10),
          departmentId: parseInt(courseDeptId, 10)
        };

        if (editingItem) {
          // Update Course
          const res = await api.put(`/api/courses/${editingItem.id}`, payload);
          if (res.data && res.data.success) {
            setSuccessMsg('Course catalog entry updated successfully!');
            clearForm();
            fetchCourses();
          }
        } else {
          // Add Course
          const res = await api.post('/api/courses', payload);
          if (res.data && res.data.success) {
            setSuccessMsg('Course added to registry catalog successfully!');
            clearForm();
            fetchCourses();
          }
        }
      } else {
        // Sections Tab
        if (!secCourseId || !secName || !secSemester) {
          setErrorMsg('Course, Section Name, and Semester details are required.');
          return;
        }

        const payload = {
          courseId: parseInt(secCourseId, 10),
          facultyId: secFacultyId ? parseInt(secFacultyId, 10) : null,
          sectionName: secName.trim(),
          semester: secSemester.trim()
        };

        if (editingItem) {
          // Update Section
          const res = await api.put(`/api/sections/${editingItem.id}`, payload);
          if (res.data && res.data.success) {
            setSuccessMsg('Class section delivery updated successfully!');
            clearForm();
            fetchSections();
          }
        } else {
          // Add Section
          const res = await api.post('/api/sections', payload);
          if (res.data && res.data.success) {
            setSuccessMsg('Class section scheduled successfully!');
            clearForm();
            fetchSections();
          }
        }
      }
    } catch (err) {
      console.error('Operation failed:', err);
      setErrorMsg(err.response?.data?.message || 'Operation failed. Check values or uniqueness.');
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setErrorMsg('');
    setSuccessMsg('');

    if (activeTab === 'courses') {
      setCourseCode(item.course_code);
      setCourseTitle(item.title);
      setCourseCredits(item.credits);
      setCourseDeptId(item.department_id);
    } else {
      setSecCourseId(item.course_id);
      setSecFacultyId(item.faculty_id || '');
      setSecName(item.section_name);
      setSecSemester(item.semester);
    }
  };

  const handleDeleteClick = async (id) => {
    const label = activeTab === 'courses' ? 'course' : 'class section';
    const warningText = activeTab === 'courses' 
      ? 'Deleting a course will automatically drop all scheduled class sections, roster enrollments, coursework submissions, and grade books for this course. Continue?' 
      : 'Deleting this class section will wipe enrollment rosters, attendance sheets, submissions, and marks registers for this section. Continue?';
    
    if (!window.confirm(warningText)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const endpoint = activeTab === 'courses' ? `/api/courses/${id}` : `/api/sections/${id}`;
      const res = await api.delete(endpoint);
      if (res.data && res.data.success) {
        setSuccessMsg(`${label.toUpperCase()} removed from server database.`);
        if (editingItem?.id === id) {
          clearForm();
        }
        if (activeTab === 'courses') fetchCourses();
        else fetchSections();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to delete ${label}. Check auth permissions.`);
    }
  };

  const clearForm = () => {
    setCourseCode('');
    setCourseTitle('');
    setCourseCredits('');
    setCourseDeptId('');
    setSecCourseId('');
    setSecFacultyId('');
    setSecName('');
    setSecSemester('');
    setEditingItem(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Header Selector Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
            Academic Catalog & Rosters
          </h3>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Maintain subjects syllabus catalog list and allocate scheduled class section deliveries.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '4px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '4px' }}>
          <button
            className={activeTab === 'courses' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('courses')}
          >
            Subject Catalog
          </button>
          <button
            className={activeTab === 'sections' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('sections')}
          >
            Class Deliveries
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <span className="badge badge-danger" style={{ display: 'block', padding: '12px', textAlign: 'center' }}>
          {errorMsg}
        </span>
      )}
      {successMsg && (
        <span className="badge badge-success" style={{ display: 'block', padding: '12px', textAlign: 'center' }}>
          {successMsg}
        </span>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.8fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        {/* Forms Workspace */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ marginBottom: '20px' }}>
            {editingItem ? 'Edit Scheduled Item' : (activeTab === 'courses' ? 'Add Subject Syllabus' : 'Schedule Class Section')}
          </h4>

          <form onSubmit={handleSubmit}>
            {activeTab === 'courses' ? (
              /* Course Form Fields */
              <>
                <div className="form-group">
                  <label className="form-label">Subject Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CS-301"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Syllabus Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Database Management Systems"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Academic Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    placeholder="e.g. 4"
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Offering Department</label>
                  <select
                    className="form-input"
                    value={courseDeptId}
                    onChange={(e) => setCourseDeptId(e.target.value)}
                    style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
                    required
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              /* Class Section Form Fields */
              <>
                <div className="form-group">
                  <label className="form-label">Select Subject</label>
                  <select
                    className="form-input"
                    value={secCourseId}
                    onChange={(e) => setSecCourseId(e.target.value)}
                    style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
                    required
                  >
                    <option value="">-- Select Course Catalog --</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.course_code} - {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Section Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Section-A"
                    value={secName}
                    onChange={(e) => setSecName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Academic Semester</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Spring 2026"
                    value={secSemester}
                    onChange={(e) => setSecSemester(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Allocated Instructor (Optional)</label>
                  <select
                    className="form-input"
                    value={secFacultyId}
                    onChange={(e) => setSecFacultyId(e.target.value)}
                    style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
                  >
                    <option value="">-- Assign Instructor Later --</option>
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.first_name} {f.last_name} ({f.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                {editingItem ? 'Save Updates' : (activeTab === 'courses' ? 'Onboard Subject' : 'Schedule Section')}
              </button>
              {(editingItem || courseCode || courseTitle || secName || secSemester) && (
                <button type="button" className="btn-secondary" onClick={clearForm}>
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Directory Listing Grid */}
        <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
          <h4 style={{ marginBottom: '20px' }}>
            {activeTab === 'courses' ? 'Subject Syllabus Directory' : 'Class Deliveries Schedule'}
          </h4>

          {loading ? (
            <p className="text-secondary" style={{ textAlign: 'center' }}>Loading listings database...</p>
          ) : (activeTab === 'courses' ? courses.length === 0 : sections.length === 0) ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
              No entries are registered.
            </p>
          ) : activeTab === 'courses' ? (
            /* Courses Table */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Code</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Subject Details</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Credits</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{c.course_code}</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: '500' }}>{c.title}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Dept ID: {c.department_id} {c.department_code && `(${c.department_code})`}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{c.credits} Credits</td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleEditClick(c)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)', borderColor: 'rgba(239, 68, 68, 0.15)', color: 'hsl(var(--color-danger))' }}
                          onClick={() => handleDeleteClick(c.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Class Sections Table */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Section / Sem</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Subject Catalog</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Instructor</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec) => (
                  <tr key={sec.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 'bold' }}>{sec.section_name}</div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{sec.semester}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: '500' }}>{sec.course_title}</div>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{sec.course_code}</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {sec.faculty_name ? (
                        <div style={{ fontSize: '0.8rem' }}>
                          <div>{sec.faculty_name}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{sec.employee_id}</div>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Vacant / Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleEditClick(sec)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)', borderColor: 'rgba(239, 68, 68, 0.15)', color: 'hsl(var(--color-danger))' }}
                          onClick={() => handleDeleteClick(sec.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
