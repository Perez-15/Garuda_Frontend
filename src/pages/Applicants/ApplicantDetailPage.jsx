import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  FileText,
  ChevronRight,
  MessageSquare,
  Trash2,
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

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;

    try {
      setAddingNote(true);
      await applicantService.addNote(id, note);
      setNote('');
      fetchApplicant(); // Refresh data
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleMoveStep = async (direction) => {
    try {
      setMovingStep(true);
      await applicantService.moveStep(id, direction);
      fetchApplicant(); // Refresh data
    } catch (error) {
      console.error('Error moving step:', error);
      alert('Failed to move applicant to next step');
    } finally {
      setMovingStep(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    try {
      await applicantService.updateStatus(id, newStatus);
      fetchApplicant(); // Refresh data
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this applicant? This action cannot be undone.'))
      return;

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
      active: 'bg-blue-100 text-blue-800',
      hired: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading applicant details...</div>
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
        {/* Header */}
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
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                  applicant.status
                )}`}
              >
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
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <Mail className="h-5 w-5 mr-3" />
                  <span>{applicant.email}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="h-5 w-5 mr-3" />
                  <span>{applicant.phone}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Building2 className="h-5 w-5 mr-3" />
                  <span>
                    {applicant.branch?.branch_name} - {applicant.branch?.client?.name}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FileText className="h-5 w-5 mr-3" />
                  <span>Source: {applicant.source}</span>
                </div>
              </div>
            </div>

            {/* Workflow Progress */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Workflow Progress</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleMoveStep('previous')}
                    disabled={movingStep}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleMoveStep('next')}
                    disabled={movingStep}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Next Step
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {applicant.workflow?.steps?.map((step, index) => {
                  const isCurrent = step.id === applicant.current_step_id;
                  const isPast =
                    step.step_order 
                    applicant.workflow?.steps?.find((s) => s.id === applicant.current_step_id)
                      ?.step_order;

                  return (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : isPast
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="ml-4 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            isCurrent ? 'text-blue-900' : 'text-gray-900'
                          }`}
                        >
                          {step.step_name}
                        </p>
                        {isCurrent && <p className="text-xs text-blue-600">Current Step</p>}
                      </div>
                      {!step.is_final_step && (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="mb-6">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a note..."
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={addingNote || !note.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-4">
                {applicant.notes?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                ) : (
                  applicant.notes?.map((note) => (
                    <div key={note.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900">{note.note}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            By {note.user?.name} •{' '}
                            {new Date(note.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Actions & Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleStatusChange('hired')}
                  disabled={applicant.status === 'hired'}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Mark as Hired
                </button>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={applicant.status === 'rejected'}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Mark as Rejected
                </button>
                <button
                  onClick={() => handleStatusChange('withdrawn')}
                  disabled={applicant.status === 'withdrawn'}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Mark as Withdrawn
                </button>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Timeline</h3>
              <div className="space-y-4">
                {applicant.activities?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No activity yet</p>
                ) : (
                  applicant.activities?.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
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