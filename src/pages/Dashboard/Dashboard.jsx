// pages/Dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import {
  UserCheck, Building2, UserCog, ClipboardList,
  RefreshCw, AlertTriangle, TrendingUp, ArrowUpRight,
  Users, CalendarDays, Briefcase, Archive,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { dashboardService } from '../../services/dashboardService';
import { applicantService } from '../../services/applicantService';
import { employeeService  } from '../../services/hiredService';
import { useAuth          } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

// ─── Prospect Status Config ───────────────────────────────────────────────────
const PROSPECT_STATUSES = [
  { value: 'sent_email',       label: 'Sent Email',        color: 'bg-blue-500'   },
  { value: 'updated',          label: 'Updated',           color: 'bg-green-500'  },
  { value: 'they_emailed',     label: 'They Emailed',      color: 'bg-purple-500' },
  { value: 'hard_copy_needed', label: 'Hard Copy Needed',  color: 'bg-orange-500' },
  { value: 'no_response',      label: 'No Response',       color: 'bg-gray-400'   },
  { value: 'after_1_month',    label: 'Follow Up (1 Mo)',  color: 'bg-yellow-500' },
  { value: 'email_back',       label: 'Email Back',        color: 'bg-teal-500'   },
  { value: 'for_follow_up',    label: 'For Follow Up',     color: 'bg-red-500'    },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub, to, trend }) {
  const colors = {
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  border: 'border-green-200',  val: 'text-green-700'  },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   border: 'border-blue-200',   val: 'text-blue-700'   },
    red:    { bg: 'bg-red-50',    icon: 'text-red-500',    border: 'border-red-200',    val: 'text-red-700'    },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-200', val: 'text-purple-700' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-500',  border: 'border-amber-200',  val: 'text-amber-700'  },
    teal:   { bg: 'bg-teal-50',   icon: 'text-teal-500',   border: 'border-teal-200',   val: 'text-teal-700'   },
  };
  const c = colors[color] || colors.blue;
  const inner = (
    <div className={`bg-white rounded-xl shadow-sm border ${c.border} p-5 flex items-center gap-4 hover:shadow-md transition-shadow ${to ? 'cursor-pointer' : ''}`}>
      <div className={`${c.bg} p-3 rounded-xl flex-shrink-0`}>
        <Icon className={`h-6 w-6 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
        <p className={`text-2xl font-bold ${c.val}`}>
          {value ?? <span className="text-gray-300 animate-pulse">—</span>}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs font-semibold flex-shrink-0 ${trend >= 0 ? 'text-green-500' : 'text-red-400'}`}>
          <ArrowUpRight className={`h-3.5 w-3.5 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ─── Hired Trend Line Chart ───────────────────────────────────────────────────
function HiredTrendChart({ data }) {
  if (!data || data.length === 0)
    return <p className="text-gray-400 text-center py-8 text-sm">No data available</p>;

  const max    = Math.max(...data.map((d) => d.count), 1);
  const width  = 500;
  const height = 140;
  const padX   = 24;
  const padY   = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = data.map((d, i) => ({
    x:     padX + (data.length === 1 ? 0 : (i / (data.length - 1))) * innerW,
    y:     padY + (1 - d.count / max) * innerH,
    count: d.count,
    month: d.month ?? d.week,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD
    + ` L ${points[points.length - 1].x} ${height - padY}`
    + ` L ${points[0].x} ${height - padY} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0"    />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#lineGrad)" />
        <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i} className="group">
            <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
            <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#22c55e" strokeWidth="2.5" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="#15803d"
              className="opacity-0 group-hover:opacity-100 transition-opacity">
              {p.count}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height + 4} textAnchor="middle" fontSize="10" fill="#9ca3af">
            {p.month}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Prospect Status Bar ──────────────────────────────────────────────────────
function ProspectStatusBar({ status, count, max }) {
  const pct    = Math.max((count / max) * 100, 2);
  const config = PROSPECT_STATUSES.find((s) => s.value === status);
  const color  = config?.color || 'bg-gray-400';
  const label  = config?.label || status;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ type, name, detail, time }) {
  const config = {
    hired:   { dot: 'bg-green-500'  },
    moved:   { dot: 'bg-blue-500'   },
    created: { dot: 'bg-indigo-500' },
    updated: { dot: 'bg-yellow-500' },
    default: { dot: 'bg-gray-400'   },
  };
  const c = config[type] || config.default;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="mt-1.5 flex-shrink-0">
        <span className={`block h-2 w-2 rounded-full ${c.dot}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate">{detail}</p>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1 whitespace-nowrap">
        <CalendarDays className="h-3 w-3" /> {time}
      </span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user: currentUser } = useAuth();

  const [loading,        setLoading]        = useState(true);
  const [dashData,       setDashData]       = useState(null);
  const [applicantStats, setApplicantStats] = useState(null);
  const [employeeStats,  setEmployeeStats]  = useState(null);
  const [error,          setError]          = useState(null);
  const [hiresFilter,    setHiresFilter]    = useState('monthly');
  const [viewMode,       setViewMode]       = useState('client');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, aStats, eStats] = await Promise.all([
        dashboardService.getDashboard(),
        applicantService.getStats({}),
        employeeService.getStats({}),
      ]);
      setDashData(dashRes);
      setApplicantStats(aStats);
      setEmployeeStats(eStats);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const branchOverview      = dashData?.branch_overview      || [];
  const recentActivity      = dashData?.recent_activity      || [];
  const hiredPerMonth       = dashData?.hired_per_month      || [];
  const hiredPerWeek        = dashData?.hired_per_week       || [];
  const prospectsByStatus   = dashData?.prospects_by_status  || [];
  const totalProspects      = dashData?.total_prospects      || 0;
  const maxProspects        = Math.max(...prospectsByStatus.map((s) => s.count), 1);

  const clientOverview = Object.values(
    branchOverview.reduce((acc, branch) => {
      const key = branch.client_name || '—';
      if (!acc[key]) {
        acc[key] = {
          client_name:     key,
          branch_count:    0,
          total_employees: 0,
          in_process:      0,
          incomplete_docs: 0,
        };
      }
      acc[key].branch_count    += 1;
      acc[key].total_employees += branch.total_employees || 0;
      acc[key].in_process      += branch.in_process      || 0;
      acc[key].incomplete_docs += branch.incomplete_docs || 0;
      return acc;
    }, {})
  );

  const greeting = currentUser?.name
    ? `Welcome back, ${currentUser.name.split(' ')[0]}!`
    : 'Welcome back!';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-7 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl h-24 shadow-sm" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => <div key={i} className="bg-white rounded-xl h-64 shadow-sm" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl h-64 shadow-sm" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" /><span>{error}</span>
          </div>
          <button onClick={fetchAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">{greeting} Here's what's happening today.</p>
          </div>
          <button onClick={fetchAll}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* ── 5 KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard
            title="Overall Hired"
            value={applicantStats?.hired}
            icon={UserCheck}
            color="green"
            sub="All time placements"
            to="/employees"
          />
          <StatCard
            title="Currently Active"
            value={applicantStats?.active_employees}
            icon={Briefcase}
            color="teal"
            sub="Currently deployed"
            to="/employees"
          />
          <StatCard
            title="In-Process"
            value={applicantStats?.in_process}
            icon={UserCog}
            color="blue"
            sub="In hiring pipeline"
            to="/in-process"
          />
          <StatCard
            title="Pooling"
            value={applicantStats?.pooling}
            icon={Archive}
            color="amber"
            sub="Talent pool"
            to="/in-process"
          />
          <StatCard
            title="Incomplete Docs"
            value={employeeStats?.requirements_incomplete}
            icon={ClipboardList}
            color="red"
            sub="Needs attention"
            to="/employees"
          />
        </div>

        {/* ── Charts Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Hiring Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Hiring Trend</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {hiresFilter === 'monthly' ? 'Last 6 months' : 'Last 8 weeks'}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setHiresFilter('monthly')}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    hiresFilter === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setHiresFilter('weekly')}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    hiresFilter === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>
            <div className="p-5">
              <HiredTrendChart data={hiresFilter === 'monthly' ? hiredPerMonth : hiredPerWeek} />
            </div>
          </div>

          {/* Prospects by Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Prospects by Status</h3>
                <p className="text-xs text-gray-400 mt-0.5">{totalProspects} total prospects</p>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div className="p-5 space-y-3">
              {prospectsByStatus.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No prospect data available</p>
              ) : (
                prospectsByStatus.map((item, i) => (
                  <ProspectStatusBar
                    key={i}
                    status={item.status}
                    count={item.count}
                    max={maxProspects}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Branch / Client Overview + Recent Activity ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Branch / Client Overview */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {viewMode === 'branch' ? 'Branch Overview' : 'Client Overview'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {viewMode === 'branch'
                    ? 'Employees & applicants per branch'
                    : 'Aggregated totals per client'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-purple-400" />
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('branch')}
                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                      viewMode === 'branch' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    By Branch
                  </button>
                  <button
                    onClick={() => setViewMode('client')}
                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                      viewMode === 'client' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    By Client
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5">
              {branchOverview.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No branch data available</p>
              ) : (
                <div className="overflow-x-auto">
                  {viewMode === 'branch' ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                          <th className="text-left pb-3 font-semibold">Branch</th>
                          <th className="text-left pb-3 font-semibold">Client</th>
                          <th className="text-center pb-3 font-semibold">Employees</th>
                          <th className="text-center pb-3 font-semibold">In-Process</th>
                          <th className="text-center pb-3 font-semibold">Incomplete Docs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {branchOverview.map((branch, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 font-medium text-gray-800">{branch.branch_name}</td>
                            <td className="py-3 text-gray-500 text-xs">{branch.client_name || '—'}</td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                {branch.total_employees || 0}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {branch.in_process || 0}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              {(branch.incomplete_docs || 0) > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                                  {branch.incomplete_docs}
                                </span>
                              ) : (
                                <span className="text-green-500 text-xs font-medium">✓ OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                          <th className="text-left pb-3 font-semibold">Client</th>
                          <th className="text-center pb-3 font-semibold">Branches</th>
                          <th className="text-center pb-3 font-semibold">Employees</th>
                          <th className="text-center pb-3 font-semibold">In-Process</th>
                          <th className="text-center pb-3 font-semibold">Incomplete Docs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {clientOverview.map((client, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 font-medium text-gray-800">{client.client_name}</td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                {client.branch_count}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                {client.total_employees}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {client.in_process}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              {client.incomplete_docs > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                                  {client.incomplete_docs}
                                </span>
                              ) : (
                                <span className="text-green-500 text-xs font-medium">✓ OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
              <p className="text-xs text-gray-400 mt-0.5">Latest system events</p>
            </div>
            <div className="px-5 py-3">
              {recentActivity.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No recent activity</p>
              ) : (
                recentActivity.slice(0, 8).map((item, i) => (
                  <ActivityItem key={i} {...item} />
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}