import apiClient from '../api/axios';

export const applicantService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/applicants', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/applicants/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/applicants', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.post(`/applicants/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-HTTP-Method-Override': 'PATCH',
      },
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/applicants/${id}`);
    return response.data;
  },

  moveStep: async (id, direction, stepId = null) => {
    const payload = { direction };
    if (stepId) payload.step_id = stepId;
    
    const response = await apiClient.patch(`/applicants/${id}/move-step`, payload);
    return response.data;
},

  updateStatus: async (id, status) => {
    const response = await apiClient.patch(`/applicants/${id}/status`, {
      status,
    });
    return response.data;
  },

  addNote: async (id, note) => {
    const response = await apiClient.post(`/applicants/${id}/notes`, { note });
    return response.data;
  },

  getActivities: async (id) => {
    const response = await apiClient.get(`/applicants/${id}/activities`);
    return response.data;
  },
};