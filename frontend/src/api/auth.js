import api from './axios';

export const authApi = {
  login: (data) => api.post('/api/v1/auth/login', data),
  logout: () => api.post('/api/v1/auth/logout'),
  getMe: () => api.get('/api/v1/auth/me'),
  updateProfile: (data) => api.put('/api/v1/auth/me', data),
  updateMe: (data) => api.put('/api/v1/auth/me', data),
  onboarding: (data) => api.post('/api/v1/auth/onboarding', data),
  linkFlat: (data) => api.post('/api/v1/auth/link-flat', data),
  claimAccessCode: (code) => api.post('/api/v1/auth/claim-access-code', { access_code: code }),
  changePassword: (data) => api.put('/api/v1/auth/change-password', data),
  googleAuth: (token) => api.post('/api/v1/auth/google', { token }),
};

export default authApi;
