import api from './axios';

export const vendorsApi = {
  getAll: (params) => api.get('/api/v1/vendors', { params }),
  create: (data) => api.post('/api/v1/vendors', data),
  update: (id, data) => api.put(`/api/v1/vendors/${id}`, data),
  delete: (id) => api.delete(`/api/v1/vendors/${id}`),
};

