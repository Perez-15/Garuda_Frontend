import apiClient from '../api/axios';

export const reportService = {
  applicantsBySource: async (params = {}) => {
    const response = await apiClient.get('/reports/applicants-by-source', { params });
    return response.data;
  },

  applicantsByStatus: async (params = {}) => {
    const response = await apiClient.get('/reports/applicants-by-status', { params });
    return response.data;
  },

  applicantsByBranch: async (params = {}) => {
    const response = await apiClient.get('/reports/applicants-by-branch', { params });
    return response.data;
  },

  conversionRate: async (params = {}) => {
    const response = await apiClient.get('/reports/conversion-rate', { params });
    return response.data;
  },

  topRecruiters: async (params = {}) => {
    const response = await apiClient.get('/reports/top-recruiters', { params });
    return response.data;
  },

  applicantsTrend: async (params = {}) => {
    const response = await apiClient.get('/reports/applicants-trend', { params });
    return response.data;
  },

  // 'export' is a reserved word — must be quoted as a key
  'export': async (params = {}) => {
    const response = await apiClient.get('/reports/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },
};