import api from './axios';
export const dashboardApi = {
  getSummary: () => api.get('/api/v1/dashboard/summary'),
  getMonthlyTrend: () => api.get('/api/v1/dashboard/monthly-trend'),
  getCategoryBreakdown: () => api.get('/api/v1/dashboard/category-breakdown'),
  getTopDefaulters: () => api.get('/api/v1/dashboard/top-defaulters'),
  getRecentTransactions: () => api.get('/api/v1/dashboard/recent-transactions'),
};
