import { useState, useEffect } from 'react';
import {
  Users, UserCheck, UserX, Building2, Briefcase,
  AlertTriangle, TrendingUp, UserPlus, Clock,
  CheckCircle, XCircle, ArrowRight, RefreshCw
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { dashboardService } from '../../services/dashboardService';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   border: 'border-blue-200',  val: 'text-blue-700'  },
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  border: 'border-green-200', val: 'text-green-700' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-500',    border: 'border-red-200',   val: 'text-red-700'   },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-500', border: 'border-yellow-200',val: 'text-yellow-700'},
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500', border: 'border-orange-200',val: 'text-orange-700'},
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-200',val: 'text-purple-700'},
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`bg-white rounded-xl shadow-sm border ${c.border} p-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
      <div className={`${c.bg} p-3 rounded-lg`}>
        <Icon className={`h-6 w-6 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
        <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}



// ─── Activity Item ──────────────────────────────────────────────────────────────
function ActivityItem({ type, name, detail, time }) {
  const config = {
    hired:       { icon: UserCheck,    color: 'text-green-500',  bg: 'bg-green-50'  },
    moved:       { icon: TrendingUp,   color: 'text-blue-500',   bg: 'bg-blue-50'   },
    submitted:   { icon: CheckCircle,  color: 'text-purple-500', bg: 'bg-purple-50' },
    warning:     { icon: AlertTriangle,color: 'text-orange-500', bg: 'bg-orange-50' },
    rejected:    { icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-50'    },
    new:         { icon: UserPlus,     color: 'text-teal-500',   bg: 'bg-teal-50'   },
  };
  const c = config[type] || config.new;
  const Icon = c.icon;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className={`${c.bg} p-1.5 rounded-lg mt-0.5 flex-shrink-0`}>
        <Icon className={`h-3.5 w-3.5 ${c.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate">{detail}</p>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
        <Clock className="h-3 w-3" />{time}
      </span>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getDashboard();
      setData(response);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-7 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-5 h-24" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 h-64" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 h-48" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const summary = data?.summary || {};
  const recentApplicants = data?.recent_applicants || [];
  const applicantsBySource = data?.applicants_by_source || [];
  const branchOverview = data?.branch_overview || [];
  const recentActivity = data?.recent_activity || [];
 
  const totalApplicants = summary.total_applicants || 0;


  // Fallback activity data
  const activityData = recentActivity.length > 0 ? recentActivity : recentApplicants.slice(0, 5).map(a => ({
    type: a.status === 'hired' ? 'hired' : a.status === 'rejected' ? 'rejected' : 'new',
    name: a.full_name,
    detail: `${a.branch?.branch_name || 'N/A'} • ${a.current_step?.step_name || 'Applied'}`,
    time: new Date(a.applied_at).toLocaleDateString(),
  }));

  const maxSource = Math.max(...applicantsBySource.map((s) => s.count), 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Welcome back! Here's an overview of Garuda Recruitment.
            </p>
          </div>
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* ── Stats Cards (6 cards) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            title="Total Applicants"
            value={summary.total_applicants || 0}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Active"
            value={summary.active_applicants || 0}
            icon={Briefcase}
            color="yellow"
          />
          <StatCard
            title="Hired"
            value={summary.hired_applicants || 0}
            icon={UserCheck}
            color="green"
            sub="All time"
          />
          <StatCard
            title="Total Employees"
            value={summary.total_employees || 0}
            icon={Users}
            color="purple"
            sub="Deployed"
          />
          <StatCard
            title="Incomplete Docs"
            value={summary.incomplete_requirements || 0}
            icon={AlertTriangle}
            color="red"
            sub="Needs attention"
          />
        </div>


        {/* ── Two Column: Recent Applicants + Branch Overview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Applicants */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Recent Applicants</h3>
              <span className="text-xs text-gray-400">{recentApplicants.length} shown</span>
            </div>
            <div className="p-5">
              {recentApplicants.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No applicants yet</p>
              ) : (
                <div className="space-y-2">
                  {recentApplicants.map((applicant) => (
                    <div
                      key={applicant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-semibold text-gray-900 truncate">{applicant.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{applicant.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {applicant.branch?.branch_name} • {applicant.current_step?.step_name || 'N/A'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                        applicant.status === 'active'   ? 'bg-blue-100 text-blue-700'   :
                        applicant.status === 'hired'    ? 'bg-green-100 text-green-700' :
                        applicant.status === 'rejected' ? 'bg-red-100 text-red-700'     :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {applicant.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Branch Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-base font-semibold text-gray-900">Branch Overview</h3>
            </div>
            <div className="p-5">
              {branchOverview.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No branch data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wide">
                        <th className="text-left pb-3 font-medium">Branch</th>
                        <th className="text-center pb-3 font-medium">Employees</th>
                        <th className="text-center pb-3 font-medium">Applicants</th>
                        <th className="text-center pb-3 font-medium">Pending Docs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {branchOverview.map((branch, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 font-medium text-gray-800">{branch.branch_name}</td>
                          <td className="py-3 text-center text-gray-600">{branch.total_employees || 0}</td>
                          <td className="py-3 text-center">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                              {branch.total_applicants || 0}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            {(branch.pending_docs || 0) > 0 ? (
                              <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                                {branch.pending_docs}
                              </span>
                            ) : (
                              <span className="text-green-500 text-xs">✓ Complete</span>
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
        </div>

        {/* ── Three Column: Source Chart + Activity Feed + Quick Stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Applicants by Source */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-base font-semibold text-gray-900">Applicants by Source</h3>
            </div>
            <div className="p-5">
              {applicantsBySource.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No data available</p>
              ) : (
                <div className="space-y-3">
                  {applicantsBySource.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.source}</span>
                        <span className="text-sm font-bold text-gray-900">{item.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-700"
                          style={{ width: `${(item.count / maxSource) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="px-5 py-3">
              {activityData.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No recent activity</p>
              ) : (
                activityData.slice(0, 6).map((item, i) => (
                  <ActivityItem key={i} {...item} />
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-base font-semibold text-gray-900">Quick Stats</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Total Clients</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{summary.total_clients || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Total Branches</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{summary.total_branches || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Total Workflows</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{summary.total_workflows || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserX className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-gray-700">Rejected</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{summary.rejected_applicants || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-teal-500" />
                  <span className="text-sm font-medium text-gray-700">New Today</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{summary.new_today || 0}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}