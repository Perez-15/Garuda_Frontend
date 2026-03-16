// pages/Attendance/TeamAttendancePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { getTeamAttendance } from '../../services/attendanceService';
import { userService } from '../../services/userService';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { X } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(value) {
  if (!value) return '—';
  const [h, m] = value.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
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

// ── Attendance policy ─────────────────────────────────────────────────────────
// Work hours: 08:00 – 17:00
// Late threshold: time_in after 08:15 (i.e. 08:16+ is Late)
const LATE_CUTOFF_MINS = 8 * 60 + 16; // 496 minutes from midnight

function toMins(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Returns "Xh Ym" from time_in → time_out, or "—" when incomplete.
 */
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

/**
 * Returns "+Xm" (minutes past 08:16) when Late, otherwise "—".
 */
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

// ─── Filter Tab ───────────────────────────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamAttendancePage() {
  const todayStr = toDateString(new Date());

  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [filterMode,     setFilterMode]     = useState('day');
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

  useEffect(() => {
    userService.getAll({ per_page: 100 })
      .then((res) => setEmployees(res.data || []))
      .catch(() => {});
  }, []);

  const filteredEmployees = filterDept
    ? employees.filter((u) => u.roles?.[0]?.name === filterDept)
    : employees;

  useEffect(() => {
    setFilterEmployee('');
  }, [filterDept]);

  const buildParams = useCallback(() => {
    const params = { per_page: 200 };
    if (filterMode === 'day') {
      params.date = selectedDay;
    } else if (filterMode === 'week') {
      const { start, end } = getWeekRange(weekOffset);
      params.date_from = toDateString(start);
      params.date_to   = toDateString(end);
    } else {
      params.month = month;
    }
    if (filterStatus)   params.status      = filterStatus;
    if (filterDept)     params.role        = filterDept;
    if (filterEmployee) params.user_id     = filterEmployee;
    return params;
  }, [filterMode, selectedDay, weekOffset, month, filterStatus, filterDept, filterEmployee]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeamAttendance(buildParams());
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  const records      = data?.data ?? [];
  const totalCount   = records.length;
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

  return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Attendance</h1>
            <p className="text-sm text-gray-400 mt-0.5">View attendance records for all internal staff.</p>
          </div>

{/* Filter Card */}
<div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 space-y-4">

  {/* Period tabs */}
  <div className="flex flex-wrap gap-2">
    <FilterTab label="By Day"   active={filterMode === 'day'}   onClick={() => setFilterMode('day')} />
    <FilterTab label="By Week"  active={filterMode === 'week'}  onClick={() => setFilterMode('week')} />
    <FilterTab label="By Month" active={filterMode === 'month'} onClick={() => setFilterMode('month')} />
  </div>

  {/* All filters in one row */}
  <div className="flex flex-wrap items-center gap-3">

    {/* Date selector */}
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
    {filterMode === 'month' && (
      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900" />
    )}

    {/* Department */}
    <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900">
      {DEPARTMENTS.map((d) => (
        <option key={d.key} value={d.key}>{d.label}</option>
      ))}
    </select>

    {/* Employee */}
    <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900">
      <option value="">All Employees</option>
      {filteredEmployees.map((u) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>

    {/* Status pills — pushed to the right */}
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

  {/* Active filter chips + clear */}
  {hasActiveFilters && (
    <div className="flex flex-wrap items-center gap-2 pt-1">
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
      <button onClick={clearFilters}
        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 ml-auto">
        <X className="h-3.5 w-3.5" /> Clear filters
      </button>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                      <th className="px-6 py-3">Employee</th>
                      <th className="px-6 py-3">Department</th>
                      {filterMode !== 'day' && <th className="px-6 py-3">Date</th>}
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
                        <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-medium text-gray-800">{rec.user?.name ?? '—'}</div>
                            <div className="text-xs text-gray-400">{rec.user?.email}</div>
                          </td>
                          <td className="px-6 py-3.5 text-gray-500">
                            {formatDept(rec.user?.roles?.[0]?.name ?? rec.user?.department)}
                          </td>
                          {filterMode !== 'day' && (
                            <td className="px-6 py-3.5 text-gray-500">
                              {new Date(rec.date + 'T00:00:00').toLocaleDateString('en-PH', {
                                month: 'short', day: 'numeric',
                              })}
                            </td>
                          )}
                          <td className="px-6 py-3.5 text-gray-600 tabular-nums">{formatTime(rec.time_in)}</td>
                          <td className="px-6 py-3.5 text-gray-600 tabular-nums">{formatTime(rec.time_out)}</td>
                          <td className="px-6 py-3.5"><StatusBadge status={rec.status} /></td>
                          <td className="px-6 py-3.5 tabular-nums">
                            {rec.status === 'Late' ? (
                              <span className="text-amber-600 font-medium">
                                {calcLateBy(rec.time_in, rec.status)}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 tabular-nums">
                            {calcHoursWorked(rec.time_in, rec.time_out) === '—' ? (
                              <span className="text-gray-300">—</span>
                            ) : (
                              <span className="text-gray-700 font-medium">
                                {calcHoursWorked(rec.time_in, rec.time_out)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={filterMode !== 'day' ? 8 : 7}
                          className="px-6 py-12 text-center text-gray-400 text-sm"
                        >
                          No attendance records found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </DashboardLayout>
  );
}