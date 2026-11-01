import api from './axios';

export const feedbackApi = {
  getAll: (params) => api.get('/api/v1/feedbacks', { params }),
  create: (data) => api.post('/api/v1/feedbacks', data),
  delete: (id) => api.delete(`/api/v1/feedbacks/${id}`),
};
