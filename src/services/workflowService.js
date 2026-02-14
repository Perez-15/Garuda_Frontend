import apiClient from '../api/axios';

export const workflowService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/workflows', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/workflows/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/workflows', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.patch(`/workflows/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/workflows/${id}`);
    return response.data;
  },

  getSteps: async (workflowId) => {
    const response = await apiClient.get(`/workflows/${workflowId}/steps`);
    return response.data;
  },

  reorderSteps: async (workflowId, steps) => {
    const response = await apiClient.post(`/workflows/${workflowId}/steps/reorder`, {
      steps,
    });
    return response.data;
  },
};