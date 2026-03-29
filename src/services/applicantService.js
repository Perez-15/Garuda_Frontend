import apiClient from '../api/axios';

export const applicantService = {

  // ── List & Stats ────────────────────────────────────────────────────────────

  getAll: async (params = {}) => {
    const response = await apiClient.get('/applicants', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/applicants/${id}`);
    return response.data;
  },

  getStats: async (params = {}) => {
    const { page, per_page, sort_by, sort_dir, ...statsParams } = params;
    const response = await apiClient.get('/applicants/stats', { params: statsParams });
    return response.data;
  },

  // ── Create ──────────────────────────────────────────────────────────────────

  create: async (data) => {
    const response = await apiClient.post('/applicants', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // ── Update ──────────────────────────────────────────────────────────────────

  update: async (id, data) => {
    const response = await apiClient.post(`/applicants/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-HTTP-Method-Override': 'PATCH',
      },
    });
    return response.data;
  },

  // ── Delete (soft) ───────────────────────────────────────────────────────────

  delete: async (id) => {
    const response = await apiClient.delete(`/applicants/${id}`);
    return response.data;
  },

  // ── Trash ───────────────────────────────────────────────────────────────────

  /**
   * Get all soft-deleted applicants (admin only).
   */
  getTrashed: async (params = {}) => {
    const response = await apiClient.get('/applicants/trashed', { params });
    return response.data;
  },

  /**
   * Restore a soft-deleted applicant (and linked employee if exists).
   */
  restore: async (id) => {
    const response = await apiClient.patch(`/applicants/${id}/restore`);
    return response.data;
  },

  /**
   * Permanently delete a soft-deleted applicant (and linked employee).
   */
  forceDelete: async (id) => {
    const response = await apiClient.delete(`/applicants/${id}/force-delete`);
    return response.data;
  },

  // ── Workflow ─────────────────────────────────────────────────────────────────

  moveStep: async (id, direction, stepId = null) => {
    const payload = { direction };
    if (stepId) payload.step_id = stepId;
    const response = await apiClient.patch(`/applicants/${id}/move-step`, payload);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await apiClient.patch(`/applicants/${id}/status`, { status });
    return response.data;
  },

  // ── Notes & Activities ───────────────────────────────────────────────────────

  addNote: async (id, note) => {
    const response = await apiClient.post(`/applicants/${id}/notes`, { note });
    return response.data;
  },

  getActivities: async (id) => {
    const response = await apiClient.get(`/applicants/${id}/activities`);
    return response.data;
  },
};