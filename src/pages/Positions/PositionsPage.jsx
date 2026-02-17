import { useState, useEffect } from 'react';
import { Plus, Briefcase, Edit, Trash2, MapPin } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { positionService } from '../../services/positionService';
import { clientService } from '../../services/clientService';
import { branchService } from '../../services/branchService';
import { useAuth } from '../../contexts/AuthContext';

export default function PositionsPage() {
  const { user } = useAuth();
  const userRole = user?.roles?.[0]?.name;
  const canManage = userRole === 'super_admin' || userRole === 'hr_admin';

  const [positions, setPositions] = useState([]);
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    branch_id: '',
    title: '',
    description: '',
    slots: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [positionsRes, clientsRes, branchesRes] = await Promise.all([
        positionService.getAll(),
        clientService.getAll(),
        branchService.getAll(),
      ]);

       console.log('Clients response:', clientsRes); // Add this
      console.log('Branches response:', branchesRes); // Add this
      setPositions(positionsRes.data);
      setClients(clientsRes.data);
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
      if (editingPosition) {
        await positionService.update(editingPosition.id, formData);
      } else {
        await positionService.create(formData);
      }
      setShowModal(false);
      setEditingPosition(null);
      setFormData({ client_id: '', branch_id: '', title: '', description: '', slots: '', is_active: true });
      fetchData();
    } catch (error) {
      console.error('Error saving position:', error);
      alert('Failed to save position');
    }
  };

  const handleEdit = (position) => {
    setEditingPosition(position);
    setFormData({
      client_id: position.client_id,
      branch_id: position.branch_id || '',
      title: position.title,
      description: position.description || '',
      slots: position.slots,
      is_active: position.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this position?')) return;
    try {
      await positionService.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting position:', error);
      alert('Failed to delete position');
    }
  };

  const openNewModal = () => {
    setEditingPosition(null);
    setFormData({ client_id: '', branch_id: '', title: '', description: '', slots: '', is_active: true });
    setShowModal(true);
  };

  const getTotalSlots = () => {
    return positions.reduce((sum, pos) => sum + parseInt(pos.slots), 0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Available Positions</h1>
            <p className="text-gray-600">Manage job openings across all clients</p>
          </div>
          {canManage && (
            <button
              onClick={openNewModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Position
            </button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Positions</p>
                <p className="text-3xl font-bold text-gray-900">{positions.length}</p>
              </div>
              <Briefcase className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Slots</p>
                <p className="text-3xl font-bold text-gray-900">{getTotalSlots()}</p>
              </div>
              <Briefcase className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Postings</p>
                <p className="text-3xl font-bold text-gray-900">
                  {positions.filter(p => p.is_active).length}
                </p>
              </div>
              <Briefcase className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Positions Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading positions...</div>
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No positions</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a position.</p>
            {canManage && (
              <div className="mt-6">
                <button
                  onClick={openNewModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  New Position
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.map((position) => (
              <div
                key={position.id}
                className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {position.title}
                      </h3>
                      <p className="text-sm text-gray-600">{position.client?.name}</p>
                      {position.branch && (
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {position.branch.branch_name}
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(position)}
                          className="p-2 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(position.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {position.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {position.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center">
                      <Briefcase className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-lg font-bold text-gray-900">{position.slots}</span>
                      <span className="text-sm text-gray-500 ml-1">
                        {position.slots === 1 ? 'slot' : 'slots'}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        position.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {position.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal - Only for HR Admin and Super Admin */}
        {showModal && canManage && (
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
                      {editingPosition ? 'Edit Position' : 'Add New Position'}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client *
                        </label>
                        <select
                          value={formData.client_id}
                         onChange={(e) => setFormData({ ...formData, client_id: e.target.value, branch_id: '' })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Select a client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Branch (Optional)
                        </label>
                        <select
                          value={formData.branch_id}
                          onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                           <option value="">All branches</option>
  {console.log('All branches:', branches)}
  {console.log('Filtered:', branches.filter(b => String(b.client_id) === String(formData.client_id)))}
  {console.log('Current client_id:', formData.client_id)}
  {branches
    .filter((b) => String(b.client_id) === String(formData.client_id))
    .map((branch) => (
      <option key={branch.id} value={branch.id}>
        {branch.branch_name}
      </option>
    ))}
</select>

                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Position Title *
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., Cashier, Kitchen Staff"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows="3"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Job description..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Slots *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.slots}
                          onChange={(e) => setFormData({ ...formData, slots: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="How many openings?"
                        />
                      </div>

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
                      {editingPosition ? 'Update' : 'Create'}
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