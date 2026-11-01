import api from './axios';

export const paymentsApi = {
  getAll: (params) => api.get('/api/v1/payments', { params }),
  getByMonth: (month) => api.get('/api/v1/payments', { params: { month } }),
  update: (id, data) => api.put(`/api/v1/payments/${id}`, data),
  pay: (id, data) => api.put(`/api/v1/payments/${id}`, {
    status: 'paid',
    paid_amount: data?.paid_amount,
    paid_date: data?.paid_date || new Date().toISOString().slice(0, 10),
    payment_method: data?.payment_mode || data?.payment_method || 'upi',
    reference_number: data?.reference_number || null,
  }),
  generate: (data) => api.post('/api/v1/payments/generate-monthly', data),
  generateMonthly: (data) => api.post('/api/v1/payments/generate-monthly', data),
  checkOverdue: () => api.post('/api/v1/payments/check-overdue'),
  remind: (id) => api.post(`/api/v1/payments/${id}/remind`),
  remindAll: (month) => api.post('/api/v1/payments/remind-all-unpaid', null, { params: { month } }),
  remindAllUnpaid: (month) => api.post('/api/v1/payments/remind-all-unpaid', null, { params: { month } }),
};

export default paymentsApi;
