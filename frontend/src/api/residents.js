import api from './axios';

export const residentsApi = {
  getAll: (params) => api.get('/api/v1/residents', { params }),
  getById: (id) => api.get(`/api/v1/residents/${id}`),
  create: (data) => api.post('/api/v1/residents', data),
  update: (id, data) => api.put(`/api/v1/residents/${id}`, data),
  delete: (id) => api.delete(`/api/v1/residents/${id}`),
  toggleStatus: (id) => api.put(`/api/v1/residents/${id}/toggle-status`),
  getPayments: (id) => api.get(`/api/v1/residents/${id}/payments`),
  getTransactions: (id) => api.get(`/api/v1/residents/${id}/transactions`),
  getVehicles: (params) => api.get('/api/v1/vehicles', { params }),
};

export default residentsApi;
