import { useMemo } from 'react';
import { 
  ClassSession, 
  AttendanceRecord, 
  UserProfile, 
  FacultyStatus, 
  Enrollment 
} from '../types';

export interface UseDashboardMetricsParams {
  attendanceRecords: AttendanceRecord[];
  enrollments: Enrollment[];
  classes: ClassSession[];
  userProfile: UserProfile;
  facultyStatuses?: FacultyStatus[];
  facultySearchQuery?: string;
}

export interface DashboardMetricsResult {
  studentEnrolledClassIds: Set<string>;
  studentEnrolledClasses: ClassSession[];
  enrolledFacultyIds: Set<string>;
  enrolledFacultyNames: Set<string>;
  displayedFaculty: FacultyStatus[];
  enrolledStudentRecords: AttendanceRecord[];
  totalChecked: number;
  presentsCount: number;
  latesCount: number;
  absentsCount: number;
  excusedCount: number;
  attendanceRate: number;
  standingLabel: 'GOOD STANDING' | 'NEEDS ATTENTION' | 'CRITICAL ATTENTION';
  standingBadgeColor: string;
  myRecentScans: AttendanceRecord[];
}

export function useDashboardMetrics({
  attendanceRecords,
  enrollments,
  classes,
  userProfile,
  facultyStatuses = [],
  facultySearchQuery = ''
}: UseDashboardMetricsParams): DashboardMetricsResult {
  // 1. Compute enrolled class IDs for this student (excluding unenrolled/dropped/deleted subjects)
  const studentEnrolledClassIds = useMemo(() => {
    if (!userProfile) return new Set<string>();

    const uEmail = (userProfile.email || '').trim().toLowerCase();
    const uStuId = (userProfile.studentId || '').trim().toLowerCase();
    const uId = (userProfile.id || '').trim().toLowerCase();
    const uName = (userProfile.name || '').trim().toLowerCase();

    return new Set(
      enrollments
        .filter(e => {
          if (e.deletedByStudent) return false;
          const eEmail = (e.studentEmail || '').trim().toLowerCase();
          const eStuId = (e.studentId || '').trim().toLowerCase();
          const eName = (e.studentName || '').trim().toLowerCase();

          if (uEmail && eEmail && uEmail === eEmail) return true;
          if (uStuId && eStuId && uStuId === eStuId) return true;
          if (uId && eStuId && uId === eStuId) return true;
          if (uName && eName && uName === eName) return true;
          return false;
        })
        .map(e => e.classId)
    );
  }, [enrollments, userProfile]);

  // 2. Compute enrolled classes and enrolled faculty identifiers
  const studentEnrolledClasses = useMemo(() => {
    return classes.filter(c => studentEnrolledClassIds.has(c.id));
  }, [classes, studentEnrolledClassIds]);

  const enrolledFacultyIds = useMemo(() => {
    return new Set(studentEnrolledClasses.map(c => c.facultyId).filter(Boolean) as string[]);
  }, [studentEnrolledClasses]);

  const enrolledFacultyNames = useMemo(() => {
    return new Set(
      studentEnrolledClasses
        .map(c => (c.facultyName || '').trim().toLowerCase())
        .filter(Boolean)
    );
  }, [studentEnrolledClasses]);

  // 3. Displayed faculty for the Live Instructors Tracking widget with memoized search/filter
  const displayedFaculty = useMemo(() => {
    const query = facultySearchQuery.trim().toLowerCase();

    if (query) {
      return facultyStatuses.filter(fac => {
        const nameMatch = fac.name.toLowerCase().includes(query);
        const roomMatch = (fac.room || '').toLowerCase().includes(query);
        const teachesMatch = classes.some(c => 
          (c.facultyId === fac.id || (c.facultyName && c.facultyName.toLowerCase() === fac.name.toLowerCase())) &&
          (c.code.toLowerCase().includes(query) || c.name.toLowerCase().includes(query))
        );
        return nameMatch || roomMatch || teachesMatch;
      });
    }

    return facultyStatuses.filter(fac => 
      enrolledFacultyIds.has(fac.id) || enrolledFacultyNames.has(fac.name.trim().toLowerCase())
    );
  }, [facultyStatuses, facultySearchQuery, classes, enrolledFacultyIds, enrolledFacultyNames]);

  // 4. Filter attendance records to ONLY those belonging to currently enrolled classes for this student
  const enrolledStudentRecords = useMemo(() => {
    if (!userProfile) return [];

    const uEmail = (userProfile.email || '').trim().toLowerCase();
    const uStuId = (userProfile.studentId || '').trim().toLowerCase();
    const uId = (userProfile.id || '').trim().toLowerCase();
    const uName = (userProfile.name || '').trim().toLowerCase();

    return attendanceRecords.filter(r => {
      const rStuId = (r.studentId || '').trim().toLowerCase();
      const rStuName = (r.studentName || '').trim().toLowerCase();

      const isStudentMatch = 
        (uStuId && rStuId && uStuId === rStuId) ||
        (uId && rStuId && uId === rStuId) ||
        (uEmail && rStuId && uEmail === rStuId) ||
        (uName && rStuName && uName === rStuName) ||
        (!rStuId && userProfile.role === 'student');

      return isStudentMatch && studentEnrolledClassIds.has(r.classId);
    });
  }, [attendanceRecords, userProfile, studentEnrolledClassIds]);

  // 5. Intensive status metrics & percentage calculation
  const { 
    totalChecked, 
    presentsCount, 
    latesCount, 
    absentsCount, 
    excusedCount, 
    attendanceRate,
    standingLabel,
    standingBadgeColor
  } = useMemo(() => {
    const total = enrolledStudentRecords.length;
    let presents = 0;
    let lates = 0;
    let absents = 0;
    let excused = 0;

    for (let i = 0; i < total; i++) {
      const status = enrolledStudentRecords[i].status;
      if (status === 'present') presents++;
      else if (status === 'late') lates++;
      else if (status === 'absent') absents++;
      else if (status === 'excused') excused++;
    }

    // Weighted attendance calculation (late counts as 0.7 presence, excused not penalized as absent)
    const rate = total > 0 
      ? Math.round(((presents + (lates * 0.7) + (excused * 0.9)) / total) * 100)
      : 100;

    let standing: 'GOOD STANDING' | 'NEEDS ATTENTION' | 'CRITICAL ATTENTION' = 'GOOD STANDING';
    let badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';

    if (rate < 75 || absents >= 3) {
      standing = 'CRITICAL ATTENTION';
      badgeColor = 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
    } else if (rate < 85 || absents > 0 || lates >= 2) {
      standing = 'NEEDS ATTENTION';
      badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
    }

    return {
      totalChecked: total,
      presentsCount: presents,
      latesCount: lates,
      absentsCount: absents,
      excusedCount: excused,
      attendanceRate: Math.min(100, Math.max(0, rate)),
      standingLabel: standing,
      standingBadgeColor: badgeColor
    };
  }, [enrolledStudentRecords]);

  // 6. Last 5 verified recent scans for this student
  const myRecentScans = useMemo(() => {
    if (!userProfile) return [];

    const uEmail = (userProfile.email || '').trim().toLowerCase();
    const uStuId = (userProfile.studentId || '').trim().toLowerCase();
    const uId = (userProfile.id || '').trim().toLowerCase();
    const uName = (userProfile.name || '').trim().toLowerCase();

    return attendanceRecords
      .filter(r => {
        const rStuId = (r.studentId || '').trim().toLowerCase();
        const rStuName = (r.studentName || '').trim().toLowerCase();

        const isMatch = 
          (uStuId && rStuId && uStuId === rStuId) ||
          (uId && rStuId && uId === rStuId) ||
          (uEmail && rStuId && uEmail === rStuId) ||
          (uName && rStuName && uName === rStuName) ||
          (!rStuId && userProfile.role === 'student');

        const isValidStatus = r.status === 'present' || r.status === 'late' || r.status === 'excused';
        return isMatch && isValidStatus;
      })
      .sort((a, b) => {
        const timeA = new Date(`${a.date} ${a.time || '00:00'}`).getTime() || 0;
        const timeB = new Date(`${b.date} ${b.time || '00:00'}`).getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [attendanceRecords, userProfile]);

  return {
    studentEnrolledClassIds,
    studentEnrolledClasses,
    enrolledFacultyIds,
    enrolledFacultyNames,
    displayedFaculty,
    enrolledStudentRecords,
    totalChecked,
    presentsCount,
    latesCount,
    absentsCount,
    excusedCount,
    attendanceRate,
    standingLabel,
    standingBadgeColor,
    myRecentScans
  };
}
