import apiClient from '../api/axios';

export const employeeService = {

  // ── List & Stats ────────────────────────────────────────────────────────────

  getAll: async (params = {}) => {
    const response = await apiClient.get('/employees', { params });
    return response.data;
  },

  getStats: async (params = {}) => {
    const { page, per_page, sort_by, sort_dir, ...statsParams } = params;
    const response = await apiClient.get('/employees/stats', { params: statsParams });
    return response.data;
  },

  // ── Single Record ───────────────────────────────────────────────────────────

  getById: async (id) => {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data;
  },

  // ── Create ──────────────────────────────────────────────────────────────────

  create: async (data) => {
    const response = await apiClient.post('/employees', data);
    return response.data;
  },

  /**
   * Convert an existing applicant record into an employee.
   * @param {number} applicantId
   * @param {{ position_id?, date_hired, daily_rate?, remarks? }} data
   */
  convertFromApplicant: async (applicantId, data) => {
    const response = await apiClient.post(`/employees/convert/${applicantId}`, data);
    return response.data;
  },

  // ── Update ──────────────────────────────────────────────────────────────────

  update: async (id, data) => {
    const response = await apiClient.patch(`/employees/${id}`, data);
    return response.data;
  },

  /**
   * Change employment status (hired → resigned / terminated / endo / awol).
   * @param {number} id
   * @param {{ employment_status: string, effective_date?: string }} data
   */
  updateStatus: async (id, data) => {
    const response = await apiClient.patch(`/employees/${id}/status`, data);
    return response.data;
  },

  // ── Delete ──────────────────────────────────────────────────────────────────

  delete: async (id) => {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
  },

  // ── HR Actions (Memo / IR / LOA) ────────────────────────────────────────────

  getHrActions: async (employeeId, params = {}) => {
    const response = await apiClient.get(`/employees/${employeeId}/hr-actions`, { params });
    return response.data;
  },

  addHrAction: async (employeeId, data) => {
    const response = await apiClient.post(`/employees/${employeeId}/hr-actions`, data);
    return response.data;
  },

  deleteHrAction: async (employeeId, actionId) => {
    const response = await apiClient.delete(`/employees/${employeeId}/hr-actions/${actionId}`);
    return response.data;
  },
};