import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings2, Plus, ChevronRight, Loader2, AlertCircle,
  Trash2, Globe, Users, LayoutGrid, Edit3,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { customColumnService } from '../../services/customcolumnService';
import { useAuth } from '../../contexts/AuthContext';

// ── Scope badge ───────────────────────────────────────────────────────────────
function ScopeBadge({ scope }) {
  const map = {
    ext:  { label: 'External', cls: 'bg-blue-50 text-blue-600 border-blue-200',     icon: <Globe className="h-3 w-3" />  },
    int:  { label: 'Internal', cls: 'bg-green-50 text-green-600 border-green-200',  icon: <Users className="h-3 w-3" />  },
    both: { label: 'Both',     cls: 'bg-purple-50 text-purple-600 border-purple-200', icon: <LayoutGrid className="h-3 w-3" /> },
  };
  const s = map[scope] || map['both'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ── Default tables (fallback if API not ready) ─────────────────────────────────
const DEFAULT_TABLES = [
  { page: 'hired',               label: 'Hired Applicants',    scope: 'both', is_default: true  },
  { page: 'applicants',          label: 'Applicants',          scope: 'both', is_default: true  },
  { page: 'in_process',          label: 'In Process',          scope: 'both', is_default: true  },
  { page: 'employed',            label: 'Employed',            scope: 'both', is_default: true  },
  { page: 'internal_employees',  label: 'Internal Employees',  scope: 'int',  is_default: true  },
];

const PAGE_ICONS = {
  hired:              '📋',
  applicants:         '📝',
  in_process:         '⏳',
  employed:           '💼',
  internal_employees: '🏢',
};

// ── Add Table Modal ────────────────────────────────────────────────────────────
function AddTableModal({ onClose, onSave }) {
  const [form, setForm] = useState({ label: '', page: '', scope: 'both' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLabelChange = (val) => {
    setForm((f) => ({
      ...f,
      label: val,
      page: val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
    }));
  };

  const handleSave = async () => {
    if (!form.label.trim()) { setError('Table name is required.'); return; }
    if (!form.page.trim())  { setError('Page key is required.'); return; }
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create table.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add new table</h2>
          <p className="text-xs text-gray-400 mt-0.5">Create a new employee table with its own schema.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Table name</label>
            <input
              type="text"
              placeholder="e.g. Probationary Employees"
              value={form.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Page key <span className="text-gray-300 normal-case">(auto-generated)</span></label>
            <input
              type="text"
              value={form.page}
              onChange={(e) => setForm((f) => ({ ...f, page: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            />
            <span className="text-xs text-gray-400">Used internally to identify this table.</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scope</label>
            <div className="flex gap-2">
              {[
                { value: 'ext',  label: 'External', icon: <Globe className="h-3.5 w-3.5" />  },
                { value: 'int',  label: 'Internal', icon: <Users className="h-3.5 w-3.5" />  },
                { value: 'both', label: 'Both',     icon: <LayoutGrid className="h-3.5 w-3.5" /> },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setForm((f) => ({ ...f, scope: s.value }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all
                    ${form.scope === s.value
                      ? s.value === 'ext'  ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : s.value === 'int'  ? 'bg-green-50 border-green-300 text-green-700'
                      :                     'bg-purple-50 border-purple-300 text-purple-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create table
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ManageColumnsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tables,       setTables]       = useState(DEFAULT_TABLES);
  const [loading,      setLoading]      = useState(true);
  const [scopeFilter,  setScopeFilter]  = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingPage, setDeletingPage] = useState(null);
  const [toast,        setToast]        = useState(null);

  const userRole = user?.roles?.[0]?.name;
  const canManage = userRole === 'super_admin' || userRole === 'hr_admin';

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTables = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customColumnService.getTables();
      if (data?.tables?.length) setTables(data.tables);
    } catch {
      // fallback to DEFAULT_TABLES already set
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTables(); }, [loadTables]);

  const handleCreateTable = async (form) => {
    await customColumnService.createTable(form);
    showToast('success', `"${form.label}" table created.`);
    loadTables();
  };

  const handleDeleteTable = async (table) => {
    if (!confirm(`Delete "${table.label}" and all its custom fields? This cannot be undone.`)) return;
    try {
      setDeletingPage(table.page);
      await customColumnService.deleteTable(table.page);
      showToast('success', `"${table.label}" deleted.`);
      loadTables();
    } catch (e) {
      showToast('error', e?.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeletingPage(null);
    }
  };

  const filtered = tables.filter((t) => {
    if (scopeFilter === 'all') return true;
    return t.scope === scopeFilter || t.scope === 'both';
  });

  return (
    <DashboardLayout>
      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2
          ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      {showAddModal && (
        <AddTableModal
          onClose={() => setShowAddModal(false)}
          onSave={handleCreateTable}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50">
              <Settings2 className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Manage Columns</h1>
              <p className="text-xs text-gray-400 mt-0.5">Configure tables, sections, and fields for employee pages.</p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add new table
            </button>
          )}
        </div>

        {/* ── Scope filter tabs ────────────────────────────────────────────── */}
        <div className="flex gap-2 bg-gray-50 border border-gray-100 rounded-xl p-1 w-fit">
          {[
            { value: 'all',  label: 'All tables',  icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            { value: 'ext',  label: 'External',    icon: <Globe className="h-3.5 w-3.5" />      },
            { value: 'int',  label: 'Internal',    icon: <Users className="h-3.5 w-3.5" />      },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setScopeFilter(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all
                ${scopeFilter === tab.value
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tables list ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-300">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading tables...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <LayoutGrid className="h-8 w-8 mb-2" />
              <p className="text-sm">No tables found for this scope.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((table, i) => (
                <div
                  key={table.page}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group"
                >
                  {/* Icon */}
                  <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                    {PAGE_ICONS[table.page] || '📋'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{table.label}</span>
                      {table.is_default && (
                        <span className="text-xs text-gray-300 border border-gray-100 rounded-full px-2 py-0.5">Default</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 font-mono">{table.page}</span>
                      <span className="text-gray-200">·</span>
                      <ScopeBadge scope={table.scope} />
                    </div>
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!table.is_default && (
                        <button
                          onClick={() => handleDeleteTable(table)}
                          disabled={deletingPage === table.page}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                          title="Delete table"
                        >
                          {deletingPage === table.page
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/manage-columns/${table.page}`, { state: { label: table.label, scope: table.scope } })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit schema
                      </button>
                    </div>
                  )}

                  {/* Arrow (always visible) */}
                  <ChevronRight
                    className="h-4 w-4 text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0 cursor-pointer"
                    onClick={() => navigate(`/manage-columns/${table.page}`, { state: { label: table.label, scope: table.scope } })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer hint ──────────────────────────────────────────────────── */}
        <p className="text-xs text-gray-300 text-center pb-4">
          Changes to a table schema automatically reflect on the corresponding employee pages.
        </p>

      </div>
    </DashboardLayout>
  );
}