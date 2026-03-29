 import apiClient from '../api/axios';

/**
 * Fetch today's attendance record for the logged-in user.
 * Returns { attendance: Attendance|null, office: { latitude, longitude, radius } }
 */
export const getTodayAttendance = () =>
  apiClient.get('/attendance/today').then((r) => r.data);

/**
 * Record Time In with GPS coordinates.
 * @param {number} latitude
 * @param {number} longitude
 */
export const recordTimeIn = (latitude, longitude) =>
  apiClient.post('/attendance/time-in', { latitude, longitude }).then((r) => r.data);

/**
 * Record Time Out with GPS coordinates.
 * @param {number} latitude
 * @param {number} longitude
 */
export const recordTimeOut = (latitude, longitude) =>
  apiClient.patch('/attendance/time-out', { latitude, longitude }).then((r) => r.data);

/**
 * Fetch the authenticated user's attendance history.
 * @param {{ month?: string, per_page?: number, user_id?: number }} params
 */
export const getAttendanceHistory = (params = {}) =>
  apiClient.get('/attendance', { params }).then((r) => r.data);

/**
 * Fetch the full team attendance for a given date. (HR/Admin only)
 * @param {{ date?: string, status?: string, per_page?: number }} params
 */
export const getTeamAttendance = (params = {}) =>
  apiClient.get('/attendance/team', { params }).then((r) => r.data);