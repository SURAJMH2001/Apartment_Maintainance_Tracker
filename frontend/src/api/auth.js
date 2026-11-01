import api from './axios';
export const authApi = {
  login: (data) => api.post('/api/v1/auth/login', data),
  logout: () => api.post('/api/v1/auth/logout'),
  changePassword: (data) => api.put('/api/v1/auth/change-password', data),
};
