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

  // Syncs the branches a TA user is allowed to access
  // POST /api/v1/users/{userId}/branches
  // Passing an empty array removes all branch access
  assignBranches: async (userId, branchIds) => {
    const response = await apiClient.post(`/users/${userId}/branches`, { branch_ids: branchIds });
    return response.data;
  },

  // Get branches assigned to a specific user
  getAssignedBranches: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/branches`);
    return response.data;
  },
};