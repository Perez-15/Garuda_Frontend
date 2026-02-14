import apiClient from '../api/axios';

export const clientService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/clients', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/clients', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.patch(`/clients/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/clients/${id}`);
    return response.data;
  },

  getBranches: async (id) => {
    const response = await apiClient.get(`/clients/${id}/branches`);
    return response.data;
  },
};