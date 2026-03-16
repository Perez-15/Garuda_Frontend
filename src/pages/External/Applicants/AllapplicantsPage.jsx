import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, UserCheck, UserCog, Users, Archive,
  CalendarDays, ClipboardList,
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { applicantService } from '../../../services/applicantService';
import { employeeService }  from '../../../services/hiredService';
import { branchService }    from '../../../services/branchService';
import { userService }      from '../../../services/userService';
import { useAuth }          from '../../../contexts/AuthContext';

// ── Status tab config ─────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: '',           label: 'All',        color: 'gray'   },
  { key: 'active',     label: 'In-Process', color: 'blue'   },
  { key: 'hired',      label: 'Hired',      color: 'green'  },
  { key: 'pooling',    label: 'Pooling',    color: 'amber'  },
];

const TAB_STYLES = {
  gray:  { active: 'bg-gray-800 text-white',   inactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',  dot: 'bg-gray-400'  },
  blue:  { active: 'bg-blue-600 text-white',   inactive: 'text-blue-600 hover:bg-blue-50',                       dot: 'bg-blue-500'  },
  green: { active: 'bg-green-600 text-white',  inactive: 'text-green-600 hover:bg-green-50',                     dot: 'bg-green-500' },
  amber: { active: 'bg-amber-500 text-white',  inactive: 'text-amber-600 hover:bg-amber-50',                     dot: 'bg-amber-500' },
};

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:  'bg-blue-100 text-blue-700',
    hired:   'bg-green-100 text-green-700',
    pooling: 'bg-amber-100 text-amber-700',
  };
  const labels = {
    active:  'In-Process',
    hired:   'Hired',
    pooling: 'Pooling',
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${map[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub, to }) {
  const colors = {
    green: { bg: 'bg-green-50',  icon: 'text-green-500',  border: 'border-green-200',  val: 'text-green-700'  },
    blue:  { bg: 'bg-blue-50',   icon: 'text-blue-500',   border: 'border-blue-200',   val: 'text-blue-700'   },
    amber: { bg: 'bg-amber-50',  icon: 'text-amber-500',  border: 'border-amber-200',  val: 'text-amber-700'  },
    red:   { bg: 'bg-red-50',    icon: 'text-red-500',    border: 'border-red-200',    val: 'text-red-700'    },
  };
  const c = colors[color] || colors.blue;
  const inner = (
    <div className={`bg-white rounded-xl shadow-sm border ${c.border} p-5 flex items-center gap-4 hover:shadow-md transition-shadow ${to ? 'cursor-pointer' : ''}`}>
      <div className={`${c.bg} p-3 rounded-lg`}>
        <Icon className={`h-6 w-6 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
        <p className={`text-2xl font-bold ${c.val}`}>
          {value ?? <span className="text-gray-300 animate-pulse">—</span>}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApplicantsPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [applicants, setApplicants]         = useState([]);
  const [branches, setBranches]             = useState([]);
  const [taUsers, setTaUsers]               = useState([]);
  const [applicantStats, setApplicantStats] = useState(null);
  const [employeeStats, setEmployeeStats]   = useState(null);
  const [loading, setLoading]               = useState(true);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [sourceFilter, setSourceFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [sortFilter, setSortFilter]     = useState('recent');
  const [taFilter, setTaFilter]         = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);
  const [perPage, setPerPage]           = useState(15);

  const userRole = currentUser?.roles?.[0]?.name;
  const isTA     = userRole === 'talent_acquisition';
  const isAdmin  = userRole === 'super_admin' || userRole === 'hr_admin';

  useEffect(() => {
    fetchBranches();
    if (isAdmin) fetchTAUsers();
  }, []);

 useEffect(() => {
  fetchApplicants();
}, [debouncedSearch, activeTab, sourceFilter, branchFilter, sortFilter, taFilter, periodFilter, currentPage, perPage]);

useEffect(() => {
  fetchStats();
}, [branchFilter]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTab, sourceFilter, branchFilter, sortFilter, taFilter, periodFilter, perPage]);

  const fetchBranches = async () => {
    try {
      if (isTA) {
        const response = await branchService.getAssignedBranches(currentUser.id);
        setBranches(response.branches || []);
      } else {
        const response = await branchService.getAll();
        setBranches(response.data || response);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchTAUsers = async () => {
    try {
      const response = await userService.getAll({ role: 'talent_acquisition' });
      setTaUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching TA users:', error);
    }
  };

  const sortMap = {
    recent:    { sort_by: 'applied_at', sort_dir: 'desc' },
    oldest:    { sort_by: 'applied_at', sort_dir: 'asc'  },
    name_asc:  { sort_by: 'full_name',  sort_dir: 'asc'  },
    name_desc: { sort_by: 'full_name',  sort_dir: 'desc' },
  };

  const buildParams = useCallback(() => {
    return {
      page:     currentPage,
      per_page: perPage,
      search:   debouncedSearch,
      ...(activeTab    && { status: activeTab }),
      ...(sourceFilter && { source: sourceFilter }),
      ...(branchFilter && { branch_id: branchFilter }),
      ...(taFilter     && { ta_id: taFilter }),
      ...(periodFilter && { period: periodFilter }),
      ...(sortMap[sortFilter] || sortMap.recent),
    };
  }, [debouncedSearch, activeTab, sourceFilter, branchFilter, sortFilter, taFilter, periodFilter, currentPage, perPage]);

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const response = await applicantService.getAll(buildParams());
      setApplicants(response.data);
      setTotalPages(response.last_page);
      setTotalCount(response.total || 0);
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoading(false);
    }
  };

 const fetchStats = async () => {
  try {
    const statsParams = {
      ...(branchFilter && { branch_id: branchFilter }),
    };
    const aStats = await applicantService.getStats(statsParams);
    setApplicantStats(aStats);
    const eStats = await employeeService.getStats(statsParams);
    setEmployeeStats(eStats);
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

  const clearAllFilters = () => {
    setSearchInput('');
    setBranchFilter('');
    setSourceFilter('');
    setSortFilter('recent');
    setTaFilter('');
    setPeriodFilter('');
    setCurrentPage(1);
  };

  // ── Row click — hired goes to employee record, others go to applicant detail
  const handleViewDetails = (applicant) => {
    if (applicant.status === 'hired' && applicant.employee?.id) {
      navigate(`/employees/${applicant.employee.id}`);
    } else {
      navigate(`/applicants/${applicant.id}`);
    }
  };

  const hasActiveFilters = branchFilter || sourceFilter || searchInput || taFilter || periodFilter;
  const selectedTA = taUsers.find(u => u.id == taFilter);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
            <p className="text-gray-600">
              {taFilter && selectedTA
                ? `Filtered by: ${selectedTA.name}`
                : branchFilter
                  ? `Branch: ${branches.find((b) => b.id == branchFilter)?.branch_name || ''}`
                  : isTA ? 'Your Assigned Branches' : 'All Branches'}
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

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
  title="Hired"
  value={applicantStats?.hired}
  icon={UserCheck}
  color="green"
  sub="Total hired"
  to="/employees"
/>
          <StatCard
            title="In-Process"
            value={applicantStats?.in_process}
            icon={UserCog}
            color="blue"
            sub="In pipeline"
          />
          <StatCard
            title="Pooling"
            value={applicantStats?.pooling}
            icon={Archive}
            color="amber"
            sub="Talent pool"
          />
          <StatCard
            title="Incomplete Requirements"
            value={employeeStats?.requirements_incomplete}
            icon={ClipboardList}
            color="red"
            sub="Needs attention"
            to="/employees"
          />
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const styles = TAB_STYLES[tab.color];
            const isActive = activeTab === tab.key;
            const count = tab.key === 'active'
              ? applicantStats?.in_process
              : tab.key === 'hired'
                ? applicantStats?.hired
                : tab.key === 'pooling'
                  ? applicantStats?.pooling
                  : totalCount;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${isActive ? styles.active + ' shadow-sm' : styles.inactive}`}
              >
                {tab.key && (
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? 'bg-white/70' : styles.dot}`} />
                )}
                {tab.label}
                {count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                    ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white shadow rounded-lg p-4 space-y-3">

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

            {/* Search */}
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by name, email, or phone..."
              />
            </div>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{isTA ? 'All My Branches' : 'All Branches'}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Sources</option>
              <option value="WordPress">WordPress</option>
              <option value="Gmail">Gmail</option>
              <option value="Facebook">Facebook</option>
              <option value="BossJobs">Boss Jobs</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Referral">Referral</option>
            </select>

            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <optgroup label="Sort by Date">
                <option value="recent">Newest First</option>
                <option value="oldest">Oldest First</option>
              </optgroup>
              <optgroup label="Sort by Name">
                <option value="name_asc">Name A–Z</option>
                <option value="name_desc">Name Z–A</option>
              </optgroup>
            </select>
          </div>

          {/* Row 2 — Admin only */}
          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-3 border-t border-gray-100">
              <div className="md:col-span-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  Admin Filters
                </span>
                <span className="text-xs text-gray-400">Filter by recruiter or time period</span>
              </div>
              <select
                value={taFilter}
                onChange={(e) => setTaFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Recruiters</option>
                {taUsers.map((ta) => (
                  <option key={ta.id} value={ta.id}>{ta.name}</option>
                ))}
              </select>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
              </select>
            </div>
          )}

          {/* Bottom row — clear + per page */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {taFilter && selectedTA && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium">
                  {selectedTA.name}
                </span>
              )}
              {periodFilter && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium capitalize">
                  {periodFilter.replace('_', ' ')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-red-500">
                  Clear all filters
                </button>
              )}
              <span className="text-xs text-gray-400">Rows per page:</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading applicants...</div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No applicants found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Step</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      {isAdmin && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                      )}
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                        onClick={() => setSortFilter(sortFilter === 'recent' ? 'oldest' : 'recent')}
                      >
                        Applied Date {sortFilter === 'recent' ? '↓' : sortFilter === 'oldest' ? '↑' : ''}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applicants.map((applicant) => (
                      <tr key={applicant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{applicant.full_name}</div>
                          <div className="text-sm text-gray-500">{applicant.email}</div>
                          <div className="text-sm text-gray-500">{applicant.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{applicant.branch?.branch_name}</div>
                          <div className="text-sm text-gray-500">{applicant.branch?.client?.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {applicant.status === 'hired'
                              ? <span className="text-green-600 text-xs font-medium">— Hired —</span>
                              : applicant.current_step?.step_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {applicant.source}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={applicant.status} />
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {applicant.created_by?.name || '—'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(applicant.applied_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(applicant)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                            {applicant.status === 'hired' && (
                              <span className="ml-1 text-xs text-green-500"></span>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                    <span className="ml-2 text-gray-400">({totalCount} total)</span>
                  </p>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}