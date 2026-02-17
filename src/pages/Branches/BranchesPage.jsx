import { useState, useEffect } from 'react';
import { Plus, MapPin, Edit, Trash2, GripVertical } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { branchService } from '../../services/branchService';
import { clientService } from '../../services/clientService';
import { useAuth } from '../../contexts/AuthContext';

export default function BranchesPage() {
  const { user } = useAuth();
  const userRole = user?.roles?.[0]?.name;
  const canManage = userRole === 'super_admin' || userRole === 'hr_admin';

  const [branches, setBranches] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    branch_name: '',
    location: '',
    is_active: true,
    contact_person: '',
    
  });

  useEffect(() => {
    fetchData();
  }, []);

 const fetchData = async () => {
    try {
      setLoading(true);
      const [branchesRes, clientsRes] = await Promise.all([
        branchService.getAll(),
        clientService.getAll(),
      ]);
      setBranches(branchesRes.data?.data || branchesRes.data || []);
      setClients(clientsRes.data?.data || clientsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await branchService.update(editingBranch.id, formData);
      } else {
        await branchService.create(formData);
      }
      setShowModal(false);
      setEditingBranch(null);
      setFormData({
        client_id: '',
        branch_name: '',
        location: '',
        is_active: true,
        contact_person: '',
        
      });
      fetchData();
    } catch (error) {
      console.error('Error saving branch:', error);
      alert('Failed to save branch');
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      client_id: branch.client_id,
      branch_name: branch.branch_name,
      location: branch.location || '',
      is_active: branch.is_active,
      contact_person: branch.contact_person || '',
      
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    try {
      await branchService.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Failed to delete branch');
    }
  };

  const openNewModal = () => {
    setEditingBranch(null);
    setFormData({
      client_id: '',
      branch_name: '',
      location: '',
      is_active: true,
      contact_person: '',
      
    });
    setShowModal(true);
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newBranches = [...branches];
    const draggedBranch = newBranches[draggedIndex];
    newBranches.splice(draggedIndex, 1);
    newBranches.splice(index, 0, draggedBranch);
    setBranches(newBranches);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    setDraggedIndex(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
            <p className="text-gray-600">Manage client branches and locations</p>
          </div>
          {canManage && (
            <button
              onClick={openNewModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Branch
            </button>
          )}
        </div>

        {/* Branches List */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">All Branches</h3>
            <p className="text-sm text-gray-500">Drag and drop to reorder branches.</p>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No branches</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new branch.</p>
              {canManage && (
                <button
                  onClick={openNewModal}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  New Branch
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {branches.map((branch, index) => (
                <div
                  key={branch.id}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center p-4 border rounded-lg hover:shadow-md transition ${
                    draggedIndex === index ? 'opacity-50 bg-gray-50' : 'bg-white'
                  }`}
                >
                  {/* Drag Handle */}
                  <div
                    className="flex-shrink-0 mr-4 text-gray-400 cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                  >
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Index Number */}
                  <div className="flex-shrink-0 mr-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">{index + 1}</span>
                    </div>
                  </div>

                  {/* Branch Info */}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{branch.branch_name}</h4>
                    <p className="text-sm text-gray-500">
                      {branch.client?.name}
                      {branch.location && ` • ${branch.location}`}
                    </p>
                    {/* RM and ARM info */}
                    <div className="flex space-x-4 mt-1">
                    <p className="text-xs text-gray-400">
  Contact Person: <span className="text-gray-600">
    {branch.contact_person || 'Not assigned'}
  </span>
</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center space-x-6 mr-6 text-sm text-gray-500">
                    <span>{branch.workflows_count ?? 0} workflows</span>
                    <span>{branch.applicants_count ?? 0} applicants</span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`mr-4 px-2 py-1 text-xs font-medium rounded-full ${
                      branch.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>

                  {/* Actions */}
                  {canManage && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(branch)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(branch.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
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
                      {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                    </h3>
                    <div className="space-y-4">

                      {/* Client */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
                        <select
                          value={formData.client_id}
                          onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Branch Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name *</label>
                        <input
                          type="text"
                          value={formData.branch_name}
                          onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Mang Inasal Taguig"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Taguig City"
                        />
                      </div>

                    {/* Conact Person*/}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Contact Person
    <span className="text-gray-400 font-normal ml-1">(Optional)</span>
  </label>
  <input
    type="text"
    value={formData.contact_person}
    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder="Enter contact person name"
  />
</div>

                      {/* Active */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">Active</label>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {editingBranch ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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