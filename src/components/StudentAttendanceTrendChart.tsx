import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { AttendanceRecord, ClassSession, Enrollment, UserProfile } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Filter, 
  Layers, 
  Activity, 
  Info,
  ShieldCheck,
  Award,
  Sparkles
} from 'lucide-react';

interface StudentAttendanceTrendChartProps {
  records: AttendanceRecord[];
  classes: ClassSession[];
  enrollments: Enrollment[];
  userProfile: UserProfile;
  onOpenScanner?: () => void;
  onDownloadReport?: () => void;
}

type ChartViewMode = 'rate_trend' | 'status_area' | 'punctuality';
type TimeRangeMode = '7d' | '14d' | '30d' | 'all';

interface TrendPoint {
  date: string;
  displayDate: string;
  rawDate: string;
  sessionCount: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  dailyRate: number;
  cumulativeRate: number;
  punctualityRate: number;
  classNames: string[];
  records: AttendanceRecord[];
}

export const StudentAttendanceTrendChart: React.FC<StudentAttendanceTrendChartProps> = React.memo(({
  records,
  classes,
  enrollments,
  userProfile,
  onOpenScanner,
  onDownloadReport
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('rate_trend');
  const [timeRange, setTimeRange] = useState<TimeRangeMode>('30d');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Filter enrolled classes for this student
  const studentEnrolledClasses = useMemo(() => {
    return classes.filter(cls =>
      enrollments.some(
        e => e.classId === cls.id &&
             (e.studentId === userProfile.studentId || e.studentEmail === userProfile.email) &&
             !e.deletedByStudent
      )
    );
  }, [classes, enrollments, userProfile]);

  const enrolledClassIds = useMemo(() => {
    return new Set(studentEnrolledClasses.map(c => c.id));
  }, [studentEnrolledClasses]);

  // Filter records belonging to this student and enrolled classes
  const studentRecords = useMemo(() => {
    return records
      .filter(r => {
        const isStudent = r.studentId === userProfile.studentId ||
                          r.studentName === userProfile.name ||
                          (userProfile.email && r.studentId === userProfile.email);
        if (!isStudent) return false;
        if (!enrolledClassIds.has(r.classId)) return false;
        if (selectedSubject !== 'all' && r.classId !== selectedSubject) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = a.date + ' ' + (a.time || '00:00');
        const dateB = b.date + ' ' + (b.time || '00:00');
        return dateA.localeCompare(dateB);
      });
  }, [records, userProfile, enrolledClassIds, selectedSubject]);

  // Aggregate time series trend points
  const trendData = useMemo(() => {
    if (studentRecords.length === 0) {
      return [];
    }

    // Determine cutoff date for timeRange
    const now = new Date();
    let cutoffDateStr = '';
    if (timeRange === '7d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      cutoffDateStr = d.toISOString().split('T')[0];
    } else if (timeRange === '14d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 14);
      cutoffDateStr = d.toISOString().split('T')[0];
    } else if (timeRange === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      cutoffDateStr = d.toISOString().split('T')[0];
    }

    const filteredRecords = cutoffDateStr 
      ? studentRecords.filter(r => r.date >= cutoffDateStr)
      : studentRecords;

    if (filteredRecords.length === 0) {
      return [];
    }

    // Group by unique date
    const dateMap = new Map<string, AttendanceRecord[]>();
    filteredRecords.forEach(r => {
      const group = dateMap.get(r.date) || [];
      group.push(r);
      dateMap.set(r.date, group);
    });

    // Sort dates chronologically
    const sortedDates = Array.from(dateMap.keys()).sort();

    let cumulativePresent = 0;
    let cumulativeLate = 0;
    let cumulativeExcused = 0;
    let cumulativeAbsent = 0;
    let cumulativeTotal = 0;

    const points: TrendPoint[] = sortedDates.map(dateStr => {
      const dayRecs = dateMap.get(dateStr) || [];
      const present = dayRecs.filter(r => r.status === 'present').length;
      const late = dayRecs.filter(r => r.status === 'late').length;
      const excused = dayRecs.filter(r => r.status === 'excused').length;
      const absent = dayRecs.filter(r => r.status === 'absent').length;
      const sessionCount = dayRecs.length;

      cumulativePresent += present;
      cumulativeLate += late;
      cumulativeExcused += excused;
      cumulativeAbsent += absent;
      cumulativeTotal += sessionCount;

      const dailyRate = sessionCount > 0 
        ? Math.round(((present + excused + late * 0.7) / sessionCount) * 100)
        : 100;

      const cumulativeRate = cumulativeTotal > 0
        ? Math.round(((cumulativePresent + cumulativeExcused + cumulativeLate * 0.7) / cumulativeTotal) * 100)
        : 100;

      const punctualityRate = (present + late) > 0
        ? Math.round((present / (present + late)) * 100)
        : 100;

      const dObj = new Date(dateStr + 'T00:00:00');
      const displayDate = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const classNames = Array.from(new Set(dayRecs.map(r => r.classCode || r.className || 'Class')));

      return {
        date: displayDate,
        displayDate,
        rawDate: dateStr,
        sessionCount,
        present,
        late,
        absent,
        excused,
        dailyRate,
        cumulativeRate,
        punctualityRate,
        classNames,
        records: dayRecs
      };
    });

    return points;
  }, [studentRecords, timeRange]);

  // Overall calculations
  const metrics = useMemo(() => {
    const total = studentRecords.length;
    const presents = studentRecords.filter(r => r.status === 'present').length;
    const lates = studentRecords.filter(r => r.status === 'late').length;
    const excused = studentRecords.filter(r => r.status === 'excused').length;
    const absents = studentRecords.filter(r => r.status === 'absent').length;

    const rate = total > 0 ? Math.round(((presents + excused + lates * 0.7) / total) * 100) : 100;
    const punctuality = (presents + lates) > 0 ? Math.round((presents / (presents + lates)) * 100) : 100;

    // Trajectory calculation (compare last half vs first half of trend points)
    let trajectory: 'up' | 'down' | 'steady' = 'steady';
    let delta = 0;
    if (trendData.length >= 2) {
      const half = Math.floor(trendData.length / 2);
      const firstHalf = trendData.slice(0, half);
      const secondHalf = trendData.slice(half);

      const avg1 = firstHalf.reduce((acc, p) => acc + p.dailyRate, 0) / firstHalf.length;
      const avg2 = secondHalf.reduce((acc, p) => acc + p.dailyRate, 0) / secondHalf.length;
      delta = Math.round(avg2 - avg1);

      if (delta > 2) trajectory = 'up';
      else if (delta < -2) trajectory = 'down';
      else trajectory = 'steady';
    }

    let standingLabel = 'Good Standing';
    let standingClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (rate < 70 || absents >= 4) {
      standingLabel = 'Critical Risk';
      standingClass = 'text-red-500 bg-red-500/10 border-red-500/30';
    } else if (rate < 80 || absents >= 2 || lates >= 4) {
      standingLabel = 'Warning Threshold';
      standingClass = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    }

    return {
      total,
      presents,
      lates,
      excused,
      absents,
      rate,
      punctuality,
      trajectory,
      delta,
      standingLabel,
      standingClass
    };
  }, [studentRecords, trendData]);

  // Custom Interactive Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TrendPoint;
      return (
        <div className="bg-white dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-left text-xs min-w-[200px] space-y-2 pointer-events-none">
          <div className="border-b border-zinc-150 dark:border-zinc-850 pb-1.5 flex items-center justify-between">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{data.displayDate}</span>
            <span className="text-[10px] font-mono text-zinc-400">{data.rawDate}</span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Cumulative Rate:
              </span>
              <span className="font-black text-xs">{data.cumulativeRate}%</span>
            </div>

            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
              <span>Day Check-ins:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{data.sessionCount} class{data.sessionCount > 1 ? 'es' : ''}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-900 text-[10px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Present: {data.present}</span>
              <span className="text-amber-500 font-bold">Late: {data.late}</span>
              <span className="text-red-500 font-bold">Absent: {data.absent}</span>
            </div>
          </div>

          {data.classNames.length > 0 && (
            <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap gap-1">
              {data.classNames.map((cName, idx) => (
                <span 
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300"
                >
                  {cName}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm space-y-4 text-left">
      {/* Top Header & Interactive Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-900">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
              Attendance Trend & Punctuality Line Chart
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${metrics.standingClass} flex items-center gap-1`}>
              <ShieldCheck className="w-3 h-3" />
              {metrics.standingLabel}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time chronological trajectory of attendance percentage and session check-ins across courses.
          </p>
        </div>

        {/* View Controls & Selectors */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Time Range Selector */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10.5px] font-bold">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === '7d' 
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-black' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('14d')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === '14d' 
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-black' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              14 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === '30d' 
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-black' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === 'all' 
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-black' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              All Term
            </button>
          </div>

          {/* Subject Filter Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              id="student-trend-chart-subject-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Courses ({studentEnrolledClasses.length})</option>
              {studentEnrolledClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Visual Stat KPIs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Overall Attendance Rate */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Attendance Rate</span>
            {metrics.trajectory === 'up' ? (
              <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" /> +{metrics.delta}%
              </span>
            ) : metrics.trajectory === 'down' ? (
              <span className="flex items-center gap-0.5 text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                <TrendingDown className="w-3 h-3" /> {metrics.delta}%
              </span>
            ) : (
              <span className="text-[9px] font-black text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                Steady
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black font-mono ${
              metrics.rate >= 80 ? 'text-emerald-500' : metrics.rate >= 70 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {metrics.rate}%
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({metrics.total} logs)
            </span>
          </div>
          <div className="mt-1 text-[9.5px] text-zinc-500 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>80% Minimum Required</span>
          </div>
        </div>

        {/* Punctuality / On-Time Index */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">On-Time Check-ins</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {metrics.presents}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({metrics.punctuality}% on-time)
            </span>
          </div>
          <div className="mt-1 text-[9.5px] text-zinc-500 flex items-center gap-1 font-medium">
            <span>{metrics.excused > 0 ? `+${metrics.excused} excused approved` : 'Verified QR scans'}</span>
          </div>
        </div>

        {/* Lateness Threshold */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Late Arrivals</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black font-mono ${metrics.lates > 0 ? 'text-amber-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {metrics.lates}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              (0.7 weight)
            </span>
          </div>
          <div className="mt-1 text-[9.5px] text-amber-600/80 dark:text-amber-400/80 font-medium">
            <span>{metrics.lates >= 5 ? 'Approaching 10-late drop' : '10 lates = automatic drop'}</span>
          </div>
        </div>

        {/* Absence Warning Monitor */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Unexcused Absences</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black font-mono ${metrics.absents > 0 ? 'text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {metrics.absents}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              / 5 allowed
            </span>
          </div>
          <div className="mt-1 text-[9.5px] text-red-600/80 dark:text-red-400/80 font-medium">
            <span>{metrics.absents > 0 ? `${5 - metrics.absents} left before auto drop` : 'Zero unexcused absences'}</span>
          </div>
        </div>
      </div>

      {/* Chart Mode Toggle Buttons */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setViewMode('rate_trend')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'rate_trend' 
                ? 'bg-emerald-500 text-black shadow-xs font-black' 
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Attendance Rate Line</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('status_area')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'status_area' 
                ? 'bg-emerald-500 text-black shadow-xs font-black' 
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Session Volume Area</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('punctuality')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'punctuality' 
                ? 'bg-emerald-500 text-black shadow-xs font-black' 
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Punctuality Curve</span>
          </button>
        </div>

        {onDownloadReport && (
          <button
            type="button"
            onClick={onDownloadReport}
            className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:underline cursor-pointer hidden sm:flex items-center gap-1"
          >
            Export History Data
          </button>
        )}
      </div>

      {/* Main Recharts Container */}
      <div className="h-[240px] sm:h-[280px] w-full pt-1">
        {trendData.length === 0 ? (
          <div className="h-full w-full rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 flex flex-col items-center justify-center space-y-2 p-6 text-center">
            <Calendar className="w-8 h-8 text-zinc-400" />
            <h4 className="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300 tracking-wider">No Attendance Activity Recorded in this Range</h4>
            <p className="text-[11px] text-zinc-400 max-w-sm font-medium">
              As you scan course QR codes or attend lectures, your dynamic attendance trend line will automatically plot here.
            </p>
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="mt-2 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-wider shadow-xs hover:bg-emerald-400 transition-all cursor-pointer active:scale-95"
              >
                Launch QR Scanner
              </button>
            )}
          </div>
        ) : viewMode === 'rate_trend' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="attendanceRateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="dailyRateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#71717a" opacity={0.15} />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }}
                axisLine={{ stroke: '#3f3f46', opacity: 0.2 }}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 80, 100]}
                tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600 }}
              />
              {/* 80% passing threshold reference line */}
              <ReferenceLine 
                y={80} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: '80% Good Standing Target', 
                  position: 'insideTopLeft', 
                  fill: '#10b981', 
                  fontSize: 10, 
                  fontWeight: 700 
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="cumulativeRate" 
                name="Cumulative Attendance %" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#attendanceRateGrad)"
                activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="dailyRate" 
                name="Session Day %" 
                stroke="#3b82f6" 
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={{ r: 3, fill: '#3b82f6' }}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : viewMode === 'status_area' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#71717a" opacity={0.15} />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }}
                axisLine={{ stroke: '#3f3f46', opacity: 0.2 }}
                tickLine={false}
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600 }}
              />
              <Area 
                type="monotone" 
                dataKey="present" 
                name="Present" 
                stackId="1"
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#presentGrad)"
              />
              <Area 
                type="monotone" 
                dataKey="late" 
                name="Late" 
                stackId="1"
                stroke="#f59e0b" 
                strokeWidth={2}
                fill="url(#lateGrad)"
              />
              <Area 
                type="monotone" 
                dataKey="absent" 
                name="Absent" 
                stackId="1"
                stroke="#ef4444" 
                strokeWidth={2}
                fill="url(#absentGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#71717a" opacity={0.15} />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }}
                axisLine={{ stroke: '#3f3f46', opacity: 0.2 }}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600 }}
              />
              <ReferenceLine 
                y={90} 
                stroke="#10b981" 
                strokeDasharray="3 3" 
                label={{ value: '90% Punctuality Target', fill: '#10b981', fontSize: 10, fontWeight: 700 }}
              />
              <Line 
                type="monotone" 
                dataKey="punctualityRate" 
                name="On-Time Punctuality %" 
                stroke="#8b5cf6" 
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#8b5cf6' }}
                activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trajectory Insights and Guidance Strip */}
      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-300">
          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <span className="font-medium">
            {metrics.rate >= 80 
              ? 'Your attendance trajectory is well above the 80% collegiate threshold. Keep checking in on-time to maintain Dean\'s List eligibility.' 
              : metrics.rate >= 70
              ? 'Warning: Your attendance has dipped below 80%. Prioritize on-time lecture check-ins or submit excuse slips for missed days.'
              : 'Alert: Critical attendance rate (<70%). You are at risk of an automatic Dropped Due to Absences (DDA) status.'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-400">
          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
          <span>{trendData.length} timeline check-in points recorded</span>
        </div>
      </div>
    </div>
  );
});

StudentAttendanceTrendChart.displayName = 'StudentAttendanceTrendChart';

export default StudentAttendanceTrendChart;
