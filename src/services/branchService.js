import apiClient from '../api/axios';

export const branchService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/branches', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/branches/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/branches', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.patch(`/branches/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/branches/${id}`);
    return response.data;
  },

  // Returns only the branches assigned to a specific TA user
  // GET /api/v1/users/{userId}/branches
  getAssignedBranches: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/branches`);
    return response.data;
  },
};