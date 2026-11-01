import api from './axios';
export const reportsApi = {
  getYears: () => api.get('/api/v1/reports/years'),
  getMonthlySummary: (params) => api.get('/api/v1/reports/monthly-summary', { params }),
  getResidentCollection: (params) => api.get('/api/v1/reports/resident-collection', { params }),
  getExpenseBreakdown: (params) => api.get('/api/v1/reports/expense-breakdown', { params }),
};
