import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Building2, Briefcase } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatsCard from '../../components/common/StatsCard';
import { dashboardService } from '../../services/dashboardService';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  const summary = data?.summary || {};
  const recentApplicants = data?.recent_applicants || [];
  const applicantsBySource = data?.applicants_by_source || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's an overview of your recruitment.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Applicants"
            value={summary.total_applicants || 0}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Active Applicants"
            value={summary.active_applicants || 0}
            icon={Briefcase}
            color="yellow"
          />
          <StatsCard
            title="Hired"
            value={summary.hired_applicants || 0}
            icon={UserCheck}
            color="green"
          />
          <StatsCard
            title="Rejected"
            value={summary.rejected_applicants || 0}
            icon={UserX}
            color="red"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Applicants */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Applicants</h3>
              {recentApplicants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No applicants yet</p>
              ) : (
                <div className="space-y-3">
                  {recentApplicants.map((applicant) => (
                    <div
                      key={applicant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{applicant.full_name}</p>
                        <p className="text-sm text-gray-500">{applicant.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {applicant.branch?.branch_name} • {applicant.current_step?.step_name}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            applicant.status === 'active'
                              ? 'bg-blue-100 text-blue-800'
                              : applicant.status === 'hired'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {applicant.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Applicants by Source */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Applicants by Source</h3>
              {applicantsBySource.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No data available</p>
              ) : (
                <div className="space-y-3">
                  {applicantsBySource.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{item.source}</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                (item.count /
                                  Math.max(...applicantsBySource.map((s) => s.count))) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white shadow rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.total_clients || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Branches</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.total_branches || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Workflows</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.total_workflows || 0}</p>
              </div>
              <Briefcase className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}