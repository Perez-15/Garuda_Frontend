import apiClient from '../api/axios';

export const workflowStepService = {
  create: async (data) => {
    const response = await apiClient.post('/workflow-steps', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.patch(`/workflow-steps/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/workflow-steps/${id}`);
    return response.data;
  },
};