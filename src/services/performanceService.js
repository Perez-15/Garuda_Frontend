import apiClient from '../api/axios';

export const performanceService = {
  getTAPerformance: async (params = {}) => {
    const response = await apiClient.get('/performance/ta', { params });
    return response.data;
  },

  getBranchPerformance: async (params = {}) => {
    const response = await apiClient.get('/performance/branches', { params });
    return response.data;
  },

  getTAApplicants: async (taId, params = {}) => {
    const response = await apiClient.get(`/performance/ta/${taId}/applicants`, { params });
    return response.data;
  },
};