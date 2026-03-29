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
   * @param {{ position?, date_hired, daily_rate?, remarks? }} data
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

  // ── Delete (soft) ───────────────────────────────────────────────────────────

  delete: async (id) => {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
  },

  // ── Trash ───────────────────────────────────────────────────────────────────

  /**
   * Get all soft-deleted employees (admin only).
   */
  getTrashed: async (params = {}) => {
    const response = await apiClient.get('/employees/trashed', { params });
    return response.data;
  },

  /**
   * Restore a soft-deleted employee record only.
   * (Applicant restore handles the linked employee via Option A logic)
   */
  restore: async (id) => {
    const response = await apiClient.patch(`/employees/${id}/restore`);
    return response.data;
  },

  /**
   * Permanently delete a soft-deleted employee.
   */
  forceDelete: async (id) => {
    const response = await apiClient.delete(`/employees/${id}/force-delete`);
    return response.data;
  },

// ── HR Actions (Memo / IR / LOA) ────────────────────────────────────────────

getHrActions: async (employeeId, params = {}) => {
  const response = await apiClient.get(`/employees/${employeeId}/hr-actions`, { params });
  return response.data;
},

addHrAction: async (employeeId, formData) => {
  const response = await apiClient.post(
    `/employees/${employeeId}/hr-actions`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return response.data;
},

updateHrAction: async (employeeId, actionId, formData) => {
  const response = await apiClient.post(
    `/employees/${employeeId}/hr-actions/${actionId}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { _method: 'PATCH' },
    }
  );
  return response.data;
},

deleteHrAction: async (employeeId, actionId) => {
  const response = await apiClient.delete(
    `/employees/${employeeId}/hr-actions/${actionId}`
  );
  return response.data;
},

getHrActionFileUrl: async (employeeId, actionId) => {
  const response = await apiClient.get(
    `/employees/${employeeId}/hr-actions/${actionId}/file-url`
  );
  return response.data;
},
};