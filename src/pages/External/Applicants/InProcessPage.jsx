import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, UserCog, ChevronRight, CalendarDays, Building2,
  Settings2, Plus, Edit2, Save, X, Loader2, Trash2,
  ChevronUp, ChevronDown, GripVertical, Filter, Users,
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { applicantService } from '../../../services/applicantService';
import { branchService } from '../../../services/branchService';
import { userService } from '../../../services/userService';
import { customColumnService } from '../../../services/customcolumnService';
import { useAuth } from '../../../contexts/AuthContext';

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
  { key: 'applicant',    label: 'Applicant',    always: true,  fixed: true },
  { key: 'branch',       label: 'Branch',       always: false, fixed: true },
  { key: 'current_step', label: 'Current Step', always: false, fixed: true },
  { key: 'source',       label: 'Source',       always: false, fixed: true },
  { key: 'applied_at',   label: 'Applied',      always: false, fixed: true },
  { key: 'handled_by',   label: 'Recruiter (TA)', always: false, fixed: true },
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
    } catch (e) {
      setError('Server error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (col) => {
    const trimmed = editLabel.trim();
    if (!trimmed) { setError('Column name is required.'); return; }
    try {
      setSaving(true);
      await customColumnService.update(col.id, { label: trimmed });
      setCols((prev) => prev.map((c) => c.id === col.id ? { ...c, label: trimmed } : c));
      setEditingId(null); setError('');
    } catch (e) {
      setError('Failed to rename column.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (col) => {
    if (!confirm(`Delete column "${col.label}"?`)) return;
    try {
      await customColumnService.remove(col.id);
      setCols((prev) => prev.filter((c) => c.id !== col.id));
    } catch (e) {
      setError('Failed to delete column.');
    }
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
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function InProcessPage() {
  const { user: currentUser } = useAuth();

  const [applicants,  setApplicants]  = useState([]);
  const [branches,    setBranches]    = useState([]);
  const [taUsers,     setTaUsers]     = useState([]);
  const [customCols,  setCustomCols]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage,     setPerPage]     = useState(15);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [searchInput,  setSearchInput]  = useState('');
  const debouncedSearch                  = useDebounce(searchInput, 400);
  const [branchFilter, setBranchFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [taFilter,     setTaFilter]     = useState('');
  const [sortFilter,   setSortFilter]   = useState('recent');

  // ── Column management ─────────────────────────────────────────────────────
  const [visibleCols,    setVisibleCols]    = useState(DEFAULT_VISIBLE);
  const [colOrder,       setColOrder]       = useState(DEFAULT_VISIBLE);
  const [showColPicker,  setShowColPicker]  = useState(false);
  const [showManageCols, setShowManageCols] = useState(false);

  const userRole      = currentUser?.roles?.[0]?.name;
  const isTA          = userRole === 'talent_acquisition';
  const canFilterByTA = !isTA; // only hr_admin / super_admin see TA filter

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchBranches(); fetchCustomCols(); }, []);
  useEffect(() => { if (canFilterByTA) fetchTaUsers(); }, [canFilterByTA]);
  useEffect(() => { fetchApplicants(); }, [debouncedSearch, branchFilter, sourceFilter, taFilter, sortFilter, currentPage, perPage]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, branchFilter, sourceFilter, taFilter, sortFilter, perPage]);

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
        status:   'active',
        page:     currentPage,
        per_page: perPage,
        search:   debouncedSearch,
        ...(isTA && { scope: 'own' }),
        ...(branchFilter && { branch_id: branchFilter }),
        ...(sourceFilter && { source: sourceFilter }),
        ...(taFilter     && { ta_id: taFilter }),
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

  const toggleColumn = (key) => {
    const col = allColumnsWithCustom.find((c) => c.key === key);
    if (col?.always) return;
    if (visibleCols.includes(key)) {
      setVisibleCols((v) => v.filter((k) => k !== key));
      setColOrder((o) => o.filter((k) => k !== key));
    } else {
      setVisibleCols((v) => [...v, key]);
      setColOrder((o) => [...o, key]);
    }
  };

  const activeColumns = colOrder.filter((k) => visibleCols.includes(k));

  const clearFilters = () => {
    setSearchInput(''); setBranchFilter(''); setSourceFilter('');
    setTaFilter(''); setSortFilter('recent'); setCurrentPage(1);
  };

  const hasFilters = searchInput || branchFilter || sourceFilter || taFilter;

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
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  {total} active
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

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className={`grid grid-cols-1 gap-3 ${canFilterByTA ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>

            {/* Search */}
            <div className={`relative ${canFilterByTA ? '' : 'md:col-span-1'}`}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email or phone..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            {/* Branch */}
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>

            {/* Source */}
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Sources</option>
              <option value="WordPress">WordPress</option>
              <option value="Gmail">Gmail</option>
              <option value="Facebook">Facebook</option>
              <option value="BossJobs">Boss Jobs</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Referral">Referral</option>
            </select>

            {/* TA Filter — HR/Admin only */}
            {canFilterByTA && (
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select value={taFilter} onChange={(e) => setTaFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                  <option value="">All Recruiters (TA)</option>
                  {taUsers.map((ta) => (
                    <option key={ta.id} value={ta.id}>{ta.name ?? ta.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-50">
              {branchFilter && (() => {
                const b = branches.find((x) => String(x.id) === String(branchFilter));
                return b ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    <Building2 className="h-3 w-3" /> {b.branch_name}
                    <button onClick={() => setBranchFilter('')} className="ml-0.5 hover:text-blue-900"><X className="h-3 w-3" /></button>
                  </span>
                ) : null;
              })()}
              {taFilter && canFilterByTA && (() => {
                const ta = taUsers.find((x) => String(x.id) === String(taFilter));
                return ta ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                    <Users className="h-3 w-3" /> {ta.name ?? ta.full_name}
                    <button onClick={() => setTaFilter('')} className="ml-0.5 hover:text-indigo-900"><X className="h-3 w-3" /></button>
                  </span>
                ) : null;
              })()}
            </div>
          )}

          {/* Row 2 — sort + column picker + clear */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Sort:</span>
              {[
                { value: 'recent',    label: 'Newest'   },
                { value: 'oldest',    label: 'Oldest'   },
                { value: 'name_asc',  label: 'Name A–Z' },
                { value: 'name_desc', label: 'Name Z–A' },
              ].map((opt) => (
                <button key={opt.value} onClick={() => setSortFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                    ${sortFilter === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Column show/hide picker */}
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
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-56">
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

              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-600">
                  Clear filters
                </button>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>Rows:</span>
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none">
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
              Loading...
            </div>
          ) : applicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <UserCog className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No in-process applicants found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {activeColumns.map((key) => {
                        const col = allColumnsWithCustom.find((c) => c.key === key);
                        return (
                          <th key={key}
                            className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
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
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {applicants.map((applicant) => (
                      <tr key={applicant.id} className="hover:bg-gray-50 transition-colors group">
                        {activeColumns.map((key) => (
                          <td key={key} className="px-5 py-3.5 whitespace-nowrap">
                            <CellValue colKey={key} applicant={applicant} />
                          </td>
                        ))}
                        <td className="px-5 py-3.5 text-right">
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

        {customCols.length > 0 && (
          <p className="text-xs text-gray-400">✦ Custom columns — data entered per applicant on their profile page</p>
        )}

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