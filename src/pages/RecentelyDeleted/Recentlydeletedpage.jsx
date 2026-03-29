import { useState, useEffect } from 'react';
import {
  Trash2, RotateCcw, AlertTriangle, Search, User,
  UserCheck, Building2, CalendarDays, X, Loader2, ShieldAlert,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { applicantService } from '../../services/applicantService';
import { employeeService }  from '../../services/hiredService';
import { useAuth }          from '../../contexts/AuthContext';

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, warning, onConfirm, onCancel, confirming }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{message}</p>
          </div>
        </div>
        {warning && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-xs text-red-700">
            {warning}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} disabled={confirming}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={confirming}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
            {confirming
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              : 'Yes, proceed'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Days remaining helper ─────────────────────────────────────────────────────
function daysUntilPurge(deletedAt) {
  const deleted  = new Date(deletedAt);
  const purgeOn  = new Date(deleted);
  purgeOn.setDate(purgeOn.getDate() + 30);
  const diff = Math.ceil((purgeOn - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

function PurgeBadge({ deletedAt }) {
  const days = daysUntilPurge(deletedAt);
  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle className="h-3 w-3" /> {days}d left
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        {days}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      {days}d left
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyTrash({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Trash2 className="h-10 w-10 mb-3 text-gray-200" />
      <p className="text-sm font-medium">No deleted {label}</p>
      <p className="text-xs mt-1 text-gray-300">Deleted records will appear here for 30 days</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Applicants Tab
// ─────────────────────────────────────────────────────────────────────────────
function ApplicantsTab() {
  const [records,     setRecords]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch               = useDebounce(searchInput, 400);

  // Confirm modal state
  const [confirm,     setConfirm]     = useState(null); // { type: 'restore'|'force', record }
  const [confirming,  setConfirming]  = useState(false);
  const [feedback,    setFeedback]    = useState(null); // { type: 'success'|'error', message }

  useEffect(() => { fetch(); }, [debouncedSearch, currentPage]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);

  const fetch = async () => {
    try {
      setLoading(true);
      const res = await applicantService.getTrashed({
        search:   debouncedSearch,
        page:     currentPage,
        per_page: 15,
      });
      setRecords(res.data);
      setTotal(res.total || 0);
      setTotalPages(res.last_page || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRestore = async () => {
    setConfirming(true);
    try {
      await applicantService.restore(confirm.record.id);
      showFeedback('success', `"${confirm.record.full_name}" has been restored.`);
      setConfirm(null);
      fetch();
    } catch (e) {
      showFeedback('error', e?.response?.data?.message || 'Failed to restore.');
      setConfirm(null);
    } finally {
      setConfirming(false);
    }
  };

  const handleForceDelete = async () => {
    setConfirming(true);
    try {
      await applicantService.forceDelete(confirm.record.id);
      showFeedback('success', `"${confirm.record.full_name}" has been permanently deleted.`);
      setConfirm(null);
      fetch();
    } catch (e) {
      showFeedback('error', e?.response?.data?.message || 'Failed to permanently delete.');
      setConfirm(null);
    } finally {
      setConfirming(false);
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="space-y-4">

      {/* Feedback banner */}
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
          ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, email or phone..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
            Loading...
          </div>
        ) : records.length === 0 ? (
          <EmptyTrash label="applicants" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicant</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status at Delete</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Linked Employee</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Deleted</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Purge In</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-900 text-sm">{r.full_name}</div>
                        <div className="text-xs text-gray-400">{r.email}</div>
                        <div className="text-xs text-gray-400">{r.phone}</div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {r.branch?.branch_name || '—'}
                        </div>
                        {r.branch?.client?.name && (
                          <div className="text-xs text-gray-400 mt-0.5 ml-5">{r.branch.client.name}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
                          ${r.status === 'hired'   ? 'bg-green-100 text-green-700'
                          : r.status === 'active'  ? 'bg-blue-100 text-blue-700'
                          : r.status === 'pooling' ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'}`}>
                          {r.status === 'active' ? 'In-Process' : r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {r.employee ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <UserCheck className="h-3 w-3" /> Also deleted
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
                          {fmt(r.deleted_at)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <PurgeBadge deletedAt={r.deleted_at} />
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConfirm({ type: 'restore', record: r })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                          </button>
                          <button
                            onClick={() => setConfirm({ type: 'force', record: r })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Page <span className="font-semibold text-gray-700">{currentPage}</span> of{' '}
                  <span className="font-semibold text-gray-700">{totalPages}</span>
                  <span className="ml-1 text-gray-400">({total} total)</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Previous
                  </button>
                  <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm modals */}
      {confirm?.type === 'restore' && (
        <ConfirmModal
          title="Restore Applicant"
          message={`Restore "${confirm.record.full_name}" and bring them back to their previous status?`}
          warning={confirm.record.employee ? 'This applicant has a linked employee record — both will be restored together.' : null}
          onConfirm={handleRestore}
          onCancel={() => setConfirm(null)}
          confirming={confirming}
        />
      )}
      {confirm?.type === 'force' && (
        <ConfirmModal
          title="Permanently Delete Applicant"
          message={`This will permanently delete "${confirm.record.full_name}" and all their data. This cannot be undone.`}
          warning={confirm.record.employee ? 'This applicant has a linked employee record — both will be permanently deleted.' : 'All associated notes, activities, and files will be removed.'}
          onConfirm={handleForceDelete}
          onCancel={() => setConfirm(null)}
          confirming={confirming}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Employees Tab
// ─────────────────────────────────────────────────────────────────────────────
function EmployeesTab() {
  const [records,     setRecords]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch               = useDebounce(searchInput, 400);

  const [confirm,    setConfirm]    = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [feedback,   setFeedback]   = useState(null);

  useEffect(() => { fetch(); }, [debouncedSearch, currentPage]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);

  const fetch = async () => {
    try {
      setLoading(true);
      const res = await employeeService.getTrashed({
        search:   debouncedSearch,
        page:     currentPage,
        per_page: 15,
      });
      setRecords(res.data);
      setTotal(res.total || 0);
      setTotalPages(res.last_page || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRestore = async () => {
    setConfirming(true);
    try {
      await employeeService.restore(confirm.record.id);
      showFeedback('success', `"${confirm.record.full_name}" has been restored.`);
      setConfirm(null);
      fetch();
    } catch (e) {
      showFeedback('error', e?.response?.data?.message || 'Failed to restore.');
      setConfirm(null);
    } finally {
      setConfirming(false);
    }
  };

  const handleForceDelete = async () => {
    setConfirming(true);
    try {
      await employeeService.forceDelete(confirm.record.id);
      showFeedback('success', `"${confirm.record.full_name}" has been permanently deleted.`);
      setConfirm(null);
      fetch();
    } catch (e) {
      showFeedback('error', e?.response?.data?.message || 'Failed to permanently delete.');
      setConfirm(null);
    } finally {
      setConfirming(false);
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const statusColor = {
    hired:      'bg-green-100 text-green-700',
    resigned:   'bg-yellow-100 text-yellow-700',
    terminated: 'bg-red-100 text-red-700',
    endo:       'bg-orange-100 text-orange-700',
    awol:       'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-4">

      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
          ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, email or contact..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full mr-3" />
            Loading...
          </div>
        ) : records.length === 0 ? (
          <EmptyTrash label="employees" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status at Delete</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Hired</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Deleted</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Purge In</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-900 text-sm">{r.full_name}</div>
                        <div className="text-xs text-gray-400">{r.email || ''}</div>
                        <div className="text-xs text-gray-400">{r.contact_number || ''}</div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {r.branch?.branch_name || '—'}
                        </div>
                        {r.branch?.client?.name && (
                          <div className="text-xs text-gray-400 mt-0.5 ml-5">{r.branch.client.name}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
                        {r.position || '—'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[r.employment_status] || 'bg-green-100 text-green-700'}`}>
                          {r.employment_status ?? 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
                          {fmt(r.date_hired)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
                          {fmt(r.deleted_at)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <PurgeBadge deletedAt={r.deleted_at} />
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConfirm({ type: 'restore', record: r })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                          </button>
                          <button
                            onClick={() => setConfirm({ type: 'force', record: r })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Page <span className="font-semibold text-gray-700">{currentPage}</span> of{' '}
                  <span className="font-semibold text-gray-700">{totalPages}</span>
                  <span className="ml-1 text-gray-400">({total} total)</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Previous
                  </button>
                  <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirm?.type === 'restore' && (
        <ConfirmModal
          title="Restore Employee"
          message={`Restore "${confirm.record.full_name}" and bring them back to their previous status?`}
          warning={confirm.record.applicant_id ? 'Note: This only restores the employee record. To also restore the linked applicant, go to the Applicants tab.' : null}
          onConfirm={handleRestore}
          onCancel={() => setConfirm(null)}
          confirming={confirming}
        />
      )}
      {confirm?.type === 'force' && (
        <ConfirmModal
          title="Permanently Delete Employee"
          message={`This will permanently delete "${confirm.record.full_name}" and all their data. This cannot be undone.`}
          warning="All HR actions, documents, and related records will be removed permanently."
          onConfirm={handleForceDelete}
          onCancel={() => setConfirm(null)}
          confirming={confirming}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function RecentlyDeletedPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('applicants');

  const userRole = currentUser?.roles?.[0]?.name;
  const isAdmin  = userRole === 'super_admin' || userRole === 'hr_admin';

  // Guard — non-admins see an access denied screen
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
          <ShieldAlert className="h-12 w-12 text-gray-300" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Access Restricted</p>
            <p className="text-xs mt-1">Only Super Admin and HR Admin can view deleted records.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Recently Deleted</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Deleted records are kept for <span className="font-medium text-gray-700">30 days</span> before being permanently removed. You can restore or permanently delete them here.
          </p>
        </div>

        {/* ── Info banner ──────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Records showing <span className="font-semibold">3 days or less</span> remaining will be permanently purged soon. Restore them now if needed.
            Restoring an applicant who was hired will also restore their linked employee record.
          </p>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 w-fit">
          <button
            onClick={() => setActiveTab('applicants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === 'applicants' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <User className="h-4 w-4" />
            Applicants
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === 'employees' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <UserCheck className="h-4 w-4" />
            Employees
          </button>
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        {activeTab === 'applicants' ? <ApplicantsTab /> : <EmployeesTab />}

      </div>
    </DashboardLayout>
  );
}