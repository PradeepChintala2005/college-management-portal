import { createContext, useContext, useState, useEffect } from 'react';

// 1. Create the Auth Context
const AuthContext = createContext(null);

// 2. Custom hook to consume the Auth Context easily
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on application mount (hydration)
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('college_jwt_token');
      const storedUser = localStorage.getItem('college_user_profile');

      if (storedToken && storedUser) {
        setUser({
          token: storedToken,
          ...JSON.parse(storedUser)
        });
      }
    } catch (err) {
      console.error('Failed to parse stored authentication session:', err);
      // Clean up corrupted storage
      localStorage.removeItem('college_jwt_token');
      localStorage.removeItem('college_user_profile');
    } finally {
      setLoading(false);
    }
  }, []);

  // Login action: Stores credentials and updates local state
  const login = (token, userProfile) => {
    localStorage.setItem('college_jwt_token', token);
    localStorage.setItem('college_user_profile', JSON.stringify(userProfile));
    
    setUser({
      token,
      ...userProfile
    });
  };

  // Logout action: Clears credentials and resets local state
  const logout = () => {
    localStorage.removeItem('college_jwt_token');
    localStorage.removeItem('college_user_profile');
    setUser(null);
  };

  // Values exposed globally to all React child components
  const contextValue = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isFaculty: user?.role === 'faculty',
    isStudent: user?.role === 'student'
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
