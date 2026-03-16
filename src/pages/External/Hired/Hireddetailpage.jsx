import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Loader2, Trash2,
  User, Phone, Briefcase, Calendar,
  Shield, FileText, AlertTriangle, ChevronDown,
  Building2, Heart, Plus, LayoutGrid,
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { employeeService } from '../../../services/hiredService';
import { branchService } from '../../../services/branchService';
import { positionService } from '../../../services/positionService';
import { customColumnService } from '../../../services/customcolumnService';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    hired:      'bg-green-100 text-green-700 border-green-200',
    resigned:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    terminated: 'bg-red-100 text-red-700 border-red-200',
    endo:       'bg-orange-100 text-orange-700 border-orange-200',
    awol:       'bg-purple-100 text-purple-700 border-purple-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status ?? 'Active'}
    </span>
  );
}

// ── Requirements badge ────────────────────────────────────────────────────────
function ReqBadge({ status }) {
  const map = {
    complete:   'bg-green-100 text-green-700 border-green-200',
    incomplete: 'bg-red-100 text-red-600 border-red-200',
    pending:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  const labels = { complete: '✓ Complete', incomplete: '✗ Incomplete', pending: '⏳ Pending' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {labels[status] || status || '—'}
    </span>
  );
}

// ── Doc status badge ──────────────────────────────────────────────────────────
function DocStatus({ status, label, expiry }) {
  const map = {
    submitted:    { cls: 'bg-green-50 text-green-700 border-green-200',    icon: '✓'  },
    pending:      { cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '⏳' },
    not_required: { cls: 'bg-gray-50 text-gray-400 border-gray-200',       icon: '—'  },
  };
  const s = map[status] || map.pending;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        {expiry && (
          <span className="text-xs text-gray-400">
            Exp: {new Date(expiry).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        )}
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
          {s.icon} {status === 'not_required' ? 'N/A' : status === 'submitted' ? 'Submitted' : 'Pending'}
        </span>
      </div>
    </div>
  );
}

// ── HR Action type badge ──────────────────────────────────────────────────────
function HrTypeBadge({ type }) {
  const map    = { memo: 'bg-blue-100 text-blue-700', ir: 'bg-red-100 text-red-700', loa: 'bg-purple-100 text-purple-700' };
  const labels = { memo: 'Memo', ir: 'Incident Report', loa: 'LOA' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type?.toUpperCase()}
    </span>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, iconColor = 'text-blue-500', children, action }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0 gap-4">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide flex-shrink-0 w-36">{label}</span>
      <span className="text-sm text-gray-700 text-right">{value || '—'}</span>
    </div>
  );
}

// ── Field input (edit mode) ───────────────────────────────────────────────────
function Field({ label, name, type = 'text', value, onChange, options, required, placeholder }) {
  const base = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  if (options) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <select name={name} value={value || ''} onChange={onChange} className={base}>
          <option value="">Select...</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type} name={name} value={value || ''} onChange={onChange}
        required={required} placeholder={placeholder}
        className={base}
      />
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'personal',      label: 'Personal Info',  icon: User          },
  { key: 'employment',    label: 'Employment',      icon: Briefcase     },
  { key: 'documents',     label: '201 / Documents', icon: Shield        },
  { key: 'hr_actions',    label: 'HR Actions',      icon: AlertTriangle },
  { key: 'custom_fields', label: 'Custom Fields',   icon: LayoutGrid    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee,  setEmployee]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  // ── Edit state ────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState({});

  // ── Dropdown data for edit mode ───────────────────────────────────────────
  const [branches,  setBranches]  = useState([]);
  const [positions, setPositions] = useState([]);

  // ── Status change ─────────────────────────────────────────────────────────
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  // ── HR Action modal ───────────────────────────────────────────────────────
  const [showHrModal, setShowHrModal] = useState(false);
  const [hrForm,      setHrForm]      = useState({ type: 'memo', subject: '', description: '', action_date: '', loa_start: '', loa_end: '' });
  const [savingHr,    setSavingHr]    = useState(false);

  // ── Custom fields ─────────────────────────────────────────────────────────
  const [customCols,   setCustomCols]   = useState([]);
  const [customForm,   setCustomForm]   = useState({});
  const [savingCustom, setSavingCustom] = useState(false);
  const [customSaved,  setCustomSaved]  = useState(false);

  useEffect(() => {
    fetchEmployee();
    fetchCustomCols();
    fetchBranches();
    fetchPositions();
  }, [id]);

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await employeeService.getById(id);
      setEmployee(res.employee);
      initForm(res.employee);
      setCustomForm(res.employee.custom_fields || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomCols = async () => {
    try {
      const res = await customColumnService.getByPage('hired');
      setCustomCols(Array.isArray(res) ? res : []);
    } catch (e) { console.error('Could not load custom columns:', e); }
  };

  const fetchBranches = async () => {
    try {
      const res = await branchService.getAll();
      setBranches(res.data || res);
    } catch (e) { console.error('Could not load branches:', e); }
  };

  const fetchPositions = async () => {
    try {
      const res = await positionService.getAll();
      setPositions(res.data || res);
    } catch (e) { console.error('Could not load positions:', e); }
  };

  // ── Init form — ALL editable fields ──────────────────────────────────────
  const initForm = (emp) => {
    setForm({
      // Personal
      full_name:                  emp.full_name                || '',
      date_of_birth:              emp.date_of_birth            || '',
      gender:                     emp.gender                   || '',
      civil_status:               emp.civil_status             || '',
      // Contact
      contact_number:             emp.contact_number           || '',
      email:                      emp.email                    || '',
      address:                    emp.address                  || '',
      // Emergency
      emergency_contact_name:     emp.emergency_contact_name   || '',
      emergency_contact_number:   emp.emergency_contact_number || '',
      // Government IDs
      sss:                        emp.sss                      || '',
      pagibig:                    emp.pagibig                  || '',
      philhealth:                 emp.philhealth               || '',
      tin:                        emp.tin                      || '',
      // Documents
      nbi_status:                 emp.nbi_status               || 'pending',
      nbi_expiry:                 emp.nbi_expiry               || '',
      police_clearance_status:    emp.police_clearance_status  || 'pending',
      police_clearance_expiry:    emp.police_clearance_expiry  || '',
      medcert_status:             emp.medcert_status           || 'pending',
      medcert_expiry:             emp.medcert_expiry           || '',
      requirements_status:        emp.requirements_status      || 'pending',
      // Employment
      branch_id:                  emp.branch_id                || '',
      position_id:                emp.position_id              || '',
      date_hired:                 emp.date_hired               || '',
      date_resigned:              emp.date_resigned            || '',
      date_ended:                 emp.date_ended               || '',
      daily_rate:                 emp.daily_rate               || '',
      source:                     emp.source                   || '',
      remarks:                    emp.remarks                  || '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await employeeService.update(id, form);
      setIsEditing(false);
      fetchEmployee();
    } catch (e) {
      console.error(e);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Change employment status to "${newStatus}"?`)) return;
    try {
      setChangingStatus(true);
      await employeeService.updateStatus(id, { employment_status: newStatus });
      setShowStatusMenu(false);
      fetchEmployee();
    } catch (e) {
      console.error(e);
      alert('Failed to update status.');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this employee record? This cannot be undone.')) return;
    try {
      await employeeService.delete(id);
      navigate('/employees');
    } catch (e) {
      console.error(e);
      alert('Failed to delete employee.');
    }
  };

  const handleAddHrAction = async () => {
    try {
      setSavingHr(true);
      await employeeService.addHrAction(id, hrForm);
      setShowHrModal(false);
      setHrForm({ type: 'memo', subject: '', description: '', action_date: '', loa_start: '', loa_end: '' });
      fetchEmployee();
    } catch (e) {
      console.error(e);
      alert('Failed to add HR action.');
    } finally {
      setSavingHr(false);
    }
  };

  const handleDeleteHrAction = async (actionId) => {
    if (!confirm('Delete this HR action?')) return;
    try {
      await employeeService.deleteHrAction(id, actionId);
      fetchEmployee();
    } catch (e) { console.error(e); }
  };

  const handleSaveCustomFields = async () => {
    try {
      setSavingCustom(true);
      await customColumnService.updateEmployeeCustomFields(employee.id, customForm);
      setCustomSaved(true);
      setTimeout(() => setCustomSaved(false), 2500);
      fetchEmployee();
    } catch (e) {
      console.error(e);
      alert('Failed to save custom fields.');
    } finally {
      setSavingCustom(false);
    }
  };

  const fmt = (date) =>
    date ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading employee profile...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Employee not found.</p>
          <button onClick={() => navigate('/employees')} className="mt-3 text-blue-600 text-sm hover:underline">
            ← Back to Employees
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <button onClick={() => navigate('/employees')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Employees
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{employee.full_name}</h1>
              <StatusBadge status={employee.employment_status} />
              <ReqBadge status={employee.requirements_status} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500 flex-wrap">
              {employee.position?.name && (
                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {employee.position.name}</span>
              )}
              {employee.branch?.branch_name && (
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {employee.branch.branch_name}</span>
              )}
              {employee.date_hired && (
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Hired {fmt(employee.date_hired)}</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isEditing ? (
              <>
                <div className="relative">
                  <button onClick={() => setShowStatusMenu((v) => !v)} disabled={changingStatus}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                    {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                    Change Status
                  </button>
                  {showStatusMenu && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44">
                      {[
                        { key: 'resigned',   label: '↩ Resigned',   cls: 'text-yellow-600' },
                        { key: 'terminated', label: '✕ Terminated', cls: 'text-red-600'    },
                        { key: 'endo',       label: '⏹ Endo',       cls: 'text-orange-600' },
                        { key: 'awol',       label: '⚠ AWOL',       cls: 'text-purple-600' },
                      ].map((s) => (
                        <button key={s.key} onClick={() => handleStatusChange(s.key)}
                          disabled={employee.employment_status === s.key}
                          className={`w-full text-left px-4 py-2 text-sm ${s.cls} hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => { setIsEditing(true); setShowStatusMenu(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                  <Edit2 className="h-4 w-4" /> Edit
                </button>
                <button onClick={handleDelete}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete employee">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setIsEditing(false); initForm(employee); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <X className="h-4 w-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${activeTab === tab.key ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.key === 'hr_actions' && employee.hr_actions?.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                  {employee.hr_actions.length}
                </span>
              )}
              {tab.key === 'custom_fields' && customCols.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {customCols.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            Tab: PERSONAL INFO
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <SectionCard title="Basic Information" icon={User} iconColor="text-blue-500">
              {!isEditing ? (
                <>
                  <InfoRow label="Full Name"     value={employee.full_name} />
                  <InfoRow label="Date of Birth" value={fmt(employee.date_of_birth)} />
                  <InfoRow label="Age"           value={employee.age} />
                  <InfoRow label="Gender"        value={employee.gender} />
                  <InfoRow label="Civil Status"  value={employee.civil_status} />
                </>
              ) : (
                <div className="space-y-3">
                  <Field label="Full Name"     name="full_name"     value={form.full_name}     onChange={handleChange} required />
                  <Field label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
                  <Field label="Gender" name="gender" value={form.gender} onChange={handleChange}
                    options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
                  <Field label="Civil Status" name="civil_status" value={form.civil_status} onChange={handleChange}
                    options={[
                      { value: 'Single',    label: 'Single'    },
                      { value: 'Married',   label: 'Married'   },
                      { value: 'Widowed',   label: 'Widowed'   },
                      { value: 'Separated', label: 'Separated' },
                    ]} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Contact Information" icon={Phone} iconColor="text-green-500">
              {!isEditing ? (
                <>
                  <InfoRow label="Contact No." value={employee.contact_number} />
                  <InfoRow label="Email"        value={employee.email} />
                  <InfoRow label="Address"      value={employee.address} />
                </>
              ) : (
                <div className="space-y-3">
                  <Field label="Contact Number" name="contact_number" value={form.contact_number} onChange={handleChange} required />
                  <Field label="Email Address"  name="email" type="email" value={form.email} onChange={handleChange} />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Complete Address</label>
                    <textarea name="address" value={form.address || ''} onChange={handleChange} rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Emergency Contact" icon={Heart} iconColor="text-red-500">
              {!isEditing ? (
                <>
                  <InfoRow label="Name"   value={employee.emergency_contact_name} />
                  <InfoRow label="Number" value={employee.emergency_contact_number} />
                </>
              ) : (
                <div className="space-y-3">
                  <Field label="Contact Name"   name="emergency_contact_name"   value={form.emergency_contact_name}   onChange={handleChange} />
                  <Field label="Contact Number" name="emergency_contact_number" value={form.emergency_contact_number} onChange={handleChange} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Government IDs" icon={FileText} iconColor="text-purple-500">
              {!isEditing ? (
                <>
                  <InfoRow label="SSS"        value={employee.sss} />
                  <InfoRow label="Pag-IBIG"   value={employee.pagibig} />
                  <InfoRow label="PhilHealth" value={employee.philhealth} />
                  <InfoRow label="TIN"        value={employee.tin} />
                </>
              ) : (
                <div className="space-y-3">
                  <Field label="SSS No."        name="sss"        value={form.sss}        onChange={handleChange} />
                  <Field label="Pag-IBIG No."   name="pagibig"    value={form.pagibig}    onChange={handleChange} />
                  <Field label="PhilHealth No." name="philhealth" value={form.philhealth} onChange={handleChange} />
                  <Field label="TIN"            name="tin"        value={form.tin}        onChange={handleChange} />
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            Tab: EMPLOYMENT
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'employment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <SectionCard title="Employment Details" icon={Briefcase} iconColor="text-blue-500">
              {!isEditing ? (
                <>
                  <InfoRow label="Status"              value={<StatusBadge status={employee.employment_status} />} />
                  <InfoRow label="Branch"              value={`${employee.branch?.branch_name || '—'}${employee.branch?.client?.name ? ` — ${employee.branch.client.name}` : ''}`} />
                  <InfoRow label="Position"            value={employee.position?.name} />
                  <InfoRow label="Date Hired"          value={fmt(employee.date_hired)} />
                  <InfoRow label="Date Resigned/Ended" value={fmt(employee.date_resigned || employee.date_ended)} />
                  <InfoRow label="Daily Rate"          value={employee.daily_rate ? `₱${Number(employee.daily_rate).toLocaleString()}` : null} />
                  <InfoRow label="Source"              value={employee.source} />
                </>
              ) : (
                <div className="space-y-3">

                  {/* Branch dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Branch <span className="text-red-400">*</span>
                    </label>
                    <select name="branch_id" value={form.branch_id || ''} onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select branch...</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name}{b.client?.name ? ` — ${b.client.name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Position dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Position</label>
                    <select name="position_id" value={form.position_id || ''} onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select position...</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <Field label="Date Hired"    name="date_hired"    type="date"   value={form.date_hired}    onChange={handleChange} required />
                  <Field label="Daily Rate"    name="daily_rate"    type="number" value={form.daily_rate}    onChange={handleChange} placeholder="0.00" />
                  <Field label="Date Resigned" name="date_resigned" type="date"   value={form.date_resigned} onChange={handleChange} />
                  <Field label="Date Ended"    name="date_ended"    type="date"   value={form.date_ended}    onChange={handleChange} />

                  {/* Source */}
                  <Field label="Source" name="source" value={form.source} onChange={handleChange}
                    options={[
                      { value: 'WordPress', label: 'WordPress' },
                      { value: 'Gmail',     label: 'Gmail'     },
                      { value: 'Facebook',  label: 'Facebook'  },
                      { value: 'BossJobs',  label: 'Boss Jobs' },
                      { value: 'Walk-in',   label: 'Walk-in'   },
                      { value: 'Referral',  label: 'Referral'  },
                    ]} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Remarks" icon={FileText} iconColor="text-gray-400">
              {!isEditing ? (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {employee.remarks || <span className="text-gray-300 italic">No remarks</span>}
                </p>
              ) : (
                <textarea name="remarks" value={form.remarks || ''} onChange={handleChange} rows={6}
                  placeholder="Add remarks..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              )}
            </SectionCard>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            Tab: DOCUMENTS / 201
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <SectionCard title="201 File Status" icon={Shield} iconColor="text-green-500"
              action={isEditing && (
                <Field label="" name="requirements_status" value={form.requirements_status} onChange={handleChange}
                  options={[
                    { value: 'complete',   label: '✓ Complete'   },
                    { value: 'incomplete', label: '✗ Incomplete' },
                    { value: 'pending',    label: '⏳ Pending'    },
                  ]} />
              )}>
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Overall Status:</span>
                    <ReqBadge status={employee.requirements_status} />
                  </div>
                  <DocStatus label="NBI Clearance"       status={employee.nbi_status}              expiry={employee.nbi_expiry} />
                  <DocStatus label="Police Clearance"    status={employee.police_clearance_status} expiry={employee.police_clearance_expiry} />
                  <DocStatus label="Medical Certificate" status={employee.medcert_status}          expiry={employee.medcert_expiry} />
                </>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'NBI Clearance',       statusKey: 'nbi_status',              expiryKey: 'nbi_expiry'              },
                    { label: 'Police Clearance',    statusKey: 'police_clearance_status', expiryKey: 'police_clearance_expiry' },
                    { label: 'Medical Certificate', statusKey: 'medcert_status',          expiryKey: 'medcert_expiry'          },
                  ].map((doc) => (
                    <div key={doc.statusKey} className="border border-gray-100 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{doc.label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Status" name={doc.statusKey} value={form[doc.statusKey]} onChange={handleChange}
                          options={[
                            { value: 'submitted',    label: '✓ Submitted'  },
                            { value: 'pending',      label: '⏳ Pending'    },
                            { value: 'not_required', label: 'Not Required' },
                          ]} />
                        <Field label="Expiry Date" name={doc.expiryKey} type="date" value={form[doc.expiryKey]} onChange={handleChange} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Submitted Government IDs" icon={FileText} iconColor="text-purple-500">
              <DocStatus label="SSS"        status={employee.sss        ? 'submitted' : 'pending'} />
              <DocStatus label="Pag-IBIG"   status={employee.pagibig    ? 'submitted' : 'pending'} />
              <DocStatus label="PhilHealth" status={employee.philhealth ? 'submitted' : 'pending'} />
              <DocStatus label="TIN"        status={employee.tin        ? 'submitted' : 'pending'} />
            </SectionCard>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            Tab: HR ACTIONS
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'hr_actions' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowHrModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                <Plus className="h-4 w-4" /> Add HR Action
              </button>
            </div>

            {!employee.hr_actions?.length ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
                <AlertTriangle className="h-10 w-10 mb-3 text-gray-200" />
                <p className="text-sm font-medium">No HR actions recorded</p>
                <p className="text-xs mt-1 text-gray-300">Memos, incident reports, and LOAs will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employee.hr_actions.map((action) => (
                  <div key={action.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <HrTypeBadge type={action.type} />
                        <div className="flex-1 min-w-0">
                          {action.subject     && <p className="text-sm font-semibold text-gray-800">{action.subject}</p>}
                          {action.description && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{action.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmt(action.action_date)}</span>
                            {action.type === 'loa' && action.loa_start && (
                              <span>LOA: {fmt(action.loa_start)} – {fmt(action.loa_end)}</span>
                            )}
                            {action.created_by?.name && (
                              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {action.created_by.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteHrAction(action.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            Tab: CUSTOM FIELDS
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'custom_fields' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionCard title="Custom Fields" icon={LayoutGrid} iconColor="text-indigo-500">
              {customCols.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <LayoutGrid className="h-10 w-10 mb-3 text-gray-200" />
                  <p className="text-sm font-medium">No custom fields defined yet</p>
                  <p className="text-xs mt-1 text-gray-300">
                    Go to the Hired page → click <strong>"Manage Columns"</strong> → add a new column
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customCols.map((col) => (
                    <div key={col.field_key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                        {col.label}
                        <span className="ml-1 text-gray-300 normal-case">({col.type})</span>
                      </label>
                      <input
                        type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                        value={customForm[col.field_key] || ''}
                        onChange={(e) => setCustomForm((prev) => ({ ...prev, [col.field_key]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder={`Enter ${col.label.toLowerCase()}...`}
                      />
                    </div>
                  ))}
                  <div className="pt-2 flex items-center gap-3">
                    <button onClick={handleSaveCustomFields} disabled={savingCustom}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      {savingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {savingCustom ? 'Saving...' : 'Save Custom Fields'}
                    </button>
                    {customSaved && (
                      <span className="text-xs text-green-600 font-medium">✓ Saved successfully</span>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>

            {customCols.length > 0 && employee.custom_fields && Object.keys(employee.custom_fields).length > 0 && (
              <SectionCard title="Saved Values" icon={FileText} iconColor="text-gray-400">
                {customCols.map((col) => (
                  <InfoRow key={col.field_key} label={col.label} value={employee.custom_fields?.[col.field_key] || '—'} />
                ))}
              </SectionCard>
            )}
          </div>
        )}

      </div>

      {/* ── HR Action Modal ───────────────────────────────────────────────── */}
      {showHrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowHrModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Add HR Action</h3>
              <button onClick={() => setShowHrModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {[
                { value: 'memo', label: 'Memo',            cls: 'bg-blue-100 text-blue-700'     },
                { value: 'ir',   label: 'Incident Report', cls: 'bg-red-100 text-red-700'       },
                { value: 'loa',  label: 'LOA',             cls: 'bg-purple-100 text-purple-700' },
              ].map((t) => (
                <button key={t.value} onClick={() => setHrForm((f) => ({ ...f, type: t.value }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                    ${hrForm.type === t.value ? t.cls + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <Field label="Subject" name="subject" value={hrForm.subject}
                onChange={(e) => setHrForm((f) => ({ ...f, subject: e.target.value }))} />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea value={hrForm.description}
                  onChange={(e) => setHrForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Details of the action..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <Field label="Action Date" name="action_date" type="date" value={hrForm.action_date}
                onChange={(e) => setHrForm((f) => ({ ...f, action_date: e.target.value }))} required />
              {hrForm.type === 'loa' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="LOA Start" name="loa_start" type="date" value={hrForm.loa_start}
                    onChange={(e) => setHrForm((f) => ({ ...f, loa_start: e.target.value }))} />
                  <Field label="LOA End" name="loa_end" type="date" value={hrForm.loa_end}
                    onChange={(e) => setHrForm((f) => ({ ...f, loa_end: e.target.value }))} />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowHrModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleAddHrAction} disabled={savingHr || !hrForm.action_date}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {savingHr ? 'Saving...' : 'Save Action'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}