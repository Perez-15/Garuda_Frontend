import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Briefcase, Edit, Trash2, MapPin, Search,
  CalendarDays, Archive, LayoutGrid, TrendingUp,
  Users, ChevronDown, X, Filter, Clock, Palette, UserCircle2, 
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { positionService } from '../../services/positionService';
import { clientService } from '../../services/clientService';
import { branchService } from '../../services/branchService';
import { useAuth } from '../../contexts/AuthContext';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function startOf(unit) {
  const d = new Date();
  if (unit === 'day')   { d.setHours(0, 0, 0, 0); return d; }
  if (unit === 'week')  { d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d; }
  if (unit === 'month') { d.setHours(0, 0, 0, 0); d.setDate(1); return d; }
  return d;
}

const DATE_PRESETS = [
  { label: 'All Time',   value: 'all' },
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom',     value: 'custom' },
];

// ← NEW: default accent colors cycled when no custom color is set
const DEFAULT_PALETTE = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#6366f1',
];

// ─── component ────────────────────────────────────────────────────────────────

export default function PositionsPage() {
  const { user } = useAuth();
  const userRole  = user?.roles?.[0]?.name;
  const canManage = ['super_admin', 'hr_admin', 'talent_acquisition'].includes(userRole);

  // data
  const [positions, setPositions] = useState([]);
  const [clients,   setClients]   = useState([]);
  const [branches,  setBranches]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // tab
  const [activeTab, setActiveTab] = useState('active');

  // modal
  const [showModal,       setShowModal]       = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);

  // ← NEW: client color panel
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [clientColors,   setClientColors]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('pos_client_colors') || '{}'); }
    catch { return {}; }
  });

  // filters
  const [searchFilter, setSearchFilter] = useState(() => localStorage.getItem('pos_search')       || '');
  const [clientFilter, setClientFilter] = useState(() => localStorage.getItem('pos_client')       || '');
  const [branchFilter, setBranchFilter] = useState(() => localStorage.getItem('pos_branch')       || '');
  const [datePreset,   setDatePreset]   = useState(() => localStorage.getItem('pos_date_preset')  || 'all');
  const [dateFrom,     setDateFrom]     = useState(() => localStorage.getItem('pos_date_from')    || '');
  const [dateTo,       setDateTo]       = useState(() => localStorage.getItem('pos_date_to')      || '');

  // form
  const [formData, setFormData] = useState({
    client_id: '', branch_id: '', title: '', description: '', slots: '', is_active: true,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const [posRes, cliRes, brRes] = await Promise.all([
        positionService.getAll(),
        clientService.getAll(),
        branchService.getAll(),
      ]);
      const extractData = (res) => {
        const payload = res?.data;
        if (!payload) return [];
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload)) return payload;
        return [];
      };
      setPositions(extractData(posRes));
      setClients(extractData(cliRes));
      setBranches(extractData(brRes));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ← NEW: resolve a color for a given client_id
  const getClientColor = (clientId, index = 0) =>
    clientColors[String(clientId)] || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];

  // ← NEW: build a stable clientId → default-palette-index map
  const clientIndexMap = useMemo(() => {
    const map = {};
    clients.forEach((c, i) => { map[String(c.id)] = i; });
    return map;
  }, [clients]);

  // ← NEW: handle color change + persist
  const handleColorChange = (clientId, color) => {
    const updated = { ...clientColors, [String(clientId)]: color };
    setClientColors(updated);
    localStorage.setItem('pos_client_colors', JSON.stringify(updated));
  };

  // ─── derived ────────────────────────────────────────────────────────────────
  const filteredBranchOptions = clientFilter
    ? branches.filter((b) => String(b.client_id) === String(clientFilter))
    : branches;

  const filteredPositions = useMemo(() => {
    let from = null;
    let to   = new Date(); to.setHours(23, 59, 59, 999);
    if      (datePreset === 'today')  { from = startOf('day'); }
    else if (datePreset === 'week')   { from = startOf('week'); }
    else if (datePreset === 'month')  { from = startOf('month'); }
    else if (datePreset === 'custom') {
      if (dateFrom) { from = new Date(dateFrom); from.setHours(0, 0, 0, 0); }
      if (dateTo)   { to   = new Date(dateTo);   to.setHours(23, 59, 59, 999); }
    }
    return positions.filter((p) => {
      const isArchived = !p.is_active;
      if (activeTab === 'active'   &&  isArchived) return false;
      if (activeTab === 'archived' && !isArchived) return false;
      if (searchFilter && !(
        p.title?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(searchFilter.toLowerCase())
      )) return false;
      if (clientFilter && String(p.client_id) !== String(clientFilter)) return false;
      if (branchFilter && String(p.branch_id) !== String(branchFilter)) return false;
      if (from) {
        const created = new Date(p.created_at);
        if (created < from || created > to) return false;
      }
      return true;
    });
  }, [positions, activeTab, searchFilter, clientFilter, branchFilter, datePreset, dateFrom, dateTo]);

  const activeCount   = positions.filter((p) =>  p.is_active).length;
  const archivedCount = positions.filter((p) => !p.is_active).length;
  const postedToday   = positions.filter((p) => new Date(p.created_at) >= startOf('day')).length;
  const postedWeek    = positions.filter((p) => new Date(p.created_at) >= startOf('week')).length;
  const postedMonth   = positions.filter((p) => new Date(p.created_at) >= startOf('month')).length;
  const totalSlots    = filteredPositions.reduce((s, p) => s + parseInt(p.slots || 0, 10), 0);

  // ─── handlers ───────────────────────────────────────────────────────────────
  const persist = (key, val) => {
    if (val) localStorage.setItem(key, val); else localStorage.removeItem(key);
  };

  const clearAllFilters = () => {
    setSearchFilter(''); setClientFilter(''); setBranchFilter('');
    setDatePreset('all'); setDateFrom(''); setDateTo('');
    ['pos_search','pos_client','pos_branch','pos_date_preset','pos_date_from','pos_date_to']
      .forEach((k) => localStorage.removeItem(k));
  };

  const hasFilters = searchFilter || clientFilter || branchFilter || datePreset !== 'all';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPosition) {
        await positionService.update(editingPosition.id, formData);
      } else {
        await positionService.create(formData);
      }
      setShowModal(false); setEditingPosition(null); resetForm(); fetchData();
    } catch (err) {
      console.error('Error saving position:', err);
      alert('Failed to save position');
    }
  };

  const handleArchive = async (position) => {
    const action = position.is_active ? 'archive' : 'restore';
    if (!window.confirm(`Are you sure you want to ${action} this position?`)) return;
    try {
      await positionService.update(position.id, { is_active: !position.is_active });
      fetchData();
    } catch (err) { alert(`Failed to ${action} position`); }
  };

  const handleEdit = (position) => {
    setEditingPosition(position);
    setFormData({
      client_id:   position.client_id   ?? '',
      branch_id:   position.branch_id   ?? '',
      title:       position.title       ?? '',
      description: position.description ?? '',
      slots:       position.slots       ?? '',
      is_active:   position.is_active   ?? true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this position?')) return;
    try {
      await positionService.delete(id);
      fetchData();
    } catch (err) { alert('Failed to delete position'); }
  };

  const openNewModal = () => { setEditingPosition(null); resetForm(); setShowModal(true); };
  const resetForm    = () =>
    setFormData({ client_id: '', branch_id: '', title: '', description: '', slots: '', is_active: true });

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Positions</h1>
            <p className="text-sm text-gray-500 mt-0.5">Monitor job openings and manage postings across all clients</p>
          </div>
          <div className="flex items-center gap-2">
            {/* ← NEW: Color Settings button */}
            <button
              onClick={() => setShowColorPanel(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg border border-gray-200 shadow-sm transition-colors"
              title="Customize client colors"
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Client Colors</span>
            </button>
            {canManage && (
              <button
                onClick={openNewModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Position
              </button>
            )}
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <X className="h-4 w-4 shrink-0" />{error}
            <button onClick={fetchData} className="ml-auto underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* ── Monitoring Stats Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Posted Today',      value: postedToday, icon: Clock,        color: 'text-sky-600',     bg: 'bg-white',     border: 'border-sky-100' },
            { label: 'Posted This Week',  value: postedWeek,  icon: TrendingUp,   color: 'text-violet-600',  bg: 'bg-white',  border: 'border-violet-100' },
            { label: 'Posted This Month', value: postedMonth, icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-white', border: 'border-emerald-100' },
            { label: 'Slots (Filtered)',  value: totalSlots,  icon: Users,        color: 'text-amber-600',   bg: 'bg-white',   border: 'border-amber-100' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-xl p-4 flex items-center gap-3`}>
              <div className={`${color} shrink-0`}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-gray-500 leading-tight">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          {[
            { key: 'active',   label: 'Active Positions',   count: activeCount,   icon: LayoutGrid },
            { key: 'archived', label: 'Archived Positions', count: archivedCount, icon: Archive },
          ].map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />{label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text" value={searchFilter}
                onChange={(e) => { setSearchFilter(e.target.value); persist('pos_search', e.target.value); }}
                placeholder="Search title or client…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <select value={clientFilter} onChange={(e) => {
                setClientFilter(e.target.value); persist('pos_client', e.target.value);
                setBranchFilter(''); localStorage.removeItem('pos_branch');
              }} className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="">All Clients</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); persist('pos_branch', e.target.value); }}
                className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="">All Branches</option>
                {filteredBranchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}{!clientFilter && b.client?.name ? ` — ${b.client.name}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={datePreset} onChange={(e) => {
                setDatePreset(e.target.value); persist('pos_date_preset', e.target.value);
                if (e.target.value !== 'custom') { setDateFrom(''); setDateTo(''); }
              }} className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                {DATE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <span>From</span>
                <input type="date" value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); persist('pos_date_from', e.target.value); }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span>to</span>
                <input type="date" value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); persist('pos_date_to', e.target.value); }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          {hasFilters && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-gray-400 flex items-center gap-1"><Filter className="h-3 w-3" /> Active:</span>
              {searchFilter && (
                <Chip color="blue" onRemove={() => { setSearchFilter(''); localStorage.removeItem('pos_search'); }}>
                  "{searchFilter}"
                </Chip>
              )}
              {clientFilter && (
                <Chip color="blue" onRemove={() => { setClientFilter(''); localStorage.removeItem('pos_client'); }}>
                  {clients.find((c) => String(c.id) === String(clientFilter))?.name}
                </Chip>
              )}
              {branchFilter && (
                <Chip color="green" onRemove={() => { setBranchFilter(''); localStorage.removeItem('pos_branch'); }}>
                  <MapPin className="h-3 w-3" />
                  {branches.find((b) => String(b.id) === String(branchFilter))?.branch_name}
                </Chip>
              )}
              {datePreset !== 'all' && (
                <Chip color="purple" onRemove={() => {
                  setDatePreset('all'); setDateFrom(''); setDateTo('');
                  ['pos_date_preset','pos_date_from','pos_date_to'].forEach((k) => localStorage.removeItem(k));
                }}>
                  <CalendarDays className="h-3 w-3" />
                  {DATE_PRESETS.find((d) => d.value === datePreset)?.label}
                  {datePreset === 'custom' && dateFrom && dateTo ? `: ${dateFrom} → ${dateTo}` : ''}
                </Chip>
              )}
              <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Result count ── */}
        {!loading && !error && (
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filteredPositions.length}</span> position{filteredPositions.length !== 1 ? 's' : ''}
            {filteredPositions.length !== positions.length && ` (of ${positions.length} total)`}
          </p>
        )}

        {/* ── Positions Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-6" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
            {activeTab === 'archived'
              ? <Archive className="mx-auto h-10 w-10 text-gray-300" />
              : <Briefcase className="mx-auto h-10 w-10 text-gray-300" />}
            <h3 className="mt-3 text-sm font-semibold text-gray-800">
              {activeTab === 'archived' ? 'No archived positions' : 'No positions found'}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {hasFilters ? 'Try adjusting your filters.' : canManage ? 'Get started by adding a position.' : 'No positions have been posted yet.'}
            </p>
            {canManage && !hasFilters && activeTab === 'active' && (
              <button onClick={openNewModal}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Plus className="h-4 w-4" /> New Position
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPositions.map((position) => {
  const isArchived = !position.is_active;

  return (
    <PositionCard
      key={position.id}
      position={position}
      canManage={canManage}
      isArchived={isArchived}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onArchive={handleArchive}
      accentColor={
        isArchived
          ? '#d1d5db'
          : getClientColor(position.client_id, clientIndexMap[String(position.client_id)])
      }
    />
  );
})}
          </div>
        )}

      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && canManage && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingPosition ? 'Edit Position' : 'Add New Position'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Client <span className="text-red-500">*</span></label>
                    <select value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value, branch_id: '' })}
                      required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">Select a client</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch <span className="text-gray-400 font-normal">(optional)</span></label>
                    <select value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      disabled={!formData.client_id}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed">
                      <option value="">All branches / No specific branch</option>
                      {branches.filter((b) => String(b.client_id) === String(formData.client_id))
                        .map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                    </select>
                    {!formData.client_id && <p className="text-xs text-gray-400 mt-1">Select a client first to filter branches</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Position Title <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Cashier, Kitchen Staff, Guard" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Job responsibilities, requirements…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of Slots <span className="text-red-500">*</span></label>
                    <input type="number" min="1" value={formData.slots}
                      onChange={(e) => setFormData({ ...formData, slots: e.target.value })}
                      required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="How many openings?" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Mark as Active</span>
                  </label>
                </div>
                <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    {editingPosition ? 'Save Changes' : 'Create Position'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ← NEW: Client Color Settings Panel ── */}
      {showColorPanel && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowColorPanel(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Client Colors</h3>
                </div>
                <button onClick={() => setShowColorPanel(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-1 max-h-96 overflow-y-auto">
                <p className="text-xs text-gray-400 mb-4">
                  Pick a color for each client. Cards will show a matching accent stripe.
                </p>
                {clients.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No clients loaded.</p>
                )}
                {clients.map((c, i) => {
                  const color = clientColors[String(c.id)] || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
                  return (
                    <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* preview swatch */}
                        <span
                          className="h-4 w-4 rounded-full shrink-0 ring-1 ring-black/10"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-gray-700 truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* native color picker */}
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => handleColorChange(c.id, e.target.value)}
                          className="h-8 w-10 rounded cursor-pointer border border-gray-200 p-0.5 bg-white"
                          title={`Pick color for ${c.name}`}
                        />
                        {/* reset to default */}
                        {clientColors[String(c.id)] && (
                          <button
                            onClick={() => {
                              const updated = { ...clientColors };
                              delete updated[String(c.id)];
                              setClientColors(updated);
                              localStorage.setItem('pos_client_colors', JSON.stringify(updated));
                            }}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                            title="Reset to default"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-between items-center">
                <button
                  onClick={() => {
                    setClientColors({});
                    localStorage.removeItem('pos_client_colors');
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Reset all
                </button>
                <button onClick={() => setShowColorPanel(false)}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Chip({ children, color = 'blue', onRemove }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
      <button onClick={onRemove} className="hover:opacity-70 ml-0.5"><X className="h-3 w-3" /></button>
    </span>
  );
}

// ← NEW: accentColor prop added; creator shown in footer
function PositionCard({ position, canManage, isArchived, onEdit, onDelete, onArchive, accentColor }) {
  const branchList = position.branch
    ? [position.branch]
    : Array.isArray(position.branches)
      ? position.branches
      : [];

  const creatorName = position.creator?.name ?? position.creator?.first_name
    ? `${position.creator.first_name} ${position.creator.last_name ?? ''}`.trim()
    : null;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-md ${
      isArchived ? 'border-gray-100 opacity-75' : 'border-gray-200'
    }`}>
      {/* ← NEW: dynamic accent color via inline style */}
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 leading-tight truncate">{position.title}</h3>
            {/* ← NEW: colored dot next to client name */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
              <p className="text-sm text-gray-500 truncate">{position.client?.name}</p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(position)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                <Edit className="h-4 w-4" />
              </button>
              <button onClick={() => onArchive(position)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isArchived
                    ? 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                    : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                }`} title={isArchived ? 'Restore' : 'Archive'}>
                <Archive className="h-4 w-4" />
              </button>
              <button onClick={() => onDelete(position.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {branchList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {branchList.map((b) => (
              <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                <MapPin className="h-3 w-3" />{b.branch_name}
              </span>
            ))}
          </div>
        )}

        {position.description && (
          <p className="text-sm text-gray-500 mt-3 line-clamp-2 leading-relaxed">{position.description}</p>
        )}

        {/* ── Footer ── */}
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                <Users className="h-3 w-3" />
                {position.slots} {parseInt(position.slots, 10) === 1 ? 'slot' : 'slots'}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                position.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {position.is_active ? 'Active' : 'Archived'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <CalendarDays className="h-3 w-3" />
              {formatDate(position.created_at)}
            </div>
          </div>

          {/* ← NEW: Added by row */}
          {creatorName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Added by <span className="font-medium text-gray-600">{creatorName}</span></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}