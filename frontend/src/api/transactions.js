import api from './axios';
export const transactionsApi = {
  getAll: (params) => api.get('/api/v1/transactions', { params }),
  create: (data) => api.post('/api/v1/transactions', data),
  update: (id, data) => api.put(`/api/v1/transactions/${id}`, data),
  delete: (id) => api.delete(`/api/v1/transactions/${id}`),
};
