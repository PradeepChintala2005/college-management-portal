import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function StudentGrades() {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch report cards and attendance records from server
  const fetchStudentRecords = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Fetch grades scorecard
      const gradesRes = await api.get(`/api/marks/student/${user.studentId}`);
      if (gradesRes.data && gradesRes.data.success) {
        setGrades(gradesRes.data.data.grades);
      }

      // 2. Fetch attendance logs history
      const attRes = await api.get(`/api/attendance/student/${user.studentId}`);
      if (attRes.data && attRes.data.success) {
        setAttendanceLogs(attRes.data.data.logs);
      }
    } catch (err) {
      console.error('Failed to load student records:', err);
      setErrorMsg('Failed to sync academic records from registry server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentRecords();
  }, []);

  // Compute Overall Attendance Metrics
  const totalClasses = attendanceLogs.length;
  const presentClasses = attendanceLogs.filter(
    (log) => log.status === 'Present' || log.status === 'Late'
  ).length;
  const attendanceRatio = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          My Academic Transcript
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Inspect report cards, graded evaluations, and your live attendance percentage metrics.
        </p>
      </div>

      {errorMsg && (
        <span className="badge badge-danger" style={{ display: 'block', padding: '12px', textAlign: 'center' }}>
          {errorMsg}
        </span>
      )}

      {loading ? (
        <p className="text-secondary" style={{ textAlign: 'center', padding: '40px' }}>
          Retrieving academic archives...
        </p>
      ) : (
        <>
          {/* Ratios Summary Widgets */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px'
          }}>
            {/* Card 1: Attendance ratio */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: `4px solid ${attendanceRatio >= 75 ? 'hsl(var(--color-success))' : 'hsl(var(--color-danger))'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}>
                {attendanceRatio}%
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                  Attendance Ratio
                </span>
                <h4 style={{ margin: '4px 0 0 0' }}>{presentClasses} / {totalClasses} classes</h4>
                <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                  {attendanceRatio >= 75 ? '✅ Meets 75% limit' : '❌ Below 75% catalog limit'}
                </p>
              </div>
            </div>

            {/* Card 2: Total grades */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                Graded Evaluations
              </span>
              <h3 style={{ margin: 0, fontSize: '2rem' }}>{grades.length} Scores</h3>
              <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '6px' }}>Registered assignments, quizzes & exams</p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: '30px',
            alignItems: 'start'
          }}>
            {/* Grades transcript sheet */}
            <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
              <h4 style={{ marginBottom: '20px' }}>Syllabus Scorecard Grades</h4>
              {grades.length === 0 ? (
                <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                  No grade book scores have been published.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase' }}>Course</th>
                      <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase' }}>Assessment</th>
                      <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((g) => {
                      const ratio = Math.round((g.marks_obtained / g.max_marks) * 100);

                      return (
                        <tr key={g.mark_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '0.85rem' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: '600' }}>{g.course_title}</div>
                            <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '2px 6px', marginTop: '4px' }}>{g.course_code}</span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>{g.exam_type}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                            {g.marks_obtained} / {g.max_marks}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                            <span style={{ color: ratio >= 75 ? 'hsl(var(--color-success))' : 'hsl(var(--color-danger))' }}>
                              {ratio}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Attendance checklist history */}
            <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
              <h4 style={{ marginBottom: '20px' }}>Attendance Check-In Logs</h4>
              {attendanceLogs.length === 0 ? (
                <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                  No attendance check-in logs found.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '12px 6px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '12px 6px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase' }}>Subject</th>
                      <th style={{ padding: '12px 6px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '0.8rem' }}>
                        <td style={{ padding: '10px 6px' }}>{log.session_date}</td>
                        <td style={{ padding: '10px 6px', fontWeight: '500' }}>{log.course_code}</td>
                        <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                          <span className={`badge ${
                            log.status === 'Present' ? 'badge-success' : log.status === 'Late' ? 'badge-warning' : 'badge-danger'
                          }`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
