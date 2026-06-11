import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function FacultyAttendance() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [roster, setRoster] = useState([]); // students enrolled in selected section
  const [attendanceStats, setAttendanceStats] = useState([]); // stats spreadsheet for section
  const [loading, setLoading] = useState(false);

  // Manual marking state
  const [manualStatuses, setManualStatuses] = useState({}); // studentId -> status ('Present', 'Absent', 'Late')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // QR Session Generation states
  const [qrToken, setQrToken] = useState('');
  const [qrExpiration, setQrExpiration] = useState('5'); // minutes
  const [qrSessionId, setQrSessionId] = useState(null);

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch all class sections and filter where this faculty is instructor
  const fetchFacultySections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/sections');
      if (res.data && res.data.success) {
        // Filter class sections taught by this faculty member
        const facultySections = (res.data.data.sections || []).filter(
          (sec) => sec.faculty_id === user.facultyId
        );
        setSections(facultySections);
      }
    } catch (err) {
      console.error('Failed to load faculty sections:', err);
      setErrorMsg('Could not fetch class schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultySections();
  }, []);

  // Fetch section details: Student Roster and Attendance Stats
  const handleSectionChange = async (e) => {
    const sectionId = e.target.value;
    setSelectedSectionId(sectionId);
    setRoster([]);
    setAttendanceStats([]);
    setQrToken('');
    setQrSessionId(null);
    setErrorMsg('');
    setSuccessMsg('');

    if (!sectionId) return;

    try {
      setLoading(true);
      // 1. Fetch student roster enrolled in this section
      const rosterRes = await api.get(`/api/enrollments/section/${sectionId}`);
      if (rosterRes.data && rosterRes.data.success) {
        setRoster(rosterRes.data.data.roster);
        // Initialize manual status values to 'Present' by default
        const initialStatuses = {};
        rosterRes.data.data.roster.forEach((student) => {
          initialStatuses[student.student_id] = 'Present';
        });
        setManualStatuses(initialStatuses);
      }

      // 2. Fetch attendance stats logs spreadsheet
      const statsRes = await api.get(`/api/attendance/section/${sectionId}`);
      if (statsRes.data && statsRes.data.success) {
        setAttendanceStats(statsRes.data.data.sheet || []);
      }
    } catch (err) {
      console.error('Failed to load section details:', err);
      setErrorMsg('Failed to load section roster. Check permissions.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Manual Attendance Checklist
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSectionId) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Create a session date slot first
      const sessionRes = await api.post('/api/attendance/session', {
        classSectionId: parseInt(selectedSectionId, 10),
        sessionDate
      });

      if (sessionRes.data && sessionRes.data.success) {
        const sessionId = sessionRes.data.data.sessionId;

        // 2. Mark records for each student in the checklist
        const markPromises = Object.entries(manualStatuses).map(([studentId, status]) => {
          return api.post('/api/attendance/mark', {
            sessionId,
            studentId: parseInt(studentId, 10),
            status
          });
        });

        await Promise.all(markPromises);

        setSuccessMsg('Attendance checklist logged successfully!');
        // Refresh stats spreadsheet
        const statsRes = await api.get(`/api/attendance/section/${selectedSectionId}`);
        if (statsRes.data && statsRes.data.success) {
          setAttendanceStats(statsRes.data.data.sheet || []);
        }
      }
    } catch (err) {
      console.error('Failed to log manual attendance:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to record manual attendance checklist.');
    }
  };

  // Generate Dynamic QR Code Session
  const handleGenerateQR = async () => {
    if (!selectedSectionId) return;

    setErrorMsg('');
    setSuccessMsg('');

    // Generate a secure unique random token
    const token = 'QR_' + Math.random().toString(36).substring(2, 15).toUpperCase();

    try {
      const res = await api.post('/api/attendance/session', {
        classSectionId: parseInt(selectedSectionId, 10),
        sessionDate: new Date().toISOString().split('T')[0],
        qrCodeToken: token,
        expiresInMinutes: parseInt(qrExpiration, 10)
      });

      if (res.data && res.data.success) {
        setQrToken(token);
        setQrSessionId(res.data.data.sessionId);
        setSuccessMsg('Secure QR session initiated successfully!');
      }
    } catch (err) {
      console.error('QR creation error:', err);
      setErrorMsg('Failed to generate attendance QR code session.');
    }
  };

  const handleStatusChange = (studentId, status) => {
    setManualStatuses({
      ...manualStatuses,
      [studentId]: status
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          Class Attendance Manager
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Schedule live attendance sessions, generate check-in QR tokens, and mark checklists.
        </p>
      </div>

      {/* Select class section */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="form-label" style={{ margin: 0 }}>Select Active Class Section</label>
          <select
            className="form-input"
            value={selectedSectionId}
            onChange={handleSectionChange}
            style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
          >
            <option value="">-- Choose Class Section --</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.course_code} {sec.course_title} ({sec.section_name} - {sec.semester})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '180px' }}>
          <label className="form-label" style={{ margin: 0 }}>Session Date</label>
          <input
            type="date"
            className="form-input"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />
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

      {selectedSectionId && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.3fr',
          gap: '30px',
          alignItems: 'start'
        }}>
          {/* Left Column: Manual Mark & QR Code generator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* QR Code generator card */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h4 style={{ marginBottom: '16px' }}>Self Check-In QR Session</h4>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
                Open a time-limited digital check-in gateway. Students scan or submit the token on their dashboards to log attendance.
              </p>

              <div className="form-group">
                <label className="form-label">Expiration Limit (Minutes)</label>
                <select
                  className="form-input"
                  value={qrExpiration}
                  onChange={(e) => setQrExpiration(e.target.value)}
                  style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
                >
                  <option value="2">2 Minutes (Fast timeout)</option>
                  <option value="5">5 Minutes (Standard)</option>
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes</option>
                </select>
              </div>

              <button className="btn-primary" style={{ width: '100%' }} onClick={handleGenerateQR}>
                Generate Secure QR Session
              </button>

              {qrToken && (
                <div style={{
                  marginTop: '25px',
                  padding: '24px',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  background: 'rgba(139, 92, 246, 0.05)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  animation: 'fadeIn 0.3s forwards'
                }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Active check-in token
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '2px', color: 'hsl(var(--color-primary-hover))' }}>
                    {qrToken}
                  </div>
                  <div className="badge badge-success" style={{ marginTop: '12px', fontSize: '0.65rem' }}>
                    Active for {qrExpiration} minutes
                  </div>
                </div>
              )}
            </div>

            {/* Manual Attendance Checklist Form */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h4 style={{ marginBottom: '20px' }}>Manual Roster Checklist</h4>
              {roster.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.9rem', textAlign: 'center' }}>No students enrolled in section roster.</p>
              ) : (
                <form onSubmit={handleManualSubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto', paddingRight: '6px', marginBottom: '24px' }}>
                    {roster.map((student) => (
                      <div key={student.student_id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: '600' }}>{student.first_name} {student.last_name}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{student.roll_number}</div>
                        </div>

                        {/* Status selector */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['Present', 'Absent', 'Late'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              className={manualStatuses[student.student_id] === st ? 'btn-primary' : 'btn-secondary'}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                borderRadius: 'var(--radius-sm)',
                                ...(manualStatuses[student.student_id] !== st && { background: 'transparent' })
                              }}
                              onClick={() => handleStatusChange(student.student_id, st)}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                    Save Attendance Checklist
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* Right Column: Attendance statistics spreadsheet */}
          <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
            <h4 style={{ marginBottom: '16px' }}>Attendance Roster Statistics</h4>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '24px' }}>
              Summary spreadsheet of student attendance logs for this class delivery section.
            </p>

            {loading ? (
              <p className="text-secondary" style={{ textAlign: 'center' }}>Compiling logs...</p>
            ) : attendanceStats.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                No attendance stats are registered for this section.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase' }}>Roll No</th>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase' }}>Student Name</th>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>P</th>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>L</th>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>A</th>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceStats.map((stat) => {
                    const total = stat.total_present + stat.total_late + stat.total_absent;
                    const presentRatio = total > 0 
                      ? Math.round(((stat.total_present + stat.total_late) / total) * 100)
                      : 0;

                    return (
                      <tr key={stat.student_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{stat.roll_number}</td>
                        <td style={{ padding: '12px 8px' }}>{stat.first_name} {stat.last_name}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: 'hsl(var(--color-success))', fontWeight: 'bold' }}>{stat.total_present}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: 'hsl(var(--color-warning))', fontWeight: 'bold' }}>{stat.total_late}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: 'hsl(var(--color-danger))', fontWeight: 'bold' }}>{stat.total_absent}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                          <span className={presentRatio >= 75 ? 'text-success' : 'text-danger'} style={{ color: presentRatio >= 75 ? 'hsl(var(--color-success))' : 'hsl(var(--color-danger))' }}>
                            {presentRatio}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
