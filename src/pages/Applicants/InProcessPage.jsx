import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  UserCog,
  ChevronRight,
  CalendarDays,
  Building2,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { applicantService } from '../../services/applicantService';
import { branchService } from '../../services/branchService';
import { useAuth } from '../../contexts/AuthContext';

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Step badge ────────────────────────────────────────────────────────────────
function StepBadge({ stepName }) {
  if (!stepName) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
      {stepName}
    </span>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (!source) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      {source}
    </span>
  );
}

export default function InProcessPage() {
  const { user: currentUser } = useAuth();

  const [applicants, setApplicants] = useState([]);
  const [branches, setBranches]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [branchFilter, setBranchFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sortFilter, setSortFilter]     = useState('recent');
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [perPage, setPerPage]           = useState(15);

  const userRole = currentUser?.roles?.[0]?.name;
  const isTA     = userRole === 'talent_acquisition';

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchApplicants();
  }, [debouncedSearch, branchFilter, sourceFilter, sortFilter, currentPage, perPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, branchFilter, sourceFilter, sortFilter, perPage]);

  const fetchBranches = async () => {
    try {
      if (isTA) {
        const res = await branchService.getAssignedBranches(currentUser.id);
        setBranches(res.branches || []);
      } else {
        const res = await branchService.getAll();
        setBranches(res.data || res);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const sortMap = {
    recent:     { sort_by: 'applied_at', sort_dir: 'desc' },
    oldest:     { sort_by: 'applied_at', sort_dir: 'asc'  },
    name_asc:   { sort_by: 'full_name',  sort_dir: 'asc'  },
    name_desc:  { sort_by: 'full_name',  sort_dir: 'desc' },
  };

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const params = {
        status:   'active',
        page:     currentPage,
        per_page: perPage,
        search:   debouncedSearch,
        // TA users only see applicants they personally added
        ...(isTA && { scope: 'own' }),
        ...(branchFilter && { branch_id: branchFilter }),
        ...(sourceFilter && { source: sourceFilter }),
        ...(sortMap[sortFilter] || sortMap.recent),
      };
      const res = await applicantService.getAll(params);
      setApplicants(res.data);
      setTotalPages(res.last_page);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Error fetching in-process applicants:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setBranchFilter('');
    setSourceFilter('');
    setSortFilter('recent');
    setCurrentPage(1);
  };

  const hasFilters = searchInput || branchFilter || sourceFilter;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCog className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">In-Process</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {isTA ? 'Applicants you added currently in the hiring pipeline' : 'Applicants currently in the hiring pipeline'}
              {total > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  {total} active
                </span>
              )}
            </p>
          </div>

          <Link
            to="/applicants/new"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            + Add Applicant
          </Link>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email or phone..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Branch */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>

            {/* Source */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Row 2 — sort + clear */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Sort:</span>
              {[
                { value: 'recent',    label: 'Newest' },
                { value: 'oldest',    label: 'Oldest' },
                { value: 'name_asc',  label: 'Name A–Z' },
                { value: 'name_desc', label: 'Name Z–A' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                    ${sortFilter === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-600">
                  Clear filters
                </button>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>Rows:</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
              Loading...
            </div>
          ) : applicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <UserCog className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No in-process applicants found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicant</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Step</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 select-none"
                        onClick={() => setSortFilter(sortFilter === 'recent' ? 'oldest' : 'recent')}
                      >
                        Applied {sortFilter === 'recent' ? '↓' : sortFilter === 'oldest' ? '↑' : ''}
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {applicants.map((applicant) => (
                      <tr key={applicant.id} className="hover:bg-gray-50 transition-colors group">

                        {/* Applicant info */}
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-gray-900 text-sm">{applicant.full_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{applicant.email}</div>
                          <div className="text-xs text-gray-400">{applicant.phone}</div>
                        </td>

                        {/* Branch */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            {applicant.branch?.branch_name || '—'}
                          </div>
                          {applicant.branch?.client?.name && (
                            <div className="text-xs text-gray-400 mt-0.5 ml-5">{applicant.branch.client.name}</div>
                          )}
                        </td>

                        {/* Current step */}
                        <td className="px-5 py-3.5">
                          <StepBadge stepName={applicant.current_step?.step_name} />
                        </td>

                        {/* Source */}
                        <td className="px-5 py-3.5">
                          <SourceBadge source={applicant.source} />
                        </td>

                        {/* Applied date */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
                            {new Date(applicant.applied_at).toLocaleDateString('en-PH', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to={`/in-process/${applicant.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ──────────────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500">
                    Page <span className="font-semibold text-gray-700">{currentPage}</span> of{' '}
                    <span className="font-semibold text-gray-700">{totalPages}</span>
                    <span className="ml-1 text-gray-400">({total} total)</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
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