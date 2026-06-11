import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import api from './services/api';

// High-Fidelity Role-Based Dashboard Parent Wrappers
import AdminDashboard from './pages/admin/AdminDashboard';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import StudentDashboard from './pages/student/StudentDashboard';

import './App.css';

/**
 * Root Redirector - Dispatches users to their dashboard home based on their authenticated role.
 */
function RootDispatcher() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Auto-route to the matching workspace dashboard
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;

  return <Navigate to="/login" replace />;
}

/**
 * Login Screen - Interactive UI with API requests and error handling
 */
function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);

    try {
      // Send POST request using our Axios client with automatic relative proxies
      const response = await api.post('/api/auth/login', { email, password });
      
      if (response.data && response.data.success) {
        const { token, user } = response.data.data;
        // Save to global auth context
        login(token, user);
        // Redirect to dispatcher
        navigate('/');
      } else {
        setErrorMsg(response.data?.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(err.response?.data?.message || 'Server connection failed. Make sure backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setSeeding(true);

    try {
      const response = await api.post('/api/auth/seed');
      if (response.data && response.data.success) {
        setInfoMsg('Database seeded successfully!\nUse one of these default accounts:\n• Admin: admin@college.edu\n• Faculty: prof.cse@college.edu\n• Student: student.cse@college.edu\nPassword for all: password123');
      } else {
        setErrorMsg('Failed to seed database.');
      }
    } catch (err) {
      console.error('Seeding error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to connect to backend server for seeding.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.1) 0%, transparent 60%)'
    }} className="animate-fade-in">
      <div className="glass-panel" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '40px',
      }}>
        <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2rem' }}>
          Welcome back
        </h2>
        <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.9rem', marginBottom: '24px' }}>
          Sign in to the College Management Portal
        </p>

        {errorMsg && (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <span className="badge badge-danger" style={{ display: 'block', padding: '8px' }}>
              {errorMsg}
            </span>
          </div>
        )}

        {infoMsg && (
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <span className="badge badge-success" style={{ display: 'block', padding: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
              {infoMsg}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. admin@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || seeding}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || seeding}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '12px' }}
            disabled={submitting || seeding}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Database empty or reset? </span>
          <button 
            type="button" 
            onClick={handleSeed} 
            disabled={seeding || submitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b5cf6',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: 0
            }}
          >
            {seeding ? 'Seeding...' : 'Seed Default Accounts'}
          </button>
        </div>
      </div>
    </div>
  );
}



function UnauthorizedScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }} className="animate-fade-in">
      <span className="badge badge-danger" style={{ fontSize: '1rem', padding: '8px 16px' }}>
        Access Denied
      </span>
      <h2>You are not authorized to view this page.</h2>
      <p className="text-muted">Your account role does not have permission to access the requested view.</p>
      <Link to="/" className="btn-primary">Return to Dashboard</Link>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/unauthorized" element={<UnauthorizedScreen />} />

          {/* Protected Routes: Gatekeeper guards panels based on user roles */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/*" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/*" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback dispatcher */}
          <Route path="*" element={<RootDispatcher />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
