import apiClient from '../api/axios';

export const userService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.patch(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  updateStatus: async (id, is_active) => {
    const response = await apiClient.patch(`/users/${id}/status`, { is_active });
    return response.data;
  },
};