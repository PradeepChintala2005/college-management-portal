import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Sub-page components imports
import AdminDepartments from './AdminDepartments';
import AdminUsers from './AdminUsers';
import AdminCourses from './AdminCourses';
import AdminAnnouncements from './AdminAnnouncements';

// Admin Overview Sub-component
function AdminOverview() {
  const [stats, setStats] = useState({
    departments: 0,
    courses: 0,
    students: 0,
    faculty: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [deptRes, courseRes, studentRes, facultyRes] = await Promise.all([
        api.get('/api/departments'),
        api.get('/api/courses'),
        api.get('/api/students'),
        api.get('/api/faculty')
      ]);

      setStats({
        departments: deptRes.data?.data?.length || 0,
        courses: courseRes.data?.data?.courses?.length || 0,
        students: studentRes.data?.data?.students?.length || 0,
        faculty: facultyRes.data?.data?.faculty?.length || 0
      });
    } catch (err) {
      console.error('Failed to load dashboard overview stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
          Console Overview
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          Real-time registry statistics and quick links to manage portal configurations.
        </p>
      </div>

      {loading ? (
        <p className="text-secondary" style={{ textAlign: 'center', padding: '40px' }}>
          Compiling server statistics...
        </p>
      ) : (
        /* Stats Grid Cards */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {/* Card 1 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Departments
            </span>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>{stats.departments}</span>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '10px' }}>Active academic divisions</p>
          </div>
          {/* Card 2 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Subjects Catalog
            </span>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>{stats.courses}</span>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '10px' }}>Program syllabus courses</p>
          </div>
          {/* Card 3 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Students
            </span>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>{stats.students}</span>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '10px' }}>Onboarded student profiles</p>
          </div>
          {/* Card 4 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Faculty Members
            </span>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>{stats.faculty}</span>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '10px' }}>Onboarded teaching staff</p>
          </div>
        </div>
      )}

      {/* Quick Info panel */}
      <div className="glass-panel" style={{ padding: '30px', marginTop: '10px' }}>
        <h4 style={{ marginBottom: '16px' }}>System Operator Instructions</h4>
        <p className="text-secondary" style={{ fontSize: '0.95rem', marginBottom: '16px', lineHeight: 1.6 }}>
          As an Administrator, you hold unrestricted access to create database nodes. First, register departments under **Manage Departments**. Once departments are ready, you can onboarding students and faculty profiles, linking them to departments. Courses can then be registered and sections assigned to instructors.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/admin/departments" className="btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>Onboard Departments</Link>
          <Link to="/admin/users" className="btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>Onboard Users</Link>
        </div>
      </div>
    </div>
  );
}

// Parent dashboard router wrapper
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Helper function to check active path for styling navbar highlights
  const isPathActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="grid-dashboard" style={{ minHeight: '100vh', background: 'hsl(var(--bg-primary))' }}>
      {/* Left Sidebar navigation */}
      <aside className="glass-panel" style={{
        margin: '20px',
        marginRight: 0,
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        borderRadius: 'var(--radius-lg)'
      }}>
        {/* Brand logo title */}
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.4rem', fontWeight: 800, textAlign: 'center' }}>
            Portal Console
          </h2>
          <p className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Administrator mode
          </p>
        </div>

        {/* Links Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <Link
            to="/admin"
            className={isPathActive('/admin') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Dashboard Overview
          </Link>
          <Link
            to="/admin/departments"
            className={isPathActive('/admin/departments') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Manage Departments
          </Link>
          <Link
            to="/admin/users"
            className={isPathActive('/admin/users') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            User Accounts
          </Link>
          <Link
            to="/admin/courses"
            className={isPathActive('/admin/courses') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Subject Catalog
          </Link>
          <Link
            to="/admin/announcements"
            className={isPathActive('/admin/announcements') ? 'btn-primary' : 'btn-secondary'}
            style={{ justifyContent: 'flex-start', padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Notice Board Announcements
          </Link>
        </nav>

        {/* User logout action details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email}
            </span>
            <span className="badge badge-warning" style={{ fontSize: '0.65rem', alignSelf: 'start' }}>
              {user?.role}
            </span>
          </div>
          <button className="btn-secondary" style={{ padding: '8px', fontSize: '0.85rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'hsl(var(--color-danger))' }} onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto' }}>
        {/* Main nested route displays */}
        <div className="glass-panel animate-fade-in" style={{ flex: 1, padding: '40px' }}>
          <Routes>
            <Route path="/" element={<AdminOverview />} />
            <Route path="/departments" element={<AdminDepartments />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/courses" element={<AdminCourses />} />
            <Route path="/announcements" element={<AdminAnnouncements />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
