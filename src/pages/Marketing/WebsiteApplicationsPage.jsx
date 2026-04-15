import { useState, useEffect, useCallback } from 'react';
import { Globe, Check, X, Download, Eye, Clock, ChevronLeft, ChevronRight, MessageSquare, Trash2, Archive, MailOpen } from 'lucide-react';
import websiteApplicationService from '../../services/websiteApplicationService';
import DashboardLayout from '../../components/layout/DashboardLayout';

const STATUS_TABS = [
    { key: 'pending',   label: 'Pending',   color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    { key: 'accepted',  label: 'Accepted',  color: 'text-green-600 bg-green-50 border-green-200' },
    { key: 'dismissed', label: 'Dismissed', color: 'text-red-600 bg-red-50 border-red-200' },
];

const INQUIRY_STATUS_TABS = [
    { key: 'new',      label: 'New',      color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { key: 'read',     label: 'Read',     color: 'text-gray-600 bg-gray-50 border-gray-200' },
    { key: 'archived', label: 'Archived', color: 'text-purple-600 bg-purple-50 border-purple-200' },
];

const INQUIRY_TYPE_LABELS = {
    'job-seeker':  { label: 'Job Seeker',   color: 'text-orange-600 bg-orange-50' },
    'partnership': { label: 'Partnership',  color: 'text-indigo-600 bg-indigo-50' },
};

export default function WebsiteApplicationsPage() {
    // ── Main section toggle: applications vs inquiries ─────────────────────
    const [section, setSection] = useState('applications'); // 'applications' | 'inquiries'

    // ── Applications state ─────────────────────────────────────────────────
    const [applications, setApplications] = useState([]);
    const [meta, setMeta]                 = useState({});
    const [activeTab, setActiveTab]       = useState('pending');
    const [page, setPage]                 = useState(1);
    const [loading, setLoading]           = useState(false);
    const [selected, setSelected]         = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // ── Inquiries state ────────────────────────────────────────────────────
    const [inquiries, setInquiries]           = useState([]);
    const [inquiryTab, setInquiryTab]         = useState('new');
    const [inquiryLoading, setInquiryLoading] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState(null);

    // ── Fetch applications ─────────────────────────────────────────────────
    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await websiteApplicationService.getAll({ status: activeTab, page, per_page: 15 });
            setApplications(res.data.data);
            setMeta(res.data.meta);
        } catch (err) {
            console.error('Failed to fetch website applications', err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page]);

    useEffect(() => { setPage(1); }, [activeTab]);
    useEffect(() => { if (section === 'applications') fetchApplications(); }, [fetchApplications, section]);

    // ── Fetch inquiries ────────────────────────────────────────────────────
    const fetchInquiries = useCallback(async () => {
        setInquiryLoading(true);
        try {
            const res = await websiteApplicationService.getInquiries({ status: inquiryTab });
            setInquiries(res.data);
        } catch (err) {
            console.error('Failed to fetch inquiries', err);
        } finally {
            setInquiryLoading(false);
        }
    }, [inquiryTab]);

    useEffect(() => { if (section === 'inquiries') fetchInquiries(); }, [fetchInquiries, section]);

    // ── Application actions ────────────────────────────────────────────────
    const handleAccept = async (app) => {
        const branchId = prompt(`Enter Branch ID to assign ${app.full_name} to:`);
        if (!branchId) return;
        setActionLoading(true);
        try {
            await websiteApplicationService.accept(app.id, { branch_id: parseInt(branchId) });
            setSelected(null);
            fetchApplications();
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to accept application.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDismiss = async (app) => {
        if (!window.confirm(`Dismiss ${app.full_name}'s application?`)) return;
        setActionLoading(true);
        try {
            await websiteApplicationService.dismiss(app.id);
            setSelected(null);
            fetchApplications();
        } catch {
            alert('Failed to dismiss application.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResumeDownload = async (app) => {
        try {
            const res = await websiteApplicationService.getResumeUrl(app.id);
            window.open(res.data.url, '_blank');
        } catch {
            alert('No resume available.');
        }
    };

    // ── Inquiry actions ────────────────────────────────────────────────────
    const handleMarkRead = async (inquiry) => {
        try {
            await websiteApplicationService.markInquiryRead(inquiry.id);
            setSelectedInquiry(null);
            fetchInquiries();
        } catch {
            alert('Failed to mark as read.');
        }
    };

    const handleArchiveInquiry = async (inquiry) => {
        if (!window.confirm(`Archive inquiry from ${inquiry.full_name}?`)) return;
        try {
            await websiteApplicationService.archiveInquiry(inquiry.id);
            setSelectedInquiry(null);
            fetchInquiries();
        } catch {
            alert('Failed to archive inquiry.');
        }
    };

    const handleDeleteInquiry = async (inquiry) => {
        if (!window.confirm(`Permanently delete inquiry from ${inquiry.full_name}?`)) return;
        try {
            await websiteApplicationService.deleteInquiry(inquiry.id);
            setSelectedInquiry(null);
            fetchInquiries();
        } catch {
            alert('Failed to delete inquiry.');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Globe className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Website Inbox</h1>
                        <p className="text-sm text-gray-500">Applications and contact inquiries from the public website</p>
                    </div>
                </div>

                {/* Section Toggle */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setSection('applications')}
                        className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                            section === 'applications'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <Globe className="w-4 h-4 inline mr-2" />
                        Job Applications
                    </button>
                    <button
                        onClick={() => setSection('inquiries')}
                        className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                            section === 'inquiries'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <MessageSquare className="w-4 h-4 inline mr-2" />
                        Contact Inquiries
                    </button>
                </div>

                {/* ── APPLICATIONS SECTION ────────────────────────────── */}
                {section === 'applications' && (
                    <>
                        {/* Status Tabs */}
                        <div className="flex gap-2 mb-6">
                            {STATUS_TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                        activeTab === tab.key
                                            ? tab.color
                                            : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            {loading ? (
                                <div className="flex items-center justify-center h-48 text-gray-400">Loading applications...</div>
                            ) : applications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                    <Clock className="w-8 h-8 mb-2 opacity-40" />
                                    <p>No {activeTab} applications</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Applicant</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Position</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Submitted</th>
                                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {applications.map(app => (
                                            <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-gray-900">{app.full_name}</p>
                                                    <p className="text-xs text-gray-400">{app.email}</p>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 font-medium">{app.position_applied}</td>
                                                <td className="px-4 py-3 text-gray-500">{app.phone}</td>
                                                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(app.created_at)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setSelected(app)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="View">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        {app.resume_path && (
                                                            <button onClick={() => handleResumeDownload(app)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Download Resume">
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {activeTab === 'pending' && (
                                                            <>
                                                                <button onClick={() => handleAccept(app)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Accept">
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDismiss(app)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Dismiss">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {meta.last_page > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400">Page {meta.current_page} of {meta.last_page} · {meta.total} total</p>
                                    <div className="flex gap-1">
                                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── INQUIRIES SECTION ────────────────────────────────── */}
                {section === 'inquiries' && (
                    <>
                        {/* Inquiry Status Tabs */}
                        <div className="flex gap-2 mb-6">
                            {INQUIRY_STATUS_TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setInquiryTab(tab.key)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                        inquiryTab === tab.key
                                            ? tab.color
                                            : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            {inquiryLoading ? (
                                <div className="flex items-center justify-center h-48 text-gray-400">Loading inquiries...</div>
                            ) : inquiries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                    <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                                    <p>No {inquiryTab} inquiries</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Sender</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Message</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Received</th>
                                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {inquiries.map(inq => (
                                            <tr key={inq.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-gray-900">{inq.full_name}</p>
                                                    <p className="text-xs text-gray-400">{inq.email}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${INQUIRY_TYPE_LABELS[inq.inquiry_type]?.color || 'text-gray-600 bg-gray-50'}`}>
                                                        {INQUIRY_TYPE_LABELS[inq.inquiry_type]?.label || inq.inquiry_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 max-w-xs">
                                                    <p className="truncate">{inq.message}</p>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(inq.created_at)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setSelectedInquiry(inq)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="View">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        {inquiryTab === 'new' && (
                                                            <button onClick={() => handleMarkRead(inq)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Mark as Read">
                                                                <MailOpen className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {inquiryTab !== 'archived' && (
                                                            <button onClick={() => handleArchiveInquiry(inq)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Archive">
                                                                <Archive className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDeleteInquiry(inq)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}

                {/* ── APPLICATION DETAIL MODAL ─────────────────────────── */}
                {selected && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selected.full_name}</h2>
                                    <p className="text-sm text-indigo-600 font-medium">{selected.position_applied}</p>
                                </div>
                                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-3 text-sm mb-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium mb-0.5">Email</p>
                                        <p className="text-gray-700">{selected.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium mb-0.5">Phone</p>
                                        <p className="text-gray-700">{selected.phone}</p>
                                    </div>
                                </div>
                                {selected.address && (
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium mb-0.5">Address</p>
                                        <p className="text-gray-700">{selected.address}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-gray-400 font-medium mb-0.5">Submitted</p>
                                    <p className="text-gray-700">{formatDate(selected.created_at)}</p>
                                </div>
                                {selected.resume_path && (
                                    <button onClick={() => handleResumeDownload(selected)} className="flex items-center gap-2 text-blue-600 hover:underline text-sm">
                                        <Download className="w-4 h-4" />
                                        Download Resume
                                    </button>
                                )}
                            </div>
                            {activeTab === 'pending' && (
                                <div className="flex gap-3">
                                    <button onClick={() => handleAccept(selected)} disabled={actionLoading} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
                                        Accept & Add to Pipeline
                                    </button>
                                    <button onClick={() => handleDismiss(selected)} disabled={actionLoading} className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors disabled:opacity-50">
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── INQUIRY DETAIL MODAL ─────────────────────────────── */}
                {selectedInquiry && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedInquiry.full_name}</h2>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${INQUIRY_TYPE_LABELS[selectedInquiry.inquiry_type]?.color || 'text-gray-600 bg-gray-50'}`}>
                                        {INQUIRY_TYPE_LABELS[selectedInquiry.inquiry_type]?.label || selectedInquiry.inquiry_type}
                                    </span>
                                </div>
                                <button onClick={() => setSelectedInquiry(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4 text-sm mb-6">
                                <div>
                                    <p className="text-xs text-gray-400 font-medium mb-0.5">Email</p>
                                    <p className="text-gray-700">{selectedInquiry.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium mb-0.5">Received</p>
                                    <p className="text-gray-700">{formatDate(selectedInquiry.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium mb-1">Message</p>
                                    <p className="text-gray-700 bg-gray-50 p-4 rounded-xl leading-relaxed">{selectedInquiry.message}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {inquiryTab === 'new' && (
                                    <button onClick={() => handleMarkRead(selectedInquiry)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                                        Mark as Read
                                    </button>
                                )}
                                {inquiryTab !== 'archived' && (
                                    <button onClick={() => handleArchiveInquiry(selectedInquiry)} className="flex-1 py-2.5 bg-purple-50 text-purple-600 rounded-lg font-semibold hover:bg-purple-100 transition-colors">
                                        Archive
                                    </button>
                                )}
                                <button onClick={() => handleDeleteInquiry(selectedInquiry)} className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}