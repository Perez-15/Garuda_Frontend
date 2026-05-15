import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getTeamAttendance } from '../../services/attendanceService';
import { userService } from '../../services/userService';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axios from 'axios';
import { X } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAutoCutoffHalf(date) {
  const d = new Date(date);
  const day = d.getDate();
  return day <= 15 ? 1 : 2;
}

function formatTime(value) {
  if (!value) return '—';
  const d = new Date(`1970-01-01T${value}`);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function toDateString(date) {
  return date.toISOString().split('T')[0];
}

function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const distToMonday = day === 0 ? 6 : day - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - distToMonday + offsetWeeks * 7);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 5);
  return { start: startOfWeek, end: endOfWeek };
}

function getLastDayOfMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

function getCutoffRange(monthStr, half) {
  const last = getLastDayOfMonth(monthStr);
  const lastStr = String(last).padStart(2, '0');
  if (half === 1)      return { from: `${monthStr}-01`, to: `${monthStr}-15` };
  if (half === 2)      return { from: `${monthStr}-16`, to: `${monthStr}-${lastStr}` };
  if (half === 'full') return { from: `${monthStr}-01`, to: `${monthStr}-${lastStr}` };
}

const LATE_CUTOFF_MINS = 8 * 60 + 16;

function toMins(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function calcHoursWorked(timeIn, timeOut) {
  const inMins  = toMins(timeIn);
  const outMins = toMins(timeOut);
  if (inMins === null || outMins === null) return '—';
  const diff = outMins - inMins;
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function calcLateBy(timeIn, status) {
  if (status !== 'Late') return '—';
  const inMins = toMins(timeIn);
  if (inMins === null) return '—';
  const late = inMins - LATE_CUTOFF_MINS;
  return late > 0 ? `+${late}m` : '—';
}

const DEPARTMENTS = [
  { key: '',                   label: 'All Departments'    },
  { key: 'hr_admin',           label: 'HR'                 },
  { key: 'talent_acquisition', label: 'Talent Acquisition' },
  { key: 'accounting',         label: 'Accounting'         },
  { key: 'marketing',          label: 'Marketing'          },
  { key: 'super_admin',        label: 'Super Admin'        },
];

function formatDept(role) {
  const map = {
    hr_admin:           'HR',
    talent_acquisition: 'Talent Acquisition',
    accounting:         'Accounting',
    marketing:          'Marketing',
    super_admin:        'Super Admin',
  };
  return map[role] ?? (role ? role.replace('_', ' ') : '—');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Present: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Late:    'bg-amber-50 text-amber-700 border border-amber-200',
    Absent:  'bg-red-50 text-red-600 border border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red:   'bg-red-50 text-red-600 border-red-100',
    blue:  'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1 ${colors[color]}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium opacity-75">{label}</span>
    </div>
  );
}

function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
        ${active ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
    >
      {label}
    </button>
  );
}

function CutoffPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all
        ${active
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
    >
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamAttendancePage() {
  const todayStr = toDateString(new Date());

  const [records,        setRecords]        = useState([]);
  const [totalCount,     setTotalCount]     = useState(0);
  const [page,           setPage]           = useState(1);
  const [hasMore,        setHasMore]        = useState(true);
  const [loading,        setLoading]        = useState(true);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [exportLoading,  setExportLoading]  = useState(false);
  const [filterMode,     setFilterMode]     = useState('cutoff');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterDept,     setFilterDept]     = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [selectedDay,    setSelectedDay]    = useState(todayStr);
  const [weekOffset,     setWeekOffset]     = useState(0);
  const [employees,      setEmployees]      = useState([]);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [cutoffHalf, setCutoffHalf] = useState(1);

  const sentinelRef        = useRef(null);
  const observerRef        = useRef(null);
  const fetchIdRef         = useRef(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    userService.getAll({ per_page: 100 })
      .then((res) => setEmployees(res.data || []))
      .catch(() => {});
  }, []);

  const filteredEmployees = filterDept
    ? employees.filter((u) => u.roles?.[0]?.name === filterDept)
    : employees;

  useEffect(() => { setFilterEmployee(''); }, [filterDept]);

  useEffect(() => {
    const today = new Date();
    setCutoffHalf(getAutoCutoffHalf(today));
  }, []);

  const cutoffLabel = (() => {
    const monthName = new Date(`${month}-01`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    if (cutoffHalf === 1)      return `${monthName} · 1–15`;
    if (cutoffHalf === 2)      return `${monthName} · 16–${getLastDayOfMonth(month)}`;
    if (cutoffHalf === 'full') return `${monthName} · Full Month`;
  })();

  const buildParams = useCallback((pageNum) => {
    const params = { per_page: 15, page: pageNum };
    if (filterMode === 'day') {
      params.date = selectedDay;
    } else if (filterMode === 'week') {
      const { start, end } = getWeekRange(weekOffset);
      params.date_from = toDateString(start);
      params.date_to   = toDateString(end);
    } else if (filterMode === 'cutoff') {
      const { from, to } = getCutoffRange(month, cutoffHalf);
      params.date_from = from;
      params.date_to   = to;
    }
    if (filterStatus)   params.status  = filterStatus;
    if (filterDept)     params.role    = filterDept;
    if (filterEmployee) params.user_id = filterEmployee;
    return params;
  }, [filterMode, selectedDay, weekOffset, month, cutoffHalf, filterStatus, filterDept, filterEmployee]);

  // ── Reset + load page 1 whenever filters change ───────────────────────────
  useEffect(() => {
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;

    setRecords([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);

    getTeamAttendance(buildParams(1))
      .then((res) => {
        if (fetchIdRef.current !== currentFetchId) return;
        const incoming = res.data ?? [];
        setRecords(incoming);
        setTotalCount(res.total ?? 0);
        setHasMore(incoming.length > 0 && (res.current_page * res.per_page) < (res.total ?? 0));
      })
      .finally(() => {
        if (fetchIdRef.current !== currentFetchId) return;
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, selectedDay, weekOffset, month, cutoffHalf, filterStatus, filterDept, filterEmployee]);

  // ── Export PDF ────────────────────────────────────────────────────────────
  // FIX 1: Replaced hardcoded `http://127.0.0.1:8000/api/v1/...` with apiClient.
  //         apiClient already has the base URL from the environment variable and
  //         automatically attaches the Authorization header — no manual token
  //         reading from localStorage needed.
  // FIX 2: Removed `localStorage.getItem('token')` — apiClient handles this.
  // FIX 3: Added loading state so the button is disabled during export,
  //         preventing the user from triggering multiple simultaneous downloads.
  const handleExportPdf = async () => {
    setExportLoading(true);
    try {
      // Build the same filter params used for the table view
      const params = {};

      if (filterMode === 'day') {
        params.date = selectedDay;
      } else if (filterMode === 'week') {
        const { start, end } = getWeekRange(weekOffset);
        params.date_from = toDateString(start);
        params.date_to   = toDateString(end);
      } else if (filterMode === 'cutoff') {
        const { from, to } = getCutoffRange(month, cutoffHalf);
        params.date_from = from;
        params.date_to   = to;
      }

      if (filterStatus)   params.status  = filterStatus;
      if (filterDept)     params.role    = filterDept;
      if (filterEmployee) params.user_id = filterEmployee;

      // apiClient sends the Authorization header automatically.
      // responseType: 'blob' tells axios to treat the response as a binary
      // file (PDF bytes) instead of trying to parse it as JSON.
      const response = await apiClient.get('/attendance/team/export', {
        params,
        responseType: 'blob',
        headers: {
          Accept: 'application/pdf',
        },
      });

      // Create a temporary download link and click it programmatically.
      // This triggers the browser's native file download without navigating away.
      const url = URL.createObjectURL(response.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = 'attendance_report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Release the object URL from memory after the download starts.
      URL.revokeObjectURL(url);

    } catch (err) {
      // If the server rejects the request (403, 500, etc.), alert the user.
      // The apiClient interceptor already handles 401 globally.
      const status = err?.response?.status;
      if (status === 403) {
        alert('You do not have permission to export attendance records.');
      } else {
        alert('Failed to export PDF. Please try again.');
      }
    } finally {
      setExportLoading(false);
    }
  };

  // ── Load next page (append) ───────────────────────────────────────────────
  const hasMoreRef     = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);

  useEffect(() => { hasMoreRef.current = hasMore; },       [hasMore]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;

    const nextPage       = page + 1;
    const currentFetchId = fetchIdRef.current;

    setLoadingMore(true);
    getTeamAttendance(buildParams(nextPage))
      .then((res) => {
        if (fetchIdRef.current !== currentFetchId) return;
        const incoming = res.data ?? [];
        setRecords((prev) => [...prev, ...incoming]);
        setPage(nextPage);
        setHasMore(incoming.length > 0 && (res.current_page * res.per_page) < (res.total ?? 0));
      })
      .finally(() => {
        if (fetchIdRef.current !== currentFetchId) return;
        setLoadingMore(false);
      });
  }, [page, buildParams]);

  // ── IntersectionObserver on sentinel ─────────────────────────────────────
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: null, rootMargin: '100px', threshold: 0 }
    );

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);

    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  const presentCount = records.filter(r => r.status === 'Present').length;
  const lateCount    = records.filter(r => r.status === 'Late').length;
  const absentCount  = records.filter(r => r.status === 'Absent').length;

  const { start: wStart, end: wEnd } = getWeekRange(weekOffset);
  const weekLabel = `${wStart.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${wEnd.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const hasActiveFilters = filterDept || filterEmployee || filterStatus;

  const clearFilters = () => {
    setFilterDept('');
    setFilterEmployee('');
    setFilterStatus('');
  };

  const showDateCol = filterMode !== 'day';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Attendance</h1>
            <p className="text-sm text-gray-400 mt-0.5">View attendance records for all internal staff.</p>
          </div>
          {/* Export button is disabled while a download is already in progress */}
          <button
            onClick={handleExportPdf}
            disabled={exportLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors shadow-sm
              ${exportLoading
                ? 'bg-green-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'}`}
          >
            {exportLoading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Exporting…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                Export PDF
              </>
            )}
          </button>
        </div>

        {/* Filter Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex flex-wrap gap-2">
              <FilterTab label="By Day"    active={filterMode === 'day'}    onClick={() => setFilterMode('day')} />
              <FilterTab label="By Week"   active={filterMode === 'week'}   onClick={() => setFilterMode('week')} />
              <FilterTab label="By Cutoff" active={filterMode === 'cutoff'} onClick={() => setFilterMode('cutoff')} />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">All Employees</option>
                {filteredEmployees.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {filterMode === 'day' && (
              <input type="date" value={selectedDay} max={todayStr}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900" />
            )}

            {filterMode === 'week' && (
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => w - 1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center">‹</button>
                <span className="text-sm font-medium text-gray-700 min-w-[210px] text-center">{weekLabel}</span>
                <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset === 0}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center disabled:opacity-30">›</button>
              </div>
            )}

            {filterMode === 'cutoff' && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <CutoffPill label="1st – 15th"                           active={cutoffHalf === 1}      onClick={() => setCutoffHalf(1)} />
                <CutoffPill label={`16th – ${getLastDayOfMonth(month)}th`} active={cutoffHalf === 2}    onClick={() => setCutoffHalf(2)} />
                <CutoffPill label="Full Month"                            active={cutoffHalf === 'full'} onClick={() => setCutoffHalf('full')} />
              </div>
            )}

            <div className="flex gap-1.5 ml-auto flex-wrap">
              {['', 'Present', 'Late', 'Absent'].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                    ${filterStatus === s
                      ? s === ''        ? 'bg-gray-900 text-white border-gray-900'
                      : s === 'Present' ? 'bg-emerald-600 text-white border-emerald-600'
                      : s === 'Late'    ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                  {s === '' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          {(hasActiveFilters || filterMode === 'cutoff') && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {filterMode === 'cutoff' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  📅 {cutoffLabel}
                </span>
              )}
              {filterDept && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {DEPARTMENTS.find(d => d.key === filterDept)?.label}
                  <button onClick={() => setFilterDept('')} className="hover:text-indigo-900"><X className="h-3 w-3" /></button>
                </span>
              )}
              {filterEmployee && (() => {
                const emp = employees.find(u => String(u.id) === String(filterEmployee));
                return emp ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {emp.name}
                    <button onClick={() => setFilterEmployee('')} className="hover:text-blue-900"><X className="h-3 w-3" /></button>
                  </span>
                ) : null;
              })()}
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 ml-auto">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Records" value={totalCount}   color="blue"  />
          <StatCard label="Present"       value={presentCount} color="green" />
          <StatCard label="Late"          value={lateCount}    color="amber" />
          <StatCard label="Absent"        value={absentCount}  color="red"   />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="overflow-y-auto overflow-x-auto"
              style={{ maxHeight: '520px' }}
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Department</th>
                    {showDateCol && <th className="px-6 py-3">Date</th>}
                    <th className="px-6 py-3">Time In</th>
                    <th className="px-6 py-3">Time Out</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Late By</th>
                    <th className="px-6 py-3">Hours Worked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.length > 0 ? (
                    records.map((rec) => (
                      <tr key={`${rec.user?.id}-${rec.date}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-medium text-gray-800">{rec.user?.name ?? '—'}</div>
                          <div className="text-xs text-gray-400">{rec.user?.email}</div>
                        </td>
                        <td className="px-6 py-3.5 text-gray-500">
                          {formatDept(rec.user?.roles?.[0]?.name ?? rec.user?.department)}
                        </td>
                        {showDateCol && (
                          <td className="px-6 py-3.5 text-gray-500">{formatDate(rec.date)}</td>
                        )}
                        <td className="px-6 py-3.5 text-gray-600 tabular-nums">{formatTime(rec.time_in)}</td>
                        <td className="px-6 py-3.5 text-gray-600 tabular-nums">{formatTime(rec.time_out)}</td>
                        <td className="px-6 py-3.5"><StatusBadge status={rec.status} /></td>
                        <td className="px-6 py-3.5 tabular-nums">
                          {rec.status === 'Late' ? (
                            <span className="text-amber-600 font-medium">{calcLateBy(rec.time_in, rec.status)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 tabular-nums">
                          {calcHoursWorked(rec.time_in, rec.time_out) === '—' ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <span className="text-gray-700 font-medium">{calcHoursWorked(rec.time_in, rec.time_out)}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={showDateCol ? 8 : 7} className="px-6 py-12 text-center text-gray-400 text-sm">
                        No attendance records found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Sentinel + load-more indicator */}
              <div ref={sentinelRef} className="px-6 py-4 flex items-center justify-center min-h-[56px]">
                {loadingMore && (
                  <div className="w-full">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-2 py-3 border-t border-gray-50">
                        <div className="flex flex-col gap-1.5 w-40">
                          <div className="h-3 bg-gray-200 rounded-full animate-pulse w-28" />
                          <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-36" />
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-24" />
                        {showDateCol && <div className="h-3 bg-gray-200 rounded-full animate-pulse w-20" />}
                        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-16" />
                        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-16" />
                        <div className="h-5 bg-gray-200 rounded-full animate-pulse w-14" />
                        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-10" />
                        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-12" />
                      </div>
                    ))}
                    <div className="flex items-center justify-center gap-2 pt-3 pb-1">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                      <span className="text-xs text-gray-400">Loading more records…</span>
                    </div>
                  </div>
                )}
                {!loadingMore && !hasMore && records.length > 0 && (
                  <span className="text-xs text-gray-300">Showing all {totalCount} records</span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}