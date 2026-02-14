import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Edit,
  Trash2,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { workflowService } from '../../services/workflowService';
import { workflowStepService } from '../../services/workflowStepService';

export default function WorkflowBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [formData, setFormData] = useState({
    step_name: '',
    description: '',
    is_final_step: false,
  });

  useEffect(() => {
    fetchWorkflow();
  }, [id]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const response = await workflowService.getById(id);
      setWorkflow(response.workflow);
      setSteps(response.workflow.steps || []);
    } catch (error) {
      console.error('Error fetching workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        workflow_id: parseInt(id),
        step_order: editingStep ? editingStep.step_order : steps.length + 1,
      };

      if (editingStep) {
        await workflowStepService.update(editingStep.id, formData);
      } else {
        await workflowStepService.create(data);
      }

      setShowModal(false);
      setEditingStep(null);
      setFormData({ step_name: '', description: '', is_final_step: false });
      fetchWorkflow();
    } catch (error) {
      console.error('Error saving step:', error);
      alert('Failed to save step');
    }
  };

  const handleEdit = (step) => {
    setEditingStep(step);
    setFormData({
      step_name: step.step_name,
      description: step.description || '',
      is_final_step: step.is_final_step,
    });
    setShowModal(true);
  };

  const handleDelete = async (stepId) => {
    if (!confirm('Are you sure you want to delete this step?')) return;
    try {
      await workflowStepService.delete(stepId);
      fetchWorkflow();
    } catch (error) {
      console.error('Error deleting step:', error);
      alert('Failed to delete step');
    }
  };

  const openNewModal = () => {
    setEditingStep(null);
    setFormData({ step_name: '', description: '', is_final_step: false });
    setShowModal(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSteps = [...steps];
    const draggedStep = newSteps[draggedIndex];
    newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, draggedStep);

    setSteps(newSteps);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    try {
      // Update step orders
      const updatedSteps = steps.map((step, index) => ({
        id: step.id,
        step_order: index + 1,
      }));

      await workflowService.reorderSteps(id, updatedSteps);
      setDraggedIndex(null);
      fetchWorkflow();
    } catch (error) {
      console.error('Error reordering steps:', error);
      alert('Failed to reorder steps');
      fetchWorkflow(); // Revert on error
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading workflow...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!workflow) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Workflow not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/workflows')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Workflows
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{workflow.workflow_name}</h1>
              <p className="text-gray-600">
                {workflow.branch?.branch_name} • {workflow.branch?.client?.name}
              </p>
            </div>
            <button
              onClick={openNewModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Step
            </button>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">Workflow Steps</h3>
            <p className="text-sm text-gray-500">
              Drag and drop to reorder steps. Click to edit.
            </p>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">No steps yet. Add your first step!</p>
              <button
                onClick={openNewModal}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add First Step
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center p-4 border rounded-lg cursor-move hover:shadow-md transition ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mr-4 text-gray-400 cursor-grab">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  <div className="flex-shrink-0 mr-4">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-semibold">{index + 1}</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium text-gray-900">{step.step_name}</h4>
                      {step.is_final_step && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Final Step
                        </span>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                    )}
                  </div>

                  {index < steps.length - 1 && (
                    <div className="mx-4">
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(step)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(step.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setShowModal(false)}
              />

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {editingStep ? 'Edit Step' : 'Add New Step'}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Step Name *
                        </label>
                        <input
                          type="text"
                          value={formData.step_name}
                          onChange={(e) =>
                            setFormData({ ...formData, step_name: e.target.value })
                          }
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Initial Interview"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          rows="3"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional description..."
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_final_step}
                          onChange={(e) =>
                            setFormData({ ...formData, is_final_step: e.target.checked })
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">
                          Mark as final step
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {editingStep ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}