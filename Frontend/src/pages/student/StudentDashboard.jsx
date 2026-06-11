import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Sub-pages imports
import StudentCheckIn from './StudentCheckIn';
import StudentGrades from './StudentGrades';
import StudentAssignments from './StudentAssignments';
import StudentEnrollment from './StudentEnrollment';

// Student Overview / Announcements Feed sub-component
function StudentOverview() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/api/announcements');
      if (res.data && res.data.success) {
        setAnnouncements(res.data.data.announcements || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to sync notice board bulletins feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
          Welcome, {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Student'}!
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          View notice board bulletins and track your dashboard workspace.
        </p>
      </div>

      {errorMsg && (
        <span className="badge badge-danger" style={{ display: 'block', padding: '12px', textAlign: 'center' }}>
          {errorMsg}
        </span>
      )}

      {/* Overview stats panel summary */}
      <div className="glass-panel" style={{ padding: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h4 style={{ marginBottom: '8px' }}>Active Student Session</h4>
          <p className="text-secondary" style={{ fontSize: '0.9rem', margin: 0 }}>
            Department: **{user?.departmentCode || 'General'}** | Roll Number: **{user?.rollNumber || 'Unassigned'}**
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/student/check-in" className="btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>Scan Class QR</Link>
          <Link to="/student/grades" className="btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>View Grades</Link>
        </div>
      </div>

      {/* Bulletins notices feed board */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h4 style={{ marginBottom: '20px' }}>Notice Board Bulletins Feed</h4>

        {loading ? (
          <p className="text-secondary" style={{ textAlign: 'center' }}>Syncing notices...</p>
        ) : announcements.length === 0 ? (
          <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
            No announcement bulletins have been published to your feed board.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {announcements.map((notice) => (
              <div
                key={notice.announcement_id}
                style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                      {notice.department_code || 'General'}
                    </span>
                    <span style={{ fontWeight: '700', fontSize: '1rem' }}>{notice.title}</span>
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>{notice.created_at}</span>
                </div>

                <p className="text-secondary" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: '6px 0' }}>
                  {notice.content}
                </p>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.02)', paddingTop: '8px', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                  Author: {notice.author_name} ({notice.author_email})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Parent dashboard router wrapper
export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isPathActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="grid-dashboard" style={{ minHeight: '100vh', background: 'hsl(var(--bg-primary))' }}>
      {/* Left Sidebar */}
      <aside className="glass-panel" style={{
        margin: '20px',
        marginRight: 0,
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        borderRadius: 'var(--radius-lg)'
      }}>
        {/* Brand logo */}
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.4rem', fontWeight: 800, textAlign: 'center' }}>
            Student Portal
          </h2>
          <p className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Learner mode
          </p>
        </div>

        {/* Links Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <Link
            to="/student"
            className={isPathActive('/student') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Portal Overview
          </Link>
          <Link
            to="/student/check-in"
            className={isPathActive('/student/check-in') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Log Attendance (QR)
          </Link>
          <Link
            to="/student/grades"
            className={isPathActive('/student/grades') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            My Scorecard
          </Link>
          <Link
            to="/student/assignments"
            className={isPathActive('/student/assignments') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Assignments Center
          </Link>
          <Link
            to="/student/enrollment"
            className={isPathActive('/student/enrollment') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Course Registration
          </Link>
        </nav>

        {/* Profile Details & Logout controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.firstName} {user?.lastName}
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.65rem', alignSelf: 'start' }}>
              {user?.role}
            </span>
          </div>
          <button className="btn-secondary" style={{ padding: '8px', fontSize: '0.85rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'hsl(var(--color-danger))' }} onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto' }}>
        <div className="glass-panel animate-fade-in" style={{ flex: 1, padding: '40px' }}>
          <Routes>
            <Route path="/" element={<StudentOverview />} />
            <Route path="/check-in" element={<StudentCheckIn />} />
            <Route path="/grades" element={<StudentGrades />} />
            <Route path="/assignments" element={<StudentAssignments />} />
            <Route path="/enrollment" element={<StudentEnrollment />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
