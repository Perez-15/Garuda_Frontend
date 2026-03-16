import { useState, useEffect } from 'react';
import {
  UserCheck, Building2, UserCog, ClipboardList,
  RefreshCw, AlertTriangle, TrendingUp, ArrowUpRight,
  Users, CalendarDays,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub, trend }) {
  const colors = {
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  border: 'border-green-200',  val: 'text-green-700'  },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   border: 'border-blue-200',   val: 'text-blue-700'   },
    red:    { bg: 'bg-red-50',    icon: 'text-red-500',    border: 'border-red-200',    val: 'text-red-700'    },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-200', val: 'text-purple-700' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`bg-white rounded-xl shadow-sm border ${c.border} p-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
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
        <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-green-500' : 'text-red-400'}`}>
          <ArrowUpRight className={`h-3.5 w-3.5 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// ─── Hired Per Month Bar Chart ────────────────────────────────────────────────
function HiredTrendChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-400 text-center py-8 text-sm">No data available</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-40 pt-4">
      {data.map((item, i) => {
        const pct = Math.max((item.count / max) * 100, 4);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.count}
            </span>
            <div className="w-full relative rounded-t-md overflow-hidden bg-gray-100" style={{ height: '100px' }}>
              <div
                className="absolute bottom-0 w-full bg-green-500 rounded-t-md transition-all duration-700 group-hover:bg-green-600"
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{item.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Source Bar ───────────────────────────────────────────────────────────────
function SourceBar({ source, count, max }) {
  const pct = Math.max((count / max) * 100, 2);
  const colors = [
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
    'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  const colorIdx = ['WordPress','Gmail','Facebook','BossJobs','Walk-in','Referral'].indexOf(source) % colors.length;
  const color = colors[Math.max(colorIdx, 0)];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{source || 'Unknown'}</span>
        <span className="text-sm font-bold text-gray-900">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ type, name, detail, time }) {
  const config = {
    hired:   { dot: 'bg-green-500',  label: 'Hired'    },
    moved:   { dot: 'bg-blue-500',   label: 'Moved'    },
    created: { dot: 'bg-indigo-500', label: 'Added'    },
    updated: { dot: 'bg-yellow-500', label: 'Updated'  },
    default: { dot: 'bg-gray-400',   label: 'Activity' },
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
  const [loading, setLoading]   = useState(true);
  const [data, setData]         = useState(null);
  const [error, setError]       = useState(null);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getDashboard();
      setData(response);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-7 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-24 shadow-sm" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl h-64 shadow-sm" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" /><span>{error}</span>
          </div>
          <button onClick={fetchDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const summary            = data?.summary            || {};
  const applicantsBySource = data?.applicants_by_source || [];
  const branchOverview     = data?.branch_overview     || [];
  const recentActivity     = data?.recent_activity     || [];
  const hiredPerMonth      = data?.hired_per_month     || [];

  const maxSource = Math.max(...applicantsBySource.map((s) => s.count), 1);

  const userRole = currentUser?.roles?.[0]?.name ?? currentUser?.role ?? '';
  const greeting = currentUser?.name ? `Welcome back, ${currentUser.name.split(' ')[0]}!` : 'Welcome back!';

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">{greeting} Here's what's happening today.</p>
          </div>
          <button onClick={fetchDashboard}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Hired Employees"
            value={summary.hired_employees}
            icon={UserCheck}
            color="green"
            sub="Active & deployed"
          />
          <StatCard
            title="In-Process"
            value={summary.in_process}
            icon={UserCog}
            color="blue"
            sub="In hiring pipeline"
          />
          <StatCard
            title="Total Branches"
            value={summary.total_branches}
            icon={Building2}
            color="purple"
            sub="Across all clients"
          />
          <StatCard
            title="Incomplete Docs"
            value={summary.incomplete_requirements}
            icon={ClipboardList}
            color="red"
            sub="Needs attention"
          />
        </div>

        {/* ── Row 2: Hired Trend + Source Chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Hired per Month */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Hired per Month</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div className="p-5">
              <HiredTrendChart data={hiredPerMonth} />
            </div>
          </div>

          {/* Applicants by Source */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Applicants by Source</h3>
                <p className="text-xs text-gray-400 mt-0.5">All time breakdown</p>
              </div>
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div className="p-5 space-y-3">
              {applicantsBySource.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No data available</p>
              ) : (
                applicantsBySource.map((item, i) => (
                  <SourceBar key={i} source={item.source} count={item.count} max={maxSource} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Row 3: Branch Overview + Recent Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Branch Overview — takes 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Branch Overview</h3>
                <p className="text-xs text-gray-400 mt-0.5">Employees & applicants per branch</p>
              </div>
              <Building2 className="h-5 w-5 text-purple-400" />
            </div>
            <div className="p-5">
              {branchOverview.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No branch data available</p>
              ) : (
                <div className="overflow-x-auto">
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