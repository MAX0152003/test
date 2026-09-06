import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  Legend 
} from 'recharts';
import { AttendanceRecord } from '../types';
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Layers, BarChart2, Calendar } from 'lucide-react';

interface AttendanceGraphProps {
  classId: string;
  classCode: string;
  className: string;
  records?: AttendanceRecord[];
  isDark?: boolean;
}

export default function AttendanceGraph({ 
  classId, 
  classCode, 
  className, 
  records = [], 
  isDark: propIsDark 
}: AttendanceGraphProps) {
  const [graphMode, setGraphMode] = useState<'pulse' | 'distribution'>('pulse');

  // Compute theme dynamically inside rendering
  const activeIsDark = propIsDark !== undefined 
    ? propIsDark 
    : typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const safeRecords = Array.isArray(records) ? records : [];

  // Filter records for this class
  const classRecords = useMemo(() => {
    return safeRecords
      .filter(r => r.classId === classId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [safeRecords, classId]);

  // Aggregate metrics
  const total = classRecords.length;
  const present = classRecords.filter(r => r.status === 'present').length;
  const late = classRecords.filter(r => r.status === 'late').length;
  const excused = classRecords.filter(r => r.status === 'excused').length;
  const absent = classRecords.filter(r => r.status === 'absent').length;

  const presentPercent = total > 0 ? Math.round((present / total) * 100) : 100;
  const latePercent = total > 0 ? Math.round((late / total) * 100) : 0;
  const excusedPercent = total > 0 ? Math.round((excused / total) * 100) : 0;
  const absentPercent = total > 0 ? Math.round((absent / total) * 100) : 0;

  // Aggregate by date for Recharts
  const chartData = useMemo(() => {
    if (classRecords.length === 0) {
      // Return 4 reference sample dates if no records yet
      return [
        { date: 'Session 1', fullDate: 'Initial Roster', rate: 100, present: 0, late: 0, excused: 0, absent: 0, total: 0 },
        { date: 'Session 2', fullDate: 'Lecture 2', rate: 100, present: 0, late: 0, excused: 0, absent: 0, total: 0 },
        { date: 'Session 3', fullDate: 'Lecture 3', rate: 100, present: 0, late: 0, excused: 0, absent: 0, total: 0 },
        { date: 'Session 4', fullDate: 'Current', rate: 100, present: 0, late: 0, excused: 0, absent: 0, total: 0 },
      ];
    }

    const map = new Map<string, AttendanceRecord[]>();
    classRecords.forEach(r => {
      const arr = map.get(r.date) || [];
      arr.push(r);
      map.set(r.date, arr);
    });

    const dates = Array.from(map.keys()).sort();

    return dates.map(dateStr => {
      const recs = map.get(dateStr) || [];
      const p = recs.filter(r => r.status === 'present').length;
      const l = recs.filter(r => r.status === 'late').length;
      const e = recs.filter(r => r.status === 'excused').length;
      const a = recs.filter(r => r.status === 'absent').length;
      const tot = recs.length;
      const rate = tot > 0 ? Math.round(((p + e + l * 0.7) / tot) * 100) : 100;

      let formattedDate = dateStr;
      try {
        const d = new Date(dateStr + 'T00:00:00');
        formattedDate = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } catch {
        // fallback to dateStr
      }

      return {
        date: formattedDate,
        rawDate: dateStr,
        fullDate: dateStr,
        rate,
        present: p,
        late: l,
        excused: e,
        absent: a,
        total: tot
      };
    });
  }, [classRecords]);

  // Custom rich tooltip with ClassPulse branding
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      const isBenchmarkMet = dataItem.rate >= 80;
      const presPct = dataItem.total > 0 ? Math.round((dataItem.present / dataItem.total) * 100) : 0;
      const latePct = dataItem.total > 0 ? Math.round((dataItem.late / dataItem.total) * 100) : 0;
      const excPct = dataItem.total > 0 ? Math.round((dataItem.excused / dataItem.total) * 100) : 0;
      const absPct = dataItem.total > 0 ? Math.round((dataItem.absent / dataItem.total) * 100) : 0;

      return (
        <div className="p-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl text-left text-xs space-y-2.5 min-w-[195px] pointer-events-none z-50">
          <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-1.5 font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                ClassPulse • Session Pulse
              </span>
            </div>
            <span className="text-[9px] font-mono text-zinc-400">{dataItem.total} logs</span>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold text-zinc-400 block uppercase">Session Date</span>
            <p className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 mt-0.5">{dataItem.date} {dataItem.fullDate && dataItem.fullDate !== dataItem.date ? `(${dataItem.fullDate})` : ''}</p>
          </div>

          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 text-[11px] font-mono">
            <span className="text-zinc-500 font-medium">Session Rate:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-black text-xs">{dataItem.rate}%</span>
              <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded font-mono ${
                isBenchmarkMet ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
              }`}>
                {isBenchmarkMet ? 'Met' : 'Below 80%'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px] font-mono">
            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Present
              </span>
              <span className="font-bold">{dataItem.present} ({presPct}%)</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Late
              </span>
              <span className="font-bold">{dataItem.late} ({latePct}%)</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Excused
              </span>
              <span className="font-bold">{dataItem.excused} ({excPct}%)</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-red-500/10 text-red-700 dark:text-red-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Absent
              </span>
              <span className="font-bold">{dataItem.absent} ({absPct}%)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Tally Metric Cards */}
      <div className={`grid ${excused > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-2.5 sm:gap-3`}>
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 text-left transition-all">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Present</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">{present}</span>
            <span className="text-xs text-zinc-400 font-mono">({presentPercent}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 text-left transition-all">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Late</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">{late}</span>
            <span className="text-xs text-zinc-400 font-mono">({latePercent}%)</span>
          </div>
        </div>

        {excused > 0 && (
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 text-left transition-all">
            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Excused</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">{excused}</span>
              <span className="text-xs text-zinc-400 font-mono">({excusedPercent}%)</span>
            </div>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 text-left transition-all">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Absent</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">{absent}</span>
            <span className="text-xs text-zinc-400 font-mono">({absentPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Main Recharts Graph Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-850">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 text-left">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              {classCode ? `${classCode} Attendance Analytics` : 'Attendance Pulse Trend'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Graph Mode */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl text-[10px] font-bold border border-zinc-200/60 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => setGraphMode('pulse')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  graphMode === 'pulse'
                    ? 'bg-white dark:bg-zinc-700 text-emerald-500 shadow-2xs font-black'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Rate (%)</span>
              </button>
              <button
                type="button"
                onClick={() => setGraphMode('distribution')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  graphMode === 'distribution'
                    ? 'bg-white dark:bg-zinc-700 text-emerald-500 shadow-2xs font-black'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                <span>Counts</span>
              </button>
            </div>

            <div className="text-[10px] font-mono text-emerald-500 flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span>{total} logs</span>
            </div>
          </div>
        </div>

        {/* Responsive Recharts Display */}
        <div className="h-48 sm:h-52 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {graphMode === 'pulse' ? (
              <AreaChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="classAttendanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke={activeIsDark ? '#27272a' : '#e4e4e7'} 
                />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={{ stroke: activeIsDark ? '#3f3f46' : '#d4d4d8' }}
                  tick={{ fill: activeIsDark ? '#a1a1aa' : '#71717a', fontSize: 10, fontWeight: 600 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 80, 100]}
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: activeIsDark ? '#a1a1aa' : '#71717a', fontSize: 10 }}
                  unit="%"
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                />
                <ReferenceLine 
                  y={80} 
                  stroke="#10b981" 
                  strokeDasharray="3 3" 
                  strokeWidth={1.5}
                  label={{ 
                    value: '80% Benchmark', 
                    position: 'insideTopLeft', 
                    fill: '#10b981', 
                    fontSize: 9, 
                    fontWeight: 700 
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  name="Attendance Rate %" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#classAttendanceGrad)"
                  dot={{ r: 4, strokeWidth: 1.5, stroke: '#ffffff', fill: '#10b981' }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barGap={3}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke={activeIsDark ? '#27272a' : '#e4e4e7'} 
                />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={{ stroke: activeIsDark ? '#3f3f46' : '#d4d4d8' }}
                  tick={{ fill: activeIsDark ? '#a1a1aa' : '#71717a', fontSize: 10, fontWeight: 600 }}
                />
                <YAxis 
                  allowDecimals={false}
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: activeIsDark ? '#a1a1aa' : '#71717a', fontSize: 10 }}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'rgba(16, 185, 129, 0.08)', radius: 6 }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '8px', fontSize: '10px', fontWeight: 600 }}
                />
                <Bar name="Present" dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar name="Late" dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar name="Excused" dataKey="excused" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar name="Absent" dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
