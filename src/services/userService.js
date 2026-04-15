import apiClient from '../api/axios';

export const userService = {
  // ✅ FIX: return the full axios response so callers can do response.data?.data
 getAll: async (params = {}) => {
  const response = await apiClient.get('/users', { params });
  return response.data;
},

  getById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
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

  updateRequirements: async (id, data) => {
    const response = await apiClient.patch(`/users/${id}/requirements`, data);
    return response.data;
  },

  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await apiClient.post(`/users/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deletePhoto: async (id) => {
    const response = await apiClient.delete(`/users/${id}/photo`);
    return response.data;
  },

  assignBranches: async (userId, branchIds) => {
    const response = await apiClient.post(`/users/${userId}/branches`, { branch_ids: branchIds });
    return response.data;
  },

  getAssignedBranches: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/branches`);
    return response.data;
  },
};