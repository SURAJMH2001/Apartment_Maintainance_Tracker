import api from './axios';
export const paymentsApi = {
  getAll: (params) => api.get('/api/v1/payments', { params }),
  update: (id, data) => api.put(`/api/v1/payments/${id}`, data),
  generateMonthly: (data) => api.post('/api/v1/payments/generate-monthly', data),
  checkOverdue: () => api.post('/api/v1/payments/check-overdue'),
};
