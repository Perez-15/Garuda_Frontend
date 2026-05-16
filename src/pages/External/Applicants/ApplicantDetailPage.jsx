import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Building2, FileText,
  Trash2, CheckCircle2, Loader2, Edit2, X, Save,
  User, UserCheck, Archive, Eye, UserPlus, UserX,
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { applicantService } from '../../../services/applicantService';
import { employeeService  } from '../../../services/hiredService';
import { useAuth          } from '../../../contexts/AuthContext';

// ── Field input helper ────────────────────────────────────────────────────────
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

export default function ApplicantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [applicant, setApplicant]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [note, setNote]             = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [movingStep, setMovingStep] = useState(false);

  // ── Edit state ──────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editForm, setEditForm]   = useState({ full_name: '', email: '', phone: '', source: '' });

  // ── Convert to Employee modal ───────────────────────────────────────────
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting]             = useState(false);
  const [convertForm, setConvertForm] = useState({ date_hired: '', daily_rate: '', remarks: '', position: '' });
  const [convertError, setConvertError]         = useState('');

  useEffect(() => { fetchApplicant(); }, [id]);

  const fetchApplicant = async () => {
    try {
      setLoading(true);
      const response = await applicantService.getById(id);
      setApplicant(response.applicant);
    } catch (error) {
      console.error('Error fetching applicant:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Permission check ────────────────────────────────────────────────────
  const userRole = currentUser?.roles?.[0]?.name;
  const isAdmin  = userRole === 'super_admin' || userRole === 'hr_admin';
  const isTA     = userRole === 'talent_acquisition';

  const int = (v) => parseInt(v, 10);
  const canModify = applicant
    ? isAdmin || (isTA && (int(applicant.created_by?.id) === int(currentUser?.id)))
    : false;

  const handleEditOpen = () => {
    setEditForm({
      full_name: applicant.full_name || '',
      email:     applicant.email    || '',
      phone:     applicant.phone    || '',
      source:    applicant.source   || '',
    });
    setIsEditing(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await applicantService.update(id, editForm);
      setIsEditing(false);
      fetchApplicant();
    } catch (error) {
      console.error('Error updating applicant:', error);
      alert('Failed to update applicant information.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      setAddingNote(true);
      await applicantService.addNote(id, note);
      setNote('');
      fetchApplicant();
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleMoveStep = async (direction) => {
    const steps       = applicant?.workflow?.steps ?? [];
    const currentStep = steps.find((s) => s.id === applicant.current_step_id);

    if (direction === 'previous' && currentStep?.step_order <= 1) {
      alert('Already at the first step.');
      return;
    }
    if (direction === 'next' && currentStep?.is_final_step) {
      alert('Already at the final step.');
      return;
    }

    try {
      setMovingStep(true);
      await applicantService.moveStep(id, direction);
      fetchApplicant();
    } catch (error) {
      console.error('Error moving step:', error);
      alert('Failed to move applicant step.');
    } finally {
      setMovingStep(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const labels = {
      pooling:  'Pooling',
      active:   'In-Process',
      backout:  'Back Out',
    };
    if (!confirm(`Are you sure you want to move this applicant to "${labels[newStatus] || newStatus}"?`)) return;
    try {
      await applicantService.updateStatus(id, newStatus);
      fetchApplicant();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this applicant? This action cannot be undone.')) return;
    try {
      await applicantService.delete(id);
      navigate('/in-process');
    } catch (error) {
      console.error('Error deleting applicant:', error);
      alert('Failed to delete applicant');
    }
  };

  // ── Convert to Employee ─────────────────────────────────────────────────
  const handleConvertChange = (e) => {
    const { name, value } = e.target;
    setConvertForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleConvert = async () => {
    if (!convertForm.date_hired) {
      setConvertError('Date hired is required.');
      return;
    }
    setConvertError('');
    try {
      setConverting(true);
      const res = await employeeService.convertFromApplicant(id, convertForm);
       console.log('Convert response:', res);        // ← add this
    console.log('Employee ID:', res.employee?.id); // ← and this
      setShowConvertModal(false);
      navigate(`/employees/${res.employee.id}`);
    } catch (error) {
      console.error('Error converting applicant:', error);
      setConvertError(
        error?.response?.data?.message || 'Failed to convert applicant to employee.'
      );
    } finally {
      setConverting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      active:  { color: 'bg-blue-100 text-blue-800',   label: 'In-Process' },
      hired:   { color: 'bg-green-100 text-green-800', label: 'Hired'      },
      pooling: { color: 'bg-amber-100 text-amber-800', label: 'Pooling'    },
      backout: { color: 'bg-rose-100 text-rose-800',   label: 'Back Out'   },
    };
    return map[status] ?? { color: 'bg-gray-100 text-gray-800', label: status ?? '—' };
  };

  const getActivityIcon = (type) => {
    const icons = {
      created:       '🟢',
      updated:       '✏️',
      step_change:   '➡️',
      status_change: '🔄',
      note_added:    '💬',
    };
    return icons[type] || '📋';
  };

  // ── Derived workflow state ──────────────────────────────────────────────
  const steps        = applicant?.workflow?.steps ?? [];
  const currentStep  = steps.find((s) => s.id === applicant?.current_step_id);
  const currentOrder = currentStep?.step_order ?? 0;
  const isFirstStep  = currentOrder <= 1;
  const isFinalStep  = currentStep?.is_final_step ?? false;

  const isHired    = applicant?.status === 'hired';
  const isBackedOut = applicant?.status === 'backout';
  const canConvert = applicant?.status === 'active' || applicant?.status === 'pooling';

  // ── Added By helper ─────────────────────────────────────────────────────
  const addedBy = applicant?.createdBy ?? applicant?.created_by;
  const addedByName = addedBy
    ? (typeof addedBy === 'string' ? addedBy : (addedBy.name ?? addedBy.full_name ?? '—'))
    : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading applicant details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!applicant) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Applicant not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const { color: statusColor, label: statusLabel } = getStatusBadge(applicant.status);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{applicant.full_name}</h1>
            <div className="flex items-center flex-wrap gap-3 mt-2">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
              <span className="text-sm text-gray-500">
                Applied on {new Date(applicant.applied_at).toLocaleDateString()}
              </span>
              {addedByName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <UserPlus className="h-3 w-3" />
                  Added by {addedByName}
                </span>
              )}
              {!canModify && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  <Eye className="h-3 w-3" /> View only
                </span>
              )}
            </div>
          </div>

          {canModify && (
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete Applicant"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                {canModify && !isEditing && (
                  <button
                    onClick={handleEditOpen}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
                  >
                    <Edit2 className="h-4 w-4" /> Edit
                  </button>
                )}
                {canModify && isEditing && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {isEditing && canModify ? (
                <form onSubmit={handleEditSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <select value={editForm.source}
                      onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Select source</option>
                      <option value="Website">Website</option>
                      <option value="Gmail">Gmail</option>
                      <option value="Facebook">Facebook</option>
                      <option value="BossJobs">Boss Jobs</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Referral">Referral</option>
                    </select>
                  </div>
                </form>
           ) : (
  <div className="space-y-3">
    <div className="flex items-center text-gray-600">
      <Mail className="h-5 w-5 mr-3 flex-shrink-0" />
      <span>{applicant.email || '—'}</span>
    </div>
    <div className="flex items-center text-gray-600">
      <Phone className="h-5 w-5 mr-3 flex-shrink-0" />
      <span>{applicant.phone || '—'}</span>
    </div>
    <div className="flex items-center text-gray-600">
      <Building2 className="h-5 w-5 mr-3 flex-shrink-0" />
      <span>{applicant.branch?.branch_name} — {applicant.branch?.client?.name}</span>
    </div>
    <div className="flex items-center text-gray-600">
      <FileText className="h-5 w-5 mr-3 flex-shrink-0" />
      <span>Source: {applicant.source || '—'}</span>
    </div>

   {/* Resume */}
    {applicant.resume_url && (
      <div className="flex items-center text-gray-600">
        <FileText className="h-5 w-5 mr-3 flex-shrink-0" />
        {/* ↓ opening <a> tag added here */}
        <a href={applicant.resume_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >
          View Resume
        </a>
      </div>
    )}

    {addedByName && (
      <div className="flex items-center gap-3 pt-3 mt-1 border-t border-gray-100">
        <UserPlus className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        <div>
          <span className="text-xs text-gray-400 block">Added by</span>
          <span className="text-sm font-medium text-gray-700">{addedByName}</span>
        </div>
      </div>
    )}
  </div>
)}
</div>  

            {/* Workflow Progress */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Workflow Progress</h3>
                  {currentStep && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Current: <span className="font-medium text-blue-600">{currentStep.step_name}</span>
                      {' '}({currentOrder} of {steps.length})
                    </p>
                  )}
                </div>
                {applicant.status === 'active' && canModify && (
                  <div className="flex space-x-2">
                    <button onClick={() => handleMoveStep('previous')} disabled={movingStep || isFirstStep}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                      {movingStep ? <Loader2 className="h-4 w-4 animate-spin inline" /> : '← Previous'}
                    </button>
                    <button onClick={() => handleMoveStep('next')} disabled={movingStep || isFinalStep}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                      {movingStep ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Next →'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {steps.map((step, index) => {
                  const isCurrent = step.id === applicant.current_step_id;
                  const isPast    = step.step_order < currentOrder;
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className="flex flex-col items-center self-stretch">
                        {index !== 0 && (
                          <div className={`w-0.5 h-3 ${isPast || isCurrent ? 'bg-green-400' : 'bg-gray-200'}`} />
                        )}
                        <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm
                          ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                            : isPast  ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-400'}`}>
                          {isPast ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                        </div>
                        {index !== steps.length - 1 && (
                          <div className={`w-0.5 flex-1 mt-0.5 ${isPast ? 'bg-green-400' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div className={`py-2 flex-1 ${index !== steps.length - 1 ? 'mb-1' : ''}`}>
                        <p className={`text-sm font-medium ${isCurrent ? 'text-blue-700' : isPast ? 'text-green-700' : 'text-gray-400'}`}>
                          {step.step_name}
                        </p>
                        {isCurrent && <p className="text-xs text-blue-500">Current Step</p>}
                        {step.is_final_step && <p className="text-xs text-gray-400">Final Step</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
              {canModify && (
                <form onSubmit={handleAddNote} className="mb-6">
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Add a note..." />
                  <div className="mt-2 flex justify-end">
                    <button type="submit" disabled={addingNote || !note.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                      {addingNote ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>
                </form>
              )}
              <div className="space-y-4">
                {applicant.notes?.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No notes yet</p>
                ) : (
                  applicant.notes?.map((n) => (
                    <div key={n.id} className="border-l-4 border-blue-400 pl-4 py-2 bg-blue-50 rounded-r-lg">
                      <p className="text-gray-900 text-sm">{n.note}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        By <span className="font-medium text-gray-700">{n.user?.name || 'Unknown'}</span>
                        {' '}· {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column ──────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>

              {/* ── Hired ── */}
              {isHired && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                    <UserCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700 font-medium">This applicant has been hired.</p>
                  </div>
                  {applicant.employee?.id && (
                    <button
                      onClick={() => navigate(`/employees/${applicant.employee.id}`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-green-400 text-green-700 rounded-lg hover:bg-green-50 transition font-medium text-sm"
                    >
                      View Employee Record →
                    </button>
                  )}
                </div>
              )}

              {/* ── Backed Out ── */}
              {isBackedOut && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <UserX className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <p className="text-sm text-rose-700 font-medium">This applicant backed out.</p>
                  </div>
                  {canModify && (
                    <button
                      onClick={() => handleStatusChange('active')}
                      className="w-full px-4 py-2 border-2 border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                    >
                      ↺ Revert to In-Process
                    </button>
                  )}
                </div>
              )}

              {/* ── Active / Pooling actions ── */}
              {!isHired && !isBackedOut && canModify && (
                <div className="space-y-2">
                  {canConvert && (
                    <button
                      onClick={() => setShowConvertModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-sm"
                    >
                      <UserCheck className="h-4 w-4" />
                      Convert to Hired
                    </button>
                  )}

                  {applicant.status !== 'pooling' && (
                    <button
                      onClick={() => handleStatusChange('pooling')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                    >
                      <Archive className="h-4 w-4" />
                      Move to Pooling
                    </button>
                  )}

                  {applicant.status === 'pooling' && (
                    <>
                      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <Archive className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-700">This applicant is in the talent pool.</p>
                      </div>
                      <button
                        onClick={() => handleStatusChange('active')}
                        className="w-full px-4 py-2 border-2 border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                      >
                        ↺ Revert to In-Process
                      </button>
                    </>
                  )}

                  {/* ── Mark as Back Out — always available for active/pooling ── */}
                  <button
                    onClick={() => handleStatusChange('backout')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50 transition text-sm font-medium"
                  >
                    <UserX className="h-4 w-4" />
                    Mark as Back Out
                  </button>
                </div>
              )}

              {/* ── View-only ── */}
              {!isHired && !isBackedOut && !canModify && (
                <div className="flex items-start gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <Eye className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-500">
                    You can view this applicant but only the recruiter who added them can make changes.
                  </p>
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Timeline</h3>
              <div className="space-y-4">
                {applicant.activities?.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No activity yet</p>
                ) : (
                  applicant.activities?.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-600">{activity.user?.name || 'Unknown User'}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleString()}</span>
                        </div>
                        {activity.user?.roles?.[0]?.name && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                            {activity.user.roles[0].name.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Convert to Employee Modal ──────────────────────────────────────── */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !converting && setShowConvertModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Convert to Employee</h3>
                  <p className="text-xs text-gray-400">{applicant.full_name}</p>
                </div>
              </div>
              {!converting && (
                <button onClick={() => setShowConvertModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {applicant.status === 'pooling' && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700">
                This applicant is currently in the talent pool. Converting will mark them as hired and create an employee record.
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
              This will create a new Employee record carrying over the applicant's name, email, contact, branch, and source.
            </div>

            {convertError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">
                {convertError}
              </div>
            )}

            <div className="space-y-3">
              
              <Field
                label="Date Hired" name="date_hired" type="date"
                value={convertForm.date_hired}
                onChange={handleConvertChange}
                required
              />
              <Field
            label="Position"
            name="position"
            type="text"
            value={convertForm.position}
            onChange={handleConvertChange}
            placeholder="e.g. Sales Associate"
            />
              <Field
                label="Daily Rate (₱)" name="daily_rate" type="number"
                value={convertForm.daily_rate}
                onChange={handleConvertChange}
                placeholder="e.g. 650"
              />

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
                <textarea
                  name="remarks"
                  value={convertForm.remarks}
                  onChange={handleConvertChange}
                  rows={2}
                  placeholder="Optional remarks..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowConvertModal(false)}
                disabled={converting}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={converting || !convertForm.date_hired}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {converting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Converting...</>
                  : <><UserCheck className="h-4 w-4" /> Convert to Employee</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}