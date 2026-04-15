// pages/Performance/PerformancePage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users, UserCheck, Archive,
  AlertTriangle, Building2, RefreshCw, Calendar,
  UserX, Eye, X, ExternalLink,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { performanceService } from '../../services/performanceService';
import { useAuth } from '../../contexts/AuthContext';


const DATE_FILTERS = [
  { key: '',           label: 'All Time'   },
  { key: 'today',      label: 'Today'      },
  { key: 'this_week',  label: 'This Week'  },
  { key: 'this_month', label: 'This Month' },
];

const MODAL_TABS = [
  { key: 'in_process', label: 'In-Process', color: 'blue'  },
  { key: 'hired',      label: 'Deployed',   color: 'green' },
  { key: 'pooling',    label: 'Pooling',    color: 'amber' },
  { key: 'back_out',   label: 'Back Out',   color: 'rose'  },
];

const TAB_COLORS = {
  blue:  { active: 'border-blue-500 text-blue-600 bg-blue-50',    badge: 'bg-blue-100 text-blue-700'   },
  green: { active: 'border-green-500 text-green-600 bg-green-50', badge: 'bg-green-100 text-green-700' },
  amber: { active: 'border-amber-500 text-amber-600 bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
  rose:  { active: 'border-rose-500 text-rose-600 bg-rose-50',    badge: 'bg-rose-100 text-rose-700'   },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function BackOutBadge({ value }) {
  if (value === 0) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✓ None</span>;
  if (value <= 2)  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><UserX className="h-3 w-3" />{value}</span>;
  return               <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><UserX className="h-3 w-3" />{value}</span>;
}

function Avatar({ name, photo }) {
  if (photo) return <img src={photo} alt={name} className="h-9 w-9 rounded-full object-cover border-2 border-white shadow" />;
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const colors = ['bg-blue-500','bg-purple-500','bg-green-500','bg-amber-500','bg-rose-500','bg-indigo-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return <div className={`h-9 w-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow`}>{initials}</div>;
}

function SummaryCard({ label, value, icon: Icon, color }) {
  const palette = {
    green: { bg: 'bg-green-50', ring: 'ring-green-200', icon: 'text-green-500', val: 'text-green-700' },
    blue:  { bg: 'bg-blue-50',  ring: 'ring-blue-200',  icon: 'text-blue-500',  val: 'text-blue-700'  },
    amber: { bg: 'bg-amber-50', ring: 'ring-amber-200', icon: 'text-amber-500', val: 'text-amber-700' },
    red:   { bg: 'bg-red-50',   ring: 'ring-red-200',   icon: 'text-red-500',   val: 'text-red-700'   },
    rose:  { bg: 'bg-rose-50',  ring: 'ring-rose-200',  icon: 'text-rose-500',  val: 'text-rose-700'  },
  };
  const c = palette[color] || palette.blue;
  return (
    <div className={`${c.bg} ring-1 ${c.ring} rounded-xl p-5 flex items-center gap-4`}>
      <div className="p-2.5 bg-white rounded-lg shadow-sm"><Icon className={`h-5 w-5 ${c.icon}`} /></div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold ${c.val}`}>{value ?? <span className="text-gray-300 animate-pulse">—</span>}</p>
      </div>
    </div>
  );
}

function MiniProgress({ value, color = 'green' }) {
  const bars = { green: 'bg-green-400', amber: 'bg-amber-400', red: 'bg-red-400', blue: 'bg-blue-400' };
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`${bars[color]} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function Rank({ index }) {
  if (index === 0) return <span className="text-lg">🥇</span>;
  if (index === 1) return <span className="text-lg">🥈</span>;
  if (index === 2) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-semibold text-gray-400 tabular-nums">#{index + 1}</span>;
}

// ── TA Modal ───────────────────────────────────────────────────────────────────
function TAModal({ ta, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('in_process');
  const [data, setData]           = useState([]);
  const [type, setType]           = useState('applicants');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!ta) return;
    setLoading(true);
    performanceService
      .getTAApplicants(ta.id, { status: activeTab })
      .then(res => {
        setData(res.data || []);
        setType(res.type || 'applicants');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ta, activeTab]);

  if (!ta) return null;

  const tabCounts = {
    in_process: ta.in_process ?? 0,
    hired:      ta.deployed   ?? 0,
    pooling:    ta.pooling    ?? 0,
    back_out:   ta.backouts   ?? 0,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
           style={{ maxHeight: '85vh' }}>

        {/* Modal Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <Avatar name={ta.name} photo={ta.avatar} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{ta.name}</h2>
            <p className="text-xs text-gray-400">
              Talent Acquisition · {tabCounts[activeTab]} {MODAL_TABS.find(t => t.key === activeTab)?.label}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 pt-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {MODAL_TABS.map(tab => {
            const c = TAB_COLORS[tab.color];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive ? c.active + ' border-current' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? c.badge : 'bg-gray-100 text-gray-500'}`}>
                  {tabCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Column Headers */}
        {!loading && data.length > 0 && (
          <div className="flex-shrink-0 px-6 py-2 bg-gray-50 border-b border-gray-100">
            {type === 'employees' ? (
              // cols: 3 + 2 + 2 + 2 + 2 + 1 = 12
              <div className="grid grid-cols-12 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="col-span-3">Employee</div>
                <div className="col-span-2">Position</div>
                <div className="col-span-2">Branch</div>
                <div className="col-span-2">Date Hired</div>
                <div className="col-span-2">Req. Status</div>
                <div className="col-span-1"></div>
              </div>
            ) : (
              // cols: 3 + 3 + 2 + 3 + 1 = 12
              <div className="grid grid-cols-12 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="col-span-3">Applicant</div>
                <div className="col-span-3">Branch</div>
                <div className="col-span-2">Current Step</div>
                <div className="col-span-3">Source</div>
                <div className="col-span-1"></div>
              </div>
            )}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No records in this status.</p>
            </div>
          ) : type === 'employees' ? (
            // cols: 3 + 2 + 2 + 2 + 2 + 1 = 12
            data.map(emp => (
              <div key={emp.id} className="grid grid-cols-12 items-center px-6 py-3 hover:bg-gray-50 transition gap-2">
                <div className="col-span-3 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{emp.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{emp.employment_status ?? 'Active'}</p>
                </div>
                <div className="col-span-2 min-w-0">
                  <p className="text-xs text-gray-600 truncate">{emp.position ?? '—'}</p>
                </div>
                <div className="col-span-2 min-w-0">
                  <p className="text-xs text-gray-600 truncate">{emp.branch?.branch_name ?? '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-600">
                    {emp.date_hired
                      ? new Date(emp.date_hired).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div className="col-span-2">
                  {(() => {
                    const s = emp.requirements_status;
                    if (s === 'complete')   return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Complete</span>;
                    if (s === 'incomplete') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">Incomplete</span>;
                    if (s === 'pending')    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Pending</span>;
                    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">—</span>;
                  })()}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => { onClose(); navigate(`/employees/${emp.id}`); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition"
                    title="View employee"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            // cols: 3 + 3 + 2 + 3 + 1 = 12
            data.map(applicant => (
              <div key={applicant.id} className="grid grid-cols-12 items-center px-6 py-3 hover:bg-gray-50 transition gap-2">
                <div className="col-span-3 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{applicant.full_name}</p>
                </div>
                <div className="col-span-3 min-w-0">
                  <p className="text-xs text-gray-600 truncate">{applicant.branch?.branch_name ?? '—'}</p>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {applicant.current_step?.step_name ?? '—'}
                  </span>
                </div>
                <div className="col-span-3 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{applicant.source ?? '—'}</p>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => { onClose(); navigate(`/applicants/${applicant.id}`); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition"
                    title="View applicant"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400">{data.length} record{data.length !== 1 ? 's' : ''} shown</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.roles?.[0]?.name;
  const isAdmin  = userRole === 'super_admin' || userRole === 'hr_admin';

  const [activeTab,     setActiveTab]     = useState('ta');
  const [dateFilter,    setDateFilter]    = useState('');
  const [taData,        setTaData]        = useState([]);
  const [branchData,    setBranchData]    = useState([]);
  const [loadingTA,     setLoadingTA]     = useState(false);
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [selectedTA,    setSelectedTA]    = useState(null);

  const fetchTA = useCallback(async () => {
    try {
      setLoadingTA(true);
      const res = await performanceService.getTAPerformance(dateFilter ? { date_filter: dateFilter } : {});
      setTaData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingTA(false); }
  }, [dateFilter]);

  const fetchBranch = useCallback(async () => {
    try {
      setLoadingBranch(true);
      const res = await performanceService.getBranchPerformance(dateFilter ? { date_filter: dateFilter } : {});
      setBranchData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingBranch(false); }
  }, [dateFilter]);

  useEffect(() => {
    fetchTA();
    fetchBranch();
    setLastRefreshed(new Date());
  }, [fetchTA, fetchBranch]);

  const handleRefresh = () => { fetchTA(); fetchBranch(); setLastRefreshed(new Date()); };

  const totalDeployed   = taData.reduce((s, r) => s + (r.deployed   ?? 0), 0);
  const totalInProcess  = taData.reduce((s, r) => s + (r.in_process ?? 0), 0);
  const totalPooling    = taData.reduce((s, r) => s + (r.pooling    ?? 0), 0);
  const totalBackOuts   = taData.reduce((s, r) => s + (r.backouts   ?? 0), 0);
  const totalIncomplete = branchData.reduce((s, r) => s + (r.incomplete_docs ?? 0), 0);
  const maxDeployed     = Math.max(...taData.map(r => r.deployed   ?? 0), 1);
  const maxInProcess    = Math.max(...branchData.map(r => r.in_process ?? 0), 1);

  const dateLabel = DATE_FILTERS.find(f => f.key === dateFilter)?.label ?? 'All Time';

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p>You do not have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" /> Performance
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Live recruitment & branch health snapshot
              {lastRefreshed && (
                <span className="ml-2 text-xs text-gray-400">
                  · Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loadingTA || loadingBranch}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${(loadingTA || loadingBranch) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 w-fit">
          <span className="flex items-center gap-1 px-2 text-xs text-gray-400 font-medium">
            <Calendar className="h-3.5 w-3.5" /> Period:
          </span>
          {DATE_FILTERS.map(f => (
            <button
              key={f.key || 'all'}
              onClick={() => setDateFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                dateFilter === f.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <SummaryCard label={`Deployed (${dateLabel})`} value={totalDeployed}   icon={UserCheck}     color="green" />
          <SummaryCard label="In-Process"                value={totalInProcess}  icon={Users}         color="blue"  />
          <SummaryCard label="Pooling"                   value={totalPooling}    icon={Archive}       color="amber" />
          <SummaryCard label="Back Outs"                 value={totalBackOuts}   icon={UserX}         color="rose"  />
          <SummaryCard label="Incomplete Docs"           value={totalIncomplete} icon={AlertTriangle} color="red"   />
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 w-fit">
          <button
            onClick={() => setActiveTab('ta')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ta' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Users className="h-4 w-4" /> TA Performance
          </button>
          <button
            onClick={() => setActiveTab('branch')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'branch' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Building2 className="h-4 w-4" /> Branch Insights
          </button>
        </div>

        {/* ── TA Performance Tab ── */}
        {activeTab === 'ta' && (
          <div className="bg-white shadow rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Recruiter Performance</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Deployed &amp; Back Outs filtered by <span className="font-medium text-blue-600">{dateLabel}</span>
                  &nbsp;· In-Process &amp; Pooling always show current totals
                </p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{taData.length} recruiters</span>
            </div>

            {loadingTA ? (
              <div className="p-8 space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : taData.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No Talent Acquisition users found.</p>
              </div>
            ) : (
              <>
                {/* TA Table Header — 1+3+2+1+1+1+2+1 = 12 */}
                <div className="hidden md:grid grid-cols-12 px-6 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <div className="col-span-1 text-center">Rank</div>
                  <div className="col-span-3">Recruiter</div>
                  <div className="col-span-2">Client</div>
                  <div className="col-span-1 text-center">In-Process</div>
                  <div className="col-span-1 text-center text-green-700 font-bold">Deployed</div>
                  <div className="col-span-1 text-center text-amber-700 font-bold">Pooling</div>
                  <div className="col-span-2 text-center text-rose-600 font-bold">Back Outs</div>
                  <div className="col-span-1 text-center">View</div>
                </div>

                <div className="divide-y divide-gray-50">
                  {taData.map((ta, index) => (
                    // Row — 1+3+2+1+1+1+2+1 = 12
                    <div
                      key={ta.id}
                      className={`grid grid-cols-12 items-center px-6 py-4 hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-green-50/40' : ''}`}
                    >
                      {/* Rank */}
                      <div className="col-span-1 flex justify-center">
                        <Rank index={index} />
                      </div>

                      {/* Recruiter */}
                      <div className="col-span-3 flex items-center gap-3">
                        <Avatar name={ta.name} photo={ta.avatar} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{ta.name}</p>
                          <p className="text-xs text-gray-400">{ta.total ?? 0} total</p>
                        </div>
                      </div>

                      {/* Client */}
                      <div className="col-span-2 min-w-0">
                        {ta.clients?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ta.clients.map((c, i) => (
                              <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium truncate max-w-full">
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>

                      {/* In-Process */}
                      <div className="col-span-1 text-center">
                        <span className="text-sm font-bold text-blue-600">{ta.in_process ?? 0}</span>
                      </div>

                      {/* Deployed */}
                      <div className="col-span-1 text-center">
                        <span className="inline-block text-sm font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg">{ta.deployed ?? 0}</span>
                        <MiniProgress value={((ta.deployed ?? 0) / maxDeployed) * 100} color="green" />
                      </div>

                      {/* Pooling */}
                      <div className="col-span-1 text-center">
                        <span className="text-sm font-bold text-amber-600">{ta.pooling ?? 0}</span>
                      </div>

                      {/* Back Outs */}
                      <div className="col-span-2 flex justify-center">
                        <BackOutBadge value={ta.backouts ?? 0} />
                      </div>

                      {/* View */}
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => setSelectedTA(ta)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Branch Performance Tab ── */}
        {activeTab === 'branch' && (
          <div className="bg-white shadow rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Branch Health</h2>
                <p className="text-xs text-gray-400 mt-0.5">Sorted by blockers (incomplete docs) · Employees always show current active headcount</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{branchData.length} branches</span>
            </div>

            {loadingBranch ? (
              <div className="p-8 space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : branchData.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No active branches found.</p>
              </div>
            ) : (
              <>
                {/* Branch Table Header — 4+2+2+2+2 = 12 */}
                <div className="hidden md:grid grid-cols-12 px-6 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <div className="col-span-4">Branch</div>
                  <div className="col-span-2 text-center">Client</div>
                  <div className="col-span-2 text-center">Employees</div>
                  <div className="col-span-2 text-center">In-Process</div>
                  <div className="col-span-2 text-center text-red-600 font-bold">Incomplete Docs</div>
                </div>

                <div className="divide-y divide-gray-50">
                  {branchData.map(branch => {
                    const hasBlocker = branch.incomplete_docs > 0;
                    return (
                      // Row — 4+2+2+2+2 = 12
                      <div key={branch.id} className={`grid grid-cols-12 items-center px-6 py-4 hover:bg-gray-50 transition-colors ${hasBlocker ? 'border-l-4 border-red-400' : 'border-l-4 border-transparent'}`}>
                        <div className="col-span-4 flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${hasBlocker ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <Building2 className={`h-4 w-4 ${hasBlocker ? 'text-red-500' : 'text-blue-500'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{branch.branch_name}</p>
                            {branch.location && <p className="text-xs text-gray-400 truncate">{branch.location}</p>}
                          </div>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">{branch.client}</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-bold text-gray-700">{branch.employees}</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-bold text-blue-600">{branch.in_process}</span>
                          <MiniProgress value={(branch.in_process / maxInProcess) * 100} color="blue" />
                        </div>
                        <div className="col-span-2 text-center">
                          {hasBlocker ? (
                            <span className="inline-flex items-center gap-1 text-sm font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                              <AlertTriangle className="h-3.5 w-3.5" />{branch.incomplete_docs}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">✓ Clear</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-4 bg-red-400 rounded-sm" /> Branch has incomplete/pending employee documents</span>
                  <span>⚠ Incomplete Docs = employees with missing NBI, medical, or other requirements</span>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* TA Modal */}
      {selectedTA && <TAModal ta={selectedTA} onClose={() => setSelectedTA(null)} />}

    </DashboardLayout>
  );
}