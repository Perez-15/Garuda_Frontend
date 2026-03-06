import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Workflow as WorkflowIcon, Edit, Trash2, Eye } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { workflowService } from '../../services/workflowService';
import { branchService } from '../../services/branchService';

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [formData, setFormData] = useState({
    branch_id: '',
    workflow_name: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [workflowsRes, branchesRes] = await Promise.all([
        workflowService.getAll(),
        branchService.getAll(),
      ]);
      setWorkflows(workflowsRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWorkflow) {
        await workflowService.update(editingWorkflow.id, formData);
      } else {
        await workflowService.create(formData);
      }
      setShowModal(false);
      setEditingWorkflow(null);
      setFormData({ branch_id: '', workflow_name: '', is_active: true });
      fetchData();
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const handleEdit = (workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      branch_id: workflow.branch_id,
      workflow_name: workflow.workflow_name,
      is_active: workflow.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await workflowService.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      alert('Failed to delete workflow');
    }
  };

  const openNewModal = () => {
    setEditingWorkflow(null);
    setFormData({ branch_id: '', workflow_name: '', is_active: true });
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hiring Process</h1>
            <p className="text-gray-600">Manage hiring process for branches</p>
          </div>
          <button
            onClick={openNewModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Process
          </button>
        </div>

        {/* Workflows Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading process...</div>
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <WorkflowIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No process</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new hiring process.
            </p>
            <div className="mt-6">
              <button
                onClick={openNewModal}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                New Process
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <WorkflowIcon className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/workflows/${workflow.id}`)}
                        className="p-2 text-gray-400 hover:text-purple-600"
                        title="View Steps"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(workflow)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(workflow.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {workflow.workflow_name}
                  </h3>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Branch:</span>{' '}
                      {workflow.branch?.branch_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Client:</span>{' '}
                      {workflow.branch?.client?.name}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-gray-500">
                      {workflow.steps_count}{' '}
                      {workflow.steps_count === 1 ? 'step' : 'steps'}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        workflow.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/workflows/${workflow.id}`)}
                    className="mt-4 w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-medium"
                  >
                    Manage Steps
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
                      {editingWorkflow ? 'Edit Workflow' : 'Add New Workflow'}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Branch *
                        </label>
                        <select
                          value={formData.branch_id}
                          onChange={(e) =>
                            setFormData({ ...formData, branch_id: e.target.value })
                          }
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a branch</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.branch_name} - {branch.client?.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Process Name *
                        </label>
                        <input
                          type="text"
                          value={formData.workflow_name}
                          onChange={(e) =>
                            setFormData({ ...formData, workflow_name: e.target.value })
                          }
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Standard Hiring Process"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) =>
                            setFormData({ ...formData, is_active: e.target.checked })
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">Active</label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {editingWorkflow ? 'Update' : 'Create'}
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