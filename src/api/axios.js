import axios from 'axios';

// Base URL comes from the environment variable defined in .env
// In development: http://127.0.0.1:8000/api/v1
// In production:  https://yourserver.com/api/v1
// Never hardcode this value directly in code.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Request interceptor ────────────────────────────────────────────────────
// Attaches the Bearer token to every outgoing request automatically.
// The token is read from localStorage where it was saved on login.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────
// ONE interceptor only. Handles 401 (expired/invalid session) globally.
// When the server says the token is no longer valid, we clear local storage
// and send the user back to the login page immediately.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all locally stored session data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Hard redirect — ensures all React state is also cleared
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;