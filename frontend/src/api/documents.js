import api from './axios';
export const documentsApi = {
  getAll: (params) => api.get('/api/v1/documents', { params }),
  upload: (data) => api.post('/api/v1/documents/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  import: (id, data) => api.post(`/api/v1/documents/${id}/import`, data),
};
