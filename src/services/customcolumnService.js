import apiClient from '../api/axios';

export const customColumnService = {

  // ── Get columns for a page ─────────────────────────────────────────────────
  getByPage: async (page) => {
    const response = await apiClient.get('/custom-columns', { params: { page } });
    return response.data;
  },

  // ── Create a new custom column ─────────────────────────────────────────────
  create: async (data) => {
    const response = await apiClient.post('/custom-columns', data);
    return response.data;
  },

  // ── Rename / update a column ───────────────────────────────────────────────
  update: async (id, data) => {
    const response = await apiClient.patch(`/custom-columns/${id}`, data);
    return response.data;
  },

  // ── Delete a column ────────────────────────────────────────────────────────
  remove: async (id) => {
    const response = await apiClient.delete(`/custom-columns/${id}`);
    return response.data;
  },

  // ── Reorder columns ────────────────────────────────────────────────────────
  reorder: async (page, order) => {
    const response = await apiClient.post('/custom-columns/reorder', { page, order });
    return response.data;
  },

  // ── Table management ───────────────────────────────────────────────────────
  getTables: async () => {
    const response = await apiClient.get('/custom-columns/tables');
    return response.data;
  },

  createTable: async (data) => {
    const response = await apiClient.post('/custom-columns/tables', data);
    return response.data;
  },

  updateTable: async (page, data) => {
    const response = await apiClient.patch(`/custom-columns/tables/${page}`, data);
    return response.data;
  },

  deleteTable: async (page) => {
    const response = await apiClient.delete(`/custom-columns/tables/${page}`);
    return response.data;
  },

  // ── Save custom field values for an employee ───────────────────────────────
  updateEmployeeCustomFields: async (employeeId, fields) => {
    const response = await apiClient.patch(`/employees/${employeeId}/custom-fields`, fields);
    return response.data;
  },

  // ── Save custom field values for an applicant ──────────────────────────────
  updateApplicantCustomFields: async (applicantId, fields) => {
    const response = await apiClient.patch(`/applicants/${applicantId}/custom-fields`, fields);
    return response.data;
  },

};