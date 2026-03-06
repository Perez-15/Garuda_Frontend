import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserX, UserCheck, MapPin } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userService } from '../../services/userService';
import { branchService } from '../../services/branchService';
import { useAuth } from '../../contexts/AuthContext';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── User create/edit modal ──────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'talent_acquisition',
  });

  // ── Assign branches modal ───────────────────────────────────────────────────
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchTargetUser, setBranchTargetUser] = useState(null);
  const [allBranches, setAllBranches] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [savingBranches, setSavingBranches] = useState(false);

  const isSuperAdmin = currentUser?.roles?.[0]?.name === 'super_admin';

  useEffect(() => {
    fetchUsers();
    fetchAllBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBranches = async () => {
    try {
      const response = await branchService.getAll();
      setAllBranches(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // ── Create / Edit user ─────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = { name: formData.name, email: formData.email };
        if (formData.password) updateData.password = formData.password;
        await userService.update(editingUser.id, updateData);
      } else {
        await userService.create(formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'talent_acquisition' });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.roles[0]?.name || 'talent_acquisition',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.delete(id);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await userService.updateStatus(user.id, !user.is_active);
      fetchUsers();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const openNewModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'talent_acquisition' });
    setShowModal(true);
  };

  // ── Assign branches ────────────────────────────────────────────────────────

  const openBranchModal = async (user) => {
    setBranchTargetUser(user);
    try {
      // Pre-load their existing assignments
      const response = await userService.getAssignedBranches(user.id);
      const assigned = response.branches || [];
      setSelectedBranchIds(assigned.map((b) => b.id));
    } catch (error) {
      console.error('Error fetching assigned branches:', error);
      setSelectedBranchIds([]);
    }
    setShowBranchModal(true);
  };

  const toggleBranch = (branchId) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSaveBranches = async () => {
    if (!branchTargetUser) return;
    try {
      setSavingBranches(true);
      await userService.assignBranches(branchTargetUser.id, selectedBranchIds);
      setShowBranchModal(false);
      setBranchTargetUser(null);
      fetchUsers(); // refresh to show updated branch counts
    } catch (error) {
      console.error('Error saving branches:', error);
      alert(error.response?.data?.message || 'Failed to save branch assignments');
    } finally {
      setSavingBranches(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getRoleBadgeColor = (role) => {
    const colors = {
      super_admin:        'bg-red-100 text-red-800',
      hr_admin:           'bg-purple-100 text-purple-800',
      talent_acquisition: 'bg-blue-100 text-blue-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role) => {
    const labels = {
      super_admin:        'Admin',
      hr_admin:           'HR Admin',
      talent_acquisition: 'Talent Acquisition',
    };
    return labels[role] || role;
  };

  // Group branches by client for the modal
  const branchesByClient = allBranches.reduce((acc, branch) => {
    const clientName = branch.client?.name || 'Unassigned';
    if (!acc[clientName]) acc[clientName] = [];
    acc[clientName].push(branch);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage system users and their roles</p>
          </div>
          <button
            onClick={openNewModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add User
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch Access</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => {
                    const role = user.roles[0]?.name;
                    const isCurrentUser = user.id === currentUser.id;
                    const isSuperAdminUser = role === 'super_admin';
                    const isThisTA = role === 'talent_acquisition';

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(role)}`}>
                            {getRoleLabel(role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isThisTA ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                {user.branches?.length > 0
                                  ? `${user.branches.length} branch${user.branches.length > 1 ? 'es' : ''}`
                                  : <span className="text-yellow-600 text-xs font-medium">No branches assigned</span>
                                }
                              </span>
                              <button
                                onClick={() => openBranchModal(user)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                              >
                                <MapPin className="h-3 w-3" />
                                Assign
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">All branches</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-30"
                            disabled={isSuperAdminUser && !isSuperAdmin}
                          >
                            <Edit className="h-4 w-4 inline" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`${user.is_active ? 'text-orange-600' : 'text-green-600'} hover:opacity-80 disabled:opacity-30`}
                            disabled={isSuperAdminUser || isCurrentUser}
                          >
                            {user.is_active
                              ? <UserX className="h-4 w-4 inline" />
                              : <UserCheck className="h-4 w-4 inline" />
                            }
                          </button>
                          {isSuperAdmin && !isSuperAdminUser && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Create / Edit User Modal ───────────────────────────────────────── */}
        {showModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {editingUser ? 'Edit User' : 'Add New User'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password {editingUser && '(leave blank to keep current)'}
                        </label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required={!editingUser}
                          placeholder={editingUser ? 'Leave blank to keep current' : ''}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      {!editingUser && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="talent_acquisition">Talent Acquisition</option>
                            {isSuperAdmin && <option value="hr_admin">HR Admin</option>}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {editingUser ? 'Update' : 'Create'}
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

        {/* ── Assign Branches Modal ──────────────────────────────────────────── */}
        {showBranchModal && branchTargetUser && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowBranchModal(false)} />
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">

                  {/* Modal Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Assign Branch Access</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Select which branches <span className="font-medium text-gray-700">{branchTargetUser.name}</span> can manage applicants for.
                    </p>
                  </div>

                  {/* Select All / Clear */}
                  <div className="flex gap-3 mb-3 text-xs">
                    <button
                      onClick={() => setSelectedBranchIds(allBranches.map((b) => b.id))}
                      className="text-blue-600 hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelectedBranchIds([])}
                      className="text-gray-500 hover:underline"
                    >
                      Clear all
                    </button>
                    <span className="ml-auto text-gray-400">
                      {selectedBranchIds.length} of {allBranches.length} selected
                    </span>
                  </div>

                  {/* Branch list grouped by client */}
                  <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {Object.entries(branchesByClient).map(([clientName, clientBranches]) => (
                      <div key={clientName}>
                        <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {clientName}
                        </div>
                        {clientBranches.map((branch) => (
                          <label
                            key={branch.id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBranchIds.includes(branch.id)}
                              onChange={() => toggleBranch(branch.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{branch.branch_name}</span>
                          </label>
                        ))}
                      </div>
                    ))}

                    {allBranches.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        No branches found. Add branches first.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleSaveBranches}
                    disabled={savingBranches}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {savingBranches ? 'Saving...' : 'Save Access'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}