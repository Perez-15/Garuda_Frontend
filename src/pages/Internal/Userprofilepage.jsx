import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Save, X, Loader2, Edit2,
  Phone, Mail, MapPin, CalendarDays, User as UserIcon,
  Building2, ShieldCheck, FileText, CreditCard,
  CheckCircle, Clock, XCircle, Users, Briefcase,
  AlertCircle, Trash2, ZoomIn,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    super_admin:        { label: 'Super Admin',        cls: 'bg-red-100 text-red-700 border-red-200'         },
    hr_admin:           { label: 'HR Admin',           cls: 'bg-blue-100 text-blue-700 border-blue-200'      },
    talent_acquisition: { label: 'Talent Acquisition', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200'},
    accounting:         { label: 'Accounting',         cls: 'bg-amber-100 text-amber-700 border-amber-200'   },
    marketing:          { label: 'Marketing',          cls: 'bg-pink-100 text-pink-700 border-pink-200'      },
  };
  const r = map[role] || { label: role || '—', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${r.cls}`}>
      {r.label}
    </span>
  );
}

// ── Doc status badge ──────────────────────────────────────────────────────────
function DocStatusBadge({ status }) {
  const map = {
    submitted:    { icon: <CheckCircle className="h-3.5 w-3.5" />, label: 'Submitted',    cls: 'bg-green-50 text-green-700 border-green-200'  },
    pending:      { icon: <Clock className="h-3.5 w-3.5" />,       label: 'Pending',      cls: 'bg-yellow-50 text-yellow-700 border-yellow-200'},
    not_required: { icon: <XCircle className="h-3.5 w-3.5" />,     label: 'Not Required', cls: 'bg-gray-50 text-gray-400 border-gray-200'     },
  };
  const s = map[status] || map['pending'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.icon} {s.label}
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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {labels[status] || '—'}
    </span>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, iconColor = 'text-indigo-500', children, action }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg bg-gray-50 ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────
function FieldRow({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-sm text-gray-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

// ── Editable field ────────────────────────────────────────────────────────────
function EditableField({ label, value, onChange, type = 'text', options, mono = false }) {
  if (options) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        className={`text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mono ? 'font-mono' : ''}`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile,       setProfile]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState(null);
  const [lightbox,      setLightbox]      = useState(false);  // ← lightbox state

  // ── Edit states per section ───────────────────────────────────────────────
  const [editingPersonal,     setEditingPersonal]     = useState(false);
  const [editingEmployment,   setEditingEmployment]   = useState(false);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [editingGovIds,       setEditingGovIds]       = useState(false);
  const [savingSection,       setSavingSection]       = useState(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [personalForm,     setPersonalForm]     = useState({});
  const [employmentForm,   setEmploymentForm]   = useState({});
  const [requirementsForm, setRequirementsForm] = useState({});
  const [govIdsForm,       setGovIdsForm]       = useState({});

  // ── Photo upload ──────────────────────────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const userRole  = currentUser?.roles?.[0]?.name;
  const canManage = userRole === 'super_admin' || userRole === 'hr_admin';
  const isSelf    = currentUser?.id === Number(id);
  const canEdit   = canManage || isSelf;

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Load profile ──────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userService.getById(id);
      const u = res.user;
      setProfile(u);
      setPersonalForm({
        name:                     u.name            || '',
        email:                    u.email           || '',
        contact_number:           u.contact_number  || '',
        address:                  u.address         || '',
        date_of_birth:            u.date_of_birth   ? u.date_of_birth.substring(0, 10) : '',
        gender:                   u.gender          || '',
        civil_status:             u.civil_status    || '',
        emergency_contact_name:   u.emergency_contact_name   || '',
        emergency_contact_number: u.emergency_contact_number || '',
      });
      setEmploymentForm({
        role:       u.roles?.[0]?.name || '',
        date_hired: u.date_hired ? u.date_hired.substring(0, 10) : '',
        department: u.department || '',
      });
      setRequirementsForm({
        nbi_status:              u.nbi_status              || 'pending',
        medcert_status:          u.medcert_status          || 'pending',
        police_clearance_status: u.police_clearance_status || 'pending',
        contract_status:         u.contract_status         || 'pending',
        requirements_status:     u.requirements_status     || 'pending',
      });
      setGovIdsForm({
        sss:        u.sss        || '',
        pagibig:    u.pagibig    || '',
        philhealth: u.philhealth || '',
        tin:        u.tin        || '',
      });
    } catch (e) {
      showToast('error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Close lightbox on Escape ──────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setLightbox(false); };
    if (lightbox) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox]);

  // ── Save handlers ─────────────────────────────────────────────────────────
  const savePersonal = async () => {
    try {
      setSavingSection('personal');
      await userService.update(id, personalForm);
      showToast('success', 'Personal info updated.');
      setEditingPersonal(false);
      loadProfile();
    } catch (e) {
      showToast('error', e?.response?.data?.message || 'Failed to save.');
    } finally { setSavingSection(null); }
  };

  const saveEmployment = async () => {
    try {
      setSavingSection('employment');
      await userService.update(id, employmentForm);
      showToast('success', 'Employment info updated.');
      setEditingEmployment(false);
      loadProfile();
    } catch (e) {
      showToast('error', e?.response?.data?.message || 'Failed to save.');
    } finally { setSavingSection(null); }
  };

  const saveRequirements = async () => {
    try {
      setSavingSection('requirements');
      await userService.updateRequirements(id, requirementsForm);
      showToast('success', 'Requirements updated.');
      setEditingRequirements(false);
      loadProfile();
    } catch (e) {
      showToast('error', e?.response?.data?.message || 'Failed to save.');
    } finally { setSavingSection(null); }
  };

  const saveGovIds = async () => {
    try {
      setSavingSection('govids');
      await userService.update(id, govIdsForm);
      showToast('success', 'Government IDs updated.');
      setEditingGovIds(false);
      loadProfile();
    } catch (e) {
      showToast('error', e?.response?.data?.message || 'Failed to save.');
    } finally { setSavingSection(null); }
  };

  // ── Photo handlers ────────────────────────────────────────────────────────
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Photo must be less than 2MB.');
      return;
    }
    try {
      setUploadingPhoto(true);
      await userService.uploadPhoto(id, file);
      showToast('success', 'Profile photo updated.');
      loadProfile();
    } catch (e) {
      showToast('error', e?.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Remove profile photo?')) return;
    try {
      await userService.deletePhoto(id);
      showToast('success', 'Photo removed.');
      loadProfile();
    } catch {
      showToast('error', 'Failed to remove photo.');
    }
  };

  // ── Section edit action button ────────────────────────────────────────────
  const EditAction = ({ editing, onEdit, onSave, onCancel, saving }) => {
    if (!canEdit) return null;
    if (editing) {
      return (
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
      );
    }
    return (
      <button onClick={onEdit}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <Edit2 className="h-3.5 w-3.5" /> Edit
      </button>
    );
  };

  // ── Loading / not found states ────────────────────────────────────────────
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
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-indigo-600 hover:underline">
            Go back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const roleName = profile.roles?.[0]?.name;

  const docOptions = [
    { value: 'submitted',    label: '✓ Submitted' },
    { value: 'pending',      label: '⏳ Pending'   },
    { value: 'not_required', label: 'N/A'          },
  ];

  return (
    <DashboardLayout>
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2
          ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success'
            ? <CheckCircle className="h-4 w-4 text-green-400" />
            : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && profile.profile_photo_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <div
            className="relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={profile.profile_photo_url}
              alt={profile.name}
              className="max-h-[80vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
            />
            <p className="mt-3 text-white/60 text-sm">{profile.name}</p>

            {/* Close button */}
            <button
              onClick={() => setLightbox(false)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="absolute bottom-6 text-white/30 text-xs select-none">
            Click outside or press Esc to close
          </p>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Back button ─────────────────────────────────────────────────── */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Internal Employees
        </button>

        {/* ── Profile Hero Card ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Cover strip */}
        <div className="h-24 bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 flex items-center justify-center">
  <span className="text-white/80 text-lg font-bold tracking-widest uppercase select-none">
    Garuda Recruitment Agency
  </span>
</div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">

              {/* Avatar with upload + lightbox trigger */}
              <div className="relative">
                <div
                  className={`h-24 w-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-indigo-100 flex items-center justify-center
                    ${profile.profile_photo_url ? 'cursor-pointer group/avatar' : ''}`}
                  onClick={() => profile.profile_photo_url && setLightbox(true)}
                  title={profile.profile_photo_url ? 'Click to view full photo' : ''}
                >
                  {profile.profile_photo_url ? (
                    <>
                      <img
                        src={profile.profile_photo_url}
                        alt={profile.name}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover/avatar:scale-105"
                      />
                      {/* Zoom overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/30 transition-all duration-200 flex items-center justify-center rounded-xl">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200" />
                      </div>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-indigo-400">
                      {profile.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}

                  {/* Upload spinner */}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Camera upload button */}
                {canEdit && (
                  <>
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition-colors z-10"
                      title="Upload photo"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* Remove photo + active status */}
              <div className="flex items-center gap-2 mt-14">
                {canEdit && profile.profile_photo_url && (
                  <button onClick={handleDeletePhoto}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Remove photo
                  </button>
                )}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border
                  ${profile.is_active
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Name + role */}
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

        {/* ── Two column layout ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Personal Info ────────────────────────────────────────────── */}
          <SectionCard
            title="Personal Information"
            icon={UserIcon}
            iconColor="text-blue-500"
            action={
              <EditAction
                editing={editingPersonal}
                onEdit={() => setEditingPersonal(true)}
                onSave={savePersonal}
                onCancel={() => { setEditingPersonal(false); loadProfile(); }}
                saving={savingSection === 'personal'}
              />
            }
          >
            {editingPersonal ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <EditableField label="Full Name" value={personalForm.name}
                    onChange={(v) => setPersonalForm((f) => ({ ...f, name: v }))} />
                </div>
                <div className="col-span-2">
                  <EditableField label="Email" type="email" value={personalForm.email}
                    onChange={(v) => setPersonalForm((f) => ({ ...f, email: v }))} />
                </div>
                <EditableField label="Contact Number" value={personalForm.contact_number}
                  onChange={(v) => setPersonalForm((f) => ({ ...f, contact_number: v }))} />
                <EditableField label="Date of Birth" type="date" value={personalForm.date_of_birth}
                  onChange={(v) => setPersonalForm((f) => ({ ...f, date_of_birth: v }))} />
                <EditableField label="Gender" value={personalForm.gender}
                  options={[
                    { value: '',         label: '— Select —' },
                    { value: 'Male',     label: 'Male'       },
                    { value: 'Female',   label: 'Female'     },
                    { value: 'Other',    label: 'Other'      },
                  ]}
                  onChange={(v) => setPersonalForm((f) => ({ ...f, gender: v }))} />
                <EditableField label="Civil Status" value={personalForm.civil_status}
                  options={[
                    { value: '',          label: '— Select —' },
                    { value: 'Single',    label: 'Single'     },
                    { value: 'Married',   label: 'Married'    },
                    { value: 'Widowed',   label: 'Widowed'    },
                    { value: 'Separated', label: 'Separated'  },
                  ]}
                  onChange={(v) => setPersonalForm((f) => ({ ...f, civil_status: v }))} />
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Address</label>
                  <textarea
                    value={personalForm.address || ''}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, address: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <EditableField label="Emergency Contact Name" value={personalForm.emergency_contact_name}
                  onChange={(v) => setPersonalForm((f) => ({ ...f, emergency_contact_name: v }))} />
                <EditableField label="Emergency Contact No." value={personalForm.emergency_contact_number}
                  onChange={(v) => setPersonalForm((f) => ({ ...f, emergency_contact_number: v }))} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><FieldRow label="Full Name" value={profile.name} /></div>
                <div className="col-span-2"><FieldRow label="Email" value={profile.email} /></div>
                <FieldRow label="Contact Number"  value={profile.contact_number} />
                <FieldRow label="Date of Birth"   value={fmt(profile.date_of_birth)} />
                <FieldRow label="Gender"          value={profile.gender} />
                <FieldRow label="Civil Status"    value={profile.civil_status} />
                <div className="col-span-2"><FieldRow label="Address" value={profile.address} /></div>
                <FieldRow label="Emergency Contact"     value={profile.emergency_contact_name} />
                <FieldRow label="Emergency Contact No." value={profile.emergency_contact_number} />
              </div>
            )}
          </SectionCard>

          {/* ── Employment Details ───────────────────────────────────────── */}
          <SectionCard
            title="Employment Details"
            icon={Briefcase}
            iconColor="text-indigo-500"
            action={
              canManage && (
                <EditAction
                  editing={editingEmployment}
                  onEdit={() => setEditingEmployment(true)}
                  onSave={saveEmployment}
                  onCancel={() => { setEditingEmployment(false); loadProfile(); }}
                  saving={savingSection === 'employment'}
                />
              )
            }
          >
            {editingEmployment ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <EditableField label="Department / Role" value={employmentForm.role}
                    options={[
                      { value: 'hr_admin',          label: 'HR Admin'           },
                      { value: 'talent_acquisition', label: 'Talent Acquisition' },
                      { value: 'accounting',         label: 'Accounting'         },
                      { value: 'marketing',          label: 'Marketing'          },
                      { value: 'super_admin',        label: 'Super Admin'        },
                    ]}
                    onChange={(v) => setEmploymentForm((f) => ({ ...f, role: v }))} />
                </div>
                <div className="col-span-2">
                  <EditableField label="Date Hired" type="date" value={employmentForm.date_hired}
                    onChange={(v) => setEmploymentForm((f) => ({ ...f, date_hired: v }))} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Department</span>
                    <div className="mt-1"><RoleBadge role={roleName} /></div>
                  </div>
                </div>
                <div className="col-span-2">
                  <FieldRow label="Date Hired" value={fmt(profile.date_hired)} />
                </div>
                <div className="col-span-2">
                  <div className="flex flex-col gap-1">
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
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Government IDs ───────────────────────────────────────────── */}
          <SectionCard
            title="Government IDs"
            icon={CreditCard}
            iconColor="text-amber-500"
            action={
              canManage && (
                <EditAction
                  editing={editingGovIds}
                  onEdit={() => setEditingGovIds(true)}
                  onSave={saveGovIds}
                  onCancel={() => { setEditingGovIds(false); loadProfile(); }}
                  saving={savingSection === 'govids'}
                />
              )
            }
          >
            {editingGovIds ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { field: 'sss',        label: 'SSS No.'       },
                  { field: 'pagibig',    label: 'Pag-IBIG No.'  },
                  { field: 'philhealth', label: 'PhilHealth No.' },
                  { field: 'tin',        label: 'TIN No.'        },
                ].map(({ field, label }) => (
                  <EditableField key={field} label={label} value={govIdsForm[field]} mono
                    onChange={(v) => setGovIdsForm((f) => ({ ...f, [field]: v }))} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="SSS No."        value={profile.sss}        mono />
                <FieldRow label="Pag-IBIG No."   value={profile.pagibig}    mono />
                <FieldRow label="PhilHealth No." value={profile.philhealth} mono />
                <FieldRow label="TIN No."        value={profile.tin}        mono />
              </div>
            )}
          </SectionCard>

          {/* ── Requirements / Documents ─────────────────────────────────── */}
          <SectionCard
            title="Requirements & Documents"
            icon={FileText}
            iconColor="text-green-500"
            action={
              canManage && (
                <EditAction
                  editing={editingRequirements}
                  onEdit={() => setEditingRequirements(true)}
                  onSave={saveRequirements}
                  onCancel={() => { setEditingRequirements(false); loadProfile(); }}
                  saving={savingSection === 'requirements'}
                />
              )
            }
          >
            {editingRequirements ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { field: 'nbi_status',              label: 'NBI Clearance'    },
                    { field: 'medcert_status',           label: 'Medical Cert.'    },
                    { field: 'police_clearance_status',  label: 'Police Clearance' },
                    { field: 'contract_status',          label: 'Contract'         },
                  ].map(({ field, label }) => (
                    <EditableField key={field} label={label} value={requirementsForm[field]}
                      options={docOptions}
                      onChange={(v) => setRequirementsForm((f) => ({ ...f, [field]: v }))} />
                  ))}
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <EditableField label="Overall Requirements Status" value={requirementsForm.requirements_status}
                    options={[
                      { value: 'complete',   label: '✓ Complete'   },
                      { value: 'incomplete', label: '✗ Incomplete' },
                      { value: 'pending',    label: '⏳ Pending'    },
                    ]}
                    onChange={(v) => setRequirementsForm((f) => ({ ...f, requirements_status: v }))} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'NBI Clearance',   value: profile.nbi_status              },
                  { label: 'Medical Cert.',    value: profile.medcert_status          },
                  { label: 'Police Clearance', value: profile.police_clearance_status },
                  { label: 'Contract',         value: profile.contract_status         },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{label}</span>
                    <DocStatusBadge status={value} />
                  </div>
                ))}
                <div className="pt-3 mt-1 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Overall Status</span>
                  <ReqBadge status={profile.requirements_status} />
                </div>
              </div>
            )}
          </SectionCard>

        </div>
      </div>
    </DashboardLayout>
  );
}