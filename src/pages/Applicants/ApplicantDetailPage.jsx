import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  FileText,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Loader2,
  Edit2,
  X,
  Save,
  User,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { applicantService } from '../../services/applicantService';

export default function ApplicantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [movingStep, setMovingStep] = useState(false);

  // ── Edit state ──
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    source: '',
  });

  useEffect(() => {
    fetchApplicant();
  }, [id]);

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

  const handleEditOpen = () => {
    setEditForm({
      full_name: applicant.full_name || '',
      email:     applicant.email    || '',
      phone:     applicant.phone    || '',
      source:    applicant.source   || '',
    });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
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
    const steps = applicant?.workflow?.steps ?? [];
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
    if (!confirm(`Are you sure you want to change status to "${newStatus}"?`)) return;
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
      navigate('/applicants');
    } catch (error) {
      console.error('Error deleting applicant:', error);
      alert('Failed to delete applicant');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active:    'bg-blue-100 text-blue-800',
      hired:     'bg-green-100 text-green-800',
      rejected:  'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800',
    };
    return colors[status] ?? 'bg-gray-100 text-gray-800';
  };

  const getActivityIcon = (type) => {
    const icons = {
      created:      '🟢',
      updated:      '✏️',
      step_change:  '➡️',
      status_change:'🔄',
      note_added:   '💬',
    };
    return icons[type] || '📋';
  };

  // ─── Derived workflow state ────────────────────────────────────────────────
  const steps = applicant?.workflow?.steps ?? [];
  const currentStep = steps.find((s) => s.id === applicant?.current_step_id);
  const currentOrder = currentStep?.step_order ?? 0;
  const isFirstStep = currentOrder <= 1;
  const isFinalStep = currentStep?.is_final_step ?? false;

  // ─── Loading / not found ───────────────────────────────────────────────────
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

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex justify-between items-start">
          <div>
            <button
              onClick={() => navigate('/applicants')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Applicants
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{applicant.full_name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(applicant.status)}`}>
                {applicant.status}
              </span>
              <span className="text-sm text-gray-500">
                Applied on {new Date(applicant.applied_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            title="Delete Applicant"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>

                {/* ── Edit / Save / Cancel buttons ── */}
                {!isEditing ? (
                  <button
                    onClick={handleEditOpen}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditCancel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {saving
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Save className="h-4 w-4" />}
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {/* ── View mode ── */}
              {!isEditing ? (
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
                    <span>
                      {applicant.branch?.branch_name} — {applicant.branch?.client?.name}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FileText className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>Source: {applicant.source || '—'}</span>
                  </div>
                </div>
              ) : (
                /* ── Edit mode ── */
                <form onSubmit={handleEditSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <select
                      value={editForm.source}
                      onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select source</option>
                      <option value="WordPress">WordPress</option>
                      <option value="Gmail">Gmail</option>
                      <option value="Facebook">Facebook</option>
                      <option value="BossJobs">Boss Jobs</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Referral">Referral</option>
                    </select>
                  </div>
                </form>
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
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleMoveStep('previous')}
                    disabled={movingStep || isFirstStep}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {movingStep ? <Loader2 className="h-4 w-4 animate-spin inline" /> : '← Previous'}
                  </button>
                  <button
                    onClick={() => handleMoveStep('next')}
                    disabled={movingStep || isFinalStep}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {movingStep ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Next →'}
                  </button>
                </div>
              </div>

              {/* Step list */}
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
                            : 'bg-gray-100 text-gray-400'}`}
                        >
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
              <form onSubmit={handleAddNote} className="mb-6">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add a note..."
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={addingNote || !note.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </button>
                </div>
              </form>
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

          {/* ── Right Column ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleStatusChange('hired')}
                  disabled={applicant.status === 'hired'}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ✓ Mark as Hired
                </button>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={applicant.status === 'rejected'}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ✕ Mark as Rejected
                </button>
                <button
                  onClick={() => handleStatusChange('withdrawn')}
                  disabled={applicant.status === 'withdrawn'}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ↩ Mark as Withdrawn
                </button>
                {applicant.status !== 'active' && (
                  <>
                    <hr className="border-gray-200 my-1" />
                    <button
                      onClick={() => handleStatusChange('active')}
                      className="w-full px-4 py-2 border-2 border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                    >
                      ↺ Revert to Active
                    </button>
                  </>
                )}
              </div>
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
                      {/* Icon */}
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm">
                        {getActivityIcon(activity.activity_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>

                        {/* ── Who did it + when ── */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-600">
                            {activity.user?.name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Role badge if available */}
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
    </DashboardLayout>
  );
}