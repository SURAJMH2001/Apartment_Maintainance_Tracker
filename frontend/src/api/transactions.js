import api from './axios';

export const transactionsApi = {
  getAll: (params) => api.get('/api/v1/transactions', { params: { limit: 1000, ...params } }),
  getSummary: () => api.get('/api/v1/transactions/summary'),
  create: (data) => api.post('/api/v1/transactions', data),
  update: (id, data) => api.put(`/api/v1/transactions/${id}`, data),
  delete: (id) => api.delete(`/api/v1/transactions/${id}`),
};

export default transactionsApi;
