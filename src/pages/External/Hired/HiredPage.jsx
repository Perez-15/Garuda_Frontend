import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, UserCheck, Building2, CalendarDays, ChevronRight,
  GripVertical, Filter, X, Users, Settings2, Plus, Trash2,
  Edit2, Save, ChevronUp, ChevronDown, Loader2,
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { employeeService } from '../../../services/hiredService';
import { branchService } from '../../../services/branchService';
import { userService } from '../../../services/userService';
import { customColumnService } from '../../../services/customcolumnService';
import { useAuth } from '../../../contexts/AuthContext';

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Status tab config ─────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: 's',          label: 'All',        color: 'gray'   },
  { key: 'active',     label: 'Active',     color: 'green'  },
  { key: 'resigned',   label: 'Resigned',   color: 'yellow' },
  { key: 'terminated', label: 'Terminated', color: 'red'    },
  { key: 'endo',       label: 'Endo',       color: 'orange' },
  { key: 'awol',       label: 'AWOL',       color: 'purple' },
];

const TAB_STYLES = {
  gray:   { active: 'bg-gray-800 text-white',   inactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100', dot: 'bg-gray-400'   },
  green:  { active: 'bg-green-600 text-white',  inactive: 'text-green-600 hover:bg-green-50',                    dot: 'bg-green-500'  },
  yellow: { active: 'bg-yellow-500 text-white', inactive: 'text-yellow-600 hover:bg-yellow-50',                  dot: 'bg-yellow-500' },
  red:    { active: 'bg-red-600 text-white',    inactive: 'text-red-600 hover:bg-red-50',                        dot: 'bg-red-500'    },
  orange: { active: 'bg-orange-500 text-white', inactive: 'text-orange-600 hover:bg-orange-50',                  dot: 'bg-orange-500' },
  purple: { active: 'bg-purple-600 text-white', inactive: 'text-purple-600 hover:bg-purple-50',                  dot: 'bg-purple-500' },
};

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    hired:      'bg-green-100 text-green-700',
    resigned:   'bg-yellow-100 text-yellow-700',
    terminated: 'bg-red-100 text-red-700',
    endo:       'bg-orange-100 text-orange-700',
    awol:       'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-green-100 text-green-700'}`}>
      {status ?? 'Active'}
    </span>
  );
}

// ── Requirements badge ────────────────────────────────────────────────────────
function ReqBadge({ status }) {
  const map = {
    complete:   'bg-green-50 text-green-700 border-green-200',
    incomplete: 'bg-red-50 text-red-600 border-red-200',
    pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  const labels = { complete: '✓ Complete', incomplete: '✗ Incomplete', pending: '⏳ Pending' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {labels[status] || status || '—'}
    </span>
  );
}

// ── Doc status mini badge ─────────────────────────────────────────────────────
function DocBadge({ status }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  const map    = { submitted: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', not_required: 'bg-gray-100 text-gray-400' };
  const labels = { submitted: '✓', pending: '⏳', not_required: 'N/A' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

// ── Fixed column definitions ──────────────────────────────────────────────────
const FIXED_COLUMNS = [
  { key: 'full_name',               label: 'Employee Name',    always: true,  fixed: true },
  { key: 'employment_status',       label: 'Status',           always: false, fixed: true },
  { key: 'branch',                  label: 'Branch / Location',always: false, fixed: true },
  { key: 'position',                label: 'Position',         always: false, fixed: true },
  { key: 'date_hired',              label: 'Date Hired',       always: false, fixed: true },
  { key: 'date_resigned',           label: 'Date End',         always: false, fixed: true },
  { key: 'contact_number',          label: 'Contact No.',      always: false, fixed: true },
  { key: 'address',                 label: 'Address',          always: false, fixed: true },
  { key: 'age',                     label: 'Age',              always: false, fixed: true },
  { key: 'date_of_birth',           label: 'Birthday',         always: false, fixed: true },
  { key: 'email',                   label: 'Email',            always: false, fixed: true },
  { key: 'sss',                     label: 'SSS',              always: false, fixed: true },
  { key: 'pagibig',                 label: 'Pag-IBIG',         always: false, fixed: true },
  { key: 'philhealth',              label: 'PhilHealth',       always: false, fixed: true },
  { key: 'tin',                     label: 'TIN',              always: false, fixed: true },
  { key: 'nbi_status',              label: 'NBI',              always: false, fixed: true },
  { key: 'medcert_status',          label: 'Medical',          always: false, fixed: true },
  { key: 'remarks',                 label: 'Remarks',          always: false, fixed: true },
  { key: 'requirements_status',     label: 'Requirements',     always: false, fixed: true },
  { key: 'gender',                  label: 'Gender',           always: false, fixed: true },
  { key: 'civil_status',            label: 'Civil Status',     always: false, fixed: true },
  { key: 'emergency_contact',       label: 'Emergency Contact',always: false, fixed: true },
  { key: 'police_clearance_status', label: 'Police Clearance', always: false, fixed: true },
  { key: 'daily_rate',              label: 'Daily Rate',       always: false, fixed: true },
  { key: 'hr_actions',              label: 'HR Actions',       always: false, fixed: true },
  { key: 'handled_by',              label: 'Handled By (TA)',  always: false, fixed: true },
];

const DEFAULT_VISIBLE = [
  'full_name', 'employment_status', 'branch', 'position', 'requirements_status',
];

// ── Cell renderer ─────────────────────────────────────────────────────────────
function CellValue({ colKey, employee }) {
  const fmt = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—';

  switch (colKey) {
    case 'full_name':
      return (
        <div>
          <div className="font-medium text-gray-900 text-sm">{employee.full_name}</div>
          <div className="text-xs text-gray-400 mt-0.5">{employee.email || ''}</div>
        </div>
      );
    case 'employment_status':   return <StatusBadge status={employee.employment_status} />;
    case 'requirements_status': return <ReqBadge status={employee.requirements_status} />;
    case 'branch':
      return (
        <div>
          <div className="text-sm text-gray-700 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            {employee.branch?.branch_name || '—'}
          </div>
          {employee.branch?.client?.name && (
            <div className="text-xs text-gray-400 mt-0.5 ml-5">{employee.branch.client.name}</div>
          )}
        </div>
      );
    case 'position':        return <span className="text-sm text-gray-600">{employee.position?.name || '—'}</span>;
    case 'date_of_birth':   return <span className="text-sm text-gray-600">{fmt(employee.date_of_birth)}</span>;
    case 'age':             return <span className="text-sm text-gray-600">{employee.age ?? '—'}</span>;
    case 'gender':          return <span className="text-sm text-gray-600">{employee.gender || '—'}</span>;
    case 'civil_status':    return <span className="text-sm text-gray-600">{employee.civil_status || '—'}</span>;
    case 'contact_number':  return <span className="text-sm text-gray-600">{employee.contact_number || '—'}</span>;
    case 'email':           return <span className="text-sm text-gray-600">{employee.email || '—'}</span>;
    case 'address':         return <span className="text-sm text-gray-600 max-w-[180px] truncate block">{employee.address || '—'}</span>;
    case 'emergency_contact':
      return (
        <div className="text-sm text-gray-600">
          <div>{employee.emergency_contact_name || '—'}</div>
          {employee.emergency_contact_number && (
            <div className="text-xs text-gray-400">{employee.emergency_contact_number}</div>
          )}
        </div>
      );
    case 'sss':        return <span className="text-sm font-mono text-gray-600">{employee.sss || '—'}</span>;
    case 'pagibig':    return <span className="text-sm font-mono text-gray-600">{employee.pagibig || '—'}</span>;
    case 'philhealth': return <span className="text-sm font-mono text-gray-600">{employee.philhealth || '—'}</span>;
    case 'tin':        return <span className="text-sm font-mono text-gray-600">{employee.tin || '—'}</span>;
    case 'nbi_status':              return <DocBadge status={employee.nbi_status} />;
    case 'police_clearance_status': return <DocBadge status={employee.police_clearance_status} />;
    case 'medcert_status':          return <DocBadge status={employee.medcert_status} />;
    case 'remarks':
      return employee.remarks
        ? <span className="text-sm text-gray-600 max-w-[200px] truncate block" title={employee.remarks}>{employee.remarks}</span>
        : <span className="text-gray-300 text-xs">—</span>;
    case 'hr_actions': {
      const count = employee.hr_actions_count ?? employee.hr_actions?.length ?? 0;
      return count > 0
        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">{count} action{count > 1 ? 's' : ''}</span>
        : <span className="text-gray-300 text-xs">None</span>;
    }
    case 'date_hired':
      return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
          {fmt(employee.date_hired)}
        </div>
      );
    case 'date_resigned':
      return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
          {fmt(employee.date_resigned || employee.date_ended)}
        </div>
      );
    case 'daily_rate':
      return employee.daily_rate
        ? <span className="text-sm font-medium text-gray-700">₱{Number(employee.daily_rate).toLocaleString()}</span>
        : <span className="text-gray-300 text-xs">—</span>;
    case 'handled_by': {
      const ta = employee.handled_by ?? employee.talent_acquisition_officer;
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
        const val = employee.custom_fields?.[fieldKey];
        return <span className="text-sm text-gray-600">{val || '—'}</span>;
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
        page: 'hired',
        field_key,
        label: trimmed,
        type: newType,
        order: cols.length,
      });
      if (res.column) {
        setCols((prev) => [...prev, res.column]);
        setNewLabel('');
        setNewType('text');
        setError('');
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
      setEditingId(null);
      setError('');
    } catch (e) {
      setError('Failed to rename column.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (col) => {
    if (!confirm(`Delete column "${col.label}"? Data for this field will no longer be shown.`)) return;
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
    await customColumnService.reorder('hired', next.map((c) => c.id));
  };

  const handleDone = () => { onRefresh(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDone} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Manage Table Columns</h3>
            <p className="text-xs text-gray-400 mt-0.5">Changes are saved directly to the database</p>
          </div>
          <button onClick={handleDone} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Column list */}
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

        {/* Add new column */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add New Column</p>
          <div className="flex gap-2">
            <input value={newLabel}
              onChange={(e) => { setNewLabel(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="e.g. Allowance, Shift, Notes..."
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
export default function HiredPage() {
  const { user: currentUser } = useAuth();

  const [employees,   setEmployees]   = useState([]);
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
  const debouncedSearch                 = useDebounce(searchInput, 400);
  const [branchFilter, setBranchFilter] = useState('');
  const [reqFilter,    setReqFilter]    = useState('');
  const [taFilter,     setTaFilter]     = useState('');

  // ── Column management ─────────────────────────────────────────────────────
  const [visibleCols,    setVisibleCols]    = useState(DEFAULT_VISIBLE);
  const [colOrder,       setColOrder]       = useState(DEFAULT_VISIBLE);
  const [showColPicker,  setShowColPicker]  = useState(false);
  const [showManageCols, setShowManageCols] = useState(false);

  // ── Drag state ────────────────────────────────────────────────────────────
  const dragCol     = useRef(null);
  const dragOverCol = useRef(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [dragKey,     setDragKey]     = useState(null);

  const userRole      = currentUser?.roles?.[0]?.name;
  const isTA          = userRole === 'talent_acquisition';
  const canFilterByTA = !isTA;

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchBranches(); fetchCustomCols(); }, []);
  useEffect(() => { if (!canFilterByTA) return; fetchTaUsers(); }, [canFilterByTA]);
  useEffect(() => { fetchStats(); }, [branchFilter]);
  useEffect(() => { fetchEmployees(); }, [debouncedSearch, activeTab, branchFilter, reqFilter, taFilter, currentPage, perPage]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, activeTab, branchFilter, reqFilter, taFilter, perPage]);

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchBranches = async () => {
    try {
      const res = isTA
        ? await branchService.getAssignedBranches(currentUser.id)
        : await branchService.getAll();
      setBranches(isTA ? (res.branches || []) : (res.data || res));
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
      const res = await customColumnService.getByPage('hired');
      setCustomCols(Array.isArray(res) ? res : []);
    } catch (e) { console.error('Could not load custom columns:', e); }
  };

  const fetchStats = async () => {
    try {
      const res = await employeeService.getStats({ branch_id: branchFilter || undefined });
      setStats(res);
    } catch (e) { console.error(e); }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = {
        page:     currentPage,
        per_page: perPage,
        search:   debouncedSearch,
        sort_by:  'date_hired',
        sort_dir: 'desc',
        ...(activeTab && activeTab !== 'active' && { status: activeTab }),
        ...(branchFilter && { branch_id: branchFilter }),
        ...(reqFilter    && { requirements_status: reqFilter }),
        ...(taFilter     && { ta_id: taFilter }),
      };
      const res = await employeeService.getAll(params);
      setEmployees(res.data);
      setTotalPages(res.last_page);
      setTotal(res.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Build full column list (fixed + custom) ───────────────────────────────
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

  // ── Column toggle ─────────────────────────────────────────────────────────
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

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onDragStart = (key) => {
    dragCol.current = key;
    setDragKey(key);
  };

  const onDragEnter = (key) => {
    dragOverCol.current = key;
    setDragOverKey(key);
  };

  const onDragEnd = () => {
    // Always clear visual state FIRST — fixes stuck blue highlight bug
    setDragOverKey(null);
    setDragKey(null);

    // Then reorder if the drop was valid
    if (!dragCol.current || !dragOverCol.current || dragCol.current === dragOverCol.current) {
      dragCol.current     = null;
      dragOverCol.current = null;
      return;
    }
    const newOrder = [...colOrder];
    const from = newOrder.indexOf(dragCol.current);
    const to   = newOrder.indexOf(dragOverCol.current);
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragCol.current);
    setColOrder(newOrder);
    dragCol.current     = null;
    dragOverCol.current = null;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeColumns = colOrder.filter((k) => visibleCols.includes(k));

  const clearFilters = () => {
    setSearchInput('');
    setBranchFilter('');
    setReqFilter('');
    setTaFilter('');
    setCurrentPage(1);
  };

  const hasFilters = searchInput || branchFilter || reqFilter || taFilter;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">Hired</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Manage your hired employee records
              {total > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  {total} records
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowManageCols(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Settings2 className="h-4 w-4" /> Manage Columns
          </button>
        </div>

        {/* ── Status Tabs ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const styles   = TAB_STYLES[tab.color];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive ? styles.active + ' shadow-sm' : styles.inactive}`}
              >
                {tab.key && (
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? 'bg-white/70' : styles.dot}`} />
                )}
                {tab.label}
                {tab.key && stats && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {stats[tab.key] ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className={`grid grid-cols-1 gap-3 ${canFilterByTA ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email or contact..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Branch */}
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>

            {/* Requirements */}
            <select value={reqFilter} onChange={(e) => setReqFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Requirements</option>
              <option value="complete">✓ Complete</option>
              <option value="incomplete">✗ Incomplete</option>
              <option value="pending">⏳ Pending</option>
            </select>

            {/* TA Filter (HR/Admin only) */}
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
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {branchFilter && (() => {
                const b = branches.find((x) => String(x.id) === String(branchFilter));
                return b ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    <Building2 className="h-3 w-3" /> {b.branch_name}
                    <button onClick={() => setBranchFilter('')} className="ml-0.5 hover:text-blue-900"><X className="h-3 w-3" /></button>
                  </span>
                ) : null;
              })()}
              {reqFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium border border-yellow-100">
                  Req: {reqFilter}
                  <button onClick={() => setReqFilter('')} className="ml-0.5 hover:text-yellow-900"><X className="h-3 w-3" /></button>
                </span>
              )}
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

          {/* Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <div className="relative">
              <button
                onClick={() => setShowColPicker((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="h-3.5 w-3.5" />
                Columns
                <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-xs ml-0.5">
                  {activeColumns.length}
                </span>
              </button>

              {showColPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-64">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Show / Hide Columns</span>
                    <button onClick={() => setShowColPicker(false)}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {allColumnsWithCustom.map((col) => (
                      <label
                        key={col.key}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 ${col.always ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={visibleCols.includes(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          disabled={col.always}
                          className="rounded text-blue-600"
                        />
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

            <div className="flex items-center gap-3">
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear filters
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

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full mr-3" />
              Loading...
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <UserCheck className="h-10 w-10 mb-3 text-gray-200" />
              <p className="text-sm font-medium">No records found</p>
              <p className="text-xs mt-1 text-gray-300">Try a different tab or clear your filters</p>
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
                          <th
                            key={key}
                            draggable
                            onDragStart={() => onDragStart(key)}
                            onDragEnter={() => onDragEnter(key)}
                            onDragEnd={onDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            className={`
                              px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide
                              cursor-grab active:cursor-grabbing select-none group transition-colors
                              ${dragKey === key
                                ? 'opacity-40 bg-indigo-50 text-gray-500'
                                : dragOverKey === key
                                  ? 'bg-indigo-100 text-indigo-700 border-l-2 border-indigo-400'
                                  : 'text-gray-500'}
                            `}
                          >
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              {col?.label}
                              {col?.custom && <span className="text-blue-300 ml-0.5">✦</span>}
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                        {activeColumns.map((key) => (
                          <td
                            key={key}
                            className={`px-4 py-3.5 whitespace-nowrap transition-colors ${dragOverKey === key ? 'bg-indigo-50' : ''}`}
                          >
                            <CellValue colKey={key} employee={emp} />
                          </td>
                        ))}
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to={`/employees/${emp.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
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

        {/* Custom column legend */}
        {customCols.length > 0 && (
          <p className="text-xs text-gray-400">✦ Custom columns — data entered per employee on their profile page</p>
        )}

      </div>

      {/* Manage Columns Modal */}
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