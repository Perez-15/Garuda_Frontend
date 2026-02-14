import apiClient from '../api/axios';

export const dashboardService = {
  getDashboard: async () => {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },
};