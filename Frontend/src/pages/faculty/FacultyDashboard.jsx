import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Sub-pages imports
import FacultyAttendance from './FacultyAttendance';
import FacultyMarks from './FacultyMarks';
import FacultyAssignments from './FacultyAssignments';
import FacultyAnnouncements from './FacultyAnnouncements';

// Faculty Overview Dashboard Sub-component
function FacultyOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [announcementsCount, setAnnouncementsCount] = useState(0);

  const fetchOverviewDetails = async () => {
    try {
      setLoading(true);
      // 1. Fetch class sections list
      const secRes = await api.get('/api/sections');
      let facultySections = [];
      if (secRes.data && secRes.data.success) {
        facultySections = (secRes.data.data.sections || []).filter(
          (sec) => sec.faculty_id === user.facultyId
        );
        setSections(facultySections);
      }

      // 2. Fetch rosters count for each assigned section
      if (facultySections.length > 0) {
        const rosterPromises = facultySections.map((sec) => 
          api.get(`/api/enrollments/section/${sec.id}`)
        );
        const rosterResponses = await Promise.all(rosterPromises);
        let totalStudents = 0;
        rosterResponses.forEach((res) => {
          if (res.data && res.data.success) {
            totalStudents += res.data.data.roster.length;
          }
        });
        setStudentCount(totalStudents);
      }

      // 3. Fetch announcements count
      const announceRes = await api.get('/api/announcements');
      if (announceRes.data && announceRes.data.success) {
        // filter notices posted by this faculty
        const myNotices = (announceRes.data.data.announcements || []).filter(
          (n) => n.author_id === user.id
        );
        setAnnouncementsCount(myNotices.length);
      }

    } catch (err) {
      console.error('Failed to load faculty overview details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewDetails();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
          Welcome back, {user?.firstName ? `Professor ${user.firstName} ${user.lastName}` : 'Professor'}!
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          Teaching workspace console summary and scheduled class directories.
        </p>
      </div>

      {loading ? (
        <p className="text-secondary" style={{ textAlign: 'center', padding: '40px' }}>
          Compiling workspace stats...
        </p>
      ) : (
        <>
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px'
          }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Assigned Classes
              </span>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>{sections.length}</span>
              <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '10px' }}>Active class sections</p>
            </div>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Students
              </span>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>{studentCount}</span>
              <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '10px' }}>Students enrolled in your sections</p>
            </div>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Notices
              </span>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>{announcementsCount}</span>
              <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '10px' }}>Bulletins posted by you</p>
            </div>
          </div>

          {/* Teaching Schedule List */}
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h4 style={{ marginBottom: '20px' }}>Your Scheduled Class Sections</h4>
            {sections.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                You are not currently assigned to teach any class sections.
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                {sections.map((sec) => (
                  <div
                    key={sec.id}
                    style={{
                      padding: '20px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <span className="badge badge-warning" style={{ alignSelf: 'flex-start', fontSize: '0.65rem' }}>
                      {sec.course_code}
                    </span>
                    <h5 style={{ margin: 0, fontSize: '1rem' }}>{sec.course_title}</h5>
                    <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      Section: **{sec.section_name}** | Semester: **{sec.semester}**
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <Link to="/faculty/attendance" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1 }}>Attendance</Link>
                      <Link to="/faculty/marks" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1 }}>Gradebook</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Parent dashboard router wrapper
export default function FacultyDashboard() {
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
            Faculty Workspace
          </h2>
          <p className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Educator mode
          </p>
        </div>

        {/* Links Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <Link
            to="/faculty"
            className={isPathActive('/faculty') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Workspace Overview
          </Link>
          <Link
            to="/faculty/attendance"
            className={isPathActive('/faculty/attendance') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Attendance Ledger
          </Link>
          <Link
            to="/faculty/marks"
            className={isPathActive('/faculty/marks') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Marks Gradebook
          </Link>
          <Link
            to="/faculty/assignments"
            className={isPathActive('/faculty/assignments') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Course Assignments
          </Link>
          <Link
            to="/faculty/announcements"
            className={isPathActive('/faculty/announcements') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Bulletin Announcements
          </Link>
        </nav>

        {/* Profile & Logout controls */}
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
            <Route path="/" element={<FacultyOverview />} />
            <Route path="/attendance" element={<FacultyAttendance />} />
            <Route path="/marks" element={<FacultyMarks />} />
            <Route path="/assignments" element={<FacultyAssignments />} />
            <Route path="/announcements" element={<FacultyAnnouncements />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
