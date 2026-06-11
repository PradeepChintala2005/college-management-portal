import axios from 'axios';

// 1. Create a custom Axios instance
const api = axios.create({
  baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '' // Relies on our Vite proxy server configuration in local development
    : (import.meta.env.VITE_API_URL || 'https://college-management-portal-a65e.onrender.com'), // Production deployed Render URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 2. Request Interceptor: Inject JWT token into headers of outgoing HTTP requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('college_jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Response Interceptor: Handle auth errors (e.g. force logout on expired token)
api.interceptors.response.use(
  (response) => {
    // Return standard response data directly to call sites
    return response;
  },
  (error) => {
    // If the server returns 401 Unauthorized, it means the JWT is invalid or expired
    if (error.response && error.response.status === 401) {
      console.warn('Authentication token expired or rejected. Logging out user...');
      localStorage.removeItem('college_jwt_token');
      localStorage.removeItem('college_user_profile');
      
      // Force reload to clean React state and redirect to login screen
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
