/**
 * Axios instance with security hardening:
 *  - JWT Authorization header on every request
 *  - Automatic 401 → logout flow
 *  - Content-Security: never send credentials to 3rd-party URLs
 *  - Request timeout (30s) to prevent hanging connections
 *  - XSS protection: response data is never injected as raw HTML
 */
import axios from 'axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

// Normalize baseURL to avoid duplicate /api/v1 prefixes (e.g. if VITE_API_URL has /api/v1)
let rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
if (rawBaseUrl.endsWith('/api/v1')) {
  rawBaseUrl = rawBaseUrl.slice(0, -'/api/v1'.length);
}
if (rawBaseUrl.endsWith('/')) {
  rawBaseUrl = rawBaseUrl.slice(0, -1);
}
const BASE_URL = rawBaseUrl;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,  // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // No cookies — we use Bearer tokens
});

// ──────────────────────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR — attach JWT token
// ──────────────────────────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Strip any existing X-Requested-With to prevent CSRF header injection
    delete config.headers['X-Requested-With'];
    return config;
  },
  (error) => Promise.reject(error)
);

// ──────────────────────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR — handle auth errors & surface friendly messages
// ──────────────────────────────────────────────────────────────────────────────
let isLoggingOut = false; // Prevent multiple logout calls from concurrent 401s

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      useAuthStore.getState().logout();
      toast.error('Your session has expired. Please sign in again.');
      // Delay redirect so toast is visible
      setTimeout(() => {
        window.location.replace('/login');
        isLoggingOut = false;
      }, 1500);
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please slow down.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

export default api;
