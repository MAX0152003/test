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

export interface EarlyWarningRisk {
  riskLevel: 'safe' | 'low' | 'moderate' | 'critical' | 'dropped';
  riskLabel: string;
  riskBadgeColor: string;
  allowableAbsencesTotal: number;
  allowableAbsencesRemaining: number;
  consecutiveAbsencesRemaining: number;
  allowableLatesRemaining: number;
  percentageUntilDrop: number;
  isDropped: boolean;
  recommendations: string[];
  projectedAttendanceIfAttendingNext: (nextClassesCount: number) => number;
}

export interface AttendanceGradingConfig {
  attendanceWeight: number; // e.g. 10 for 10%
  latePenalty: 'none' | 'half' | 'third_absence' | 'quarter'; // half present, 3 lates = 1 absence, etc.
  excusedHandling: 'full_credit' | 'exclude_from_total';
  gradingScale: 'philippine_transmuted' | 'raw_percentage' | 'letter_grade' | 'us_gpa';
}

export interface StudentCalculatedGrade {
  studentId: string;
  studentName: string;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  totalSessions: number;
  effectivePresent: number;
  attendancePercentage: number;
  weightedScore: number;
  transmutedGrade: string;
  academicRemarks: string;
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

/**
 * Calculates detailed Early Intervention Risk Metrics and Allowable Absences Meter
 */
export function calculateEarlyWarningRisk(studentRecords: AttendanceRecord[]): EarlyWarningRisk {
  const standing = calculateStudentStanding(studentRecords);
  
  const allowableTotal = 5;
  const allowableConsecutive = 3;
  const allowableLates = 10;

  const allowableAbsencesRemaining = Math.max(0, allowableTotal - standing.absentCount);
  const consecutiveAbsencesRemaining = Math.max(0, allowableConsecutive - standing.currentConsecutiveAbsents);
  const allowableLatesRemaining = Math.max(0, allowableLates - standing.lateCount);

  let riskLevel: 'safe' | 'low' | 'moderate' | 'critical' | 'dropped' = 'safe';
  let riskLabel = 'Optimal Standing';
  let riskBadgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';

  if (standing.isDropped) {
    riskLevel = 'dropped';
    riskLabel = 'FDA: Dropped for Absences';
    riskBadgeColor = 'bg-red-600 text-white font-bold';
  } else if (allowableAbsencesRemaining === 1 || consecutiveAbsencesRemaining === 1 || allowableLatesRemaining <= 2) {
    riskLevel = 'critical';
    riskLabel = 'Critical Risk: 1 Absence from Drop';
    riskBadgeColor = 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30';
  } else if (allowableAbsencesRemaining === 2 || consecutiveAbsencesRemaining === 2 || allowableLatesRemaining <= 4 || standing.attendanceRate < 80) {
    riskLevel = 'moderate';
    riskLabel = 'Moderate Risk: Close to Threshold';
    riskBadgeColor = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
  } else if (standing.absentCount > 0 || standing.lateCount > 2 || standing.attendanceRate < 90) {
    riskLevel = 'low';
    riskLabel = 'Low Risk: Minor Irregularities';
    riskBadgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
  }

  const recommendations: string[] = [];
  if (riskLevel === 'dropped') {
    recommendations.push('File a formal Academic Reinstatement Appeal with the College Dean.');
    recommendations.push('Coordinate with your instructor regarding retroactive medical excuse submissions.');
  } else if (riskLevel === 'critical') {
    recommendations.push('Do NOT miss any remaining class sessions; any subsequent absence will trigger automated FDA.');
    recommendations.push('If recent absences were due to illness or official university events, submit an Excuse Letter immediately.');
    recommendations.push('Schedule a 1-on-1 Consultation during office hours.');
  } else if (riskLevel === 'moderate') {
    recommendations.push('Monitor attendance closely; maintain perfect punctuality for the next 4 sessions.');
    recommendations.push('Ensure past excuse letters have been officially endorsed by your instructor.');
  } else {
    recommendations.push('Keep checking in promptly to maintain Dean\'s List eligibility.');
    recommendations.push('Review course syllabus learning materials in advance of upcoming lectures.');
  }

  // Projected attendance rate function
  const projectedAttendanceIfAttendingNext = (nextClassesCount: number) => {
    const positive = standing.presentCount + standing.lateCount + standing.excusedCount + nextClassesCount;
    const total = standing.totalRecords + nextClassesCount;
    return total > 0 ? Math.round((positive / total) * 100) : 100;
  };

  const percentageUsed = Math.min(100, Math.round((standing.absentCount / allowableTotal) * 100));

  return {
    riskLevel,
    riskLabel,
    riskBadgeColor,
    allowableAbsencesTotal: allowableTotal,
    allowableAbsencesRemaining,
    consecutiveAbsencesRemaining,
    allowableLatesRemaining,
    percentageUntilDrop: 100 - percentageUsed,
    isDropped: standing.isDropped,
    recommendations,
    projectedAttendanceIfAttendingNext
  };
}

/**
 * Calculates Transmuted Attendance Contribution for Faculty Gradebooks
 */
export function calculateAttendanceGrade(
  records: AttendanceRecord[],
  studentId: string,
  studentName: string,
  config: AttendanceGradingConfig
): StudentCalculatedGrade {
  const studentRecs = records.filter(
    r => r.studentId === studentId || (r.studentName && r.studentName.toLowerCase() === studentName.toLowerCase())
  );

  const presentCount = studentRecs.filter(r => r.status === 'present').length;
  const lateCount = studentRecs.filter(r => r.status === 'late').length;
  const excusedCount = studentRecs.filter(r => r.status === 'excused').length;
  const absentCount = studentRecs.filter(r => r.status === 'absent').length;

  let effectivePresent = presentCount;

  // Apply late penalty rule
  if (config.latePenalty === 'half') {
    effectivePresent += lateCount * 0.5;
  } else if (config.latePenalty === 'third_absence') {
    const penalizedLates = Math.floor(lateCount / 3);
    const unpenalizedLates = lateCount % 3;
    effectivePresent += (lateCount - penalizedLates) + (unpenalizedLates * 0.33);
  } else if (config.latePenalty === 'quarter') {
    effectivePresent += lateCount * 0.75;
  } else {
    // none - full credit
    effectivePresent += lateCount;
  }

  // Apply excused absences rule
  let divisorSessions = studentRecs.length;
  if (config.excusedHandling === 'full_credit') {
    effectivePresent += excusedCount;
  } else if (config.excusedHandling === 'exclude_from_total') {
    divisorSessions = Math.max(1, divisorSessions - excusedCount);
  }

  const attendancePercentage = divisorSessions > 0 
    ? Math.min(100, Math.round((effectivePresent / divisorSessions) * 100))
    : 100;

  const weightedScore = (attendancePercentage * (config.attendanceWeight / 100));

  let transmutedGrade = '1.0';
  let academicRemarks = 'Passed - Excellent Attendance';

  if (config.gradingScale === 'philippine_transmuted') {
    if (attendancePercentage >= 97) transmutedGrade = '1.0';
    else if (attendancePercentage >= 94) transmutedGrade = '1.25';
    else if (attendancePercentage >= 91) transmutedGrade = '1.5';
    else if (attendancePercentage >= 88) transmutedGrade = '1.75';
    else if (attendancePercentage >= 85) transmutedGrade = '2.0';
    else if (attendancePercentage >= 82) transmutedGrade = '2.25';
    else if (attendancePercentage >= 79) transmutedGrade = '2.5';
    else if (attendancePercentage >= 76) transmutedGrade = '2.75';
    else if (attendancePercentage >= 75) transmutedGrade = '3.0';
    else if (attendancePercentage >= 70) {
      transmutedGrade = '4.0';
      academicRemarks = 'Conditional / Warning';
    } else {
      transmutedGrade = '5.0';
      academicRemarks = 'Failed (FDA)';
    }
  } else if (config.gradingScale === 'letter_grade') {
    if (attendancePercentage >= 93) transmutedGrade = 'A';
    else if (attendancePercentage >= 90) transmutedGrade = 'A-';
    else if (attendancePercentage >= 87) transmutedGrade = 'B+';
    else if (attendancePercentage >= 83) transmutedGrade = 'B';
    else if (attendancePercentage >= 80) transmutedGrade = 'B-';
    else if (attendancePercentage >= 75) transmutedGrade = 'C';
    else if (attendancePercentage >= 70) transmutedGrade = 'D';
    else transmutedGrade = 'F';
  } else if (config.gradingScale === 'us_gpa') {
    if (attendancePercentage >= 95) transmutedGrade = '4.0';
    else if (attendancePercentage >= 90) transmutedGrade = '3.7';
    else if (attendancePercentage >= 85) transmutedGrade = '3.3';
    else if (attendancePercentage >= 80) transmutedGrade = '3.0';
    else if (attendancePercentage >= 75) transmutedGrade = '2.0';
    else transmutedGrade = '0.0';
  } else {
    transmutedGrade = `${attendancePercentage}%`;
  }

  return {
    studentId,
    studentName,
    presentCount,
    lateCount,
    excusedCount,
    absentCount,
    totalSessions: studentRecs.length,
    effectivePresent,
    attendancePercentage,
    weightedScore: parseFloat(weightedScore.toFixed(2)),
    transmutedGrade,
    academicRemarks
  };
}

