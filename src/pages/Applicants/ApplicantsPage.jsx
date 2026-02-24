import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { applicantService } from '../../services/applicantService';
import { branchService } from '../../services/branchService';

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('recent'); // newest by default
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchApplicants();
  }, [search, statusFilter, sourceFilter, branchFilter, sortFilter, currentPage]);

  const fetchBranches = async () => {
    try {
      const response = await branchService.getAll();
      setBranches(response.data || response);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchApplicants = async () => {
    try {
      setLoading(true);

      // Map sortFilter to API params
      const sortMap = {
        recent:    { sort_by: 'applied_at', sort_dir: 'desc' },
        oldest:    { sort_by: 'applied_at', sort_dir: 'asc'  },
        name_asc:  { sort_by: 'full_name',  sort_dir: 'asc'  },
        name_desc: { sort_by: 'full_name',  sort_dir: 'desc' },
        today:     { sort_by: 'applied_at', sort_dir: 'desc', date_filter: 'today'      },
        this_week: { sort_by: 'applied_at', sort_dir: 'desc', date_filter: 'this_week'  },
        this_month:{ sort_by: 'applied_at', sort_dir: 'desc', date_filter: 'this_month' },
      };

      const params = {
        page: currentPage,
        search,
        ...(statusFilter && { status: statusFilter }),
        ...(sourceFilter && { source: sourceFilter }),
        ...(branchFilter && { branch_id: branchFilter }),
        ...(sortMap[sortFilter] || sortMap.recent),
      };

      const response = await applicantService.getAll(params);
      setApplicants(response.data);
      setTotalPages(response.last_page);
      setTotalCount(response.total || 0);
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active:    'bg-blue-100 text-blue-800',
      hired:     'bg-green-100 text-green-800',
      rejected:  'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSortLabel = () => {
    const labels = {
      recent:     'Newest First',
      oldest:     'Oldest First',
      name_asc:   'Name A–Z',
      name_desc:  'Name Z–A',
      today:      'Today',
      this_week:  'This Week',
      this_month: 'This Month',
    };
    return labels[sortFilter] || 'Newest First';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
            <p className="text-gray-600">
              {branchFilter
                ? `Branch: ${branches.find((b) => b.id == branchFilter)?.branch_name || ''}`
                : 'All Branches'}
              {totalCount > 0 && (
                <span className="ml-2 text-sm text-gray-400">— {totalCount} total</span>
              )}
            </p>
          </div>
          <Link
            to="/applicants/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Applicant
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by name, email, or phone..."
                />
              </div>
            </div>

            {/* Branch Filter */}
            <div>
              <select
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <select
                value={sourceFilter}
                onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="">All Sources</option>
                <option value="WordPress">WordPress</option>
                <option value="Gmail">Gmail</option>
                <option value="Facebook">Facebook</option>
                <option value="BossJobs">Boss Jobs</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Referral">Referral</option>
              </select>
            </div>

            {/* Sort / Date Filter */}
            <div>
              <select
                value={sortFilter}
                onChange={(e) => { setSortFilter(e.target.value); setCurrentPage(1); }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <optgroup label="Sort by Date">
                  <option value="recent">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </optgroup>
                <optgroup label="Sort by Name">
                  <option value="name_asc">Name A–Z</option>
                  <option value="name_desc">Name Z–A</option>
                </optgroup>
                <optgroup label="Filter by Period">
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                </optgroup>
              </select>
            </div>

          </div>

          {/* Active sort indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span>Showing:</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
              {getSortLabel()}
            </span>
            {(branchFilter || statusFilter || sourceFilter || search) && (
              <button
                onClick={() => {
                  setSearch('');
                  setBranchFilter('');
                  setStatusFilter('');
                  setSourceFilter('');
                  setSortFilter('recent');
                  setCurrentPage(1);
                }}
                className="ml-auto text-xs text-gray-400 hover:text-red-500"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Applicants Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading applicants...</div>
            </div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No applicants found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applicant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Step
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                        onClick={() => setSortFilter(sortFilter === 'recent' ? 'oldest' : 'recent')}
                      >
                        Applied Date {sortFilter === 'recent' ? '↓' : sortFilter === 'oldest' ? '↑' : ''}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applicants.map((applicant) => (
                      <tr key={applicant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {applicant.full_name}
                            </div>
                            <div className="text-sm text-gray-500">{applicant.email}</div>
                            <div className="text-sm text-gray-500">{applicant.phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {applicant.branch?.branch_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {applicant.branch?.client?.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {applicant.current_step?.step_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {applicant.source}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(applicant.status)}`}>
                            {applicant.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(applicant.applied_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/applicants/${applicant.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}