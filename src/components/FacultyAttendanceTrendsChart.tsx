import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  ReferenceLine 
} from 'recharts';
import { ClassSession, AttendanceRecord } from '../types';
import { BarChart3, TrendingUp, CheckCircle2, Clock, Filter, Calendar, Layers } from 'lucide-react';

interface FacultyAttendanceTrendsChartProps {
  classes: ClassSession[];
  records: AttendanceRecord[];
  isDark?: boolean;
}

interface DayTrendData {
  day: string;
  fullDate: string;
  dateKey: string;
  present: number;
  late: number;
  excused: number;
  absent: number;
  total: number;
  dailyRate: number;
  punctualityRate: number;
}

type ChartViewType = 'grouped' | 'stacked' | 'rate_curve';

export default function FacultyAttendanceTrendsChart({
  classes,
  records,
  isDark = false
}: FacultyAttendanceTrendsChartProps) {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0); // 0 = current week, -1 = last week
  const [chartView, setChartView] = useState<ChartViewType>('grouped');

  // Filter records belonging to the faculty's classes
  const facultyClassIds = useMemo(() => new Set(classes.map(c => c.id)), [classes]);

  // Filter records by selected class
  const relevantRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedClassFilter === 'all') {
        return facultyClassIds.has(r.classId);
      }
      return r.classId === selectedClassFilter;
    });
  }, [records, selectedClassFilter, facultyClassIds]);

  // Calculate days for the target week (Monday to Saturday)
  const weekDaysData: DayTrendData[] = useMemo(() => {
    const now = new Date();
    // Offset target date based on selected week
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (selectedWeekOffset * 7));
    
    // Find current week's Monday
    const dayOfWeek = targetDate.getDay(); // 0 is Sunday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + distanceToMonday);

    const days: DayTrendData[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 6; i++) {
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + i);
      
      const yyyy = currentDay.getFullYear();
      const mm = String(currentDay.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDay.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const fullDateStr = currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Aggregate records for this day
      const dayRecs = relevantRecords.filter(r => r.date === dateKey);
      const presentCount = dayRecs.filter(r => r.status === 'present').length;
      const lateCount = dayRecs.filter(r => r.status === 'late').length;
      const excusedCount = dayRecs.filter(r => r.status === 'excused').length;
      const absentCount = dayRecs.filter(r => r.status === 'absent').length;
      const totalCount = dayRecs.length;

      const dailyRate = totalCount > 0 
        ? Math.round(((presentCount + excusedCount + lateCount * 0.7) / totalCount) * 100) 
        : 100;
      
      const punctualityRate = (presentCount + lateCount) > 0
        ? Math.round((presentCount / (presentCount + lateCount)) * 100)
        : 100;

      days.push({
        day: dayNames[i],
        fullDate: fullDateStr,
        dateKey,
        present: presentCount,
        late: lateCount,
        excused: excusedCount,
        absent: absentCount,
        total: totalCount,
        dailyRate,
        punctualityRate
      });
    }

    return days;
  }, [relevantRecords, selectedWeekOffset]);

  // Summary totals for the week
  const weekSummary = useMemo(() => {
    const totalPresent = weekDaysData.reduce((acc, d) => acc + d.present, 0);
    const totalLate = weekDaysData.reduce((acc, d) => acc + d.late, 0);
    const totalExcused = weekDaysData.reduce((acc, d) => acc + d.excused, 0);
    const totalAbsent = weekDaysData.reduce((acc, d) => acc + d.absent, 0);
    const grandTotal = totalPresent + totalLate + totalExcused + totalAbsent;
    
    const attendanceRate = grandTotal > 0 ? Math.round(((totalPresent + totalExcused + totalLate * 0.7) / grandTotal) * 100) : 0;
    const punctualityRate = (totalPresent + totalLate) > 0 ? Math.round((totalPresent / (totalPresent + totalLate)) * 100) : 0;

    return {
      totalPresent,
      totalLate,
      totalExcused,
      totalAbsent,
      grandTotal,
      attendanceRate,
      punctualityRate
    };
  }, [weekDaysData]);

  // Custom tooltip for recharts with ClassPulse branding
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = weekDaysData.find(d => d.day === label);
      const total = dataItem?.total || 0;
      const presPct = total > 0 ? Math.round(((dataItem?.present || 0) / total) * 100) : 0;
      const latePct = total > 0 ? Math.round(((dataItem?.late || 0) / total) * 100) : 0;
      const excPct = total > 0 ? Math.round(((dataItem?.excused || 0) / total) * 100) : 0;
      const absPct = total > 0 ? Math.round(((dataItem?.absent || 0) / total) * 100) : 0;
      const isGood = (dataItem?.dailyRate || 0) >= 80;

      return (
        <div className="p-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl text-left text-xs space-y-2.5 font-sans min-w-[200px] pointer-events-none z-50">
          <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-1.5 font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                ClassPulse • Day Pulse
              </span>
            </div>
            <span className="text-[9px] text-zinc-400 font-mono">{total} Logs</span>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold text-zinc-400 block uppercase">{label} Session</span>
            <p className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 leading-tight mt-0.5">{dataItem?.fullDate}</p>
          </div>

          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 text-[11px] font-mono">
            <span className="text-zinc-500 font-medium">Daily Attendance:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-black text-xs">{dataItem?.dailyRate}%</span>
              <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded font-mono ${
                isGood ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
              }`}>
                {isGood ? 'Target Met' : 'Low'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px] font-mono">
            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Present
              </span>
              <span className="font-bold">{dataItem?.present || 0} ({presPct}%)</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Late
              </span>
              <span className="font-bold">{dataItem?.late || 0} ({latePct}%)</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Excused
              </span>
              <span className="font-bold">{dataItem?.excused || 0} ({excPct}%)</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-red-500/10 text-red-700 dark:text-red-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Absent
              </span>
              <span className="font-bold">{dataItem?.absent || 0} ({absPct}%)</span>
            </div>
          </div>

          {dataItem && (dataItem.present + dataItem.late) > 0 && (
            <div className="pt-1.5 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[9px] font-mono text-zinc-400">
              <span>On-Time Punctuality:</span>
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{dataItem.punctualityRate}%</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm text-left space-y-5">
      {/* Header section with title and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-900">
        <div className="space-y-0.5">
          <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-emerald-500" />
            Weekly Attendance & Punctuality Trends
          </h3>
          <p className="text-xs text-zinc-400">
            Real-time daily breakdown of total present vs. late student check-ins
          </p>
        </div>

        {/* Filter and week toggle controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart View Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setChartView('grouped')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                chartView === 'grouped'
                  ? 'bg-emerald-500 text-black shadow-xs font-black'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="Grouped Bar Breakdown"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Bars</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('stacked')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                chartView === 'stacked'
                  ? 'bg-emerald-500 text-black shadow-xs font-black'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="Stacked Volume Breakdown"
            >
              <Layers className="w-3 h-3" />
              <span>Stacked</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('rate_curve')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                chartView === 'rate_curve'
                  ? 'bg-emerald-500 text-black shadow-xs font-black'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="Rate % Curve"
            >
              <TrendingUp className="w-3 h-3" />
              <span>Rate %</span>
            </button>
          </div>

          {/* Week Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setSelectedWeekOffset(0)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedWeekOffset === 0
                  ? 'bg-emerald-500 text-black shadow-xs font-black'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setSelectedWeekOffset(-1)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedWeekOffset === -1
                  ? 'bg-emerald-500 text-black shadow-xs font-black'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Last Week
            </button>
          </div>

          {/* Subject Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="appearance-none pl-7 pr-7 py-1.5 text-xs font-bold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="all">All Classes ({classes.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.name}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-emerald-500 absolute left-2 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/15">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Present Logs
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-emerald-500 mt-1 font-mono">
            {weekSummary.totalPresent}
          </p>
          <p className="text-[9px] text-zinc-400 mt-0.5">On-time check-ins</p>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/15">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Late Check-ins
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-lg font-black text-amber-500 mt-1 font-mono">
            {weekSummary.totalLate}
          </p>
          <p className="text-[9px] text-zinc-400 mt-0.5">Delayed arrivals</p>
        </div>

        <div className="p-3 rounded-xl bg-sky-500/5 dark:bg-sky-950/20 border border-sky-500/15">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Excused Logs
            </span>
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <p className="text-lg font-black text-sky-500 mt-1 font-mono">
            {weekSummary.totalExcused}
          </p>
          <p className="text-[9px] text-zinc-400 mt-0.5">Valid excuse letters</p>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Punctuality Rate
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          {weekSummary.grandTotal > 0 ? (
            <>
              <p className="text-lg font-black text-zinc-800 dark:text-zinc-100 mt-1 font-mono">
                {weekSummary.punctualityRate}%
              </p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Present vs. Late ratio</p>
            </>
          ) : (
            <>
              <p className="text-xs font-black text-zinc-500 dark:text-zinc-400 mt-1.5 uppercase tracking-wide">
                No logs yet
              </p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Awaiting active session</p>
            </>
          )}
        </div>
      </div>

      {/* Main Chart Container */}
      {weekSummary.grandTotal > 0 ? (
        <div className="h-[260px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'rate_curve' ? (
              <AreaChart
                data={weekDaysData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="facultyRateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#27272a' : '#e4e4e7'}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: isDark ? '#3f3f46' : '#d4d4d8' }}
                  tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 11, fontWeight: 700 }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 80, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 10 }}
                  unit="%"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={80}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: '80% Good Standing Target',
                    position: 'insideTopLeft',
                    fill: '#10b981',
                    fontSize: 9,
                    fontWeight: 700
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="dailyRate"
                  name="Daily Attendance %"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#facultyRateGrad)"
                  dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : chartView === 'stacked' ? (
              <BarChart
                data={weekDaysData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                barSize={28}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#27272a' : '#e4e4e7'}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: isDark ? '#3f3f46' : '#d4d4d8' }}
                  tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 11, fontWeight: 700 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 10 }}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'rgba(161, 161, 170, 0.08)', radius: 8 }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar name="Present" dataKey="present" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar name="Late" dataKey="late" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar name="Excused" dataKey="excused" fill="#0ea5e9" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar name="Absent" dataKey="absent" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart
                data={weekDaysData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#27272a' : '#e4e4e7'}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: isDark ? '#3f3f46' : '#d4d4d8' }}
                  tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 11, fontWeight: 700 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 10 }}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'rgba(161, 161, 170, 0.08)', radius: 8 }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar
                  name="Present"
                  dataKey="present"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  name="Late"
                  dataKey="late"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  name="Excused"
                  dataKey="excused"
                  fill="#0ea5e9"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  name="Absent"
                  dataKey="absent"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[200px] w-full flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              No Attendance Records for This Period
            </p>
            <p className="text-[11px] text-zinc-400 max-w-sm">
              Generate an active QR code or start a classroom session to begin tracking real-time student check-ins and punctuality metrics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
