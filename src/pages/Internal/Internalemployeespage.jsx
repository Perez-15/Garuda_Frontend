import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Users, Plus, Edit2, Save, X, Loader2, Trash2,
  ChevronUp, ChevronDown, GripVertical, Filter, Settings2,
  UserCheck, UserX, Building2, CalendarDays, Phone,
  ChevronRight,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userService } from '../../services/userService';
import { customColumnService } from '../../services/customcolumnService';
import { useAuth } from '../../contexts/AuthContext';

const PAGE = 'internal_employees';

const DEPT_TABS = [
  { key: '',                   label: 'All'                },
  { key: 'talent_acquisition', label: 'Talent Acquisition' },
  { key: 'hr_admin',           label: 'HR'                 },
  { key: 'accounting',         label: 'Accounting'         },
  { key: 'marketing',          label: 'Marketing'          },
];

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function RoleBadge({ role }) {
  const map = {
    super_admin:        { label: 'Super Admin',        cls: 'bg-red-100 text-red-700'      },
    hr_admin:           { label: 'HR',                 cls: 'bg-blue-100 text-blue-700'    },
    talent_acquisition: { label: 'Talent Acquisition', cls: 'bg-indigo-100 text-indigo-700'},
    accounting:         { label: 'Accounting',         cls: 'bg-amber-100 text-amber-700'  },
    marketing:          { label: 'Marketing',          cls: 'bg-pink-100 text-pink-700'    },
  };
  const r = map[role] || { label: role, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.cls}`}>{r.label}</span>;
}

function StatusBadge({ isActive }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Inactive
    </span>
  );
}

function ReqBadge({ status }) {
  const map = {
    complete:   'bg-green-50 text-green-700 border-green-200',
    incomplete: 'bg-red-50 text-red-600 border-red-200',
    pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  const labels = { complete: '✓ Complete', incomplete: '✗ Incomplete', pending: '⏳ Pending' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {labels[status] || '—'}
    </span>
  );
}

function DocBadge({ status }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  const map    = { submitted: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', not_required: 'bg-gray-100 text-gray-400' };
  const labels = { submitted: '✓', pending: '⏳', not_required: 'N/A' };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${map[status]}`}>{labels[status]}</span>;
}

const FIXED_COLUMNS = [
  { key: 'name',                    label: 'Name',             always: true,  fixed: true },
  { key: 'role',                    label: 'Role/Dept',        always: false, fixed: true },
  { key: 'contact_number',          label: 'Contact',          always: false, fixed: true },
  { key: 'date_hired',              label: 'Date Hired',       always: false, fixed: true },
  { key: 'assigned_branches',       label: 'Branches',         always: false, fixed: true },
  { key: 'status',                  label: 'Status',           always: false, fixed: true },
  { key: 'requirements_status',     label: 'Requirements',     always: false, fixed: true },
  { key: 'nbi_status',              label: 'NBI',              always: false, fixed: true },
  { key: 'medcert_status',          label: 'Medical',          always: false, fixed: true },
  { key: 'police_clearance_status', label: 'Police Clearance', always: false, fixed: true },
  { key: 'contract_status',         label: 'Contract',         always: false, fixed: true },
  { key: 'sss',                     label: 'SSS',              always: false, fixed: true },
  { key: 'pagibig',                 label: 'Pag-IBIG',         always: false, fixed: true },
  { key: 'philhealth',              label: 'PhilHealth',       always: false, fixed: true },
  { key: 'tin',                     label: 'TIN',              always: false, fixed: true },
];

const DEFAULT_VISIBLE = ['name', 'role', 'contact_number', 'date_hired', 'status', 'requirements_status', 'assigned_branches'];

function CellValue({ colKey, user }) {
  const fmt = (d) => d
    ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  switch (colKey) {
    case 'name':
      return (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user.profile_photo_url
              ? <img src={user.profile_photo_url} alt={user.name} className="h-full w-full object-cover" />
              : <span className="text-xs font-bold text-indigo-500">{user.name?.charAt(0)?.toUpperCase()}</span>}
          </div>
          <div>
            <div className="font-medium text-gray-900 text-sm">{user.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{user.email}</div>
          </div>
        </div>
      );
    case 'role':               return <RoleBadge role={user.roles?.[0]?.name} />;
    case 'contact_number':
      return (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          {user.contact_number
            ? <><Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />{user.contact_number}</>
            : <span className="text-gray-300">—</span>}
        </div>
      );
    case 'date_hired':
      return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
          {fmt(user.date_hired)}
        </div>
      );
    case 'assigned_branches': {
      const branches = user.branches ?? [];
      if (!branches.length) return <span className="text-gray-300 text-xs">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {branches.slice(0, 2).map((b) => (
            <span key={b.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-700">
              {b.branch_name}
            </span>
          ))}
          {branches.length > 2 && <span className="text-xs text-gray-400">+{branches.length - 2}</span>}
        </div>
      );
    }
    case 'status':                  return <StatusBadge isActive={user.is_active} />;
    case 'requirements_status':     return <ReqBadge status={user.requirements_status} />;
    case 'nbi_status':              return <DocBadge status={user.nbi_status} />;
    case 'medcert_status':          return <DocBadge status={user.medcert_status} />;
    case 'police_clearance_status': return <DocBadge status={user.police_clearance_status} />;
    case 'contract_status':         return <DocBadge status={user.contract_status} />;
    case 'sss':        return <span className="text-sm font-mono text-gray-600">{user.sss || '—'}</span>;
    case 'pagibig':    return <span className="text-sm font-mono text-gray-600">{user.pagibig || '—'}</span>;
    case 'philhealth': return <span className="text-sm font-mono text-gray-600">{user.philhealth || '—'}</span>;
    case 'tin':        return <span className="text-sm font-mono text-gray-600">{user.tin || '—'}</span>;
    default:
      if (colKey.startsWith('custom_')) {
        return <span className="text-sm text-gray-600">{user.custom_fields?.[colKey.replace('custom_', '')] || '—'}</span>;
      }
      return <span className="text-gray-400 text-xs">—</span>;
  }
}

// ── Add User Modal ────────────────────────────────────────────────────────────
function UserModal({ onClose, onSaved, canManage }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'hr_admin',
    contact_number: '', date_hired: '',
    nbi_status: 'pending', medcert_status: 'pending',
    police_clearance_status: 'pending', contract_status: 'pending',
    sss: '', pagibig: '', philhealth: '', tin: '',
    requirements_status: 'pending',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [tab,    setTab]    = useState('info');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    if (!form.password.trim()) { setError('Password is required.'); return; }
    try {
      setSaving(true);
      await userService.create(form);
      onSaved(); onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const docOptions = [
    { value: 'submitted', label: '✓ Submitted' },
    { value: 'pending',   label: '⏳ Pending'   },
    { value: 'not_required', label: 'N/A'       },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Add Internal Employee</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex border-b border-gray-100 px-6">
          {['info', 'requirements'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors
                ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'info' ? 'Basic Info' : 'Requirements'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {tab === 'info' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Juan dela Cruz" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="juan@company.com" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 8 characters" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Department / Role *</label>
                <select value={form.role} onChange={(e) => set('role', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="talent_acquisition">Talent Acquisition</option>
                  <option value="hr_admin">HR</option>
                  <option value="accounting">Accounting</option>
                  <option value="marketing">Marketing</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Contact Number</label>
                <input value={form.contact_number} onChange={(e) => set('contact_number', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="09XX XXX XXXX" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Date Hired</label>
                <input type="date" value={form.date_hired} onChange={(e) => set('date_hired', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
          {tab === 'requirements' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field: 'nbi_status',             label: 'NBI Clearance'    },
                  { field: 'medcert_status',          label: 'Medical Cert.'    },
                  { field: 'police_clearance_status', label: 'Police Clearance' },
                  { field: 'contract_status',         label: 'Contract'         },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                    <select value={form[field]} onChange={(e) => set(field, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {docOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Government IDs</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { field: 'sss', label: 'SSS No.' }, { field: 'pagibig', label: 'Pag-IBIG No.' },
                    { field: 'philhealth', label: 'PhilHealth No.' }, { field: 'tin', label: 'TIN No.' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                      <input value={form[field]} onChange={(e) => set(field, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="—" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-gray-50">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Overall Requirements Status</label>
                <select value={form.requirements_status} onChange={(e) => set('requirements_status', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="complete">✓ Complete</option>
                  <option value="incomplete">✗ Incomplete</option>
                  <option value="pending">⏳ Pending</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !canManage}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Add Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Manage Columns Modal ──────────────────────────────────────────────────────
function ManageColumnsModal({ customCols, onClose, onRefresh }) {
  const [cols, setCols]         = useState(customCols.map((c) => ({ ...c })));
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType]   = useState('text');
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const handleAdd = async () => {
    const trimmed = newLabel.trim();
    if (!trimmed) { setError('Column name is required.'); return; }
    const field_key = trimmed.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!field_key) { setError('Invalid column name.'); return; }
    try {
      setSaving(true);
      const res = await customColumnService.create({ page: PAGE, field_key, label: trimmed, type: newType, order: cols.length });
      if (res.column) { setCols((p) => [...p, res.column]); setNewLabel(''); setNewType('text'); setError(''); }
      else setError(res.message || 'Failed.');
    } catch { setError('Server error.'); }
    finally { setSaving(false); }
  };

  const handleRename = async (col) => {
    const trimmed = editLabel.trim();
    if (!trimmed) { setError('Required.'); return; }
    try {
      setSaving(true);
      await customColumnService.update(col.id, { label: trimmed });
      setCols((p) => p.map((c) => c.id === col.id ? { ...c, label: trimmed } : c));
      setEditingId(null); setError('');
    } catch { setError('Failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (col) => {
    if (!confirm(`Delete "${col.label}"?`)) return;
    try { await customColumnService.remove(col.id); setCols((p) => p.filter((c) => c.id !== col.id)); }
    catch { setError('Failed.'); }
  };

  const move = async (index, dir) => {
    const next = [...cols]; const target = index + dir;
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
                    <button onClick={() => move(index, -1)} disabled={index === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ChevronUp className="h-3 w-3" /></button>
                    <button onClick={() => move(index, 1)} disabled={index === cols.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ChevronDown className="h-3 w-3" /></button>
                  </div>
                  <GripVertical className="h-4 w-4 text-blue-200 flex-shrink-0" />
                  {editingId === col.id ? (
                    <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(col); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <span className="flex-1 text-sm text-gray-700">{col.label} <span className="text-xs text-blue-400">({col.type})</span></span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingId === col.id ? (
                      <>
                        <button onClick={() => handleRename(col)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="h-3.5 w-3.5" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(col.id); setEditLabel(col.label); setError(''); }} className="p-1 text-blue-500 hover:bg-blue-100 rounded"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(col)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
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
            <input value={newLabel} onChange={(e) => { setNewLabel(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="e.g. Emergency Contact, Notes..."
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
          <button onClick={handleDone} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Done</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function InternalEmployeesPage() {
  const { user: currentUser } = useAuth();

  const [users,       setUsers]       = useState([]);
  const [customCols,  setCustomCols]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage,     setPerPage]     = useState(15);

  const [searchInput,  setSearchInput]  = useState('');
  const debouncedSearch                  = useDebounce(searchInput, 400);
  const [activeTab,    setActiveTab]    = useState('');
  const [reqFilter,    setReqFilter]    = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [visibleCols,    setVisibleCols]    = useState(DEFAULT_VISIBLE);
  const [colOrder,       setColOrder]       = useState(DEFAULT_VISIBLE);
  const [showColPicker,  setShowColPicker]  = useState(false);
  const [showManageCols, setShowManageCols] = useState(false);
  const [showAddModal,   setShowAddModal]   = useState(false);

  const dragCol     = useRef(null);
  const dragOverCol = useRef(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [dragKey,     setDragKey]     = useState(null);

  const userRole  = currentUser?.roles?.[0]?.name ?? '';
  const canManage = userRole === 'super_admin' || userRole === 'hr_admin';

  useEffect(() => { fetchCustomCols(); }, []);
  useEffect(() => { fetchUsers(); }, [debouncedSearch, activeTab, reqFilter, statusFilter, currentPage, perPage]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, activeTab, reqFilter, statusFilter, perPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage, per_page: perPage, search: debouncedSearch,
        ...(activeTab    && { role: activeTab }),
        ...(reqFilter    && { requirements_status: reqFilter }),
        ...(statusFilter !== '' && { is_active: statusFilter }),
      };
      const res = await userService.getAll(params);
      setUsers(res.data || []);
      setTotalPages(res.last_page || 1);
      setTotal(res.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchCustomCols = async () => {
    try {
      const res = await customColumnService.getByPage(PAGE);
      setCustomCols(Array.isArray(res) ? res : []);
    } catch (e) { console.error(e); }
  };

  const handleToggleStatus = async (user) => {
    if (!canManage) return;
    try { await userService.updateStatus(user.id, !user.is_active); fetchUsers(); }
    catch (e) { console.error(e); }
  };

  const allColumnsWithCustom = [
    ...FIXED_COLUMNS,
    ...customCols.map((c) => ({ key: `custom_${c.field_key}`, label: c.label, always: false, fixed: false, custom: true })),
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

  const onDragStart = (key) => { dragCol.current = key; setDragKey(key); };
  const onDragEnter = (key) => { dragOverCol.current = key; setDragOverKey(key); };
  const onDragEnd   = () => {
    setDragOverKey(null); setDragKey(null);
    if (!dragCol.current || !dragOverCol.current || dragCol.current === dragOverCol.current) {
      dragCol.current = null; dragOverCol.current = null; return;
    }
    const newOrder = [...colOrder];
    const from = newOrder.indexOf(dragCol.current);
    const to   = newOrder.indexOf(dragOverCol.current);
    newOrder.splice(from, 1); newOrder.splice(to, 0, dragCol.current);
    setColOrder(newOrder);
    dragCol.current = null; dragOverCol.current = null;
  };

  const clearFilters = () => { setSearchInput(''); setReqFilter(''); setStatusFilter(''); setCurrentPage(1); };
  const hasFilters = searchInput || reqFilter || statusFilter !== '';

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Internal Employees</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Manage your internal team across all departments
              {total > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {total} members
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button onClick={() => setShowManageCols(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                <Settings2 className="h-4 w-4" /> Manage Columns
              </button>
            )}
            {canManage && (
              <button onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                <Plus className="h-4 w-4" /> Add Employee
              </button>
            )}
          </div>
        </div>

        {/* Dept Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 overflow-x-auto">
          {DEPT_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email or contact..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <select value={reqFilter} onChange={(e) => setReqFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Requirements</option>
              <option value="complete">✓ Complete</option>
              <option value="incomplete">✗ Incomplete</option>
              <option value="pending">⏳ Pending</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <div className="relative">
              <button onClick={() => setShowColPicker((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Filter className="h-3.5 w-3.5" /> Columns
                <span className="bg-indigo-600 text-white rounded-full px-1.5 py-0.5 text-xs ml-0.5">{activeColumns.length}</span>
              </button>
              {showColPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-64">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Show / Hide</span>
                    <button onClick={() => setShowColPicker(false)}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {allColumnsWithCustom.map((col) => (
                      <label key={col.key}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 ${col.always ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input type="checkbox" checked={visibleCols.includes(col.key)}
                          onChange={() => toggleColumn(col.key)} disabled={col.always}
                          className="rounded text-indigo-600" />
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

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full mr-3" />
              Loading...
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users className="h-10 w-10 mb-3 text-gray-200" />
              <p className="text-sm font-medium">No internal employees found</p>
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
                          <th key={key} draggable
                            onDragStart={() => onDragStart(key)}
                            onDragEnter={() => onDragEnter(key)}
                            onDragEnd={onDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            className={`
                              px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide
                              whitespace-nowrap select-none cursor-grab active:cursor-grabbing transition-colors
                              ${dragKey === key
                                ? 'opacity-40 bg-indigo-50 text-gray-500'
                                : dragOverKey === key
                                  ? 'bg-indigo-100 text-indigo-700 border-l-2 border-indigo-400'
                                  : 'text-gray-500'}
                            `}
                          >
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                              {col?.label}
                              {col?.custom && <span className="text-blue-300 ml-0.5">✦</span>}
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                        {activeColumns.map((key) => (
                          <td key={key}
                            className={`px-4 py-3.5 whitespace-nowrap transition-colors ${dragOverKey === key ? 'bg-indigo-50' : ''}`}>
                            <CellValue colKey={key} user={u} />
                          </td>
                        ))}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* ── View Profile ── */}
                            <Link to={`/internal/users/${u.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                              View <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                            {/* ── Toggle active (admin only) ── */}
                            {canManage && (
                              <button onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'text-red-400 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                                title={u.is_active ? 'Deactivate' : 'Activate'}>
                                {u.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                              </button>
                            )}
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

        {customCols.length > 0 && (
          <p className="text-xs text-gray-400">✦ Custom columns — data entered per employee</p>
        )}
      </div>

      {showAddModal && (
        <UserModal canManage={canManage}
          onClose={() => setShowAddModal(false)}
          onSaved={fetchUsers} />
      )}
      {showManageCols && (
        <ManageColumnsModal customCols={customCols}
          onClose={() => setShowManageCols(false)}
          onRefresh={fetchCustomCols} />
      )}
    </DashboardLayout>
  );
}