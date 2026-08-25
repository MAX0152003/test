import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { AttendanceRecord, ClassSession, Enrollment, UserProfile } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Filter, 
  Info
} from 'lucide-react';

interface StudentWeeklyAttendanceChartProps {
  records: AttendanceRecord[];
  classes: ClassSession[];
  enrollments: Enrollment[];
  userProfile: UserProfile;
}

interface WeekData {
  weekKey: string;
  weekLabel: string;
  dateRange: string;
  present: number;
  late: number;
  excused: number;
  absent: number;
  total: number;
  rate: number;
  issues: string[];
}

export default function StudentWeeklyAttendanceChart({
  records,
  classes,
  enrollments,
  userProfile
}: StudentWeeklyAttendanceChartProps) {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // Enrolled subjects for this student
  const studentEnrolledClasses = useMemo(() => {
    return classes.filter(cls =>
      enrollments.some(
        e => e.classId === cls.id &&
             (e.studentId === userProfile.studentId || e.studentEmail === userProfile.email) &&
             !e.deletedByStudent
      )
    );
  }, [classes, enrollments, userProfile]);

  // Filter records by student and optional subject (strictly only for currently enrolled subjects)
  const studentRecords = useMemo(() => {
    const enrolledClassIdSet = new Set(studentEnrolledClasses.map(c => c.id));
    return records.filter(r => {
      const isStudentMatch = r.studentId === userProfile.studentId || 
                             r.studentName === userProfile.name ||
                             (userProfile.email && r.studentId === userProfile.email);
      if (!isStudentMatch) return false;
      if (selectedSubjectFilter !== 'all') {
        return r.classId === selectedSubjectFilter && enrolledClassIdSet.has(r.classId);
      }
      // When 'all', only include records for subjects that are currently enrolled
      return enrolledClassIdSet.has(r.classId);
    });
  }, [records, userProfile, selectedSubjectFilter, studentEnrolledClasses]);

  // Calculate 4 weekly buckets relative to current date
  const weeklyTrendData: WeekData[] = useMemo(() => {
    const today = new Date();
    // Normalize to end of today
    const currentEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const weeks: WeekData[] = [];

    for (let i = 3; i >= 0; i--) {
      // Each week interval is 7 days
      const weekEnd = new Date(currentEnd);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endLabel = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dateRange = `${startLabel} - ${endLabel}`;

      const weekNum = 4 - i;
      const weekLabel = `Week ${weekNum}`;

      // Filter records falling within this week
      const recsInWeek = studentRecords.filter(r => {
        return r.date >= startStr && r.date <= endStr;
      });

      const present = recsInWeek.filter(r => r.status === 'present').length;
      const late = recsInWeek.filter(r => r.status === 'late').length;
      const excused = recsInWeek.filter(r => r.status === 'excused').length;
      const absent = recsInWeek.filter(r => r.status === 'absent').length;
      const total = recsInWeek.length;

      // Rate calculation (present=100%, excused=100%, late=70%)
      const rate = total > 0 
        ? Math.round(((present + excused + late * 0.7) / total) * 100)
        : 0;

      const issues: string[] = [];
      if (absent > 0) {
        issues.push(`${absent} Absent${absent > 1 ? 's' : ''}`);
      }
      if (late > 0) {
        issues.push(`${late} Late${late > 1 ? 's' : ''}`);
      }
      if (excused > 0) {
        issues.push(`${excused} Excused`);
      }
      if (total > 0 && absent === 0 && late === 0) {
        issues.push('100% Consistent');
      }

      weeks.push({
        weekKey: `W${weekNum}`,
        weekLabel,
        dateRange,
        present,
        late,
        excused,
        absent,
        total,
        rate,
        issues
      });
    }

    return weeks;
  }, [studentRecords]);

  // Aggregate metrics over the 4 weeks
  const aggregateMetrics = useMemo(() => {
    const totalSessions = weeklyTrendData.reduce((sum, w) => sum + w.total, 0);
    const totalPresents = weeklyTrendData.reduce((sum, w) => sum + w.present, 0);
    const totalLates = weeklyTrendData.reduce((sum, w) => sum + w.late, 0);
    const totalExcused = weeklyTrendData.reduce((sum, w) => sum + w.excused, 0);
    const totalAbsents = weeklyTrendData.reduce((sum, w) => sum + w.absent, 0);

    const overallRate = totalSessions > 0
      ? Math.round(((totalPresents + totalExcused + totalLates * 0.7) / totalSessions) * 100)
      : 0;

    let consistencyStatus = 'High Consistency';
    let statusColor = 'text-emerald-650 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    if (totalSessions === 0) {
      consistencyStatus = 'No Records Recorded';
      statusColor = 'text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    } else if (totalAbsents >= 2 || overallRate < 75) {
      consistencyStatus = 'Critical Attendance Risk';
      statusColor = 'text-red-650 dark:text-red-400 bg-red-500/10 border-red-500/20';
    } else if (totalLates >= 3 || totalAbsents === 1 || overallRate < 85) {
      consistencyStatus = 'Punctuality Warning';
      statusColor = 'text-amber-650 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    }

    return {
      totalSessions,
      totalPresents,
      totalLates,
      totalExcused,
      totalAbsents,
      overallRate,
      consistencyStatus,
      statusColor
    };
  }, [weeklyTrendData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as WeekData;
      return (
        <div className="bg-white dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-left text-xs min-w-[190px] space-y-2">
          <div className="border-b border-zinc-100 dark:border-zinc-900 pb-1.5 flex items-center justify-between">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{data.weekLabel}</span>
            <span className="text-[10px] font-mono text-zinc-400">{data.dateRange}</span>
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Present:</span>
              <span className="font-black">{data.present}</span>
            </div>
            {data.late > 0 && (
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Late:</span>
                <span className="font-black">{data.late}</span>
              </div>
            )}
            {data.excused > 0 && (
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Excused:</span>
                <span className="font-black">{data.excused}</span>
              </div>
            )}
            {data.absent > 0 && (
              <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Absent:</span>
                <span className="font-black">{data.absent}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-900 text-zinc-600 dark:text-zinc-400">
              <span>Total Sessions:</span>
              <span className="font-black text-zinc-900 dark:text-zinc-100">{data.total}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
              <span>Weekly Rate:</span>
              <span className="font-black text-emerald-500">{data.rate}%</span>
            </div>
          </div>
          {data.issues.length > 0 && (
            <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap gap-1">
              {data.issues.map((iss, idx) => (
                <span 
                  key={`${iss}-${idx}`}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    iss.includes('Absent') ? 'bg-red-500/10 text-red-500' :
                    iss.includes('Late') ? 'bg-amber-500/10 text-amber-500' :
                    iss.includes('Excused') ? 'bg-blue-500/10 text-blue-500' :
                    'bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  {iss}
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
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
              4-Week Attendance & Punctuality Trends
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${aggregateMetrics.statusColor}`}>
              {aggregateMetrics.consistencyStatus}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Weekly session breakdown comparing on-time arrivals against late check-ins and unexcused absences.
          </p>
        </div>

        {/* Subject Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="student-trend-subject-select" className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
            <Filter className="w-3 h-3 text-emerald-500" />
            Course:
          </label>
          <select
            id="student-trend-subject-select"
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Enrolled Subjects ({studentEnrolledClasses.length})</option>
            {studentEnrolledClasses.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-850">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">4-Week Average</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">
              {aggregateMetrics.overallRate}%
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({aggregateMetrics.totalSessions} sessions)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-850">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">On-Time / Present</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {aggregateMetrics.totalPresents}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {aggregateMetrics.totalSessions > 0 ? Math.round((aggregateMetrics.totalPresents / aggregateMetrics.totalSessions) * 100) : 100}%
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-850">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Late Check-Ins</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${aggregateMetrics.totalLates > 0 ? 'text-amber-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {aggregateMetrics.totalLates}
            </span>
            {aggregateMetrics.totalLates > 0 && (
              <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded-sm">
                Watch threshold
              </span>
            )}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-850">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Unexcused Absences</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${aggregateMetrics.totalAbsents > 0 ? 'text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {aggregateMetrics.totalAbsents}
            </span>
            {aggregateMetrics.totalAbsents > 0 ? (
              <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.2 rounded-sm">
                Max 3 consec / 5 total
              </span>
            ) : (
              <span className="text-[10px] text-emerald-500 font-bold">Zero absents</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Recharts Bar Chart */}
      <div className="h-[220px] sm:h-[260px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weeklyTrendData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barSize={24}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
            <XAxis 
              dataKey="weekLabel" 
              tick={{ fontSize: 11, fill: '#71717a', fontWeight: 600 }}
              axisLine={{ stroke: '#3f3f46', opacity: 0.2 }}
              tickLine={false}
            />
            <YAxis 
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#71717a', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(161, 161, 170, 0.08)', radius: 8 }}
            />
            <Legend 
              verticalAlign="top" 
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', fontWeight: 600 }}
            />
            <Bar 
              dataKey="present" 
              name="Present" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]} 
              stackId="a"
            />
            <Bar 
              dataKey="excused" 
              name="Excused" 
              fill="#3b82f6" 
              radius={[0, 0, 0, 0]} 
              stackId="a"
            />
            <Bar 
              dataKey="late" 
              name="Late" 
              fill="#f59e0b" 
              radius={[0, 0, 0, 0]} 
              stackId="a"
            />
            <Bar 
              dataKey="absent" 
              name="Absent" 
              fill="#ef4444" 
              radius={[4, 4, 0, 0]} 
              stackId="a"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4-Week Insights & Consistency Alerts Banner */}
      <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <Info className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            {aggregateMetrics.totalAbsents > 0
              ? `You have ${aggregateMetrics.totalAbsents} absence record(s) over the last 4 weeks. File an excuse letter to prevent academic drop warnings.`
              : aggregateMetrics.totalLates > 0
              ? `You have ${aggregateMetrics.totalLates} late check-in(s) over the last 4 weeks. 10 cumulative lates trigger automatic subject drop.`
              : 'Excellent punctuality! All logged check-ins across the last 4 weeks are on-time with zero unexcused absences.'
            }
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
          <Calendar className="w-3 h-3 text-emerald-500" />
          <span>Period: {weeklyTrendData[0]?.dateRange.split(' - ')[0]} – {weeklyTrendData[3]?.dateRange.split(' - ')[1]}</span>
        </div>
      </div>
    </div>
  );
}
