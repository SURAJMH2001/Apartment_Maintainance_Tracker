import api from './axios';

export const announcementsApi = {
  getAll: () => api.get('/api/v1/announcements'),
  create: (data) => api.post('/api/v1/announcements', data),
  delete: (id) => api.delete(`/api/v1/announcements/${id}`),
};
