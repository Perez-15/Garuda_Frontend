import { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, UserX, UserCheck, MapPin,
  X, Save, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userService }   from '../../services/userService';
import { branchService } from '../../services/branchService';
import { useAuth }       from '../../contexts/AuthContext';

// ── Constants ──────────────────────────────────────────────────────────────────
const DOC_STATUS_OPTIONS = [
  { value: '',             label: 'Not set'      },
  { value: 'submitted',    label: 'Submitted'    },
  { value: 'pending',      label: 'Pending'      },
  { value: 'not_required', label: 'Not Required' },
];

const REQ_STATUS_OPTIONS = [
  { value: '',           label: 'Not set'    },
  { value: 'complete',   label: 'Complete'   },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'pending',    label: 'Pending'    },
];

const REQ_BADGE = {
  complete:   'bg-green-100 text-green-700',
  incomplete: 'bg-red-100 text-red-700',
  pending:    'bg-yellow-100 text-yellow-700',
};

// ── Collapsible section header ─────────────────────────────────────────────────
function SectionHeader({ title, expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 border-t border-gray-100 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition"
    >
      {title}
      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser } = useAuth();

  // FIX 1: Define both role flags + combined canManage
  const isSuperAdmin = currentUser?.roles?.[0]?.name === 'super_admin';
  const isHrAdmin    = currentUser?.roles?.[0]?.name === 'hr_admin';
  const canManage    = isSuperAdmin || isHrAdmin;

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);

  // ── User modal ─────────────────────────────────────────────────────────────
  const [showModal, setShowModal]     = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving]           = useState(false);

  const [showDocs, setShowDocs]     = useState(false);
  const [showGovIds, setShowGovIds] = useState(false);

  const emptyForm = {
    name: '', email: '', password: '', role: 'talent_acquisition',
    contact_number: '', date_hired: '',
    nbi_status: '', medcert_status: '',
    police_clearance_status: '', contract_status: '',
    sss: '', pagibig: '', philhealth: '', tin: '',
    requirements_status: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  // ── Assign branches modal ──────────────────────────────────────────────────
  const [showBranchModal, setShowBranchModal]     = useState(false);
  const [branchTargetUser, setBranchTargetUser]   = useState(null);
  const [allBranches, setAllBranches]             = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [savingBranches, setSavingBranches]       = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAllBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAll();
      setUsers(response.data?.data || response.data || []);
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

  // ── Create / Edit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        // FIX 2: HR Admin cannot change roles — strip role from payload
        if (!isSuperAdmin) delete updateData.role;
        await userService.update(editingUser.id, updateData);
      } else {
        // FIX 3: use userService.store to match UserController@store
        await userService.create(formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData(emptyForm);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name:                     user.name              || '',
      email:                    user.email             || '',
      password:                 '',
      role:                     user.roles?.[0]?.name  || 'talent_acquisition',
      contact_number:           user.contact_number    || '',
      date_hired:               user.date_hired        || '',
      nbi_status:               user.nbi_status        || '',
      medcert_status:           user.medcert_status    || '',
      police_clearance_status:  user.police_clearance_status || '',
      contract_status:          user.contract_status   || '',
      sss:                      user.sss               || '',
      pagibig:                  user.pagibig           || '',
      philhealth:               user.philhealth        || '',
      tin:                      user.tin               || '',
      requirements_status:      user.requirements_status || '',
    });
    setShowDocs(!!(user.nbi_status || user.medcert_status || user.police_clearance_status || user.contract_status));
    setShowGovIds(!!(user.sss || user.pagibig || user.philhealth || user.tin));
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setShowDocs(false);
    setShowGovIds(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Assign branches ────────────────────────────────────────────────────────
  const openBranchModal = async (user) => {
    setBranchTargetUser(user);
    try {
      const response = await userService.getAssignedBranches(user.id);
      const assigned = response.branches || [];
      setSelectedBranchIds(assigned.map(b => b.id));
    } catch (error) {
      console.error('Error fetching assigned branches:', error);
      setSelectedBranchIds([]);
    }
    setShowBranchModal(true);
  };

  const toggleBranch = (branchId) => {
    setSelectedBranchIds(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
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
      fetchUsers();
    } catch (error) {
      console.error('Error saving branches:', error);
      alert(error.response?.data?.message || 'Failed to save branch assignments');
    } finally {
      setSavingBranches(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getRoleBadgeColor = (role) => ({
    super_admin:        'bg-red-100 text-red-800',
    hr_admin:           'bg-purple-100 text-purple-800',
    talent_acquisition: 'bg-blue-100 text-blue-800',
    accounting:         'bg-yellow-100 text-yellow-800',
    marketing:          'bg-pink-100 text-pink-800',
  }[role] || 'bg-gray-100 text-gray-800');

  const getRoleLabel = (role) => ({
    super_admin:        'Super Admin',
    hr_admin:           'HR Admin',
    talent_acquisition: 'Talent Acquisition',
    accounting:         'Accounting',
    marketing:          'Marketing',
  }[role] || role);

  const branchesByClient = allBranches.reduce((acc, branch) => {
    const clientName = branch.client?.name || 'Unassigned';
    if (!acc[clientName]) acc[clientName] = [];
    acc[clientName].push(branch);
    return acc;
  }, {});

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage system users and their roles</p>
          </div>
          {canManage && (
            <button
              onClick={openNewModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" /> Add User
            </button>
          )}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Hired</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requirements</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch Access</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {canManage && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => {
                    const role             = user.roles?.[0]?.name;
                    const isCurrentUser    = user.id === currentUser.id;
                    const isSuperAdminUser = role === 'super_admin';
                    const isHrAdminUser    = role === 'hr_admin';
                    const isTA             = role === 'talent_acquisition';

                    // FIX 4: HR Admin cannot edit/delete super_admin or other hr_admin accounts
                    const canEditThis   = isSuperAdmin || (!isSuperAdminUser && !isHrAdminUser);
                    const canDeleteThis = isSuperAdmin && !isSuperAdminUser;
                    const canToggleThis = canManage && !isSuperAdminUser && !isCurrentUser;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-blue-400 font-normal">(you)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(role)}`}>
                            {getRoleLabel(role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.contact_number || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.date_hired
                            ? new Date(user.date_hired).toLocaleDateString()
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.requirements_status ? (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${REQ_BADGE[user.requirements_status] || 'bg-gray-100 text-gray-600'}`}>
                              {user.requirements_status.charAt(0).toUpperCase() + user.requirements_status.slice(1)}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isTA ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                {user.branches?.length > 0
                                  ? `${user.branches.length} branch${user.branches.length > 1 ? 'es' : ''}`
                                  : <span className="text-yellow-600 text-xs font-medium">None assigned</span>
                                }
                              </span>
                              {canManage && (
                                <button
                                  onClick={() => openBranchModal(user)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                                >
                                  <MapPin className="h-3 w-3" /> Assign
                                </button>
                              )}
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
                        {canManage && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleEdit(user)}
                              disabled={!canEditThis}
                              title={!canEditThis ? 'You cannot edit this account' : 'Edit'}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-30"
                            >
                              <Edit className="h-4 w-4 inline" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={!canToggleThis}
                              title={
                                isCurrentUser    ? 'Cannot deactivate yourself'      :
                                isSuperAdminUser ? 'Cannot deactivate Super Admin'   : ''
                              }
                              className={`${user.is_active ? 'text-orange-600' : 'text-green-600'} hover:opacity-80 disabled:opacity-30`}
                            >
                              {user.is_active
                                ? <UserX className="h-4 w-4 inline" />
                                : <UserCheck className="h-4 w-4 inline" />
                              }
                            </button>
                            {canDeleteThis && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4 inline" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed z-20 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => !saving && setShowModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">
                  {editingUser ? `Edit — ${editingUser.name}` : 'Add New User'}
                </h3>
                {!saving && (
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                  {/* Account */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text" name="name" value={formData.name} onChange={handleChange} required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email" name="email" value={formData.email} onChange={handleChange} required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password{' '}
                      {editingUser
                        ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                        : <span className="text-red-400">*</span>
                      }
                    </label>
                    <input
                      type="password" name="password" value={formData.password} onChange={handleChange}
                      required={!editingUser}
                      placeholder={editingUser ? 'Leave blank to keep current' : 'Min 8 characters'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* FIX 5: Role — Super Admin sees all options, HR Admin sees limited options
                      Role is also disabled when HR Admin is editing (cannot change roles) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="role" value={formData.role} onChange={handleChange} required
                      disabled={!!editingUser && !isSuperAdmin}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="talent_acquisition">Talent Acquisition</option>
                      <option value="accounting">Accounting</option>
                      <option value="marketing">Marketing</option>
                      {isSuperAdmin && <option value="hr_admin">HR Admin</option>}
                      {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                    </select>
                    {!!editingUser && !isSuperAdmin && (
                      <p className="text-xs text-gray-400 mt-1">Only Super Admin can change roles.</p>
                    )}
                  </div>

                  {/* Personal Info */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2 border-t border-gray-100">
                    Personal Info
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                      <input
                        type="text" name="contact_number" value={formData.contact_number} onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Hired</label>
                      <input
                        type="date" name="date_hired" value={formData.date_hired} onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Documents (collapsible) */}
                  <SectionHeader title="Documents & Clearances" expanded={showDocs} onToggle={() => setShowDocs(v => !v)} />
                  {showDocs && (
                    <div className="space-y-3">
                      {[
                        { name: 'nbi_status',              label: 'NBI Clearance'    },
                        { name: 'medcert_status',          label: 'Medical Cert'     },
                        { name: 'police_clearance_status', label: 'Police Clearance' },
                        { name: 'contract_status',         label: 'Contract'         },
                      ].map(doc => (
                        <div key={doc.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{doc.label}</label>
                          <select
                            name={doc.name} value={formData[doc.name]} onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {DOC_STATUS_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Overall Requirements Status</label>
                        <select
                          name="requirements_status" value={formData.requirements_status} onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {REQ_STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Government IDs (collapsible) */}
                  <SectionHeader title="Government IDs" expanded={showGovIds} onToggle={() => setShowGovIds(v => !v)} />
                  {showGovIds && (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: 'sss',        label: 'SSS'       },
                        { name: 'pagibig',    label: 'Pag-IBIG'  },
                        { name: 'philhealth', label: 'PhilHealth' },
                        { name: 'tin',        label: 'TIN'        },
                      ].map(gov => (
                        <div key={gov.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{gov.label}</label>
                          <input
                            type="text" name={gov.name} value={formData[gov.name]} onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
                  <button
                    type="button" onClick={() => setShowModal(false)} disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                      : <><Save className="h-4 w-4" /> {editingUser ? 'Save Changes' : 'Create User'}</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Branches Modal ──────────────────────────────────────────────── */}
      {showBranchModal && branchTargetUser && (
        <div className="fixed z-20 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowBranchModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">

              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">Assign Branch Access</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Select branches for <span className="font-medium text-gray-700">{branchTargetUser.name}</span>
                </p>
              </div>

              <div className="px-6 py-4">
                <div className="flex gap-3 mb-3 text-xs">
                  <button onClick={() => setSelectedBranchIds(allBranches.map(b => b.id))} className="text-blue-600 hover:underline">
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setSelectedBranchIds([])} className="text-gray-500 hover:underline">
                    Clear all
                  </button>
                  <span className="ml-auto text-gray-400">
                    {selectedBranchIds.length} of {allBranches.length} selected
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {Object.entries(branchesByClient).map(([clientName, clientBranches]) => (
                    <div key={clientName}>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {clientName}
                      </div>
                      {clientBranches.map(branch => (
                        <label key={branch.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer">
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

              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBranches} disabled={savingBranches}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingBranches
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                    : 'Save Access'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}