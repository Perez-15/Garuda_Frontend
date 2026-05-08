// pages/Reports/ReportsPage.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Download, TrendingUp, Users, CheckCircle,
  Briefcase, Calendar, Building2, Trophy,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { reportService } from '../../services/reportService';
import { clientService } from '../../services/clientService';
import { branchService } from '../../services/branchService';
import apiClient from '../../api/axios';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Tooltip, Legend,
);

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function toLocalIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function todayIso() {
  return toLocalIso(new Date());
}

const CLIENT_COLORS = [
  '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#f97316',
  '#14b8a6', '#a855f7',
];

function buildClientColorMap(data) {
  const map = {};
  let idx = 0;
  data.forEach(b => {
    const key = b.client_id ?? b.client_name ?? 'unknown';
    if (!(key in map)) map[key] = CLIENT_COLORS[idx++ % CLIENT_COLORS.length];
  });
  return map;
}

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : 'Unknown';

const CHART_FONT = "'Inter', system-ui, sans-serif";

function chartDefaults(dark) {
  return {
    textColor:   dark ? '#9ca3af' : '#6b7280',
    gridColor:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    borderColor: dark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)',
  };
}

// ─── Prospect Statuses ─────────────────────────────────────────────────────────
const PROSPECT_STATUSES = [
  { value: 'sent_email',       label: 'Sent Email',        color: '#3b82f6' },
  { value: 'updated',          label: 'Updated',           color: '#22c55e' },
  { value: 'they_emailed',     label: 'They Emailed',      color: '#a855f7' },
  { value: 'hard_copy_needed', label: 'Hard Copy Needed',  color: '#f97316' },
  { value: 'no_response',      label: 'No Response',       color: '#9ca3af' },
  { value: 'after_1_month',    label: 'Follow Up (1 Mo)',  color: '#eab308' },
  { value: 'email_back',       label: 'Email Back',        color: '#14b8a6' },
  { value: 'for_follow_up',    label: 'For Follow Up',     color: '#ef4444' },
];

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trendUp, color, icon: Icon }) {
  const palette = {
    blue:   { accent: '#3b82f6', bg: 'bg-blue-50',   icon: 'text-blue-500',   val: 'text-blue-700'   },
    green:  { accent: '#22c55e', bg: 'bg-green-50',  icon: 'text-green-500',  val: 'text-green-700'  },
    yellow: { accent: '#eab308', bg: 'bg-yellow-50', icon: 'text-yellow-500', val: 'text-yellow-700' },
    purple: { accent: '#a855f7', bg: 'bg-purple-50', icon: 'text-purple-500', val: 'text-purple-700' },
    amber:  { accent: '#f59e0b', bg: 'bg-amber-50',  icon: 'text-amber-500',  val: 'text-amber-700'  },
  };
  const p = palette[color] || palette.blue;
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden relative">
      <div className="h-1 w-full" style={{ background: p.accent }} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-bold ${p.val}`}>{value}</p>
            {sub && (
              <p className={`text-xs mt-1 font-medium ${
                trendUp === true  ? 'text-green-500' :
                trendUp === false ? 'text-red-400'   : 'text-gray-400'
              }`}>
                {trendUp === true ? '↑ ' : trendUp === false ? '↓ ' : ''}{sub}
              </p>
            )}
          </div>
          <div className={`${p.bg} p-2.5 rounded-lg`}>
            <Icon className={`h-5 w-5 ${p.icon}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, dot, children, action }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {dot && <span className="w-2 h-2 rounded-full inline-block" style={{ background: dot }} />}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Preset Button ─────────────────────────────────────────────────────────────
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

function CutoffPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
        active
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Recruiter Row ─────────────────────────────────────────────────────────────
function RecruiterRow({ recruiter, rank, maxAdded }) {
  const medals  = { 1: '🏆', 2: '🥈', 3: '🥉' };
  const rankBg  = rank === 1 ? 'bg-yellow-400 text-white' : rank === 2 ? 'bg-gray-300 text-gray-700' : rank === 3 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500';
  const barPct  = maxAdded > 0 ? Math.round((parseInt(recruiter.total_added) / maxAdded) * 100) : 0;
  const initials = recruiter.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const rateCls = recruiter.conversion_rate >= 22 ? 'bg-green-50 text-green-700' : recruiter.conversion_rate >= 15 ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className={`w-7 h-7 rounded-full ${rankBg} flex items-center justify-center flex-shrink-0 text-xs font-bold`}>
        {rank <= 3 ? medals[rank] : rank}
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
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rateCls}`}>
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

// ─── Funnel (CSS) ──────────────────────────────────────────────────────────────
function FunnelViz({ stages }) {
  const max = Math.max(...stages.map(s => s.value), 1);
  const colors = [
    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    { bg: '#fefce8', border: '#fde68a', text: '#92400e' },
    { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
    { bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d' },
  ];
  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const widthPct = Math.max((stage.value / max) * 100, 22);
        const convPct  = i > 0 && stages[i - 1].value > 0
          ? Math.round((stage.value / stages[i - 1].value) * 100)
          : null;
        const c = colors[i % colors.length];
        return (
          <div key={stage.name}>
            {i > 0 && (
              <div className="flex items-center justify-center gap-1.5 py-1">
                <span className="text-gray-300 text-xs">▼</span>
                {convPct !== null && (
                  <span className="text-xs text-gray-400 font-medium">{convPct}% passed through</span>
                )}
              </div>
            )}
            <div className="flex justify-center">
              <div
                className="flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-700"
                style={{
                  width: `${widthPct}%`,
                  minWidth: '200px',
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                }}
              >
                <span className="text-xs font-semibold truncate" style={{ color: c.text }}>{stage.name}</span>
                <span className="text-base font-bold ml-3 flex-shrink-0" style={{ color: c.text }}>{stage.value.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Prospects by Status Bar ───────────────────────────────────────────────────
function ProspectStatusBar({ status, count, max }) {
  const pct    = Math.max((count / max) * 100, 2);
  const config = PROSPECT_STATUSES.find(s => s.value === status);
  const color  = config?.color || '#9ca3af';
  const label  = config?.label || status;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [loading, setLoading]           = useState(true);
  const [activePreset, setActivePreset] = useState('this_month');
  const [dateRange, setDateRange]       = useState({ start_date: '', end_date: '' });
  const [filters, setFilters]           = useState({ client_id: '', branch_id: '' });

  const now          = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [cutoffMonth, setCutoffMonth] = useState(currentMonth);
  const [cutoffHalf,  setCutoffHalf]  = useState(now.getDate() <= 15 ? 1 : 2);

  const [sourceData,      setSourceData]      = useState([]);
  const [statusData,      setStatusData]      = useState([]);
  const [branchData,      setBranchData]      = useState([]);
  const [recruitersData,  setRecruitersData]  = useState([]);
  const [trendData,       setTrendData]       = useState([]);
  const [prospectsData,   setProspectsData]   = useState([]);
  const [totalProspects,  setTotalProspects]  = useState(0);

  const [clients,  setClients]  = useState([]);
  const [branches, setBranches] = useState([]);

  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = e => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const cd = chartDefaults(dark);

  useEffect(() => {
    fetchFilterOptions();
    fetchProspects();
    applyPreset('this_month');
  }, []);

  useEffect(() => {
    if (!dateRange.start_date || !dateRange.end_date) return;
    fetchAllReports();
  }, [dateRange, filters]);

  const fetchFilterOptions = async () => {
    try {
      const [clientsRes, branchesRes] = await Promise.all([
        clientService.getAll(),
        branchService.getAll(),
      ]);
      setClients(clientsRes.data?.data   || clientsRes.data   || []);
      setBranches(branchesRes.data?.data || branchesRes.data  || branchesRes || []);
    } catch (e) { console.error(e); }
  };

  const fetchProspects = async () => {
    try {
      const res      = await apiClient.get('/client-prospects');
      const prospects = res.data.data ?? res.data ?? [];
      setTotalProspects(prospects.length);

      // Group by status
      const counts = prospects.reduce((acc, p) => {
        if (p.status) acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      const sorted = PROSPECT_STATUSES
        .map(s => ({ status: s.value, count: counts[s.value] || 0 }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count);

      setProspectsData(sorted);
    } catch (e) { console.error(e); }
  };

  const applyPreset = (preset) => {
    setActivePreset(preset);
    if (preset === 'custom') return;
    const today = new Date();
    let start = '', end = todayIso();
    if      (preset === 'today')      { start = end = todayIso(); }
    else if (preset === 'this_week')  { const s = new Date(today); s.setDate(today.getDate() - today.getDay()); start = toLocalIso(s); }
    else if (preset === 'this_month') { start = toLocalIso(new Date(today.getFullYear(), today.getMonth(), 1)); }
    else if (preset === 'this_year')  { start = toLocalIso(new Date(today.getFullYear(), 0, 1)); }
    else if (preset === 'all_time')   { start = '2000-01-01'; }
    setDateRange({ start_date: start, end_date: end });
  };

  const applyCutoff = (month, half) => {
    setActivePreset('cutoff');
    setCutoffMonth(month);
    setCutoffHalf(half);
    const [year, mon] = month.split('-').map(Number);
    const lastDay = getLastDayOfMonth(year, mon - 1);
    const start   = half === 1 ? `${month}-01` : `${month}-16`;
    const end     = half === 1 ? `${month}-15` : `${month}-${String(lastDay).padStart(2, '0')}`;
    setDateRange({ start_date: start, end_date: end });
  };

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const params = { ...dateRange, ...filters };
      const [sourceRes, statusRes, branchRes, recruitersRes, trendRes] = await Promise.all([
        reportService.applicantsBySource(params),
        reportService.applicantsByStatus(params),
        reportService.applicantsByBranch(params),
        reportService.topRecruiters(params),
        reportService.applicantsTrend(params),
      ]);
      setSourceData(sourceRes.data         || []);
      setStatusData(statusRes.data         || []);
      setBranchData(branchRes.data         || []);
      setRecruitersData(recruitersRes.data || []);
      setTrendData(trendRes.data           || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (e) { console.error(e); }
  };

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const totalApplicants = sourceData.reduce((s, i) => s + parseInt(i.count || 0), 0);
  const hired           = parseInt(statusData.find(s => s.status === 'hired')?.count     || 0);
  const active          = parseInt(statusData.find(s => s.status === 'active')?.count    || 0);
  const pooling         = parseInt(statusData.find(s => s.status === 'pooling')?.count   || 0);
  const withdrawn       = parseInt(statusData.find(s => s.status === 'withdrawn')?.count || 0);
  const conversionRate  = totalApplicants > 0 ? ((hired / totalApplicants) * 100).toFixed(1) : '0.0';
  const maxAdded        = Math.max(...recruitersData.map(r => parseInt(r.total_added || 0)), 1);
  const maxProspects    = Math.max(...prospectsData.map(s => s.count), 1);

  // ── Chart data ───────────────────────────────────────────────────────────────
  const trendChartData = {
    labels:   trendData.map(d => d.date),
    datasets: [
      {
        label: 'Applicants',
        data:  trendData.map(d => d.applicants || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Hired',
        data:  trendData.map(d => d.hired || 0),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.06)',
        borderWidth: 2,
        pointBackgroundColor: '#22c55e',
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.4,
        borderDash: [4, 3],
      },
    ],
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        grid: { color: cd.gridColor },
        ticks: { color: cd.textColor, font: { family: CHART_FONT, size: 11 } },
      },
      y: {
        grid: { color: cd.gridColor },
        ticks: { color: cd.textColor, font: { family: CHART_FONT, size: 11 } },
        beginAtZero: true,
      },
    },
  };

  const sortedSource   = [...sourceData].sort((a, b) => b.count - a.count);
  const sourceColors   = ['#6366f1','#818cf8','#a5b4fc','#c7d2fe','#e0e7ff','#eef2ff'];
  const sourceChartData = {
    labels:   sortedSource.map(s => capitalize(s.source || 'Unknown')),
    datasets: [{
      label: 'Applicants',
      data:  sortedSource.map(s => parseInt(s.count)),
      backgroundColor: sortedSource.map((_, i) => sourceColors[i % sourceColors.length]),
      borderRadius: 4,
      borderSkipped: false,
    }],
  };
  const sourceChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.parsed.x} applicants` } },
    },
    scales: {
      x: {
        grid: { color: cd.gridColor },
        ticks: { color: cd.textColor, font: { family: CHART_FONT, size: 11 } },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: { color: cd.textColor, font: { family: CHART_FONT, size: 11 } },
      },
    },
  };

  const sortedBranch    = [...branchData].sort((a, b) => b.count - a.count).slice(0, 8);
  const clientColorMap  = buildClientColorMap(sortedBranch);
  const branchBarColors = sortedBranch.map(b => clientColorMap[b.client_id ?? b.client_name ?? 'unknown']);
  const uniqueClients   = [];
  const seenClients     = new Set();
  sortedBranch.forEach(b => {
    const key   = b.client_id ?? b.client_name ?? 'unknown';
    const label = b.client_name ?? `Client ${b.client_id}` ?? 'Unknown';
    if (!seenClients.has(key)) {
      seenClients.add(key);
      uniqueClients.push({ key, label, color: clientColorMap[key] });
    }
  });

  const branchChartData = {
    labels:   sortedBranch.map(b => b.branch_name),
    datasets: [{
      label: 'Applicants',
      data:  sortedBranch.map(b => parseInt(b.count)),
      backgroundColor: branchBarColors,
      borderRadius: 4,
      borderSkipped: false,
    }],
  };
  const branchChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index' },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: cd.textColor, font: { family: CHART_FONT, size: 11 }, autoSkip: false, maxRotation: 30 },
      },
      y: {
        grid: { color: cd.gridColor },
        ticks: { color: cd.textColor, font: { family: CHART_FONT, size: 11 } },
        beginAtZero: true,
      },
    },
  };

  const funnelStages = [
    { name: 'Total Applicants', value: totalApplicants },
    { name: 'In-Process',       value: active          },
    { name: 'Pooling',          value: pooling         },
    { name: 'Hired',            value: hired           },
  ].filter(s => s.value > 0);

  const [cmYear, cmMon] = cutoffMonth.split('-').map(Number);
  const cutoffLastDay   = getLastDayOfMonth(cmYear, cmMon - 1);
  const periodLabel     = dateRange.start_date && dateRange.end_date
    ? `${dateRange.start_date} → ${dateRange.end_date}` : '—';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Recruitment insights ·{' '}
              <span className="font-medium text-gray-700">{periodLabel}</span>
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={!dateRange.start_date || !dateRange.end_date}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-gray-300 flex-shrink-0" />
            {[
              { key: 'today',      label: 'Today'      },
              { key: 'this_week',  label: 'This week'  },
              { key: 'this_month', label: 'This month' },
              { key: 'this_year',  label: 'This year'  },
              { key: 'all_time',   label: 'All time'   },
            ].map(p => (
              <PresetBtn key={p.key} label={p.label} active={activePreset === p.key} onClick={() => applyPreset(p.key)} />
            ))}

            <span className="text-gray-200 mx-0.5 select-none">|</span>

            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cutoff:</span>
            <input
              type="month"
              value={cutoffMonth}
              onChange={e => applyCutoff(e.target.value, cutoffHalf)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <CutoffPill
              label="1st – 15th"
              active={activePreset === 'cutoff' && cutoffHalf === 1}
              onClick={() => applyCutoff(cutoffMonth, 1)}
            />
            <CutoffPill
              label={`16th – ${cutoffLastDay}th`}
              active={activePreset === 'cutoff' && cutoffHalf === 2}
              onClick={() => applyCutoff(cutoffMonth, 2)}
            />

            <span className="text-gray-200 mx-0.5 select-none">|</span>

            <select
              value={filters.client_id}
              onChange={e => setFilters({ ...filters, client_id: e.target.value })}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">All clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={filters.branch_id}
              onChange={e => setFilters({ ...filters, branch_id: e.target.value })}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">All branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>

            {(filters.client_id || filters.branch_id) && (
              <button
                onClick={() => setFilters({ client_id: '', branch_id: '' })}
                className="text-xs text-red-400 hover:text-red-600 font-medium ml-1"
              >
                × Clear
              </button>
            )}

            <span className="ml-auto text-xs text-gray-400 font-medium hidden md:block">
              {periodLabel}
            </span>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl h-28 shadow-sm" />)}
            </div>
            <div className="bg-white rounded-xl h-64 shadow-sm" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl h-64 shadow-sm" />
              <div className="bg-white rounded-xl h-64 shadow-sm" />
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard label="Total applicants" value={totalApplicants.toLocaleString()} icon={Users}       color="blue"   sub="In selected period"                     />
              <KpiCard label="Hired"            value={hired}                            icon={CheckCircle} color="green"  sub="Successfully placed"                    />
              <KpiCard label="In-process"       value={active}                           icon={Briefcase}   color="yellow" sub="Active in pipeline"                     />
              <KpiCard label="Pooling"          value={pooling}                          icon={Users}       color="amber"  sub="In talent pool"                         />
              <KpiCard label="Conversion rate"  value={`${conversionRate}%`}             icon={TrendingUp}  color="purple" sub={`${hired} hired of ${totalApplicants}`}  />
            </div>

            {/* Row 1: Trend + Prospects by Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {trendData.length > 0 ? (
                <SectionCard title="Applicants over time" dot="#3b82f6"
                  action={
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block" /> Applicants</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-400 inline-block" /> Hired</span>
                    </div>
                  }
                >
                  <div style={{ height: 220 }}>
                    <Line data={trendChartData} options={trendChartOptions} />
                  </div>
                </SectionCard>
              ) : (
                <SectionCard title="Applicants over time" dot="#3b82f6">
                  <div className="flex items-center justify-center h-52 text-sm text-gray-400">
                    No trend data for this period
                  </div>
                </SectionCard>
              )}

              {/* Prospects by Status — replaces status donut */}
              <SectionCard
                title="Prospects by status"
                dot="#14b8a6"
                action={
                  <span className="text-xs text-gray-400">{totalProspects} total prospects</span>
                }
              >
                {prospectsData.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">No prospect data available</p>
                ) : (
                  <div className="space-y-3">
                    {prospectsData.map((item, i) => (
                      <ProspectStatusBar
                        key={i}
                        status={item.status}
                        count={item.count}
                        max={maxProspects}
                      />
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Row 2: Source bar + Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="Applicants by source" dot="#6366f1">
                {sourceData.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">No data for this period</p>
                ) : (
                  <div style={{ height: Math.max(sortedSource.length * 36 + 40, 180) }}>
                    <Bar data={sourceChartData} options={sourceChartOptions} />
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Recruitment funnel" dot="#22c55e">
                {funnelStages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">No data for this period</p>
                ) : (
                  <FunnelViz stages={funnelStages} />
                )}
              </SectionCard>
            </div>

            {/* Branch performance */}
            <SectionCard
              title="Branch performance"
              dot="#8b5cf6"
              action={
                <div className="flex items-center gap-3 flex-wrap">
                  {uniqueClients.map(c => (
                    <span key={c.key} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ background: c.color }} />
                      {c.label}
                    </span>
                  ))}
                </div>
              }
            >
              {branchData.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No data for this period</p>
              ) : (
                <div style={{ height: 200 }}>
                  <Bar data={branchChartData} options={branchChartOptions} />
                </div>
              )}
            </SectionCard>

            {/* Top Recruiters */}
            <SectionCard
              title="Top recruiters"
              dot="#eab308"
              action={<span className="text-xs text-gray-400">Top 10 · this period</span>}
            >
              {recruitersData.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">No recruiter data for this period</p>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-2 pb-2 border-b border-gray-100 text-xs text-gray-400 font-medium">
                    <span className="ml-auto">Added</span>
                    <span>Hired</span>
                    <span>Rate</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                    {recruitersData.map((recruiter, i) => (
                      <RecruiterRow
                        key={recruiter.id}
                        recruiter={recruiter}
                        rank={i + 1}
                        maxAdded={maxAdded}
                      />
                    ))}
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