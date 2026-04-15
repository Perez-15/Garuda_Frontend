import apiClient from '../api/axios';

const websiteApplicationService = {
    // ── Website Applications ───────────────────────────────────────────────
    getAll: (params = {}) =>
        apiClient.get('/website-applications', { params }),

    getPendingCount: () =>
        apiClient.get('/website-applications/pending-count'),

    accept: (id, data = {}) =>
        apiClient.post(`/website-applications/${id}/accept`, data), // ← fixed: POST not GET

    dismiss: (id) =>
        apiClient.post(`/website-applications/${id}/dismiss`), // ← fixed: POST not GET

    getResumeUrl: (id) =>
        apiClient.get(`/website-applications/${id}/resume`),

    // ── Contact Inquiries ──────────────────────────────────────────────────
    getInquiries: (params = {}) =>
        apiClient.get('/marketing/contact-inquiries', { params }),

    markInquiryRead: (id) =>
        apiClient.patch(`/marketing/contact-inquiries/${id}/read`),

    archiveInquiry: (id) =>
        apiClient.patch(`/marketing/contact-inquiries/${id}/archive`),

    deleteInquiry: (id) =>
        apiClient.delete(`/marketing/contact-inquiries/${id}`),
};

export default websiteApplicationService;