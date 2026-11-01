import api from './axios';
export const auditApi = {
  getLogs: (params) => api.get('/api/v1/audit/logs', { params }),
};
