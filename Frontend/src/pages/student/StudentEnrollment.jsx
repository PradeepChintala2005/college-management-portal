import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function StudentEnrollment() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch all scheduled sections and student's current enrollments
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      // 1. Fetch all class sections scheduled in the college
      const sectionRes = await api.get('/api/sections');
      let allSections = [];
      if (sectionRes.data && sectionRes.data.success) {
        allSections = sectionRes.data.data.sections || [];
      }

      // 2. Fetch active registrations for this student
      const enrollRes = await api.get(`/api/enrollments/student/${user.studentId}`);
      let activeEnrollments = [];
      if (enrollRes.data && enrollRes.data.success) {
        activeEnrollments = enrollRes.data.data.enrollments || [];
      }

      setSections(allSections);
      setEnrollments(activeEnrollments);
    } catch (err) {
      console.error('Failed to load course registration directories:', err);
      setErrorMsg('Failed to sync course schedules from the registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check if student is already enrolled in a specific class section
  const getEnrollmentForSection = (sectionId) => {
    return enrollments.find((e) => e.class_section_id === sectionId);
  };

  // Handle Register/Enroll course
  const handleEnroll = async (sectionId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/api/enrollments', {
        studentId: user.studentId,
        classSectionId: sectionId
      });

      if (res.data && res.data.success) {
        setSuccessMsg('Successfully enrolled in the course section!');
        fetchData(); // reload lists
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to complete registration.');
    }
  };

  // Handle Drop/Withdraw course
  const handleDrop = async (enrollmentId) => {
    if (!window.confirm('Are you sure you want to withdraw from this course section? This will drop your attendance stats and grade sheets.')) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.delete(`/api/enrollments/${enrollmentId}`);
      if (res.data && res.data.success) {
        setSuccessMsg('Successfully dropped course section.');
        fetchData(); // reload lists
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to withdraw from course.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          Course Registration Panel
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Browse available subjects and manage your active academic section enrollments.
        </p>
      </div>

      {/* Status Alerts */}
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
        gridTemplateColumns: '1.8fr 1.2fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        {/* Available Classes Grid */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ marginBottom: '20px' }}>Available Class Sections</h4>
          {loading ? (
            <p className="text-secondary" style={{ textAlign: 'center' }}>Syncing registry catalogs...</p>
          ) : sections.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
              No class sections are currently scheduled in the database.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {sections.map((sec) => {
                const enrollment = getEnrollmentForSection(sec.id);
                return (
                  <div
                    key={sec.id}
                    style={{
                      padding: '20px',
                      background: enrollment ? 'rgba(139, 92, 246, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                      border: enrollment ? '1px solid var(--color-primary-hover)' : '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        {sec.course_code}
                      </span>
                      {enrollment && (
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                          Registered
                        </span>
                      )}
                    </div>

                    <h5 style={{ margin: 0, fontSize: '1rem' }}>{sec.course_title}</h5>
                    
                    <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
                      Section: <strong>{sec.section_name}</strong> | Semester: <strong>{sec.semester}</strong>
                    </div>

                    <div className="text-muted" style={{ fontSize: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.02)', paddingTop: '8px' }}>
                      Instructor: {sec.faculty_name || 'Vacant / Unassigned'}
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      {enrollment ? (
                        <button
                          className="btn-secondary"
                          style={{ width: '100%', padding: '6px 12px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'hsl(var(--color-danger))' }}
                          onClick={() => handleDrop(enrollment.enrollment_id)}
                        >
                          Withdraw Course
                        </button>
                      ) : (
                        <button
                          className="btn-primary"
                          style={{ width: '100%', padding: '6px 12px', fontSize: '0.75rem' }}
                          onClick={() => handleEnroll(sec.id)}
                        >
                          Register Section
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Schedule Summary */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ marginBottom: '16px' }}>My Active Registrations</h4>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
            List of scheduled class section deliverables you are currently enrolled in.
          </p>

          {enrollments.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '20px', background: 'rgba(255, 255, 255, 0.01)', borderRadius: 'var(--radius-sm)' }}>
              You are not registered in any classes yet. Choose sections from the available catalog list!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {enrollments.map((e) => (
                <div
                  key={e.enrollment_id}
                  style={{
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{e.course_code}</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{e.section_name}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '500', margin: '4px 0' }}>
                    {e.course_title}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Semester: {e.semester}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
