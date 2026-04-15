// pages/External/Hired/HiredPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, UserCheck, Building2, CalendarDays, ChevronRight,
  GripVertical, Filter, X, Users, Settings2, Plus, Trash2,
  Edit2, Save, ChevronUp, ChevronDown, Loader2, UserPlus,
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { employeeService } from '../../../services/hiredService';
import { branchService } from '../../../services/branchService';
import { userService } from '../../../services/userService';
import { customColumnService } from '../../../services/customcolumnService';
import { useAuth } from '../../../contexts/AuthContext';
import { usePersistedColumns } from '../../../hooks/usePersistedColumns';
import ManageColumnsModal from '../../../components/Modal/ManageColumnsModal';

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
  { key: 'full_name',               label: 'Employee Name',     always: true,  fixed: true },
  { key: 'employment_status',       label: 'Status',            always: false, fixed: true },
  { key: 'branch',                  label: 'Branch / Location', always: false, fixed: true },
  { key: 'position',                label: 'Position',          always: false, fixed: true },
  { key: 'date_hired',              label: 'Date Hired',        always: false, fixed: true },
  { key: 'date_resigned',           label: 'Date End',          always: false, fixed: true },
  { key: 'contact_number',          label: 'Contact No.',       always: false, fixed: true },
  { key: 'address',                 label: 'Address',           always: false, fixed: true },
  { key: 'age',                     label: 'Age',               always: false, fixed: true },
  { key: 'date_of_birth',           label: 'Birthday',          always: false, fixed: true },
  { key: 'email',                   label: 'Email',             always: false, fixed: true },
  { key: 'sss',                     label: 'SSS',               always: false, fixed: true },
  { key: 'pagibig',                 label: 'Pag-IBIG',          always: false, fixed: true },
  { key: 'philhealth',              label: 'PhilHealth',        always: false, fixed: true },
  { key: 'tin',                     label: 'TIN',               always: false, fixed: true },
  { key: 'nbi_status',              label: 'NBI',               always: false, fixed: true },
  { key: 'medcert_status',          label: 'Medical',           always: false, fixed: true },
  { key: 'remarks',                 label: 'Remarks',           always: false, fixed: true },
  { key: 'requirements_status',     label: 'Requirements',      always: false, fixed: true },
  { key: 'gender',                  label: 'Gender',            always: false, fixed: true },
  { key: 'civil_status',            label: 'Civil Status',      always: false, fixed: true },
  { key: 'emergency_contact',       label: 'Emergency Contact', always: false, fixed: true },
  { key: 'police_clearance_status', label: 'Police Clearance',  always: false, fixed: true },
  { key: 'daily_rate',              label: 'Daily Rate',        always: false, fixed: true },
  { key: 'hr_actions',              label: 'HR Actions',        always: false, fixed: true },
  { key: 'handled_by',              label: 'Handled By (TA)',   always: false, fixed: true },
  { key: 'added_by',               label: 'Added By',          always: false, fixed: true },
];

const DEFAULT_VISIBLE = [
  'full_name', 'employment_status', 'branch', 'position',
  'date_hired', 'date_resigned', 'requirements_status', 'added_by',
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
    case 'position':        return <span className="text-sm text-gray-600">{employee.position || '—'}</span>;
    case 'date_of_birth':   return <span className="text-sm text-gray-600">{fmt(employee.date_of_birth)}</span>;
    case 'age':             return <span className="text-sm text-gray-600">{employee.age ?? '—'}</span>;
    case 'gender':          return <span className="text-sm text-gray-600">{employee.gender || '—'}</span>;
    case 'civil_status':    return <span className="text-sm text-gray-600">{employee.civil_status || '—'}</span>;
    case 'contact_number':  return <span className="text-sm text-gray-600">{employee.contact_number || '—'}</span>;
    case 'email':           return <span className="text-sm text-gray-600">{employee.email || '—'}</span>;
    case 'address':
      return (
        <span className="text-sm text-gray-600 max-w-[200px] truncate block" title={employee.address || ''}>
          {employee.address || '—'}
        </span>
      );
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
    case 'added_by': {
      const creator = employee.created_by_user ?? employee.createdBy ?? employee.created_by;
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
        return <span className="text-sm text-gray-600">{employee.custom_fields?.[fieldKey] || '—'}</span>;
      }
      return <span className="text-gray-400 text-xs">—</span>;
  }
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
  const [sortBy,  setSortBy]  = useState('date_hired');
  const [sortDir, setSortDir] = useState('desc');
  const [taFilter,     setTaFilter]     = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  // ── Column management — persisted per user in localStorage ────────────────
  const { visibleCols, colOrder, toggleColumn: _toggleColumn, setColOrder } =
    usePersistedColumns('hired', currentUser?.id, DEFAULT_VISIBLE);
  const [showColPicker,  setShowColPicker]  = useState(false);
  const [showManageCols, setShowManageCols] = useState(false);

  // ── Drag state ────────────────────────────────────────────────────────────
  const dragCol     = useRef(null);
  const dragOverCol = useRef(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [dragKey,     setDragKey]     = useState(null);

  const userRole      = currentUser?.roles?.[0]?.name;
  const isTA          = userRole === 'talent_acquisition';
  const isAdmin       = userRole === 'super_admin' || userRole === 'hr_admin';
  const canFilterByTA = !isTA;

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchBranches(); fetchCustomCols(); }, []);

  useEffect(() => { if (!canFilterByTA) return; fetchTaUsers(); }, [canFilterByTA]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTab, branchFilter, reqFilter, taFilter, periodFilter, perPage, sortBy, sortDir]);

  useEffect(() => { fetchStats(); }, [branchFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [debouncedSearch, activeTab, branchFilter, reqFilter, taFilter, periodFilter, currentPage, perPage]);

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
      const list = Array.isArray(res.data)       ? res.data
                 : Array.isArray(res.data?.data)  ? res.data.data
                 : [];
      setTaUsers(list);
    } catch (e) {
      console.error('Could not load TA users:', e);
      setTaUsers([]);
    }
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
        page:      currentPage,
        per_page:  perPage,
        search:    debouncedSearch,
        sort_by:   sortBy,
        sort_dir:  sortDir,
        ...(activeTab && activeTab !== 's' && { status: activeTab }),
        ...(branchFilter && { branch_id: branchFilter }),
        ...(reqFilter    && { requirements_status: reqFilter }),
        ...(taFilter     && { ta_id: taFilter }),
        ...(periodFilter && { period: periodFilter }),
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

  // ── Column toggle (uses hook) ─────────────────────────────────────────────
  const toggleColumn = (key) => _toggleColumn(key, allColumnsWithCustom);

  // ── Drag handlers — saves new order via hook's setColOrder ────────────────
  const onDragStart = (key) => { dragCol.current = key; setDragKey(key); };
  const onDragEnter = (key) => { dragOverCol.current = key; setDragOverKey(key); };
  const onDragEnd = () => {
    setDragOverKey(null);
    setDragKey(null);
    if (!dragCol.current || !dragOverCol.current || dragCol.current === dragOverCol.current) {
      dragCol.current = null; dragOverCol.current = null; return;
    }
    const newOrder = [...colOrder];
    const from = newOrder.indexOf(dragCol.current);
    const to   = newOrder.indexOf(dragOverCol.current);
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragCol.current);
    setColOrder(newOrder);
    dragCol.current = null; dragOverCol.current = null;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeColumns = colOrder.filter((k) => visibleCols.includes(k));

  const clearFilters = () => {
    setSearchInput(''); setBranchFilter(''); setReqFilter('');
    setTaFilter(''); setPeriodFilter(''); setCurrentPage(1);
  };

  const hasFilters = searchInput || branchFilter || reqFilter || taFilter || periodFilter;
  const selectedTA = Array.isArray(taUsers)
    ? taUsers.find((x) => String(x.id) === String(taFilter))
    : undefined;

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
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive ? styles.active + ' shadow-sm' : styles.inactive}`}>
                {tab.key && <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? 'bg-white/70' : styles.dot}`} />}
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
        <div className="bg-white shadow rounded-lg p-4 space-y-3">

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email or contact..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>

            <select value={reqFilter} onChange={(e) => setReqFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Requirements</option>
              <option value="complete">✓ Complete</option>
              <option value="incomplete">✗ Incomplete</option>
              <option value="pending">⏳ Pending</option>
            </select>

            <div className="flex gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="date_hired">Date Hired</option>
                <option value="full_name">Name</option>
                <option value="date_resigned">Date End</option>
                <option value="daily_rate">Daily Rate</option>
                <option value="employment_status">Status</option>
              </select>
              <button onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-600 flex-shrink-0"
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
                {sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Row 2 — Admin filters */}
          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-3 border-t border-gray-100">
              <div className="md:col-span-3 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  Admin Filters
                </span>
                <span className="text-xs text-gray-400">Filter by recruiter or time period</span>
              </div>
              <div>
                <select value={taFilter} onChange={(e) => setTaFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Recruiters (TA)</option>
                  {(taUsers ?? []).map((ta) => <option key={ta.id} value={ta.id}>{ta.name ?? ta.full_name}</option>)}
                </select>
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
          )}

          {/* Bottom row */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">

              {/* Columns picker */}
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
                  <div className="absolute top-full left-0 mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-64">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Show / Hide Columns</span>
                        <p className="text-xs text-gray-400 mt-0.5">Changes apply only to your account</p>
                      </div>
                      <button onClick={() => setShowColPicker(false)}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
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

              {/* Active filter chips */}
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
              {taFilter && selectedTA && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                  <Users className="h-3 w-3" /> {selectedTA.name ?? selectedTA.full_name}
                  <button onClick={() => setTaFilter('')} className="ml-0.5 hover:text-indigo-900"><X className="h-3 w-3" /></button>
                </span>
              )}
              {periodFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100 capitalize">
                  {periodFilter.replace('_', ' ')}
                  <button onClick={() => setPeriodFilter('')} className="ml-0.5 hover:text-purple-900"><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear filters
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
                          <th key={key} draggable
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
                            `}>
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
                          <td key={key}
                            className={`px-4 py-3.5 whitespace-nowrap transition-colors ${dragOverKey === key ? 'bg-indigo-50' : ''}`}>
                            <CellValue colKey={key} employee={emp} />
                          </td>
                        ))}
                        <td className="px-4 py-3.5 text-center">
                          <Link to={`/employees/${emp.id}`}
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
      </div>

      {showManageCols && (
        <ManageColumnsModal
          page="hired"
          onClose={() => setShowManageCols(false)}
          onSaved={fetchCustomCols}
        />
      )}

    </DashboardLayout>
  );
}