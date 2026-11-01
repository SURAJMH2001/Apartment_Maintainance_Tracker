import api from './axios';

export const tasksApi = {
  getAll: (params) => api.get('/api/v1/tasks', { params }),
  create: (data) => api.post('/api/v1/tasks', data),
  update: (id, data) => api.put(`/api/v1/tasks/${id}`, data),
  delete: (id) => api.delete(`/api/v1/tasks/${id}`),
};

export const assetsApi = {
  getAll: (params) => api.get('/api/v1/assets', { params }),
  create: (data) => api.post('/api/v1/assets', data),
  update: (id, data) => api.put(`/api/v1/assets/${id}`, data),
  delete: (id) => api.delete(`/api/v1/assets/${id}`),
};

export const issuesApi = {
  getAll: (params) => api.get('/api/v1/issues', { params }),
  create: (data) => api.post('/api/v1/issues', data),
  update: (id, data) => api.put(`/api/v1/issues/${id}`, data),
  delete: (id) => api.delete(`/api/v1/issues/${id}`),
  addComment: (id, data) => api.post(`/api/v1/issues/${id}/comments`, data),
  react: (id, emoji) => api.post(`/api/v1/issues/${id}/react`, { emoji }),
};
