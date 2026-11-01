import api from './axios';
export const alertsApi = {
  getAll: (params) => api.get('/api/v1/alerts', { params }),
  resolve: (id) => api.put(`/api/v1/alerts/${id}/resolve`),
};
