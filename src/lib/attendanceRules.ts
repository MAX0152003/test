import { AttendanceRecord } from '../types';

export interface AttendanceStanding {
  status: 'good' | 'warning' | 'dropped';
  label: string;
  badgeColor: string;
  isDropped: boolean;
  dropReasons: string[];
  warningReasons: string[];
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  presentCount: number;
  totalRecords: number;
  maxConsecutiveAbsents: number;
  currentConsecutiveAbsents: number;
  attendanceRate: number;
}

/**
 * Evaluates academic standing according to institutional drop policy:
 * - 3 consecutive absences = Dropped
 * - 5 nonconsecutive absences = Dropped
 * - 10 lates = Dropped
 * - Approved excuse letters mark absences as 'excused', which do NOT count as absences
 *   and break the consecutive absence streak.
 */
export function calculateStudentStanding(studentRecords: AttendanceRecord[]): AttendanceStanding {
  // Sort chronologically
  const sortedRecs = [...studentRecords].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const presentCount = sortedRecs.filter(r => r.status === 'present').length;
  const lateCount = sortedRecs.filter(r => r.status === 'late').length;
  const excusedCount = sortedRecs.filter(r => r.status === 'excused').length;
  const absentCount = sortedRecs.filter(r => r.status === 'absent').length;
  const totalRecords = sortedRecs.length;

  // Calculate consecutive unexcused absences
  let maxConsecutiveAbsents = 0;
  let currConsecutive = 0;

  for (const r of sortedRecs) {
    if (r.status === 'absent') {
      currConsecutive++;
      if (currConsecutive > maxConsecutiveAbsents) {
        maxConsecutiveAbsents = currConsecutive;
      }
    } else {
      // Excused, present, or late breaks the unexcused streak
      currConsecutive = 0;
    }
  }
  const currentConsecutiveAbsents = currConsecutive;

  // Calculate attendance rate (Present, Late, and Excused count favorably towards completion)
  const positiveAttendance = presentCount + lateCount + excusedCount;
  const attendanceRate = totalRecords > 0 
    ? Math.round((positiveAttendance / totalRecords) * 100) 
    : 100;

  // Evaluate drop conditions
  const dropReasons: string[] = [];
  if (maxConsecutiveAbsents >= 3) {
    dropReasons.push('3 Consecutive Absences');
  }
  if (absentCount >= 5) {
    dropReasons.push('5 Nonconsecutive Absences');
  }
  if (lateCount >= 10) {
    dropReasons.push('10 Lates Accumulated');
  }

  const isDropped = dropReasons.length > 0;

  // Evaluate warning conditions
  const warningReasons: string[] = [];
  if (!isDropped) {
    if (maxConsecutiveAbsents >= 2) {
      warningReasons.push('2 Consecutive Absences (1 away from drop)');
    }
    if (absentCount >= 3) {
      warningReasons.push(`${absentCount}/5 Absences (${5 - absentCount} left)`);
    }
    if (lateCount >= 6) {
      warningReasons.push(`${lateCount}/10 Lates (${10 - lateCount} left)`);
    }
    if (attendanceRate < 85) {
      warningReasons.push(`Low Attendance Rate (${attendanceRate}%)`);
    }
  }

  if (isDropped) {
    return {
      status: 'dropped',
      label: '🚫 Dropped',
      badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25',
      isDropped: true,
      dropReasons,
      warningReasons,
      absentCount,
      excusedCount,
      lateCount,
      presentCount,
      totalRecords,
      maxConsecutiveAbsents,
      currentConsecutiveAbsents,
      attendanceRate,
    };
  }

  if (warningReasons.length > 0) {
    return {
      status: 'warning',
      label: '⚠️ Warning',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
      isDropped: false,
      dropReasons,
      warningReasons,
      absentCount,
      excusedCount,
      lateCount,
      presentCount,
      totalRecords,
      maxConsecutiveAbsents,
      currentConsecutiveAbsents,
      attendanceRate,
    };
  }

  return {
    status: 'good',
    label: 'Good Standing',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
    isDropped: false,
    dropReasons: [],
    warningReasons: [],
    absentCount,
    excusedCount,
    lateCount,
    presentCount,
    totalRecords,
    maxConsecutiveAbsents,
    currentConsecutiveAbsents,
    attendanceRate,
  };
}
