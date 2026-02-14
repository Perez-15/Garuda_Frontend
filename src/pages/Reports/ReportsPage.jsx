import { useState, useEffect } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Briefcase,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { reportService } from '../../services/reportService';
import { clientService } from '../../services/clientService';
import { workflowService } from '../../services/workflowService';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: '',
  });
  const [filters, setFilters] = useState({
    client_id: '',
    workflow_id: '',
  });

  // Data states
  const [sourceData, setSourceData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [branchData, setBranchData] = useState([]);
  const [conversionData, setConversionData] = useState([]);

  // Filter options
  const [clients, setClients] = useState([]);
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    fetchFilterOptions();
    fetchAllReports();
  }, []);

  useEffect(() => {
    fetchAllReports();
  }, [dateRange, filters]);

  const fetchFilterOptions = async () => {
    try {
      const [clientsRes, workflowsRes] = await Promise.all([
        clientService.getAll(),
        workflowService.getAll(),
      ]);
      setClients(clientsRes.data);
      setWorkflows(workflowsRes.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const params = {
        ...dateRange,
        ...filters,
      };

      const [sourceRes, statusRes, branchRes, conversionRes] = await Promise.all([
        reportService.applicantsBySource(params),
        reportService.applicantsByStatus(params),
        reportService.applicantsByBranch(params),
        reportService.conversionRate(params),
      ]);

      setSourceData(sourceRes.data);
      setStatusData(statusRes.data);
      setBranchData(branchRes.data);
      setConversionData(conversionRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await reportService.export({ ...dateRange, ...filters });
      alert('Export functionality coming soon!');
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const getTotalApplicants = () => {
    return sourceData.reduce((sum, item) => sum + parseInt(item.count), 0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'hired':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'active':
        return <Briefcase className="h-5 w-5 text-blue-600" />;
      default:
        return <Users className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600">View recruitment metrics and insights</p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Report
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Client Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client
              </label>
              <select
                value={filters.client_id}
                onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Workflow Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow
              </label>
              <select
                value={filters.workflow_id}
                onChange={(e) => setFilters({ ...filters, workflow_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Workflows</option>
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.workflow_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              onClick={fetchAllReports}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setDateRange({ start_date: '', end_date: '' });
                setFilters({ client_id: '', workflow_id: '' });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading reports...</div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Applicants</p>
                    <p className="text-3xl font-bold text-gray-900">{getTotalApplicants()}</p>
                  </div>
                  <Users className="h-10 w-10 text-blue-500" />
                </div>
              </div>

              {statusData.map((status) => (
                <div key={status.status} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 capitalize">
                        {status.status}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">{status.count}</p>
                    </div>
                    {getStatusIcon(status.status)}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Applicants by Source */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Applicants by Source
                </h3>
                {sourceData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                ) : (
                  <div className="space-y-4">
                    {sourceData.map((item) => {
                      const total = getTotalApplicants();
                      const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
                      return (
                        <div key={item.source}>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {item.source}
                            </span>
                            <span className="text-sm text-gray-600">
                              {item.count} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-blue-600 h-3 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Applicants by Status */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Applicants by Status
                </h3>
                {statusData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                ) : (
                  <div className="space-y-4">
                    {statusData.map((item) => {
                      const total = getTotalApplicants();
                      const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
                      const colors = {
                        active: 'bg-blue-600',
                        hired: 'bg-green-600',
                        rejected: 'bg-red-600',
                        withdrawn: 'bg-gray-600',
                      };
                      return (
                        <div key={item.status}>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 capitalize">
                              {item.status}
                            </span>
                            <span className="text-sm text-gray-600">
                              {item.count} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`${colors[item.status] || 'bg-gray-600'} h-3 rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Applicants by Branch */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-purple-600" />
                  Applicants by Branch
                </h3>
                {branchData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {branchData.map((item) => (
                      <div
                        key={item.branch_name}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {item.branch_name}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conversion Rate / Funnel */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                  Workflow Conversion Funnel
                </h3>
                {conversionData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                ) : (
                  <div className="space-y-3">
                    {conversionData.map((step, index) => {
                      const maxCount = Math.max(...conversionData.map((s) => parseInt(s.count)));
                      const percentage = ((step.count / maxCount) * 100).toFixed(0);
                      return (
                        <div key={step.step_name}>
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                              <span className="text-orange-600 font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">
                                  {step.step_name}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {step.count}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-orange-600 h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}