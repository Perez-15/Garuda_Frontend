import { useState, useEffect } from 'react';
import {
  Download, TrendingUp, Users, CheckCircle,
  XCircle, Briefcase, RefreshCw,
  Calendar, Building2, Trophy, Star, Award,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { reportService } from '../../services/reportService';
import { clientService } from '../../services/clientService';
import { branchService } from '../../services/branchService';

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }) {
  const palette = {
    blue:   { border: 'border-blue-500',   bg: 'bg-blue-50',   icon: 'text-blue-500',   val: 'text-blue-700'   },
    green:  { border: 'border-green-500',  bg: 'bg-green-50',  icon: 'text-green-500',  val: 'text-green-700'  },
    yellow: { border: 'border-yellow-500', bg: 'bg-yellow-50', icon: 'text-yellow-500', val: 'text-yellow-700' },
    red:    { border: 'border-red-500',    bg: 'bg-red-50',    icon: 'text-red-500',    val: 'text-red-700'    },
    purple: { border: 'border-purple-500', bg: 'bg-purple-50', icon: 'text-purple-500', val: 'text-purple-700' },
    amber:  { border: 'border-amber-500',  bg: 'bg-amber-50',  icon: 'text-amber-500',  val: 'text-amber-700'  },
  };
  const p = palette[color] || palette.blue;
  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${p.border} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className={`text-3xl font-bold ${p.val}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`${p.bg} p-2.5 rounded-lg`}>
          <Icon className={`h-5 w-5 ${p.icon}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, iconColor = 'text-gray-500', children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Horizontal Bar ────────────────────────────────────────────────────────────
function HBar({ label, count, total, color = 'bg-blue-500', rank }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
  return (
    <div className="flex items-center gap-3">
      {rank !== undefined && (
        <span className="w-5 text-xs font-bold text-gray-300 text-right flex-shrink-0">#{rank}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
          <span className="text-xs font-bold text-gray-500 ml-2 flex-shrink-0">
            {count} <span className="text-gray-300">({pct}%)</span>
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Recruiter Row ─────────────────────────────────────────────────────────────
function RecruiterRow({ recruiter, rank, maxAdded }) {
  const rankConfig = {
    1: { bg: 'bg-yellow-400', text: 'text-white', icon: Trophy },
    2: { bg: 'bg-gray-300',   text: 'text-white', icon: Award  },
    3: { bg: 'bg-orange-400', text: 'text-white', icon: Star   },
  };
  const rc      = rankConfig[rank] || { bg: 'bg-gray-100', text: 'text-gray-500', icon: Users };
  const RankIcon = rc.icon;
  const barPct  = maxAdded > 0 ? ((recruiter.total_added / maxAdded) * 100).toFixed(0) : 0;

  const initials = recruiter.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
      <div className={`w-7 h-7 rounded-full ${rc.bg} ${rc.text} flex items-center justify-center flex-shrink-0 text-xs font-bold`}>
        {rank <= 3 ? <RankIcon className="h-3.5 w-3.5" /> : rank}
      </div>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{recruiter.name}</p>
          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
            <span className="text-xs text-gray-400">
              <span className="font-bold text-gray-700">{recruiter.total_added}</span> added
            </span>
            <span className="text-xs text-gray-400">
              <span className="font-bold text-green-600">{recruiter.total_hired}</span> hired
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              recruiter.conversion_rate >= 30 ? 'bg-green-50 text-green-700'
              : recruiter.conversion_rate >= 15 ? 'bg-yellow-50 text-yellow-700'
              : 'bg-gray-100 text-gray-500'
            }`}>
              {recruiter.conversion_rate}%
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Date Preset Button ────────────────────────────────────────────────────────
function PresetBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [loading, setLoading]               = useState(true);
  const [activePreset, setActivePreset]     = useState('this_month');
  const [dateRange, setDateRange]           = useState({ start_date: '', end_date: '' });
  const [filters, setFilters]               = useState({ client_id: '', branch_id: '' });

  const [sourceData, setSourceData]         = useState([]);
  const [statusData, setStatusData]         = useState([]);
  const [branchData, setBranchData]         = useState([]);
  const [recruitersData, setRecruitersData] = useState([]);

  const [clients, setClients]   = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchFilterOptions();
    applyPreset('this_month');
  }, []);

  // Guard: only fetch when dates are set
  useEffect(() => {
    if (!dateRange.start_date || !dateRange.end_date) return;
    fetchAllReports();
  }, [dateRange, filters]);

  // ── Filter options ────────────────────────────────────────────────────────────
  const fetchFilterOptions = async () => {
    try {
      const [clientsRes, branchesRes] = await Promise.all([
        clientService.getAll(),
        branchService.getAll(),
      ]);
      // Handle both paginated ({ data: { data: [] } }) and plain ({ data: [] }) responses
      setClients(clientsRes.data?.data   || clientsRes.data   || []);
      setBranches(branchesRes.data?.data || branchesRes.data  || branchesRes || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // ── Date presets ──────────────────────────────────────────────────────────────
  const applyPreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    let start = '', end = '';

    if (preset === 'today') {
      start = end = today.toISOString().split('T')[0];
    } else if (preset === 'this_week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      start = startOfWeek.toISOString().split('T')[0];
      end   = today.toISOString().split('T')[0];
    } else if (preset === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      end   = today.toISOString().split('T')[0];
    } else if (preset === 'this_quarter') {
      const q = Math.floor(today.getMonth() / 3);
      start = new Date(today.getFullYear(), q * 3, 1).toISOString().split('T')[0];
      end   = today.toISOString().split('T')[0];
    } else if (preset === 'this_year') {
      start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      end   = today.toISOString().split('T')[0];
    } else {
      // 'custom' — don't change dates, just update active button
      return;
    }

    setDateRange({ start_date: start, end_date: end });
  };

  // ── Fetch all report data ─────────────────────────────────────────────────────
  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const params = { ...dateRange, ...filters };
      const [sourceRes, statusRes, branchRes, recruitersRes] = await Promise.all([
        reportService.applicantsBySource(params),
        reportService.applicantsByStatus(params),
        reportService.applicantsByBranch(params),
        reportService.topRecruiters(params),
      ]);
      setSourceData(sourceRes.data   || []);
      setStatusData(statusRes.data   || []);
      setBranchData(branchRes.data   || []);
      setRecruitersData(recruitersRes.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Export PDF ────────────────────────────────────────────────────────────────
  // NOTE: reportService.export() must pass responseType: 'blob' for PDF to work
  const handleExport = async () => {
    try {
      const response = await reportService.export({ ...dateRange, ...filters });
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `garuda-report-${dateRange.start_date}-to-${dateRange.end_date}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  // ── Derived metrics ───────────────────────────────────────────────────────────
  const totalApplicants = sourceData.reduce((s, i) => s + parseInt(i.count || 0), 0);
  const hired    = statusData.find((s) => s.status === 'hired')?.count   || 0;
  const active   = statusData.find((s) => s.status === 'active')?.count  || 0;
  const rejected = statusData.find((s) => s.status === 'rejected')?.count|| 0;
  const pooling  = statusData.find((s) => s.status === 'pooling')?.count || 0;

  const conversionRate = totalApplicants > 0
    ? ((hired / totalApplicants) * 100).toFixed(1) : '0.0';

  const maxBranch = Math.max(...branchData.map((b) => parseInt(b.count || 0)), 1);
  const maxAdded  = Math.max(...recruitersData.map((r) => parseInt(r.total_added || 0)), 1);

  const sourceColors = [
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
    'bg-sky-500',  'bg-cyan-500',   'bg-teal-500',
  ];

  // ── Status color maps ─────────────────────────────────────────────────────────
  const statusColorMap = {
    active:   'bg-yellow-500',
    hired:    'bg-green-500',
    rejected: 'bg-red-500',
    withdrawn:'bg-gray-400',
    pooling:  'bg-amber-400',  // ← added
  };

  const statusPillMap = {
    active:   'bg-yellow-50 text-yellow-700 border-yellow-200',
    hired:    'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    withdrawn:'bg-gray-50 text-gray-600 border-gray-200',
    pooling:  'bg-amber-50 text-amber-700 border-amber-200', // ← added
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">Recruitment performance insights for Garuda</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllReports}
              disabled={!dateRange.start_date || !dateRange.end_date}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={!dateRange.start_date || !dateRange.end_date}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Export PDF
            </button>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Period:</span>
            {[
              { key: 'today',        label: 'Today'        },
              { key: 'this_week',    label: 'This Week'    },
              { key: 'this_month',   label: 'This Month'   },
              { key: 'this_quarter', label: 'This Quarter' },
              { key: 'this_year',    label: 'This Year'    },
              { key: 'custom',       label: 'Custom'       },
            ].map((p) => (
              <PresetBtn
                key={p.key}
                label={p.label}
                active={activePreset === p.key}
                onClick={() => applyPreset(p.key)}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => {
                setActivePreset('custom');
                setDateRange({ ...dateRange, start_date: e.target.value });
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => {
                setActivePreset('custom');
                setDateRange({ ...dateRange, end_date: e.target.value });
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filters.client_id}
              onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={filters.branch_id}
              onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>

          {(filters.client_id || filters.branch_id) && (
            <button
              onClick={() => setFilters({ client_id: '', branch_id: '' })}
              className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium"
            >
              × Clear all filters
            </button>
          )}
        </div>

        {/* ── Loading skeleton ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-28 shadow-sm" />
            ))}
          </div>
        ) : (
          <>
            {/* ── KPI Cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <KpiCard label="Total Applicants" value={totalApplicants}      icon={Users}       color="blue"   sub="In selected period" />
              <KpiCard label="Hired"            value={hired}                icon={CheckCircle} color="green"  sub="Successfully placed" />
              <KpiCard label="In-Process"       value={active}               icon={Briefcase}   color="yellow" sub="Active in pipeline" />
              <KpiCard label="Pooling"          value={pooling}              icon={Users}       color="amber"  sub="In talent pool" />
              <KpiCard label="Rejected"         value={rejected}             icon={XCircle}     color="red"    sub="Not qualified" />
              <KpiCard label="Conversion Rate"  value={`${conversionRate}%`} icon={TrendingUp}  color="purple" sub={`${hired} hired of ${totalApplicants}`} />
            </div>

            {/* ── Row 1: Source + Status ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Applicants by Source */}
              <SectionCard title="Applicants by Source" icon={TrendingUp} iconColor="text-blue-500">
                {sourceData.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">No data available</p>
                ) : (
                  <div className="space-y-4">
                    {[...sourceData]
                      .sort((a, b) => b.count - a.count)
                      .map((item, i) => (
                        <HBar
                          key={item.source}
                          label={item.source || 'Unknown'}
                          count={item.count}
                          total={totalApplicants}
                          color={sourceColors[i % sourceColors.length]}
                          rank={i + 1}
                        />
                      ))}
                  </div>
                )}
              </SectionCard>

              {/* Applicants by Status */}
              <SectionCard title="Applicants by Status" icon={CheckCircle} iconColor="text-green-500">
                {statusData.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">No data available</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {statusData.map((item) => (
                        <HBar
                          key={item.status}
                          label={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          count={item.count}
                          total={totalApplicants}
                          color={statusColorMap[item.status] || 'bg-gray-400'}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-50">
                      {statusData.map((item) => (
                        <div
                          key={item.status}
                          className={`flex justify-between items-center px-3 py-2 rounded-lg border text-xs font-semibold
                            ${statusPillMap[item.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
                        >
                          <span className="capitalize">{item.status}</span>
                          <span className="text-base font-bold">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </SectionCard>
            </div>

            {/* ── Row 2: Branch Performance ──────────────────────────────────── */}
            <SectionCard title="Branch Performance" icon={Building2} iconColor="text-purple-500">
              {branchData.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No data available</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  {[...branchData]
                    .sort((a, b) => b.count - a.count)
                    .map((item, i) => (
                      <div key={item.branch_name} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${i === 0 ? 'bg-yellow-400 text-white'
                          : i === 1 ? 'bg-gray-300 text-gray-700'
                          : i === 2 ? 'bg-orange-400 text-white'
                          : 'bg-gray-100 text-gray-500'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-semibold text-gray-700 truncate">{item.branch_name}</span>
                            <span className="text-xs font-bold text-gray-500 ml-2 flex-shrink-0">
                              {item.count}{' '}
                              <span className="text-gray-300">
                                ({maxBranch > 0 ? ((item.count / maxBranch) * 100).toFixed(0) : 0}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all duration-700"
                              style={{ width: `${maxBranch > 0 ? (item.count / maxBranch) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </SectionCard>

            {/* ── Row 3: Top Recruiters ──────────────────────────────────────── */}
            <SectionCard title="Top Recruiters" icon={Trophy} iconColor="text-yellow-500">
              {recruitersData.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No recruiter data available for this period</p>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-50 text-xs text-gray-400 font-medium">
                    <span className="ml-auto">Added</span>
                    <span>Hired</span>
                    <span>Rate</span>
                  </div>
                  <div className="space-y-1">
                    {recruitersData.map((recruiter, i) => (
                      <RecruiterRow
                        key={recruiter.id}
                        recruiter={recruiter}
                        rank={i + 1}
                        maxAdded={maxAdded}
                      />
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-50 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Top Performer</p>
                      <p className="text-sm font-bold text-gray-800">
                        {recruitersData[0]?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Most Hired</p>
                      <p className="text-sm font-bold text-green-700">
                        {[...recruitersData].sort((a, b) => b.total_hired - a.total_hired)[0]?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Best Conversion</p>
                      <p className="text-sm font-bold text-purple-700">
                        {[...recruitersData].sort((a, b) => b.conversion_rate - a.conversion_rate)[0]?.name || '—'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}