import api from './axios';

export const dashboardApi = {
  getSummary: () => api.get('/api/v1/dashboard/summary'),
  getMonthlyTrend: (months = 6) => api.get('/api/v1/dashboard/monthly-trend', { params: { months } }),
  getCategoryBreakdown: () => api.get('/api/v1/dashboard/category-breakdown'),
  getTopDefaulters: () => api.get('/api/v1/dashboard/top-defaulters'),
  getRecentTransactions: () => api.get('/api/v1/dashboard/recent-transactions'),
};

export default dashboardApi;
