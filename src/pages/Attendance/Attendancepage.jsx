// pages/Attendance/AttendancePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  getTodayAttendance,
  recordTimeIn,
  recordTimeOut,
  getAttendanceHistory,
} from '../../services/attendanceService';
import { useGeolocation } from '../../hooks/Usegeolocation';
import DashboardLayout from '../../components/layout/DashboardLayout';


function formatTime(value) {
  if (!value) return '—';
  const [h, m] = value.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function toDateString(date) {
  return date.toISOString().split('T')[0];
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

function StatCard({ label, value, color }) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red:   'bg-red-50 text-red-600 border-red-100',
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

export default function AttendancePage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [todayRecord,   setTodayRecord]   = useState(null);
  const [history,       setHistory]       = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [toast,         setToast]         = useState(null);
  const [filterMode,    setFilterMode]    = useState('month');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [selectedDay,   setSelectedDay]   = useState(toDateString(new Date()));
  const [weekOffset,    setWeekOffset]    = useState(0);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { getPosition, loading: geoLoading, error: geoError } = useGeolocation();

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadToday = useCallback(async () => {
    try {
      const data = await getTodayAttendance();
      setTodayRecord(data.attendance);
    } catch (err) {
      showToast('error', err?.response?.data?.message ?? 'Failed to load attendance.');
    }
  }, [showToast]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      let params = { per_page: 50 };
      if (filterMode === 'day') {
        params.date_from = selectedDay;
        params.date_to   = selectedDay;
      } else if (filterMode === 'week') {
        const { start, end } = getWeekRange(weekOffset);
        params.date_from = toDateString(start);
        params.date_to   = toDateString(end);
      } else {
        params.month = month;
      }
      if (filterStatus) params.status = filterStatus;
      const data = await getAttendanceHistory(params);
      setHistory(data.data ?? []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [filterMode, selectedDay, weekOffset, month, filterStatus]);

  useEffect(() => {
    const loadPage = async () => {
      setPageLoading(true);
      await Promise.all([loadToday(), loadHistory()]);
      setPageLoading(false);
    };
    loadPage();
  }, [loadToday, loadHistory]);

  const handleTimeIn = async () => {
    setSubmitting(true);
    try {
      const pos = await getPosition();
      if (!pos.isWithinOffice) {
        showToast('error', `You must be inside the office to record attendance. (${pos.distance}m away)`);
        return;
      }
      const data = await recordTimeIn(pos.latitude, pos.longitude);
      showToast('success', data.message);
      await loadToday();
      await loadHistory();
    } catch (err) {
      showToast('error', err?.response?.data?.message ?? err.message ?? 'Time In failed.');
    } finally { setSubmitting(false); }
  };

  const handleTimeOut = async () => {
    setSubmitting(true);
    try {
      const pos = await getPosition();
      if (!pos.isWithinOffice) {
        showToast('error', `You must be inside the office to record attendance. (${pos.distance}m away)`);
        return;
      }
      const data = await recordTimeOut(pos.latitude, pos.longitude);
      showToast('success', data.message);
      await loadToday();
      await loadHistory();
    } catch (err) {
      showToast('error', err?.response?.data?.message ?? err.message ?? 'Time Out failed.');
    } finally { setSubmitting(false); }
  };

  const isWorking  = submitting || geoLoading;
  const canTimeIn  = !todayRecord?.time_in;
  const canTimeOut = todayRecord?.time_in && !todayRecord?.time_out;
  const isComplete = todayRecord?.time_in && todayRecord?.time_out;

  const presentCount = history.filter(r => r.status === 'Present').length;
  const lateCount    = history.filter(r => r.status === 'Late').length;
  const absentCount  = history.filter(r => r.status === 'Absent').length;

  const { start: wStart, end: wEnd } = getWeekRange(weekOffset);
  const weekLabel = `${wStart.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${wEnd.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  if (pageLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full" />
            <span className="text-sm">Loading attendance...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold
            ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'}`}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Attendance</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Today Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Today's Record</h2>
            {todayRecord && <StatusBadge status={todayRecord.status} />}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Time In</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {todayRecord?.time_in ? formatTime(todayRecord.time_in) : <span className="text-gray-300">—</span>}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Time Out</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {todayRecord?.time_out ? formatTime(todayRecord.time_out) : <span className="text-gray-300">—</span>}
                </p>
              </div>
            </div>

            {/* Hours Worked + Late By — shown once time_in exists */}
            {todayRecord?.time_in && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Hours Worked</p>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">
                    {calcHoursWorked(todayRecord.time_in, todayRecord.time_out) === '—'
                      ? <span className="text-gray-300">In progress</span>
                      : calcHoursWorked(todayRecord.time_in, todayRecord.time_out)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Late By</p>
                  <p className="text-xl font-bold tabular-nums">
                    {todayRecord.status === 'Late'
                      ? <span className="text-amber-500">{calcLateBy(todayRecord.time_in, todayRecord.status)}</span>
                      : <span className="text-gray-300">—</span>}
                  </p>
                </div>
              </div>
            )}

            {isComplete ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-emerald-600 text-sm font-semibold">✓ Attendance complete for today</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleTimeIn} disabled={!canTimeIn || isWorking}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all
                    ${canTimeIn && !isWorking ? 'bg-gray-900 hover:bg-gray-800 text-white shadow-sm' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                  {isWorking && canTimeIn
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Locating…
                      </span>
                    : '🟢  Time In'}
                </button>
                <button onClick={handleTimeOut} disabled={!canTimeOut || isWorking}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all
                    ${canTimeOut && !isWorking ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                  {isWorking && canTimeOut
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Locating…
                      </span>
                    : '🔴  Time Out'}
                </button>
              </div>
            )}
            {geoError && <p className="mt-3 text-xs text-red-500 text-center">{geoError}</p>}
            <p className="mt-3 text-xs text-gray-400 text-center">📍 GPS location is verified against the office address</p>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Attendance History</h2>

            {/* Period tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              <FilterTab label="By Day"   active={filterMode === 'day'}   onClick={() => setFilterMode('day')} />
              <FilterTab label="By Week"  active={filterMode === 'week'}  onClick={() => setFilterMode('week')} />
              <FilterTab label="By Month" active={filterMode === 'month'} onClick={() => setFilterMode('month')} />
            </div>

            {/* Period + status filters */}
            <div className="flex flex-wrap items-center gap-3">
              {filterMode === 'day' && (
                <input type="date" value={selectedDay} max={toDateString(new Date())}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900" />
              )}
              {filterMode === 'week' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setWeekOffset(w => w - 1)}
                    className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center">‹</button>
                  <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">{weekLabel}</span>
                  <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset === 0}
                    className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center disabled:opacity-30">›</button>
                </div>
              )}
              {filterMode === 'month' && (
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900" />
              )}

              {/* Status buttons */}
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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-100">
            <StatCard label="Present" value={presentCount} color="green" />
            <StatCard label="Late"    value={lateCount}    color="amber" />
            <StatCard label="Absent"  value={absentCount}  color="red"   />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Day</th>
                  <th className="px-6 py-3">Time In</th>
                  <th className="px-6 py-3">Time Out</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Late By</th>
                  <th className="px-6 py-3">Hours Worked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex items-center justify-center gap-3 text-gray-400 text-sm">
                        <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full" />
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : history.length > 0 ? (
                  history.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-gray-800">{formatDate(rec.date)}</td>
                      <td className="px-6 py-3.5 text-gray-400">
                        {rec.date && !isNaN(new Date(rec.date))
                          ? new Date(rec.date).toLocaleDateString('en-PH', { weekday: 'short' })
                          : '—'}
                      </td>
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
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                      No attendance records found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}