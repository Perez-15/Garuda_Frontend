import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Save, X, Loader2, Edit2,
  CalendarDays, Building2, CreditCard, FileText,
  User as UserIcon, Briefcase, CheckCircle, Clock,
  XCircle, AlertCircle, Trash2, ZoomIn, Lock,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userService } from '../../services/userService';
import { customColumnService } from '../../services/customcolumnService';
import { useAuth } from '../../contexts/AuthContext';

const PAGE = 'internal_employees';

// ── Fields the profile owner (non-admin) can edit themselves ─────────────────
const SELF_EDITABLE_FIELDS = new Set([
  'full_name', 'contact_number', 'address', 'date_of_birth',
  'age', 'gender', 'civil_status',
  'emergency_contact_name', 'emergency_contact_number',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const FIXED_READ = {
  full_name:                (p) => p.name,
  email:                    (p) => p.email,
  contact_number:           (p) => p.contact_number,
  address:                  (p) => p.address,
  date_of_birth:            (p) => fmt(p.date_of_birth),
  age:                      (p) => p.age,
  gender:                   (p) => p.gender,
  civil_status:             (p) => p.civil_status,
  emergency_contact_name:   (p) => p.emergency_contact_name,
  emergency_contact_number: (p) => p.emergency_contact_number,
  date_hired:               (p) => fmt(p.date_hired),
  date_ended:               (p) => fmt(p.date_ended),
  date_resigned:            (p) => fmt(p.date_resigned),
  daily_rate:               (p) => p.daily_rate ? `₱${Number(p.daily_rate).toLocaleString()}` : '—',
  employment_status:        (p) => p.employment_status,
  source:                   (p) => p.source,
  remarks:                  (p) => p.remarks,
  sss:                      (p) => p.sss,
  pagibig:                  (p) => p.pagibig,
  philhealth:               (p) => p.philhealth,
  tin:                      (p) => p.tin,
  nbi_status:               (p) => p.nbi_status,
  medcert_status:           (p) => p.medcert_status,
  police_clearance_status:  (p) => p.police_clearance_status,
  contract_status:          (p) => p.contract_status,
  requirements_status:      (p) => p.requirements_status,
  psa_birth_cert:           (p) => p.custom_fields?.psa_birth_cert,
  sss_doc:                  (p) => p.custom_fields?.sss_doc,
  philhealth_doc:           (p) => p.custom_fields?.philhealth_doc,
  pagibig_doc:              (p) => p.custom_fields?.pagibig_doc,
  tin_doc:                  (p) => p.custom_fields?.tin_doc,
  coe:                      (p) => p.custom_fields?.coe,
  tor_diploma:              (p) => p.custom_fields?.tor_diploma,
  valid_id_photocopy:       (p) => p.custom_fields?.valid_id_photocopy,
  picture_1x1:              (p) => p.custom_fields?.picture_1x1,
};

const FIXED_KEYS = new Set([
  'full_name','email','contact_number','address','date_of_birth','age','gender',
  'civil_status','emergency_contact_name','emergency_contact_number',
  'date_hired','date_ended','date_resigned','daily_rate','employment_status',
  'source','remarks','sss','pagibig','philhealth','tin',
  'nbi_status','medcert_status','police_clearance_status','contract_status','requirements_status',
]);

const SAVE_KEY_MAP = { full_name: 'name' };
const toSaveKey = (k) => SAVE_KEY_MAP[k] || k;

const SECTION_ICONS = {
  'Personal Information':     <UserIcon className="h-4 w-4" />,
  'Employment Details':       <Briefcase className="h-4 w-4" />,
  'Government IDs':           <CreditCard className="h-4 w-4" />,
  'Documents & Requirements': <FileText className="h-4 w-4" />,
};
const SECTION_COLORS = {
  'Personal Information':     'text-blue-500',
  'Employment Details':       'text-indigo-500',
  'Government IDs':           'text-amber-500',
  'Documents & Requirements': 'text-green-500',
};



// ── Badges ────────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    super_admin:        { label: 'Super Admin',        cls: 'bg-red-100 text-red-700 border-red-200'          },
    hr_admin:           { label: 'HR Admin',           cls: 'bg-blue-100 text-blue-700 border-blue-200'       },
    talent_acquisition: { label: 'Talent Acquisition', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    accounting:         { label: 'Accounting',         cls: 'bg-amber-100 text-amber-700 border-amber-200'    },
    marketing:          { label: 'Marketing',          cls: 'bg-pink-100 text-pink-700 border-pink-200'       },
  };
  const r = map[role] || { label: role || '—', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${r.cls}`}>
      {r.label}
    </span>
  );
}

function DocStatusBadge({ status }) {
  const map = {
    submitted:    { icon: <CheckCircle className="h-3.5 w-3.5" />, label: 'Submitted',    cls: 'bg-green-50 text-green-700 border-green-200'   },
    pending:      { icon: <Clock className="h-3.5 w-3.5" />,       label: 'Pending',      cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    not_required: { icon: <XCircle className="h-3.5 w-3.5" />,     label: 'Not Required', cls: 'bg-gray-50 text-gray-400 border-gray-200'      },
  };
  const s = map[status] || map['pending'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

function ReqBadge({ status }) {
  const map = {
    complete:   'bg-green-100 text-green-700 border-green-200',
    incomplete: 'bg-red-100 text-red-600 border-red-200',
    pending:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  const labels = { complete: '✓ Complete', incomplete: '✗ Incomplete', pending: '⏳ Pending' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {labels[status] || '—'}
    </span>
  );
}

// ── Dynamic field value renderer ──────────────────────────────────────────────
function FieldValue({ fieldKey, type, profile }) {
  const reader = FIXED_READ[fieldKey];
  const val = reader
    ? reader(profile)
    : profile.custom_fields?.[fieldKey];

  if (['nbi_status','medcert_status','police_clearance_status','contract_status',
       'psa_birth_cert','sss_doc','philhealth_doc','pagibig_doc','tin_doc',
       'coe','tor_diploma','valid_id_photocopy','picture_1x1'].includes(fieldKey)) {
    return <DocStatusBadge status={val} />;
  }
  if (fieldKey === 'requirements_status') return <ReqBadge status={val} />;
  if (fieldKey === 'role') return <RoleBadge role={profile.roles?.[0]?.name} />;

  const isMonoKey = ['sss','pagibig','philhealth','tin'].includes(fieldKey);
  return (
    <span className={`text-sm text-gray-800 ${isMonoKey ? 'font-mono' : ''}`}>
      {val || '—'}
    </span>
  );
}

// ── Dynamic field editor ──────────────────────────────────────────────────────
function FieldEditor({ field, value, onChange }) {
  const { field_key, label, type, options } = field;

  const parsedOptions = Array.isArray(options)
    ? options
    : (typeof options === 'string'
        ? (() => { try { return JSON.parse(options); } catch { return []; } })()
        : []);

  const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  if (type === 'select' && parsedOptions.length) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
        <select value={value || ''} onChange={(e) => onChange(field_key, e.target.value)} className={`${inputCls} bg-white`}>
          <option value="" disabled>---</option>
          {parsedOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
        <input type="date" value={value || ''} onChange={(e) => onChange(field_key, e.target.value)} className={inputCls} />
      </div>
    );
  }

  if (type === 'number') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
        <input type="number" value={value || ''} onChange={(e) => onChange(field_key, e.target.value)} className={inputCls} />
      </div>
    );
  }

  if (field_key === 'address') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
        <textarea value={value || ''} onChange={(e) => onChange(field_key, e.target.value)}
          rows={2} className={`${inputCls} resize-none`} />
      </div>
    );
  }

  const isMonoKey = ['sss','pagibig','philhealth','tin'].includes(field_key);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
      <input
        type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'}
        value={value || ''}
        onChange={(e) => onChange(field_key, e.target.value)}
        className={`${inputCls} ${isMonoKey ? 'font-mono' : ''}`}
      />
    </div>
  );
}

// ── Locked field — shown when owner tries to view an HR-only field in edit mode ─
function LockedField({ field, profile }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
        {field.label}
        <Lock className="h-3 w-3 text-gray-300" />
      </label>
      <div className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2 bg-gray-50 text-gray-400 cursor-not-allowed flex items-center justify-between">
        <FieldValue fieldKey={field.field_key} type={field.type} profile={profile} />
        <span className="text-xs text-gray-300 ml-2 whitespace-nowrap">HR only</span>
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({
  title, fields, profile, editing, onEdit, onSave, onCancel,
  onFieldChange, formValues, saving, canEditSection, canEditField, passwordForm, onPasswordChange,
}) {
  const icon  = SECTION_ICONS[title]  || <FileText className="h-4 w-4" />;
  const color = SECTION_COLORS[title] || 'text-gray-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg bg-gray-50 ${color}`}>{icon}</div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {canEditSection && (
          editing ? (
            <div className="flex items-center gap-1.5">
              <button onClick={onCancel}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button onClick={onSave} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          ) : (
            <button onClick={onEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
          )
        )}
      </div>

      <div className="px-6 py-5">
        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            {fields.map((f) => {
              if (f.field_key === 'role') return null;
              const span = ['full_name','email','address','emergency_contact_name',
                            'emergency_contact_number'].includes(f.field_key) ? 'col-span-2' : '';
              return (
                <div key={f.field_key} className={span || 'col-span-1'}>
                  {/* If the user can edit this specific field, show editor; otherwise show locked */}
                  {canEditField(f.field_key) ? (
                    <FieldEditor field={f} value={formValues[f.field_key] ?? ''} onChange={onFieldChange} />
                  ) : (
                    <LockedField field={f} profile={profile} />
                  )}
                </div>
              );
            })}
            {title === 'Employment Details' && (
              <div className="col-span-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Assigned Branches</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {profile.branches?.length > 0
                    ? profile.branches.map((b) => (
                        <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-purple-50 text-purple-700 border border-purple-100">
                          <Building2 className="h-3 w-3" /> {b.branch_name}
                        </span>
                      ))
                    : <span className="text-sm text-gray-400">—</span>}
                </div>
              </div>
            )}

            {title === 'Personal Information' && passwordForm && (
  <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Change Password</p>
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          New Password <span className="normal-case text-gray-300">(leave blank to keep)</span>
        </label>
        <input
          type="password"
          value={passwordForm.password}
          onChange={(e) => onPasswordChange('password', e.target.value)}
          placeholder="Min 8 characters"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      {passwordForm.password && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Confirm Password</label>
          <input
            type="password"
            value={passwordForm.password_confirmation}
            onChange={(e) => onPasswordChange('password_confirmation', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}
    </div>
  </div>
)}
          </div>
          
        ) : (
          <div className="divide-y divide-gray-50">
            {fields.map((f) => {
              if (f.field_key === 'role') {
                return (
                  <div key="role" className="flex items-center justify-between py-2.5 gap-4">
                    <span className="text-sm text-gray-400 w-44 flex-shrink-0">Department / Role</span>
                    <div className="flex-1 flex justify-end"><RoleBadge role={profile.roles?.[0]?.name} /></div>
                  </div>
                );
              }
              return (
                <div key={f.field_key} className="flex items-center justify-between py-2.5 gap-4">
                  <span className="text-sm text-gray-400 w-44 flex-shrink-0 flex items-center gap-1">
                    {f.label}
                    {/* Show lock icon on HR-only fields when viewed by owner */}
                    {!canEditField(f.field_key) && canEditSection && (
                      <Lock className="h-3 w-3 text-gray-300 flex-shrink-0" />
                    )}
                  </span>
                  <div className="flex-1 flex justify-end">
                    <FieldValue fieldKey={f.field_key} type={f.type} profile={profile} />
                  </div>
                </div>
              );
            })}
            
            {title === 'Employment Details' && (
              <div className="flex items-start justify-between py-2.5 gap-4">
                <span className="text-sm text-gray-400 w-44 flex-shrink-0">Assigned Branches</span>
                <div className="flex-1 flex flex-wrap justify-end gap-1">
                  {profile.branches?.length > 0
                    ? profile.branches.map((b) => (
                        <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-purple-50 text-purple-700 border border-purple-100">
                          <Building2 className="h-3 w-3" /> {b.branch_name}
                        </span>
                      ))
                    : <span className="text-sm text-gray-400">—</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile,        setProfile]        = useState(null);
  const [schema,         setSchema]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [toast,          setToast]          = useState(null);
  const [lightbox,       setLightbox]       = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const [editingSections, setEditingSections] = useState({});
  const [savingSections,  setSavingSections]  = useState({});
  const [sectionForms,    setSectionForms]    = useState({});

  const userRole  = currentUser?.roles?.[0]?.name;
  const canManage = userRole === 'super_admin' || userRole === 'hr_admin';
  const isSelf    = currentUser?.id === Number(id);

  const [passwordForm, setPasswordForm] = useState({ password: '', password_confirmation: '' });

  // ── Permission helpers ────────────────────────────────────────────────────

  // Can this specific field be edited by the current user?
  const canEditField = useCallback((fieldKey) => {
    if (canManage) return true;                          // HR/admin edits everything
    if (isSelf) return SELF_EDITABLE_FIELDS.has(fieldKey); // owner edits personal info only
    return false;
  }, [canManage, isSelf]);

  // A section shows the Edit button only if at least one field in it is editable
  const canEditSection = useCallback((fields) => {
    return fields.some((f) => canEditField(f.field_key));
  }, [canEditField]);

  const canViewSection = useCallback((sectionName) => {
  if (canManage) return true;
  return sectionName === 'Personal Information';
}, [canManage]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const groupSchema = useCallback((columns) => {
    const map = {};
    const order = [];
    columns.forEach((col) => {
      const sec = col.section || 'General';
      if (!map[sec]) { map[sec] = []; order.push(sec); }
      map[sec].push(col);
    });
    return order.map((sec) => ({ name: sec, fields: map[sec] }));
  }, []);

  const buildFormForSection = useCallback((sectionFields, profile) => {
    const form = {};
    sectionFields.forEach((f) => {
      if (FIXED_KEYS.has(f.field_key)) {
        if (f.field_key === 'full_name')      form[f.field_key] = profile.name || '';
        else if (f.field_key === 'date_of_birth') form[f.field_key] = profile.date_of_birth?.substring(0,10) || '';
        else if (f.field_key === 'date_hired')    form[f.field_key] = profile.date_hired?.substring(0,10) || '';
        else if (f.field_key === 'date_ended')    form[f.field_key] = profile.date_ended?.substring(0,10) || '';
        else if (f.field_key === 'date_resigned') form[f.field_key] = profile.date_resigned?.substring(0,10) || '';
        else form[f.field_key] = profile[f.field_key] || '';
      } else {
        form[f.field_key] = profile.custom_fields?.[f.field_key] || '';
      }
    });
    return form;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, schemaRes] = await Promise.all([
        userService.getById(id),
        customColumnService.getByPage(PAGE),
      ]);
      const p       = profileRes.user;
      const grouped = groupSchema(Array.isArray(schemaRes) ? schemaRes : []);
      setProfile(p);
      setSchema(grouped);
      const forms = {};
      grouped.forEach((sec) => { forms[sec.name] = buildFormForSection(sec.fields, p); });
      setSectionForms(forms);
    } catch {
      showToast('error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [id, groupSchema, buildFormForSection, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setLightbox(false); };
    if (lightbox) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox]);

  const handleFieldChange = (sectionName, fieldKey, value) => {
    setSectionForms((prev) => ({
      ...prev,
      [sectionName]: { ...prev[sectionName], [fieldKey]: value },
    }));
  };

  const saveSection = async (sectionName, fields) => {
    try {
      setSavingSections((s) => ({ ...s, [sectionName]: true }));

       if (sectionName === 'Personal Information' && passwordForm.password) {
      if (passwordForm.password !== passwordForm.password_confirmation) {
        showToast('error', 'Passwords do not match.');
        setSavingSections((s) => ({ ...s, [sectionName]: false }));
        return;
      }
      await userService.update(id, { password: passwordForm.password });
      setPasswordForm({ password: '', password_confirmation: '' });
    }
      const form = sectionForms[sectionName] || {};

      const fixedPayload  = {};
      const customPayload = {};

      fields.forEach((f) => {
        if (f.field_key === 'role') return;
        // Only save fields this user is allowed to edit
        if (!canEditField(f.field_key)) return;
        const val = form[f.field_key];
        if (FIXED_KEYS.has(f.field_key)) {
          fixedPayload[toSaveKey(f.field_key)] = val;
        } else {
          customPayload[f.field_key] = val;
        }
      });

      if (Object.keys(fixedPayload).length) {
        await userService.update(id, fixedPayload);
      }
      if (Object.keys(customPayload).length) {
        try {
          await userService.updateCustomFields(id, customPayload);
        } catch (err) {
          console.warn('Custom fields update skipped:', err);
        }
      }

      showToast('success', `${sectionName} updated.`);
      setEditingSections((s) => ({ ...s, [sectionName]: false }));
      loadData();
    } catch (e) {
      showToast('error', e?.response?.data?.message || 'Failed to save.');
    } finally {
      setSavingSections((s) => ({ ...s, [sectionName]: false }));
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('error', 'Photo must be less than 2MB.'); return; }
    try {
      setUploadingPhoto(true);
      await userService.uploadPhoto(id, file);
      showToast('success', 'Profile photo updated.');
      loadData();
    } catch { showToast('error', 'Failed to upload photo.'); }
    finally { setUploadingPhoto(false); e.target.value = ''; }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Remove profile photo?')) return;
    try { await userService.deletePhoto(id); showToast('success', 'Photo removed.'); loadData(); }
    catch { showToast('error', 'Failed to remove photo.'); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading profile...
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <AlertCircle className="h-10 w-10 mb-3 text-gray-200" />
          <p className="text-sm font-medium">Profile not found</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-indigo-600 hover:underline">Go back</button>
        </div>
      </DashboardLayout>
    );
  }

  const roleName = profile.roles?.[0]?.name;

  return (
    <DashboardLayout>
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2
          ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-400" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && profile.profile_photo_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightbox(false)}>
          <div className="relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={profile.profile_photo_url} alt={profile.name}
              className="max-h-[80vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain" />
            <p className="mt-3 text-white/60 text-sm">{profile.name}</p>
            <button onClick={() => setLightbox(false)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-gray-900">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="absolute bottom-6 text-white/30 text-xs select-none">Click outside or press Esc to close</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Back ────────────────────────────────────────────────────────── */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Internal Employees
        </button>

        {/* ── Permission notice for non-admin owners ───────────────────────── */}
        {isSelf && !canManage && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            <Lock className="h-4 w-4 flex-shrink-0" />
            You can edit your personal information. Fields marked with a lock icon can only be edited by HR or Admin.
          </div>
        )}

        {/* ── Hero Card ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 flex items-center justify-center">
            <span className="text-white/80 text-lg font-bold tracking-widest uppercase select-none">
              Garuda Recruitment Agency
            </span>
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                <div
                  className={`h-24 w-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-indigo-100 flex items-center justify-center
                    ${profile.profile_photo_url ? 'cursor-pointer group/avatar' : ''}`}
                  onClick={() => profile.profile_photo_url && setLightbox(true)}
                >
                  {profile.profile_photo_url ? (
                    <>
                      <img src={profile.profile_photo_url} alt={profile.name}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover/avatar:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/30 transition-all duration-200 flex items-center justify-center rounded-xl">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200" />
                      </div>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-indigo-400">
                      {profile.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                {/* Anyone can update their own photo; admins can update anyone's */}
                {(canManage || isSelf) && (
                  <>
                    <button onClick={() => photoInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition-colors z-10">
                      <Camera className="h-4 w-4" />
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange} className="hidden" />
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-14">
                {(canManage || isSelf) && profile.profile_photo_url && (
                  <button onClick={handleDeletePhoto}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Remove photo
                  </button>
                )}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border
                  ${profile.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
                <p className="text-sm text-gray-400 mt-0.5">{profile.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <RoleBadge role={roleName} />
                  {profile.date_hired && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> Hired {fmtShort(profile.date_hired)}
                    </span>
                  )}
                </div>
              </div>
              <ReqBadge status={profile.requirements_status} />
            </div>
          </div>
        </div>

        {/* ── Dynamic Schema Sections ──────────────────────────────────────── */}
        {schema.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
            No schema configured for this page yet.{' '}
            {canManage && (
              <button onClick={() => navigate('/manage-columns/internal_employees')}
                className="text-indigo-500 hover:underline">Configure schema</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {schema.filter((sec) => canViewSection(sec.name)).map((sec) => (
          <SectionCard
            key={sec.name}
                title={sec.name}
                fields={sec.fields}
                profile={profile}
                editing={!!editingSections[sec.name]}
                saving={!!savingSections[sec.name]}
                canEditSection={canEditSection(sec.fields)}
                canEditField={canEditField}
                formValues={sectionForms[sec.name] || {}}
                onEdit={() => setEditingSections((s) => ({ ...s, [sec.name]: true }))}
                onCancel={() => {
                  setEditingSections((s) => ({ ...s, [sec.name]: false }));
                  setSectionForms((prev) => ({
                    ...prev,
                    [sec.name]: buildFormForSection(sec.fields, profile),
                  }));
                }}
                onSave={() => saveSection(sec.name, sec.fields)}
                onFieldChange={(fieldKey, value) => handleFieldChange(sec.name, fieldKey, value)}
                 passwordForm={sec.name === 'Personal Information' ? passwordForm : null}
                onPasswordChange={(field, val) => setPasswordForm((prev) => ({ ...prev, [field]: val }))}
              />
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}