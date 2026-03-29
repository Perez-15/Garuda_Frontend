// pages/External/Applicants/InProcessPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, UserCog, ChevronRight, CalendarDays, Building2,
  Settings2, Plus, Edit2, Save, X, Loader2, Trash2,
  ChevronUp, ChevronDown, GripVertical, Filter, Users, UserPlus,
  UserX,
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { applicantService } from '../../../services/applicantService';
import { branchService } from '../../../services/branchService';
import { userService } from '../../../services/userService';
import { customColumnService } from '../../../services/customcolumnService';
import { useAuth } from '../../../contexts/AuthContext';
import { usePersistedColumns } from '../../../hooks/usePersistedColumns';

const PAGE = 'in_process';

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Step badge ────────────────────────────────────────────────────────────────
function StepBadge({ stepName }) {
  if (!stepName) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
      {stepName}
    </span>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (!source) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      {source}
    </span>
  );
}

// ── Fixed column definitions ──────────────────────────────────────────────────
const FIXED_COLUMNS = [
  { key: 'applicant',    label: 'Applicant',      always: true,  fixed: true },
  { key: 'branch',       label: 'Branch',         always: false, fixed: true },
  { key: 'current_step', label: 'Current Step',   always: false, fixed: true },
  { key: 'source',       label: 'Source',         always: false, fixed: true },
  { key: 'applied_at',   label: 'Applied',        always: false, fixed: true },
  { key: 'handled_by',   label: 'Recruiter (TA)', always: false, fixed: true },
  { key: 'added_by',     label: 'Added By',       always: false, fixed: true },
];

const DEFAULT_VISIBLE = ['applicant', 'branch', 'current_step', 'source', 'applied_at'];

// ── Cell renderer ─────────────────────────────────────────────────────────────
function CellValue({ colKey, applicant }) {
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  switch (colKey) {
    case 'applicant':
      return (
        <div>
          <div className="font-medium text-gray-900 text-sm">{applicant.full_name}</div>
          <div className="text-xs text-gray-400 mt-0.5">{applicant.email}</div>
          <div className="text-xs text-gray-400">{applicant.phone}</div>
        </div>
      );
    case 'branch':
      return (
        <div>
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            {applicant.branch?.branch_name || '—'}
          </div>
          {applicant.branch?.client?.name && (
            <div className="text-xs text-gray-400 mt-0.5 ml-5">{applicant.branch.client.name}</div>
          )}
        </div>
      );
    case 'current_step': return <StepBadge stepName={applicant.current_step?.step_name} />;
    case 'source':       return <SourceBadge source={applicant.source} />;
    case 'applied_at':
      return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
          {fmt(applicant.applied_at)}
        </div>
      );
    case 'handled_by': {
      const ta = applicant.created_by;
      if (!ta) return <span className="text-gray-300 text-xs">—</span>;
      const name = typeof ta === 'string' ? ta : (ta.name ?? ta.full_name ?? '—');
      return (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
          <span className="text-sm text-gray-600">{name}</span>
        </div>
      );
    }
    case 'added_by': {
      const creator = applicant.createdBy ?? applicant.created_by_user ?? applicant.created_by;
      if (!creator || typeof creator !== 'object') return <span className="text-gray-300 text-xs">—</span>;
      const name = creator.name ?? creator.full_name ?? '—';
      return (
        <div className="flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-sm text-gray-600">{name}</span>
        </div>
      );
    }
    default:
      if (colKey.startsWith('custom_')) {
        const fieldKey = colKey.replace('custom_', '');
        return <span className="text-sm text-gray-600">{applicant.custom_fields?.[fieldKey] || '—'}</span>;
      }
      return <span className="text-gray-400 text-xs">—</span>;
  }
}

// ── Manage Columns Modal ──────────────────────────────────────────────────────
function ManageColumnsModal({ customCols, onClose, onRefresh }) {
  const [cols, setCols]           = useState(customCols.map((c) => ({ ...c })));
  const [newLabel, setNewLabel]   = useState('');
  const [newType, setNewType]     = useState('text');
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const handleAdd = async () => {
    const trimmed = newLabel.trim();
    if (!trimmed) { setError('Column name is required.'); return; }
    const field_key = trimmed.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!field_key) { setError('Invalid column name.'); return; }
    try {
      setSaving(true);
      const res = await customColumnService.create({
        page: PAGE, field_key, label: trimmed, type: newType, order: cols.length,
      });
      if (res.column) {
        setCols((prev) => [...prev, res.column]);
        setNewLabel(''); setNewType('text'); setError('');
      } else {
        setError(res.message || 'Failed to add column.');
      }
    } catch { setError('Server error. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleRename = async (col) => {
    const trimmed = editLabel.trim();
    if (!trimmed) { setError('Column name is required.'); return; }
    try {
      setSaving(true);
      await customColumnService.update(col.id, { label: trimmed });
      setCols((prev) => prev.map((c) => c.id === col.id ? { ...c, label: trimmed } : c));
      setEditingId(null); setError('');
    } catch { setError('Failed to rename column.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (col) => {
    if (!confirm(`Delete column "${col.label}"?`)) return;
    try {
      await customColumnService.remove(col.id);
      setCols((prev) => prev.filter((c) => c.id !== col.id));
    } catch { setError('Failed to delete column.'); }
  };

  const move = async (index, dir) => {
    const next = [...cols];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCols(next);
    await customColumnService.reorder(PAGE, next.map((c) => c.id));
  };

  const handleDone = () => { onRefresh(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDone} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Manage Table Columns</h3>
            <p className="text-xs text-gray-400 mt-0.5">Changes are saved directly to the database</p>
          </div>
          <button onClick={handleDone} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Default Columns</p>
          {FIXED_COLUMNS.map((col) => (
            <div key={col.key} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
              <GripVertical className="h-4 w-4 text-gray-200 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-500">{col.label}</span>
              <span className="text-xs text-gray-300 bg-gray-100 px-2 py-0.5 rounded">fixed</span>
            </div>
          ))}

          {cols.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1">Custom Columns</p>
              {cols.map((col, index) => (
                <div key={col.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-100 bg-blue-50 group">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(index, -1)} disabled={index === 0}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ChevronUp className="h-3 w-3" /></button>
                    <button onClick={() => move(index, 1)} disabled={index === cols.length - 1}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ChevronDown className="h-3 w-3" /></button>
                  </div>
                  <GripVertical className="h-4 w-4 text-blue-200 flex-shrink-0" />
                  {editingId === col.id ? (
                    <input autoFocus value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(col); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <span className="flex-1 text-sm text-gray-700">
                      {col.label} <span className="text-xs text-blue-400">({col.type})</span>
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingId === col.id ? (
                      <>
                        <button onClick={() => handleRename(col)} disabled={saving}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setEditingId(null)}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="h-3.5 w-3.5" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(col.id); setEditLabel(col.label); setError(''); }}
                          className="p-1 text-blue-500 hover:bg-blue-100 rounded"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(col)}
                          className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add New Column</p>
          <div className="flex gap-2">
            <input value={newLabel}
              onChange={(e) => { setNewLabel(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="e.g. Interview Score, Notes..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={newType} onChange={(e) => setNewType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
          </div>
          <button onClick={handleAdd} disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Column to Database
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
          <button onClick={handleDone}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: ApplicantDetailPage also needs updating — see separate output file
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function InProcessPage() {
  const { user: currentUser } = useAuth();

  const [applicants,  setApplicants]  = useState([]);
  const [branches,    setBranches]    = useState([]);
  const [taUsers,     setTaUsers]     = useState([]);
  const [customCols,  setCustomCols]  = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage,     setPerPage]     = useState(15);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState('active');
  const [searchInput,  setSearchInput]  = useState('');
  const debouncedSearch                  = useDebounce(searchInput, 400);
  const [branchFilter, setBranchFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [taFilter,     setTaFilter]     = useState('');
  const [sortFilter,   setSortFilter]   = useState('recent');
  const [periodFilter, setPeriodFilter] = useState('');

  // ── Column management — persisted per user in localStorage ───────────────
  const { visibleCols, colOrder, toggleColumn: _toggleColumn, setColOrder } =
    usePersistedColumns('inprocess', currentUser?.id, DEFAULT_VISIBLE);
  const [showColPicker,  setShowColPicker]  = useState(false);
  const [showManageCols, setShowManageCols] = useState(false);

  const userRole      = currentUser?.roles?.[0]?.name;
  const isTA          = userRole === 'talent_acquisition';
  const isAdmin       = userRole === 'super_admin' || userRole === 'hr_admin';
  const canFilterByTA = !isTA;

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchBranches(); fetchCustomCols(); fetchStats(); }, []);
  useEffect(() => { if (canFilterByTA) fetchTaUsers(); }, [canFilterByTA]);
  useEffect(() => { fetchApplicants(); }, [debouncedSearch, activeTab, branchFilter, sourceFilter, taFilter, sortFilter, periodFilter, currentPage, perPage]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, activeTab, branchFilter, sourceFilter, taFilter, sortFilter, periodFilter, perPage]);
  useEffect(() => { fetchStats(); }, [branchFilter, taFilter, periodFilter]);

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchBranches = async () => {
    try {
      if (isTA) {
        const res = await branchService.getAssignedBranches(currentUser.id);
        setBranches(res.branches || []);
      } else {
        const res = await branchService.getAll();
        setBranches(res.data || res);
      }
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const params = {
        ...(isTA         && { scope: 'own' }),
        ...(branchFilter && { branch_id: branchFilter }),
        ...(taFilter     && { ta_id: taFilter }),
        ...(periodFilter && { period: periodFilter }),
      };
      const res = await applicantService.getStats(params);
      setStats(res);
    } catch (e) { console.error('Could not load stats:', e); }
  };

  const fetchTaUsers = async () => {
    try {
      const res = await userService.getAll({ role: 'talent_acquisition' });
      setTaUsers(res.data || []);
    } catch (e) { console.error('Could not load TA users:', e); }
  };

  const fetchCustomCols = async () => {
    try {
      const res = await customColumnService.getByPage(PAGE);
      setCustomCols(Array.isArray(res) ? res : []);
    } catch (e) { console.error('Could not load custom columns:', e); }
  };

  const sortMap = {
    recent:    { sort_by: 'applied_at', sort_dir: 'desc' },
    oldest:    { sort_by: 'applied_at', sort_dir: 'asc'  },
    name_asc:  { sort_by: 'full_name',  sort_dir: 'asc'  },
    name_desc: { sort_by: 'full_name',  sort_dir: 'desc' },
  };

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const params = {
        status:   activeTab,
        page:     currentPage,
        per_page: perPage,
        search:   debouncedSearch,
        ...(isTA         && { scope: 'own' }),
        ...(branchFilter && { branch_id: branchFilter }),
        ...(sourceFilter && { source: sourceFilter }),
        ...(taFilter     && { ta_id: taFilter }),
        ...(periodFilter && { period: periodFilter }),
        ...(sortMap[sortFilter] || sortMap.recent),
      };
      const res = await applicantService.getAll(params);
      setApplicants(res.data);
      setTotalPages(res.last_page);
      setTotal(res.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Build full column list ────────────────────────────────────────────────
  const allColumnsWithCustom = [
    ...FIXED_COLUMNS,
    ...customCols.map((c) => ({
      key:    `custom_${c.field_key}`,
      label:  c.label,
      always: false,
      fixed:  false,
      custom: true,
    })),
  ];

  const toggleColumn = (key) => _toggleColumn(key, allColumnsWithCustom);

  const activeColumns = colOrder.filter((k) => visibleCols.includes(k));

  const clearAllFilters = () => {
    setSearchInput(''); setBranchFilter(''); setSourceFilter('');
    setTaFilter(''); setSortFilter('recent'); setPeriodFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchInput || branchFilter || sourceFilter || taFilter || periodFilter;
  const selectedTA = taUsers.find((u) => String(u.id) === String(taFilter));

  // ── Tab badge label ───────────────────────────────────────────────────────
  const tabCountLabel = activeTab === 'active' ? 'active'
    : activeTab === 'pooling' ? 'pooling'
    : 'backed out';

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCog className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">In-Process</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {isTA ? 'Applicants you added currently in the hiring pipeline' : 'Applicants currently in the hiring pipeline'}
              {total > 0 && (
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === 'pooling'  ? 'bg-amber-100 text-amber-700'
                  : activeTab === 'backout' ? 'bg-rose-100 text-rose-700'
                  : 'bg-blue-100 text-blue-700'
                }`}>
                  {total} {tabCountLabel}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowManageCols(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
              <Settings2 className="h-4 w-4" /> Manage Columns
            </button>
            <Link to="/applicants/new"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              + Add Applicant
            </Link>
          </div>
        </div>

        {/* ── Tab strip — 3 tabs: In-Process, Pooling, Back Outs ──────────── */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 overflow-x-auto w-fit">

          {/* In-Process tab */}
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === 'active' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'}`}
          >
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${activeTab === 'active' ? 'bg-white/70' : 'bg-blue-500'}`} />
            In-Process
            {stats?.in_process !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {stats.in_process}
              </span>
            )}
          </button>

          {/* Pooling tab */}
          <button
            onClick={() => setActiveTab('pooling')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === 'pooling' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 hover:bg-amber-50'}`}
          >
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${activeTab === 'pooling' ? 'bg-white/70' : 'bg-amber-500'}`} />
            Pooling
            {stats?.pooling !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'pooling' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {stats.pooling}
              </span>
            )}
          </button>

          {/* Back Outs tab */}
          <button
            onClick={() => setActiveTab('backout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === 'backout' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-600 hover:bg-rose-50'}`}
          >
            <UserX className={`h-3.5 w-3.5 flex-shrink-0 ${activeTab === 'backout' ? 'text-white' : 'text-rose-500'}`} />
            Back Outs
            {stats?.backout !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'backout' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {stats.backout}
              </span>
            )}
          </button>

        </div>

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div className="bg-white shadow rounded-lg p-4 space-y-3">

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">{isTA ? 'All My Branches' : 'All Branches'}</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>

            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Sources</option>
              <option value="WordPress">WordPress</option>
              <option value="Gmail">Gmail</option>
              <option value="Facebook">Facebook</option>
              <option value="BossJobs">Boss Jobs</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Referral">Referral</option>
            </select>

            <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <optgroup label="Sort by Date">
                <option value="recent">Newest First</option>
                <option value="oldest">Oldest First</option>
              </optgroup>
              <optgroup label="Sort by Name">
                <option value="name_asc">Name A–Z</option>
                <option value="name_desc">Name Z–A</option>
              </optgroup>
            </select>
          </div>

          {/* Row 2 — Recruiter + Period pushed to the right */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-start-4">
              {isAdmin && (
                <select value={taFilter} onChange={(e) => setTaFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Recruiters</option>
                  {taUsers.map((ta) => (
                    <option key={ta.id} value={ta.id}>{ta.name ?? ta.full_name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
              </select>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <button onClick={() => setShowColPicker((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <Filter className="h-3.5 w-3.5" />
                  Columns
                  <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-xs ml-0.5">
                    {activeColumns.length}
                  </span>
                </button>
                {showColPicker && (
                  <div className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-56">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Show / Hide</span>
                      <button onClick={() => setShowColPicker(false)}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                    </div>
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {allColumnsWithCustom.map((col) => (
                        <label key={col.key}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 ${col.always ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <input type="checkbox" checked={visibleCols.includes(col.key)}
                            onChange={() => toggleColumn(col.key)} disabled={col.always}
                            className="rounded text-blue-600" />
                          <span className="text-sm text-gray-700">
                            {col.label}
                            {col.custom && <span className="ml-1 text-xs text-blue-400">✦</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {branchFilter && (() => {
                const b = branches.find((x) => String(x.id) === String(branchFilter));
                return b ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                    <Building2 className="h-3.5 w-3.5 text-gray-500" /> {b.branch_name}
                    <button onClick={() => setBranchFilter('')} className="ml-0.5 text-gray-400 hover:text-gray-700"><X className="h-3 w-3" /></button>
                  </span>
                ) : null;
              })()}
              {sourceFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                  {sourceFilter}
                  <button onClick={() => setSourceFilter('')} className="ml-0.5 text-gray-400 hover:text-gray-700"><X className="h-3 w-3" /></button>
                </span>
              )}
              {taFilter && selectedTA && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                  <Users className="h-3.5 w-3.5 text-gray-500" /> TA {selectedTA.name ?? selectedTA.full_name}
                  <button onClick={() => setTaFilter('')} className="ml-0.5 text-gray-400 hover:text-gray-700"><X className="h-3 w-3" /></button>
                </span>
              )}
              {periodFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                  {periodFilter.replace(/_/g, ' ')}
                  <button onClick={() => setPeriodFilter('')} className="ml-0.5 text-gray-400 hover:text-gray-700"><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-red-500">
                  Clear all filters
                </button>
              )}
              <span className="text-xs text-gray-400">Rows per page:</span>
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
              Loading...
            </div>
          ) : applicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <UserCog className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">
                {activeTab === 'backout' ? 'No back outs found' : 'No applicants found'}
              </p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {activeColumns.map((key) => {
                        const col = allColumnsWithCustom.find((c) => c.key === key);
                        return (
                          <th key={key}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {col?.label}
                              {col?.custom && <span className="text-blue-300 ml-0.5">✦</span>}
                              {key === 'applied_at' && (
                                <button onClick={() => setSortFilter(sortFilter === 'recent' ? 'oldest' : 'recent')}
                                  className="ml-1 text-gray-400 hover:text-blue-600">
                                  {sortFilter === 'recent' ? '↓' : sortFilter === 'oldest' ? '↑' : ''}
                                </button>
                              )}
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applicants.map((applicant) => (
                      <tr key={applicant.id} className={`hover:bg-gray-50 ${activeTab === 'backout' ? 'opacity-75' : ''}`}>
                        {activeColumns.map((key) => (
                          <td key={key} className="px-6 py-4 whitespace-nowrap">
                            <CellValue colKey={key} applicant={applicant} />
                          </td>
                        ))}
                        <td className="px-6 py-4 text-right">
                          <Link to={`/in-process/${applicant.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                    <span className="ml-2 text-gray-400">({total} total)</span>
                  </p>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      Previous
                    </button>
                    <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {showManageCols && (
        <ManageColumnsModal
          customCols={customCols}
          onClose={() => setShowManageCols(false)}
          onRefresh={fetchCustomCols}
        />
      )}

    </DashboardLayout>
  );
}