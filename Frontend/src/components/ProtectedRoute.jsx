import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component - Guards frontend views based on login state and user roles
 * @param {JSX.Element} children - The target screen to render if authorized
 * @param {Array<string>} allowedRoles - Optional list of roles allowed to view this page
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // 1. If still reading token from localStorage, display a loading placeholder
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'hsl(var(--bg-primary))',
        color: 'hsl(var(--text-secondary))'
      }}>
        <h2>Validating security session...</h2>
      </div>
    );
  }

  // 2. If user is not logged in, redirect them to the Login screen
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. If specific roles are required, verify the logged-in user possesses an authorized role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Authorized! Render the child screen component
  return children;
};

export default ProtectedRoute;
