import api from './axios';

export const settingsApi = {
  getSettings: () => api.get('/api/v1/settings'),
  getPublicSettings: () => api.get('/api/v1/settings/public'),
  updateSettings: (data) => api.put('/api/v1/settings', data)
};

