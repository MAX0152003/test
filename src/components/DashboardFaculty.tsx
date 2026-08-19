import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClassSession, 
  AppNotification, 
  UserProfile, 
  AccessibilityConfig,
  Enrollment,
  AttendanceRecord,
  FacultyStatus,
  Announcement,
  LabRoom,
  DispatchedWarningEmail
} from '../types';
import { calculateStudentStanding } from '../lib/attendanceRules';
import { 
  Plus, 
  QrCode, 
  Clock, 
  MapPin, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  CheckCircle, 
  Users, 
  Check, 
  AlertCircle,
  Calendar,
  Layers,
  Filter,
  UserCheck,
  Search,
  Inbox,
  Download,
  SlidersHorizontal,
  ArrowLeft,
  FileText,
  AlertTriangle,
  Mail,
  Sparkles,
  Eye,
  EyeOff,
  BellRing,
  Camera,
  UploadCloud,
  Settings,
  CheckSquare
} from 'lucide-react';
import { speakText } from './AccessibilitySettings';
import AlarmClock from './AlarmClock';
import SubjectDetailModal from './SubjectDetailModal';
import Messages from './Messages';
import HelpCenter from './HelpCenter';
import WeeklyScheduleGrid from './WeeklyScheduleGrid';
import FacultyAttendanceTrendsChart from './FacultyAttendanceTrendsChart';
import { ClassCardSkeleton, AttendanceTableSkeleton, ScheduleListSkeleton } from './SkeletonLoaders';
import { 
  BUILDING_CLUSTERS, 
  ACADEMIC_TERMS, 
  GRACE_PERIOD_OPTIONS, 
  DEFAULT_GRACE_PERIOD_MINUTES,
  EXCUSE_PRESET_TYPES, 
  isFridayPrayerWindow 
} from '../lib/msuUtils';

interface DashboardFacultyProps {
  activeScreen: string;
  setScreen: (screen: string, contactObj?: { id: string; name?: string; ts?: number }) => void;
  classes: ClassSession[];
  onAddClass: (newClass: Omit<ClassSession, 'id'>) => void;
  onEditClass: (updatedClass: ClassSession) => void;
  onDeleteClass: (classId: string) => void;
  userProfile: UserProfile;
  facultyStatus: 'available' | 'in-class' | 'unavailable';
  onChangeFacultyStatus: (status: 'available' | 'in-class' | 'unavailable') => void;
  accessibility: AccessibilityConfig;
  enrollments: Enrollment[];
  attendanceRecords: AttendanceRecord[];
  notifications: AppNotification[];
  facultyStatuses: FacultyStatus[];
  onUpdateProfile: (updated: UserProfile) => void;
  onClearAllNotifications?: () => void;
  onMarkAllNotificationsRead?: () => void;
  announcements?: Announcement[];
  excuseLetters?: any[];
  onUpdateExcuseStatus?: (id: string, status: 'pending' | 'valid' | 'invalid' | 'approved' | 'rejected') => void;
  onUpdateAttendanceRecord?: (recordId: string, status: 'present' | 'late' | 'absent' | 'excused') => void;
  onAddAttendanceRecord?: (record: Omit<AttendanceRecord, 'id'>) => void;
  labRooms?: LabRoom[];
  onUpdateLabRooms?: (rooms: LabRoom[]) => void;
  selectedChatContact?: { id: string; name?: string; ts?: number };
}

const parseTimeToMinutesVal = (timeStr: string) => {
  if (!timeStr) return 0;
  try {
    const trimmed = timeStr.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3] ? match[3].toUpperCase() : null;
      if (ampm) {
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      }
      return hours * 60 + minutes;
    }
    const softMatch = trimmed.match(/^(\d{1,2})\s*(AM|PM)$/i);
    if (softMatch) {
      let hours = parseInt(softMatch[1], 10);
      const ampm = softMatch[2].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60;
    }
    return 0;
  } catch {
    return 0;
  }
};

const expandDaysToSpecificOnesVal = (days: string[]): string[] => {
  const expanded: string[] = [];
  days.forEach(d => {
    const trimmed = d.trim().toLowerCase();
    if (trimmed === 'mw' || trimmed === 'm-w' || trimmed === 'monday/wednesday') {
      expanded.push('mon', 'wed');
    } else if (trimmed === 'tth' || trimmed === 't-th' || trimmed === 'tuesday/thursday') {
      expanded.push('tue', 'thu');
    } else if (trimmed === 'm') {
      expanded.push('mon');
    } else if (trimmed === 't') {
      expanded.push('tue');
    } else if (trimmed === 'w') {
      expanded.push('wed');
    } else if (trimmed === 'h' || trimmed === 'th') {
      expanded.push('thu');
    } else if (trimmed === 'f') {
      expanded.push('fri');
    } else if (trimmed === 's' || trimmed === 'sat' || trimmed === 'saturday') {
      expanded.push('sat');
    } else if (trimmed === 'a' || trimmed === 'sun' || trimmed === 'sunday') {
      expanded.push('sun');
    } else if (trimmed === 'fs' || trimmed === 'f-s' || trimmed === 'friday/saturday') {
      expanded.push('fri', 'sat');
    } else if (trimmed === 'all' || trimmed === 'daily' || trimmed === 'mtwthf' || trimmed === 'mtwthfs' || trimmed === 'mtwthfas') {
      expanded.push('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
    } else {
      const matched = trimmed.substring(0, 3);
      if (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(matched)) {
        expanded.push(matched);
      } else {
        expanded.push(trimmed);
      }
    }
  });
  return expanded;
};

const SCHEDULING_TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let minutes = 5 * 60; minutes <= 18 * 60; minutes += 30) {
    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;
    const formattedHour = String(hours12).padStart(2, '0');
    const formattedMin = String(mins).padStart(2, '0');
    slots.push(`${formattedHour}:${formattedMin} ${period}`);
  }
  return slots;
})();

const checkDaysOverlapVal = (daysA: string[], daysB: string[]): boolean => {
  const expandedA = expandDaysToSpecificOnesVal(daysA);
  const expandedB = expandDaysToSpecificOnesVal(daysB);
  return expandedA.some(day => expandedB.includes(day));
};

export default function DashboardFaculty({
  activeScreen,
  setScreen,
  selectedChatContact,
  classes,
  onAddClass,
  onEditClass,
  onDeleteClass,
  userProfile,
  facultyStatus,
  onChangeFacultyStatus,
  accessibility,
  enrollments,
  attendanceRecords,
  notifications,
  facultyStatuses,
  onUpdateProfile,
  onClearAllNotifications,
  onMarkAllNotificationsRead,
  announcements = [],
  excuseLetters = [],
  onUpdateExcuseStatus,
  onUpdateAttendanceRecord,
  onAddAttendanceRecord,
  labRooms = [],
  onUpdateLabRooms
}: DashboardFacultyProps) {
  
  // Faculty selected lab room monitor state
  const [selectedFacultyRoomId, setSelectedFacultyRoomId] = React.useState('lab-1');

  // Bulletins Visibility toggle
  const [isBulletinsHidden, setIsBulletinsHidden] = React.useState<boolean>(() => {
    return localStorage.getItem('classpulse_faculty_bulletins_hidden') === 'true';
  });

  // Notifications filters & search
  const [notifSearch, setNotifSearch] = React.useState('');
  const [notifFilter, setNotifFilter] = React.useState<'all' | 'alerts' | 'updates'>('all');

  // Excuse filter: 'pending' | 'valid' | 'invalid'
  const [excuseFilter, setExcuseFilter] = React.useState<'pending' | 'valid' | 'invalid'>('pending');

  // Fast Class Search & Student Search states
  const [classSearchQuery, setClassSearchQuery] = React.useState('');
  const [studentSearchQuery, setStudentSearchQuery] = React.useState('');

  React.useEffect(() => {
    localStorage.setItem('classpulse_faculty_bulletins_hidden', String(isBulletinsHidden));
  }, [isBulletinsHidden]);

  // Timer for QR code attendance simulation
  const [timeLeft, setTimeLeft] = React.useState(300); // 5 minutes standard
  const [activeQRClass, setActiveQRClass] = React.useState<string>(() => {
    const now = new Date();
    const dayLabels = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayLabel = dayLabels[now.getDay()];
    const matched = classes.find(c => {
      const expanded = expandDaysToSpecificOnesVal(c.days);
      return expanded.includes(todayLabel);
    }) || classes[0];
    return matched?.id || '';
  });
  const [qrToken, setQrToken] = React.useState('QR_KEY_' + Math.random().toString(36).substring(4, 10).toUpperCase());
  const [qrIntervalId, setQrIntervalId] = React.useState<any>(null);

  // Subject Monitoring active ID state
  const [selectedMonitoringClassId, setSelectedMonitoringClassId] = React.useState<string>(classes[0]?.id || '');
  const [expandedStudentId, setExpandedStudentId] = React.useState<string | null>(null);
  
  // Batch Export date filtering ranges
  const [exportStartDate, setExportStartDate] = React.useState<string>('');
  const [exportEndDate, setExportEndDate] = React.useState<string>('');
  const [showDateFilters, setShowDateFilters] = React.useState<boolean>(false);
  
  // Custom states matching user requirements
  const [showRoomTable, setShowRoomTable] = React.useState<boolean>(false);
  const [showQuickAttendanceEdit, setShowQuickAttendanceEdit] = React.useState<boolean>(false);
  const [showEditDatePopover, setShowEditDatePopover] = React.useState<boolean>(false);
  const [showBatchMarkConfirmModal, setShowBatchMarkConfirmModal] = React.useState<boolean>(false);
  const [batchActionType, setBatchActionType] = React.useState<'present' | 'excused'>('present');
  const [batchExcusedReason, setBatchExcusedReason] = React.useState<string>('Official MSU University Holiday / Suspension');
  const [rosterFilter, setRosterFilter] = React.useState<'all' | 'flagged' | 'borderline'>('all');
  const [dispatchedEmailsModalOpen, setDispatchedEmailsModalOpen] = React.useState<boolean>(false);
  const [selectedRosterDate, setSelectedRosterDate] = React.useState<string>(() => {
    // Default to current date in YYYY-MM-DD
    const localToday = new Date();
    const offset = localToday.getTimezoneOffset();
    const adjusted = new Date(localToday.getTime() - (offset*60*1000));
    return adjusted.toISOString().split('T')[0];
  });

  // Batch Attendance Override: Marks all enrolled students as 'present' or 'excused' for selectedRosterDate
  const handleBatchAttendanceOverride = (targetStatus: 'present' | 'excused' = batchActionType) => {
    const activeMonClass = classes.find(c => c.id === selectedMonitoringClassId) || classes[0];
    if (!activeMonClass) return;

    const monEnrs = enrollments.filter(e => e.classId === activeMonClass.id && !e.deletedByStudent);
    if (monEnrs.length === 0) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(`No active enrolled students found to mark ${targetStatus}.`, "warning");
      }
      return;
    }

    let count = 0;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    monEnrs.forEach(student => {
      const studentRecords = attendanceRecords.filter(
        r => r.classId === activeMonClass.id && 
        (r.studentId === student.studentId || r.studentName === student.studentName)
      );
      const existingDateRec = studentRecords.find(r => r.date === selectedRosterDate);

      if (existingDateRec) {
        if (existingDateRec.status !== targetStatus) {
          if (onUpdateAttendanceRecord) {
            onUpdateAttendanceRecord(existingDateRec.id, targetStatus);
            count++;
          }
        }
      } else {
        if (onAddAttendanceRecord) {
          onAddAttendanceRecord({
            classId: activeMonClass.id,
            className: activeMonClass.name,
            classCode: activeMonClass.code,
            date: selectedRosterDate,
            time: nowTime,
            status: targetStatus,
            role: 'student',
            studentName: student.studentName,
            studentId: student.studentId
          });
          count++;
        }
      }
    });

    const statusLabel = targetStatus === 'excused' ? 'EXCUSED / OFFICIAL HOLIDAY' : 'PRESENT';
    const msg = `⚡ Batch Attendance Override: Marked ${monEnrs.length} enrolled students as ${statusLabel} for ${selectedRosterDate}.`;
    speakText(msg, accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(msg, "success");
    }
  };

  // Automated Absence Warning Email Dispatch Handler
  const handleDispatchAtRiskWarningEmails = () => {
    const activeMonClass = classes.find(c => c.id === selectedMonitoringClassId) || classes[0];
    if (!activeMonClass) return;

    const monEnrs = enrollments.filter(e => e.classId === activeMonClass.id && !e.deletedByStudent);
    const atRiskItems: any[] = [];

    monEnrs.forEach(student => {
      const studentRecords = attendanceRecords.filter(
        r => r.classId === activeMonClass.id && 
        (r.studentId === student.studentId || r.studentName === student.studentName)
      );
      const standing = calculateStudentStanding(studentRecords);

      // Check consecutive unexcused absences
      const sortedRecords = [...studentRecords].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      let consecutiveAbs = 0;
      for (const r of sortedRecords) {
        if (r.status === 'absent') {
          consecutiveAbs++;
        } else if (r.status === 'excused') {
          continue;
        } else {
          break;
        }
      }

      const hasConsecutiveAbs = consecutiveAbs >= 3;
      const isBelowRate = standing.attendanceRate < 75;

      if (standing.isDropped || standing.status === 'warning' || isBelowRate || hasConsecutiveAbs) {
        atRiskItems.push({ 
          student, 
          rate: standing.attendanceRate, 
          abs: standing.absentCount, 
          consecutiveAbs,
          isConsecutive: hasConsecutiveAbs,
          total: standing.totalRecords,
          standing 
        });
      }
    });

    if (atRiskItems.length === 0) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("All enrolled students are in good standing with zero critical absence warnings!", "success");
      }
      return;
    }

    const existingDispatches = JSON.parse(localStorage.getItem('classpulse_dispatched_emails') || '[]');
    const freshDispatches: DispatchedWarningEmail[] = [];

    atRiskItems.forEach(item => {
      const stuEmail = item.student.studentEmail || (item.student.studentId ? `${item.student.studentId.toLowerCase()}@msu.edu.ph` : 'student@msu.edu.ph');
      const triggerReason = item.isConsecutive 
        ? `Incurred ${item.consecutiveAbs} consecutive unexcused absences (MSU 3-absence early warning policy)`
        : `Attendance rate dropped to ${item.rate}%, below the 75% threshold`;

      const emailObj: DispatchedWarningEmail = {
        id: 'email-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        studentId: item.student.studentId || 'STU-OFFICIAL',
        studentName: item.student.studentName || 'Student Candidate',
        studentEmail: stuEmail,
        classCode: activeMonClass.code,
        className: activeMonClass.name,
        attendanceRate: item.rate,
        advisorEmail: 'academic.advisor@msu.edu.ph',
        dispatchedAt: new Date().toLocaleString(),
        status: 'Delivered',
        subject: `⚠️ OFFICIAL ACADEMIC WARNING: ${activeMonClass.code} Attendance Alert (${item.isConsecutive ? '3+ Consecutive Absences' : `${item.rate}% Rate`})`,
        body: `Dear ${item.student.studentName},\n\nThis is an official academic notice regarding your standing in ${activeMonClass.code} (${activeMonClass.name}).\n\nWarning Trigger: ${triggerReason}.\nTotal Recorded Absences: ${item.abs} (Current Rate: ${item.rate}%).\n\nPlease contact Professor ${userProfile?.name || 'Faculty'} and your Department Academic Adviser immediately. If these absences were due to illness, please file an official MSU Infirmary Slip through the portal.\n\nMSU Main Campus Office of Academic Affairs & Attendance Management`
      };
      freshDispatches.push(emailObj);
    });

    localStorage.setItem('classpulse_dispatched_emails', JSON.stringify([...freshDispatches, ...existingDispatches]));

    const toastMsg = `📧 Dispatched official warning notices to ${atRiskItems.length} at-risk student(s), advisers, and department chairs!`;
    speakText(toastMsg, accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(toastMsg, "warning");
    }
    setDispatchedEmailsModalOpen(true);
  };

  const sortedClasses = React.useMemo(() => {
    return [...classes].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true })
    );
  }, [classes]);

  const [showStickyHeader] = React.useState(true);
  const isScrolled = false;
  const [showAllClasses, setShowAllClasses] = React.useState<boolean>(false);

  // Faculty Alarm Simulation popup trigger states
  React.useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.screenId) {
        setNotifSearch('');
        setNotifFilter('all');
        setExcuseFilter('pending');
        setClassSearchQuery('');
        setStudentSearchQuery('');
        setSelectedClassDetail(null);
        setIsDetailModalOpen(false);
        setIsFormOpen(false);
        setEditingClass(null);
      }
    };
    window.addEventListener('reset-screen-state', handleReset);
    return () => {
      window.removeEventListener('reset-screen-state', handleReset);
    };
  }, []);
  const [isFacultyAlarmOpen, setIsFacultyAlarmOpen] = React.useState(false);
  const [selectedAlarmClassId, setSelectedAlarmClassId] = React.useState<string>(classes[0]?.id || '');
  const [facultyAlarmRoom, setFacultyAlarmRoom] = React.useState('Room 201');

  // Sync state validities
  React.useEffect(() => {
    if (classes.length > 0) {
      if (!classes.some(c => c.id === selectedMonitoringClassId)) {
        setSelectedMonitoringClassId(classes[0].id);
      }
      if (!classes.some(c => c.id === selectedAlarmClassId)) {
        setSelectedAlarmClassId(classes[0].id);
      }
    }
  }, [classes, selectedMonitoringClassId, selectedAlarmClassId]);

  const activeMonClass = classes.find(c => c.id === selectedMonitoringClassId);
  const monEnrollments = enrollments.filter(e => e.classId === selectedMonitoringClassId && !e.deletedByStudent);

  // Compute analytics data for active monitoring class
  const monClassRecords = attendanceRecords.filter(r => r.classId === selectedMonitoringClassId);

  const handleExportSelectedClassAttendance = () => {
    if (!activeMonClass) {
      speakText("No class is currently selected for export.", accessibility.readAloud);
      return;
    }
    
    let recordsToExport = [...monClassRecords];
    if (exportStartDate) {
      recordsToExport = recordsToExport.filter(r => r.date >= exportStartDate);
    }
    if (exportEndDate) {
      recordsToExport = recordsToExport.filter(r => r.date <= exportEndDate);
    }
    
    const headers = ["Student ID", "Student Name", "Class Code", "Class Name", "Date", "Time", "Status"];
    const rows = recordsToExport.map(rec => [
      rec.studentId || "N/A",
      rec.studentName || "N/A",
      rec.classCode || activeMonClass.code,
      rec.className || activeMonClass.name,
      rec.date,
      rec.time,
      rec.status.toUpperCase()
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => {
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const rangeSuffix = (exportStartDate || exportEndDate) 
      ? `_from_${exportStartDate || 'start'}_to_${exportEndDate || 'end'}` 
      : "";
    
    link.setAttribute("download", `${activeMonClass.code}_Attendance_${activeMonClass.name.replace(/\s+/g, '_')}${rangeSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const filterDesc = (exportStartDate || exportEndDate)
      ? ` from ${exportStartDate || 'earliest'} to ${exportEndDate || 'latest'}`
      : "";
    speakText(`Successfully exported attendance ledger for ${activeMonClass.name} to CSV${filterDesc}`, accessibility.readAloud);
  };

  const handleExportAllFacultyAttendance = () => {
    const facultyClassIds = classes.map(c => c.id);
    let filteredRecords = attendanceRecords.filter(r => facultyClassIds.includes(r.classId));
    
    if (exportStartDate) {
      filteredRecords = filteredRecords.filter(r => r.date >= exportStartDate);
    }
    if (exportEndDate) {
      filteredRecords = filteredRecords.filter(r => r.date <= exportEndDate);
    }
    
    const headers = ["Student ID", "Student Name", "Class Code", "Class Name", "Date", "Time", "Status"];
    const rows = filteredRecords.map(rec => {
      const cls = classes.find(c => c.id === rec.classId);
      return [
        rec.studentId || "N/A",
        rec.studentName || "N/A",
        rec.classCode || (cls ? cls.code : "N/A"),
        rec.className || (cls ? cls.name : "N/A"),
        rec.date,
        rec.time,
        rec.status.toUpperCase()
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => {
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const rangeSuffix = (exportStartDate || exportEndDate) 
      ? `_from_${exportStartDate || 'start'}_to_${exportEndDate || 'end'}` 
      : "";
    
    link.setAttribute("download", `Faculty_Consolidated_Attendance${rangeSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const filterDesc = (exportStartDate || exportEndDate)
      ? ` from ${exportStartDate || 'earliest'} to ${exportEndDate || 'latest'}`
      : "";
    speakText(`Successfully exported all assigned classes attendance records to CSV${filterDesc}`, accessibility.readAloud);
  };

  const monClassPresents = monClassRecords.filter(r => r.status === 'present').length;
  const monClassLates = monClassRecords.filter(r => r.status === 'late').length;
  const monClassAbsents = monClassRecords.filter(r => r.status === 'absent').length;
  
  // Roster at risk (under 85% attendance rate)
  const monClassAtRisk = monEnrollments.filter(student => {
    const studentRecords = attendanceRecords.filter(
      r => r.classId === selectedMonitoringClassId && 
      (r.studentId === student.studentId || r.studentName === student.studentName)
    );
    const presentCount = studentRecords.filter(r => r.status === 'present').length;
    const lateCount = studentRecords.filter(r => r.status === 'late').length;
    const rate = studentRecords.length > 0 ? Math.round(((presentCount + lateCount) / studentRecords.length) * 100) : 100;
    return rate < 85;
  }).length;

  const totalMonRecords = monClassRecords.length;
  const monClassPresentsRate = totalMonRecords > 0 ? (monClassPresents / totalMonRecords) * 100 : 0;
  const monClassLatesRate = totalMonRecords > 0 ? (monClassLates / totalMonRecords) * 100 : 0;
  const monClassAbsentsRate = totalMonRecords > 0 ? (monClassAbsents / totalMonRecords) * 100 : 0;
  const monClassAtRiskRate = monEnrollments.length > 0 ? (monClassAtRisk / monEnrollments.length) * 100 : 0;

  const handleCommitFacultyAlarmUpdate = (status: 'attend' | 'cancel' | 'late') => {
    const matchedClass = classes.find(c => c.id === selectedAlarmClassId);
    if (!matchedClass) return;

    onEditClass({
      ...matchedClass,
      facultyStatusUpdate: status,
      room: facultyAlarmRoom,
      lastUpdateTimestamp: Date.now()
    });

    setIsFacultyAlarmOpen(false);
    speakText(`Class update status committed. Declared: ${status.toUpperCase()} in ${facultyAlarmRoom}`, accessibility.readAloud);
  };

  // Modal triggers
  const [selectedClassDetail, setSelectedClassDetail] = React.useState<ClassSession | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState<boolean>(false);
  const [hoveredFacultyTrendIndex, setHoveredFacultyTrendIndex] = React.useState<number | null>(null);

  // Form states for class adding/editing
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<ClassSession | null>(null);
  const [deleteConfirmClass, setDeleteConfirmClass] = React.useState<{ id: string; code: string } | null>(null);
  const [conflictConfirmData, setConflictConfirmData] = React.useState<{ action: () => void } | null>(null);

  const [formCode, setFormCode] = React.useState('');
  const [formName, setFormName] = React.useState('');
  const [formStart, setFormStart] = React.useState('09:00 AM');
  const [formEnd, setFormEnd] = React.useState('10:30 AM');
  const [formRoom, setFormRoom] = React.useState('');
  const [formDays, setFormDays] = React.useState<string[]>(['MW']);
  const [formGracePeriod, setFormGracePeriod] = React.useState<number>(DEFAULT_GRACE_PERIOD_MINUTES);
  const [formAcademicTerm, setFormAcademicTerm] = React.useState<string>(ACADEMIC_TERMS[0]);
  const [formBuildingCluster, setFormBuildingCluster] = React.useState<string>(BUILDING_CLUSTERS[0]);

  // Profiles edit states
  const [profileName, setProfileName] = React.useState(userProfile.name);
  const [profileEmail, setProfileEmail] = React.useState(userProfile.email);
  const [profileAvatar, setProfileAvatar] = React.useState(userProfile.avatar);
  const [profileSavedMsg, setProfileSavedMsg] = React.useState(false);

  // Dynamic conflict detection for faculty form
  const facultyConflicts = React.useMemo(() => {
    const conflicts: { type: 'room' | 'faculty'; message: string; subCode: string; subName: string; details: string }[] = [];
    if (!isFormOpen) return conflicts;

    const currentStart = parseTimeToMinutesVal(formStart);
    const currentEnd = parseTimeToMinutesVal(formEnd);

    classes.forEach(c => {
      // skip if editing the same class
      if (editingClass && c.id === editingClass.id) return;

      // Check day overlap
      const hasDayOverlap = checkDaysOverlapVal(formDays, c.days);
      if (!hasDayOverlap) return;

      // Check time overlap
      const classStart = parseTimeToMinutesVal(c.startTime);
      const classEnd = parseTimeToMinutesVal(c.endTime);
      const isTimeOverlapping = currentStart < classEnd && classStart < currentEnd;
      if (!isTimeOverlapping) return;

      // Check room overlap
      const isSameRoom = (c.room || '').trim().toLowerCase() === (formRoom || '').trim().toLowerCase();
      if (isSameRoom) {
        conflicts.push({
          type: 'room',
          subCode: c.code,
          subName: c.name,
          message: `Room Conflict: "${formRoom}" is already booked by ${c.code} (${c.facultyName}).`,
          details: `${c.days.join(', ')} @ ${c.startTime} - ${c.endTime}`
        });
      }

      // Check if same faculty member is already busy
      const isSameFaculty = (c.facultyId && userProfile.facultyId && c.facultyId === userProfile.facultyId) ||
                            (c.facultyName && userProfile.name && c.facultyName.trim().toLowerCase() === userProfile.name.trim().toLowerCase());
      if (isSameFaculty) {
        conflicts.push({
          type: 'faculty',
          subCode: c.code,
          subName: c.name,
          message: `Time Clashing: You are scheduled to teach ${c.code} (${c.name}) during this identical time slot.`,
          details: `${c.days.join(', ')} @ ${c.startTime} - ${c.endTime}`
        });
      }
    });

    return conflicts;
  }, [formStart, formEnd, formRoom, formDays, classes, editingClass, isFormOpen, userProfile]);

  const availableRoomsForForm = React.useMemo(() => {
    const currentStart = parseTimeToMinutesVal(formStart);
    const currentEnd = parseTimeToMinutesVal(formEnd);

    return labRooms.filter(rm => {
      if (rm.status === 'maintenance') return false;
      
      const overlaps = classes.some(c => {
        if ((c.room || '').trim().toLowerCase() !== (rm.name || '').trim().toLowerCase()) return false;
        if (editingClass && c.id === editingClass.id) return false;
        
        const hasDayOverlap = checkDaysOverlapVal(formDays, c.days);
        if (!hasDayOverlap) return false;

        const classStart = parseTimeToMinutesVal(c.startTime);
        const classEnd = parseTimeToMinutesVal(c.endTime);

        return currentStart < classEnd && classStart < currentEnd;
      });

      return !overlaps;
    }).sort((a, b) => {
      const floorA = a.floor || '';
      const floorB = b.floor || '';
      const floorCmp = floorA.localeCompare(floorB, undefined, { numeric: true });
      if (floorCmp !== 0) return floorCmp;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [formStart, formEnd, formDays, classes, editingClass, labRooms]);

  React.useEffect(() => {
    setProfileName(userProfile.name);
    setProfileEmail(userProfile.email);
    setProfileAvatar(userProfile.avatar);
  }, [userProfile]);

  // Interval timer for the broadcasted QR expiration count and automatic 15-sec rotation (Real-Time QR Codes!)
  React.useEffect(() => {
    let interval: any = null;
    let rotationInterval: any = null;

    if (activeScreen === 'qr-generator' && timeLeft > 0 && qrToken && qrToken !== 'STANDBY' && qrToken !== 'EXPIRED') {
      // 1. Expiration Countdown (ticks every 1 second)
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setQrToken('EXPIRED');
            speakText("Broadcast session expired.", accessibility.readAloud);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 2. Dynamic Real-time Token Rotation (rotates every 15 seconds to ensure robust, secure scanning)
      rotationInterval = setInterval(() => {
        const now = new Date();
        const dayLabels = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const todayLabel = dayLabels[now.getDay()];
        const activeMatch = classes.find(c => {
          const expanded = expandDaysToSpecificOnesVal(c.days);
          return expanded.includes(todayLabel);
        }) || classes.find(c => c.id === activeQRClass) || classes[0];
        
        if (activeMatch) {
          const generatedKey = 'CODE_' + activeMatch.code.toUpperCase() + '_' + Math.random().toString(36).substring(4, 9).toUpperCase();
          
          // Propagate fresh security key rotation to parent class state
          onEditClass({
            ...activeMatch,
            qrToken: generatedKey,
            qrGeneratedAt: Date.now()
          });
          setQrToken(generatedKey);
        }
      }, 15000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (rotationInterval) clearInterval(rotationInterval);
    };
  }, [activeScreen, timeLeft, qrToken, activeQRClass]);

  const handleCreateNewQrToken = () => {
    setQrToken('QR_KEY_' + Math.random().toString(36).substring(4, 10).toUpperCase());
    setTimeLeft(300); // Reset countdown timer
    onChangeFacultyStatus('in-class');
    speakText("New attendance QR key generated. Status automatically set to In Class.", accessibility.readAloud);
  };

  const handleOpenEditForm = (cls: ClassSession) => {
    setEditingClass(cls);
    setFormCode(cls.code);
    setFormName(cls.name);
    setFormStart(cls.startTime);
    setFormEnd(cls.endTime);
    setFormRoom(cls.room);
    setFormDays(cls.days);
    setFormGracePeriod(cls.gracePeriodMinutes ?? DEFAULT_GRACE_PERIOD_MINUTES);
    setFormAcademicTerm(cls.academicTerm ?? ACADEMIC_TERMS[0]);
    setFormBuildingCluster(cls.buildingCluster ?? BUILDING_CLUSTERS[0]);
    setIsFormOpen(true);
    speakText(`Editing class form for ${cls.name}`, accessibility.readAloud);

    // Auto scroll to schedule form
    setTimeout(() => {
      const formEl = document.getElementById('faculty-schedule-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleOpenAddForm = () => {
    setEditingClass(null);
    setFormCode('');
    setFormName('');
    setFormStart('09:00 AM');
    setFormEnd('10:30 AM');
    setFormRoom('');
    setFormDays(['MW']);
    setFormGracePeriod(DEFAULT_GRACE_PERIOD_MINUTES);
    setFormAcademicTerm(ACADEMIC_TERMS[0]);
    setFormBuildingCluster(BUILDING_CLUSTERS[0]);
    setIsFormOpen(true);
    speakText("Opening add class schedule form", accessibility.readAloud);

    // Auto scroll to schedule form
    setTimeout(() => {
      const formEl = document.getElementById('faculty-schedule-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode || !formName) return;

    const saveAction = () => {
      if (editingClass) {
        onEditClass({
          ...editingClass,
          code: formCode,
          name: formName,
          startTime: formStart,
          endTime: formEnd,
          room: formRoom,
          days: formDays,
          gracePeriodMinutes: formGracePeriod,
          academicTerm: formAcademicTerm,
          buildingCluster: formBuildingCluster
        });
        speakText("Class details updated successfully", accessibility.readAloud);
      } else {
        onAddClass({
          code: formCode,
          name: formName,
          startTime: formStart,
          endTime: formEnd,
          room: formRoom,
          days: formDays,
          gracePeriodMinutes: formGracePeriod,
          academicTerm: formAcademicTerm,
          buildingCluster: formBuildingCluster,
          facultyName: userProfile.name,
          facultyId: userProfile.facultyId || 'fac-1'
        });
        speakText("New class registry added", accessibility.readAloud);
      }
      setIsFormOpen(false);
    };

    if (facultyConflicts.length > 0) {
      setConflictConfirmData({ action: saveAction });
    } else {
      saveAction();
    }
  };

  const handleDeleteClick = (classId: string, code: string) => {
    setDeleteConfirmClass({ id: classId, code });
  };

  const handleDayToggle = (day: string) => {
    if (formDays.includes(day)) {
      setFormDays(prev => prev.filter(d => d !== day));
    } else {
      setFormDays(prev => [...prev, day]);
    }
  };

  const handleOpenSubjectDetails = (cls: ClassSession) => {
    setSelectedClassDetail(cls);
    setIsDetailModalOpen(true);
    speakText(`Opening course detail modal for ${cls.name}`, accessibility.readAloud);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result as string);
        speakText("New profile photograph loaded. Submit form to commit.", accessibility.readAloud);
      };
      reader.readAsDataURL(file);
    }
  };

  // Stats Counters
  const totalClasses = classes.length;
  const currentStudentsCount = enrollments.length;

  return (
    <div className={activeScreen === 'messages' || activeScreen === 'help-center' ? "h-full flex flex-col min-h-0" : "space-y-6"}>

      <AnimatePresence mode="wait">
        {/* 1. FACULTY INSIGHTS DASHBOARD */}
        {activeScreen === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3.5 sm:space-y-4 text-left"
          >
            {/* Compact Welcome Header */}
          <div className="p-3.5 sm:p-4 md:p-5 rounded-2xl relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-indigo-900 via-zinc-900 to-emerald-950 text-white shadow-md">
            <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  Faculty Hub
                </span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Welcome back, Prof. {userProfile.name}!
                </h2>
              </div>
            </div>
          </div>

          {/* Targeted Administrative Announcements */}
          {announcements.filter(ann => ann.target === 'all' || ann.target === 'faculty').length > 0 && (
            isBulletinsHidden ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/10 flex items-center justify-between text-left animate-fade-in">
                <div className="flex items-center gap-2.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Administrative Bulletins minimized ({announcements.filter(ann => ann.target === 'all' || ann.target === 'faculty').length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulletinsHidden(false);
                    speakText("University Bulletins expanded.", accessibility.readAloud);
                  }}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer select-none active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" />
                  unhide
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/15 text-amber-950 dark:text-amber-300 space-y-3 text-left animate-fade-in relative">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-550 bg-amber-500 animate-pulse" />
                    University Bulletins ({announcements.filter(ann => ann.target === 'all' || ann.target === 'faculty').length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulletinsHidden(true);
                      speakText("Administrative Bulletins hidden/minimized.", accessibility.readAloud);
                    }}
                    className="inline-flex items-center gap-1.5 py-1 px-2 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer select-none active:scale-95"
                    title="Hide and minimize bulletins card"
                  >
                    <EyeOff className="w-3 h-3" />
                    hide
                  </button>
                </div>
                <div className="space-y-3 divide-y divide-amber-500/10">
                  {announcements
                    .filter(ann => ann.target === 'all' || ann.target === 'faculty')
                    .map((ann) => (
                      <div key={ann.id} className="pt-3 first:pt-0">
                        <h5 className="text-xs font-extrabold text-amber-600 dark:text-amber-400">{ann.title}</h5>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed font-sans">{ann.content}</p>
                        <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wider block mt-1 uppercase">Issued {new Date(ann.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                </div>
              </div>
            )
          )}

          {/* High Fidelity Faculty Status & Statistics Suite */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Faculty status indicator card */}
            <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850/80 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src={userProfile.avatar} 
                  alt={userProfile.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/20"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{userProfile.name}</h4>
                  <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-zinc-400">LECTURER COORDINATOR</span>
                </div>
              </div>

              {/* Status Indicator Panel */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Active Campus Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                    facultyStatus === 'available' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                    facultyStatus === 'in-class' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {facultyStatus === 'available' ? 'Available' : facultyStatus === 'in-class' ? 'In Class' : 'Away'}
                  </span>
                </div>

                <div className="flex gap-1.5 mt-2">
                  {[
                    { id: 'available', label: 'Available', color: 'emerald' },
                    { id: 'in-class', label: 'In Class', color: 'amber' },
                    { id: 'unavailable', label: 'Away', color: 'red' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        onChangeFacultyStatus(st.id as any);
                        speakText(`Status updated to ${st.label}`, accessibility.readAloud);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all border cursor-pointer text-center ${
                        facultyStatus === st.id
                          ? st.color === 'emerald' ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold' :
                            st.color === 'amber' ? 'bg-amber-500 text-black border-amber-500 font-extrabold' :
                            'bg-red-500 text-white border-red-500 font-extrabold'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-650 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-zinc-400 leading-normal">
                Updating your status alerts students in your active rosters through schedule broadcasts.
              </p>

              {/* Message Admin Inline Help Panel */}
              <div className="pt-3.5 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[11px] mt-1 shrink-0">
                <span className="text-zinc-500 font-bold">Administrative Help?</span>
                <button
                  type="button"
                  onClick={() => {
                    setScreen('help-center');
                    speakText("Opening the Help & Administrator Support Center.", accessibility.readAloud);
                  }}
                  className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  Message Admin 💬
                </button>
              </div>
            </div>

            {/* Right: Quick Stats Meters */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850/80 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.01)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/[0.02] rounded-full blur-2xl group-hover:scale-110 transition-transform" />
                <div className="space-y-1 text-left relative z-10">
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-zinc-400">Class Statistics</span>
                  <h4 className="text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-2">{totalClasses} Sections</h4>
                  <p className="text-xs text-zinc-500">Allocated across {classes.reduce((acc, c) => acc + c.days.length, 0)} schedule intervals week-round.</p>
                </div>
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-[10px] text-zinc-400 mt-4 relative z-10">
                  <span>Room Allocation List</span>
                  <span className="font-bold underline text-emerald-550 dark:text-emerald-450 cursor-pointer" onClick={() => setScreen('schedules')}>Inspect Rooms</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850/80 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.01)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/[0.02] rounded-full blur-2xl group-hover:scale-110 transition-transform" />
                <div className="space-y-1 text-left relative z-10">
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-zinc-400">Total Rosters Count</span>
                  <h4 className="text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-2">{currentStudentsCount} Students</h4>
                  <p className="text-xs text-zinc-500">Regularly attending classes. Average active scan tracking speed is <b>1.8s / student</b>.</p>
                </div>
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-[10px] text-zinc-400 mt-4 relative z-10">
                  <span className="text-emerald-500 font-extrabold flex items-center gap-0.5">• Term average: 88.5%</span>
                  <span className="text-emerald-555 font-bold cursor-pointer" onClick={() => setScreen('students-monitoring')}>View Risk Analysis</span>
                </div>
              </div>

            </div>

          </div>

          {/* Student Performance Analytics */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850/80 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-zinc-400 tracking-widest">Performance Analysis</span>
                <h3 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">Student Performance rosters</h3>
                <p className="text-xs text-zinc-400 leading-normal mt-0.5">Visual representation of general roster standings in term evaluations.</p>
              </div>

              {(() => {
                const totalStudentsInClass = monEnrollments.length;
                
                const passingCount = monEnrollments.filter(st => {
                  const recs = attendanceRecords.filter(r => r.classId === selectedMonitoringClassId && (r.studentId === st.studentId || r.studentName === st.studentName));
                  const pres = recs.filter(r => r.status === 'present').length;
                  const late = recs.filter(r => r.status === 'late').length;
                  const rate = recs.length > 0 ? Math.round(((pres + late) / recs.length) * 100) : 100;
                  return rate >= 85;
                }).length;

                const borderlineCount = monEnrollments.filter(st => {
                  const recs = attendanceRecords.filter(r => r.classId === selectedMonitoringClassId && (r.studentId === st.studentId || r.studentName === st.studentName));
                  const pres = recs.filter(r => r.status === 'present').length;
                  const late = recs.filter(r => r.status === 'late').length;
                  const rate = recs.length > 0 ? Math.round(((pres + late) / recs.length) * 100) : 100;
                  return rate >= 75 && rate < 85;
                }).length;

                const warningCount = (totalStudentsInClass - passingCount - borderlineCount) >= 0 
                  ? Math.max(0, totalStudentsInClass - passingCount - borderlineCount) 
                  : 0;

                const passPercent = totalStudentsInClass > 0 ? Math.round((passingCount / totalStudentsInClass) * 100) : 0;
                const borderPercent = totalStudentsInClass > 0 ? Math.round((borderlineCount / totalStudentsInClass) * 100) : 0;
                const warnPercent = totalStudentsInClass > 0 ? Math.max(0, 100 - passPercent - borderPercent) : 0;

                const stats = [
                  { name: 'Passing (85% - 100% attendance)', count: totalStudentsInClass > 0 ? passingCount : 0, percent: passPercent, color: 'emerald' },
                  { name: 'Borderline Range (75% - 85% attendance)', count: totalStudentsInClass > 0 ? borderlineCount : 0, percent: borderPercent, color: 'amber' },
                  { name: 'Warning/At-Risk (<75% attendance)', count: totalStudentsInClass > 0 ? warningCount : 0, percent: warnPercent, color: 'red' }
                ];

                return (
                  <div className="space-y-3.5 pt-1">
                    {stats.map((stat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-zinc-700 dark:text-zinc-200">{stat.name}</span>
                          <span className="font-mono text-zinc-400">{stat.count} students ({stat.percent}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative">
                          <div 
                            className={`h-full rounded-full ${
                              stat.color === 'emerald' ? 'bg-emerald-500' :
                              stat.color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${stat.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Class Cards list */}
            <div className="lg:col-span-8 space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">Assigned Curriculums</h3>
                    <p className="text-xs text-zinc-400">Click any card to inspect active student registries and attendance trends</p>
                  </div>
                  <div className="relative w-full md:max-w-xs shrink-0 select-none">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                      <Search className="w-3.5 h-3.5 text-emerald-500" />
                    </span>
                    <input
                      type="text"
                      className="w-full pl-8 pr-8 py-1.5 text-base md:text-xs bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-205 dark:border-zinc-800 focus:border-emerald-500 outline-none text-zinc-800 dark:text-zinc-200 font-bold"
                      placeholder="Fast search classes..."
                      value={classSearchQuery}
                      onChange={(e) => setClassSearchQuery(e.target.value)}
                    />
                    {classSearchQuery && (
                      <button 
                        onClick={() => setClassSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-650 font-black cursor-pointer text-sm animate-fade-in"
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {(() => {
                  const filtered = classes.filter(cls => 
                    (cls.name || '').toLowerCase().includes(classSearchQuery.toLowerCase()) ||
                    (cls.code || '').toLowerCase().includes(classSearchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs font-medium">
                        No courses match "{classSearchQuery}"
                      </div>
                    );
                  }

                  const displayedClasses = showAllClasses ? filtered : filtered.slice(0, 3);

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {displayedClasses.map(cls => {
                          const enrolledCount = enrollments.filter(e => e.classId === cls.id).length;
                          return (
                            <div
                              key={cls.id}
                              onClick={() => handleOpenSubjectDetails(cls)}
                              className="p-5 pl-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-all cursor-pointer text-left relative overflow-hidden group hover:border-emerald-500/30"
                            >
                              {/* High elegance left-border ribbon accentuating the status */}
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 transition-transform duration-300 group-hover:scale-y-110" />
                              
                              <span className="text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                                {cls.code}
                              </span>
                              
                              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight mt-3 truncate">{cls.name}</h4>
                              
                              <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                                <span className="flex items-center gap-1 font-semibold text-zinc-650 dark:text-zinc-350">
                                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  {cls.startTime}
                                </span>
                                <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-400 font-extrabold border border-emerald-500/10">
                                  <Users className="w-3.5 h-3.5 text-emerald-500" /> {enrolledCount} Students
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {filtered.length > 3 && (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !showAllClasses;
                              setShowAllClasses(nextVal);
                              speakText(nextVal ? "Showing all assigned curriculums" : "Showing three enrolled classes", accessibility.readAloud);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-350 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <span>{showAllClasses ? "Hide Extra Classes (Show 3 Enrolled)" : `Show All Assigned Classes (${filtered.length})`}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Real-time Faculty Attendance & Punctuality Trends Chart */}
              <FacultyAttendanceTrendsChart
                classes={classes}
                records={attendanceRecords}
                isDark={accessibility.theme === 'dark'}
              />

              {/* Merged Pre-Class Clock & Status Broadcast card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-150 dark:border-zinc-900">
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-500 animate-pulse" />
                      Pre-Class Clock & Status Broadcast
                    </h3>
                    <p className="text-xs text-zinc-400">Merged Pre-Class Alert system. Automatically prompts status update options 5 minutes before scheduled classes.</p>
                  </div>
                </div>

                {!isFacultyAlarmOpen ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 flex items-center justify-center text-lg">
                      ⏰
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-205">Broadcast Standby</h4>
                      <p className="text-xs text-zinc-500">Currently no active pre-class countdown is running. Status option prompts and room modification inputs appear 5 minutes before scheduled class times.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const firstClass = classes[0];
                        if (firstClass) {
                          setSelectedAlarmClassId(firstClass.id);
                          setFacultyAlarmRoom(firstClass.room);
                        }
                        setIsFacultyAlarmOpen(true);
                        speakText("Simulating 5 minute countdown alarm clock before class starts.", accessibility.readAloud);
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      Simulate 5m Before Class
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 space-y-5">
                    {/* Active Countdown Header */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold animate-pulse">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>CLASS COMMENCEMENT COUNTDOWN</span>
                      </div>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100 font-black px-2 py-0.5 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-850">
                        05:00 MINS LEFT
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Commencing Subject Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">Commencing Curriculum Class</label>
                        <select
                          value={selectedAlarmClassId}
                          onChange={(e) => {
                            setSelectedAlarmClassId(e.target.value);
                            const found = classes.find(c => c.id === e.target.value);
                            if (found) setFacultyAlarmRoom(found.room);
                          }}
                          className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-55 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-105 outline-none font-bold"
                        >
                          {sortedClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.code}: {c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Room Change field */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">Room Modification Option</label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            value={facultyAlarmRoom}
                            onChange={(e) => setFacultyAlarmRoom(e.target.value)}
                            placeholder="e.g. Room 303-C"
                            className="w-full text-xs pl-9 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-55 dark:bg-zinc-900 outline-none text-zinc-900 dark:text-zinc-105 font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Fast Actions Row */}
                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Declare Attendance & Update Status</span>
                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleCommitFacultyAlarmUpdate('attend')}
                          className="p-3 bg-emerald-500 hover:bg-emerald-400 cursor-pointer rounded-xl text-black font-black uppercase text-[10px] tracking-wider text-center transition-transform active:scale-95"
                        >
                          Attend
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCommitFacultyAlarmUpdate('cancel')}
                          className="p-3 bg-red-500 hover:bg-red-400 cursor-pointer rounded-xl text-white font-black uppercase text-[10px] tracking-wider text-center transition-transform active:scale-95"
                        >
                          Cancel Class
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCommitFacultyAlarmUpdate('late')}
                          className="p-3 bg-amber-500 hover:bg-amber-400 cursor-pointer rounded-xl text-black font-black uppercase text-[10px] tracking-wider text-center transition-transform active:scale-95"
                        >
                          Late Arrival
                        </button>
                      </div>
                    </div>

                    <div className="text-[10.5px] text-zinc-400 flex items-center justify-between">
                      <span>Standards Protocol Sync active (auto-posts)</span>
                      <button
                        type="button"
                        onClick={() => setIsFacultyAlarmOpen(false)}
                        className="text-red-500 underline font-semibold cursor-pointer"
                      >
                        Bypass Prompt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Sidebar Clock */}
            <div className="lg:col-span-4 space-y-4">
              <AlarmClock readAloudEnabled={accessibility.readAloud} />
              
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-left">
                <h4 className="text-xs font-black text-zinc-805 dark:text-zinc-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  Direct QR Code Broadcasts
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal mb-3">
                  Open the QR generation pane to cast a secure attendance token. Students can scans dynamically to enroll.
                </p>
                <button
                  onClick={() => setScreen('qr-generator')}
                  type="button"
                  className="w-full text-center py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all active:scale-95"
                >
                  Open QR Generator
                </button>
              </div>

              {/* LABORATORY ROOM UTILIZATION MONITOR CABINET */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-left space-y-3.5">
                <div>
                  <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    Laboratory Rooms Cabinet
                  </h4>
                  <p className="text-[10px] text-zinc-400">Select and monitor campus lab availability & active scanner logs</p>
                </div>

                {/* Dropdown Room Selector */}
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-zinc-450 uppercase tracking-widest block font-black">Target Laboratory Room</label>
                  <select
                    name="room-selector"
                    value={selectedFacultyRoomId}
                    onChange={(e) => {
                      setSelectedFacultyRoomId(e.target.value);
                      speakText(`Tuning monitor into ${labRooms.find(r => r.id === e.target.value)?.name || 'selected laboratory room'} live signals`, accessibility.readAloud);
                    }}
                    className="w-full text-[11px] p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-850 outline-none text-zinc-805 dark:text-zinc-200"
                  >
                    {labRooms.map(rm => (
                      <option key={rm.id} value={rm.id}>{rm.name} {rm.floor ? `(${rm.floor})` : ''} ({rm.currentOccupancy}/{rm.capacity} Pax)</option>
                    ))}
                    {labRooms.length === 0 && (
                      <option value="">No laboratory rooms registered</option>
                    )}
                  </select>
                </div>

                {/* Selected Room Status Card */}
                {(() => {
                  const activeRoom = labRooms.find(r => r.id === selectedFacultyRoomId) || labRooms[0];
                  if (!activeRoom) {
                    return (
                      <p className="text-[9px] text-zinc-400 text-center py-2">No dynamic lab statistics registered.</p>
                    );
                  }

                  const percent = Math.min(100, Math.round((activeRoom.currentOccupancy / activeRoom.capacity) * 100)) || 0;
                  
                  // Color coding level
                  const occupancyLevel = 
                    activeRoom.status === 'maintenance' ? 'maintenance' :
                    percent >= 85 ? 'high' :
                    percent >= 60 ? 'moderate' : 'low';

                  const badgeConfig = {
                    low: { label: '🟢 Optimal / Low Occupancy', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', barColor: 'bg-emerald-500' },
                    moderate: { label: '🟠 Moderate Occupancy', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', barColor: 'bg-amber-500' },
                    high: { label: '🔴 High Occupancy / Near Full', color: 'text-red-500 bg-red-500/10 border-red-500/30', barColor: 'bg-red-500' },
                    maintenance: { label: '⚠️ Under Maintenance', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30', barColor: 'bg-amber-500' }
                  }[occupancyLevel];

                  return (
                    <div className="space-y-3 animate-scale-up">
                      {/* Real-time Color-Coded Status Badge */}
                      <div className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-between shadow-2xs ${badgeConfig.color}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${badgeConfig.barColor} animate-ping`} />
                          <span className="font-mono uppercase tracking-wider text-[10px]">{badgeConfig.label}</span>
                        </div>
                        <span className="font-mono font-black text-xs">{percent}%</span>
                      </div>

                      {/* Stats details */}
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-150 dark:border-zinc-850 space-y-2">
                        {/* 3-Tier Quick Scale Indicator */}
                        <div className="grid grid-cols-3 gap-1 text-[8px] font-mono text-center font-bold">
                          <div className={`py-0.5 rounded ${occupancyLevel === 'low' ? 'bg-emerald-500 text-black font-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}>
                            &lt; 60% Low
                          </div>
                          <div className={`py-0.5 rounded ${occupancyLevel === 'moderate' ? 'bg-amber-500 text-black font-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}>
                            60-84% Mod
                          </div>
                          <div className={`py-0.5 rounded ${occupancyLevel === 'high' ? 'bg-red-500 text-white font-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}>
                            ≥ 85% Full
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${badgeConfig.barColor}`}
                            style={{ width: `${activeRoom.status === 'maintenance' ? 100 : percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1 font-mono">
                          <span className="text-zinc-400">Live Occupancy:</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold">{activeRoom.currentOccupancy} / {activeRoom.capacity} Pax</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-zinc-400">Hardware systems:</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold">{activeRoom.devicesCount} Terminals</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-zinc-400">Terminal scan state:</span>
                          <span className={`font-black leading-none ${activeRoom.scannersActive ? 'text-emerald-500' : 'text-zinc-400'}`}>{activeRoom.scannersActive ? '● SECURE POWERED' : '○ SHUTDOWN'}</span>
                        </div>
                        {activeRoom.floor && (
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-zinc-400">Located Floor:</span>
                            <span className="text-zinc-700 dark:text-zinc-300 font-extrabold">{activeRoom.floor}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-zinc-100 dark:border-zinc-900">
                          <span className="text-zinc-400">Laboratory status:</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono ${
                            activeRoom.status === 'occupied' || occupancyLevel === 'high' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                            activeRoom.status === 'maintenance' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold animate-pulse' :
                            'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {activeRoom.status === 'maintenance' ? '⚠️ maintenance' : activeRoom.status}
                          </span>
                        </div>
                      </div>

                      {/* Active Roster scanning stream console */}
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block font-black">Active Scanner Logs</span>
                        <div className="p-3 rounded-xl bg-zinc-950 font-mono text-[9px] text-zinc-300 space-y-1 max-h-24 overflow-y-auto border border-zinc-900 leading-normal select-none custom-scrollbar">
                          {(activeRoom.activeScannerLogs || []).slice(0, 3).map((log) => (
                            <p key={log.id} className="truncate select-none font-mono tracking-tight leading-normal">
                              <span className="text-zinc-500">[{log.timestamp.split(':').slice(0,2).join(':')}]</span> {log.action === 'Scan IN' ? '🟢' : '⚪'} {log.studentName}
                            </p>
                          ))}
                          {(!activeRoom.activeScannerLogs || activeRoom.activeScannerLogs.length === 0) && (
                            <p className="text-zinc-500 text-center py-2 opacity-50 text-[8px] italic">_ await scan entry signals _</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* 2. SUBJECTS & SCHEDULE EDITOR SCREEN */}
      {activeScreen === 'schedule-editor' && (
        <motion.div
          key="schedule-editor"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-left"
        >
          <div className="pb-4 border-b border-zinc-150 dark:border-zinc-850/60">
            <div className="flex items-start gap-3">
              <button 
                onClick={() => setScreen('dashboard')} 
                type="button"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-all active:scale-95 shadow-sm shrink-0 select-none mt-0.5"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2 text-lg">
                      <Calendar className="w-5 h-5 text-emerald-500" />
                      Manage Course Curriculums
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">Add, edit, or configure classroom configurations and schedules.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleOpenAddForm}
                      type="button"
                      className="bg-emerald-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer animate-fade-in px-4 py-2 text-xs w-full sm:w-auto justify-center"
                    >
                      <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
                      Add Class Term
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Input Editor Form Modal Overlay */}
          <AnimatePresence>
            {isFormOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] text-left"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-900 mb-4 shrink-0">
                    <h3 className="font-black text-sm uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                      {editingClass ? 'Edit Class Specifications' : 'Formulate a New Course Class'}
                    </h3>
                    <button
                      onClick={() => {
                        setIsFormOpen(false);
                        setEditingClass(null);
                      }}
                      type="button"
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 text-sm font-black select-none cursor-pointer"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleSubmitForm} className="space-y-4 overflow-y-auto pr-1.5 custom-scrollbar">
                    {/* Real-time conflict warnings banner */}
                    {facultyConflicts.length > 0 && (
                      <div className="p-4 rounded-xl bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 text-left space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 animate-bounce" />
                          <span className="text-xs font-black text-red-650 dark:text-red-400 uppercase tracking-wider font-sans">
                            Conflict Warning: Detected {facultyConflicts.length} Scheduling Clash{facultyConflicts.length > 1 ? 'es' : ''}
                          </span>
                        </div>
                        <div className="divide-y divide-red-200 dark:divide-zinc-800/60 space-y-2">
                          {facultyConflicts.map((conf, index) => (
                            <div key={index} className="text-[11px] text-zinc-700 dark:text-zinc-300 pt-2 first:pt-0 font-sans">
                              <p className="font-bold flex items-start sm:items-center justify-between gap-2 text-red-600 dark:text-red-400">
                                <span>{conf.message}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-550/10 dark:bg-red-950/40 border border-red-500/20 uppercase font-mono tracking-widest shrink-0 font-extrabold">
                                  {conf.type} clash
                                </span>
                              </p>
                              <p className="text-[10px] text-zinc-455 dark:text-zinc-500 font-medium font-mono mt-0.5">
                                Overlapping Slot: {conf.details} ({conf.subName})
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-widest">Course Code</label>
                        <input
                          type="text"
                          placeholder="e.g. CS254"
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value)}
                          required
                          className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-widest">Topic Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Distributed Computing"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          required
                          className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-widest">Start Hours</label>
                        <select
                          value={formStart}
                          onChange={(e) => setFormStart(e.target.value)}
                          required
                          className={`w-full text-xs p-3 rounded-xl border bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 transition-all ${
                            facultyConflicts.some(cf => cf.type === 'faculty') 
                              ? 'border-red-500 ring-1 ring-red-500/20' 
                              : 'border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          {SCHEDULING_TIME_SLOTS.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-widest">End Hours</label>
                        <select
                          value={formEnd}
                          onChange={(e) => setFormEnd(e.target.value)}
                          required
                          className={`w-full text-xs p-3 rounded-xl border bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 transition-all ${
                            facultyConflicts.some(cf => cf.type === 'faculty') 
                              ? 'border-red-500 ring-1 ring-red-500/20' 
                              : 'border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          {SCHEDULING_TIME_SLOTS.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5 col-span-1 sm:col-span-1 text-left">
                        <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-widest">Lecture Room</label>
                        <select
                          name="room-selector"
                          value={formRoom}
                          onChange={(e) => setFormRoom(e.target.value)}
                          required
                          className={`w-full text-xs p-3 rounded-xl border bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 transition-all ${
                            facultyConflicts.some(cf => cf.type === 'room') 
                              ? 'border-red-500 ring-1 ring-red-500/20' 
                              : 'border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <option value="">-- Select Room --</option>
                          {availableRoomsForForm.map(rm => (
                            <option key={rm.id} value={rm.name}>{rm.name} ({rm.floor})</option>
                          ))}
                          {editingClass && !availableRoomsForForm.some(rm => (rm.name || '').toLowerCase() === (editingClass.room || '').toLowerCase()) && (
                            <option value={editingClass.room}>{editingClass.room} (Current Room)</option>
                          )}
                        </select>
                        {availableRoomsForForm.length === 0 && (
                          <p className="text-red-500 text-[10px] mt-1.5 font-bold font-mono animate-pulse">
                            ⚠️ No available rooms found for this schedule time.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-widest">Academic Term / Semester</label>
                        <select
                          value={formAcademicTerm}
                          onChange={(e) => setFormAcademicTerm(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 font-bold"
                        >
                          {ACADEMIC_TERMS.map(term => (
                            <option key={term} value={term}>{term}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-widest">Building Cluster</label>
                        <select
                          value={formBuildingCluster}
                          onChange={(e) => setFormBuildingCluster(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 font-medium"
                        >
                          {BUILDING_CLUSTERS.map(cluster => (
                            <option key={cluster} value={cluster}>{cluster}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-widest">Custom Lateness Grace Period (Distance Transit Allowance)</label>
                      <select
                        value={formGracePeriod}
                        onChange={(e) => setFormGracePeriod(Number(e.target.value))}
                        className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 font-bold"
                      >
                        {GRACE_PERIOD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-zinc-400">Allows automatic leeway for students walking from distant campus complexes (e.g. King Faisal or Science Complex to CICS).</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-widest">Scheduled Recurrence Days</label>
                      <div className="flex flex-wrap gap-2">
                        {['MW', 'TTh', 'S', 'A', 'F'].map(day => {
                          const selected = formDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDayToggle(day)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                selected 
                                  ? 'bg-emerald-500 text-black font-extrabold' 
                                  : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 border border-zinc-200 dark:border-zinc-805 text-zinc-650 dark:text-zinc-300'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      {formDays.includes('F') && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-1">
                          <span>🕌 Friday Schedule: Aware of 11:30 AM - 1:30 PM Jum’ah Prayer break window</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-900">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFormOpen(false);
                          setEditingClass(null);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={availableRoomsForForm.length === 0 && !formRoom}
                        className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          availableRoomsForForm.length === 0 && !formRoom
                            ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                            : 'bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer shadow-sm'
                        }`}
                      >
                        {editingClass ? 'Update Class' : 'Save New Class'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* List of active schedules */}
          <WeeklyScheduleGrid
            classes={classes}
            userRole="faculty"
            enrollments={enrollments}
            userProfile={userProfile}
            onOpenSubjectDetails={handleOpenSubjectDetails}
            onEditSubject={handleOpenEditForm}
          />
        </motion.div>
      )}

      {/* 3. QR CODES ATTENDANCE PASSCODE GENERATOR VIEW */}
      {activeScreen === 'qr-generator' && (
        <motion.div
          key="qr-generator"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-6 text-left animate-fade-in"
        >
          <div className="space-y-6 text-left">
            <div className="flex items-start gap-3 border-b border-zinc-150 dark:border-zinc-850/60 pb-4">
              <button 
                onClick={() => setScreen('dashboard')} 
                type="button"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-all active:scale-95 shadow-sm shrink-0 select-none mt-0.5"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <QrCode className="w-5.5 h-5.5 text-blue-600" />
                  Dynamic Single-Use Attendance QR Generator
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Generate real-time credentials or configure dynamic visual scan codes.</p>
              </div>
            </div>

            {/* Auto-Detected Class Display */}
            {(() => {
              const matchedActive = classes.find(c => c.id === activeQRClass) || classes[0];
              if (!matchedActive) return null;
              
              return (
                <div className="mb-5 p-4.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 w-full border border-zinc-200 dark:border-zinc-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-md font-bold">Auto-Detected Class</span>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 pt-1">
                      {matchedActive.code}: {matchedActive.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400">Scheduled {matchedActive.startTime} • {matchedActive.room} ({matchedActive.days})</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-lg tracking-wide uppercase font-black">
                      SYSTEM MATCHED
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-4">

              {/* QR Code matrix box representation */}
              <div className="p-4 border border-zinc-200 dark:border-zinc-850 rounded-2xl flex flex-col items-center justify-center space-y-4 relative bg-zinc-50 dark:bg-zinc-950/30">
                <div className="p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg shadow-xs border border-zinc-200 dark:border-zinc-800">
                  {qrToken && qrToken !== 'STANDBY' && qrToken !== 'EXPIRED' ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=2&data=${encodeURIComponent(JSON.stringify({ classId: activeQRClass, qrToken: qrToken }))}`}
                      alt="ClassPulse Active Session QR Code"
                      className="w-40 h-40 rounded object-contain filter brightness-[0.92] contrast-125 dark:brightness-[0.78] dark:contrast-[1.10]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-zinc-150 dark:bg-zinc-900 flex flex-wrap p-2 rounded relative border border-zinc-200 dark:border-zinc-850 items-center justify-center">
                      <div className="absolute inset-0 border border-emerald-500/20 rounded animate-pulse" />
                      {/* Fake microcode block matrix grids */}
                      <div className="w-10 h-10 border-4 border-zinc-800 dark:border-zinc-200 bg-transparent absolute top-2 left-2" />
                      <div className="w-10 h-10 border-4 border-zinc-800 dark:border-zinc-200 bg-transparent absolute top-2 right-2" />
                      <div className="w-10 h-10 border-4 border-zinc-800 dark:border-zinc-200 bg-transparent absolute bottom-2 left-2" />
                      <div className="absolute inset-8 border border-zinc-400 dark:border-zinc-650 flex items-center justify-center text-zinc-500 font-mono text-[9px] font-black uppercase text-center">
                        STANDBY GENERATOR
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <span className="text-xs font-mono font-black tracking-widest px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg">
                    {qrToken === 'STANDBY' ? 'READY - CLICK GENERATE' : qrToken}
                  </span>
                  
                  {qrToken !== 'STANDBY' && qrToken !== 'EXPIRED' && (
                    <div className="space-y-2">
                      <div className="text-[11px] text-zinc-450 dark:text-zinc-400 font-semibold mt-3 flex items-center justify-center gap-1 bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full border border-zinc-250 dark:border-zinc-850">
                        <Clock className="w-3.5 h-3.5 text-blue-500 animate-[spin_4s_linear_infinite]" />
                        Class Session Expires in: <span className="font-mono text-blue-500 dark:text-blue-400 font-black ml-1 text-xs">{timeLeft}s (30m countdown)</span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const canvas = document.createElement('canvas');
                          canvas.width = 350;
                          canvas.height = 350;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          
                          ctx.fillStyle = '#0a0a0a';
                          ctx.fillRect(0, 0, 350, 350);
                          
                          ctx.strokeStyle = '#10b981';
                          ctx.lineWidth = 12;
                          ctx.strokeRect(20, 20, 310, 310);
                          
                          ctx.fillStyle = '#ffffff';
                          ctx.font = 'bold 16px "Inter", sans-serif';
                          ctx.textAlign = 'center';
                          ctx.fillText('CLASSPULSE OFFLINE PASS', 175, 55);
                          
                          ctx.fillStyle = '#10b981';
                          ctx.font = '12px "JetBrains Mono", monospace';
                          ctx.fillText(qrToken, 175, 305);
                          
                          const drawFinder = (cx: number, cy: number) => {
                            ctx.fillStyle = '#10b981';
                            ctx.fillRect(cx, cy, 32, 32);
                            ctx.fillStyle = '#0a0a0a';
                            ctx.fillRect(cx + 4, cy + 4, 24, 24);
                            ctx.fillStyle = '#10b981';
                            ctx.fillRect(cx + 8, cy + 8, 16, 16);
                          };
                          
                          drawFinder(85, 85);
                          drawFinder(85 + 180 - 32, 85);
                          drawFinder(85, 85 + 180 - 32);
                          
                          ctx.fillStyle = '#ffffff';
                          let seed = 0;
                          for (let i = 0; i < qrToken.length; i++) {
                            seed += qrToken.charCodeAt(i);
                          }
                          const cols = 21;
                          const dot = 180 / cols;
                          for (let r = 0; r < cols; r++) {
                            for (let c = 0; c < cols; c++) {
                              if ((r < 6 && c < 6) || (r < 6 && c > cols - 7) || (r > cols - 7 && c < 6)) {
                                continue;
                              }
                              const val = Math.sin(r * 45.3 + c * 89.1 + seed);
                              if (val > -0.15) {
                                ctx.fillRect(85 + c * dot, 85 + r * dot, dot - 1, dot - 1);
                              }
                            }
                          }
                          
                          const link = document.createElement('a');
                          link.download = `ClassPulse_${qrToken}_offline.png`;
                          link.href = canvas.toDataURL('image/png');
                          link.click();
                          speakText("Class token QR code exported as offline image file successfully.", accessibility.readAloud);
                        }}
                        className="py-1 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:text-emerald-500 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer w-full"
                      >
                        📥 Export / Download Offline QR Code
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Rules and Limits warning card */}
              <div className="p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/10 text-[10px] text-zinc-500 leading-relaxed font-semibold text-left">
                ⚠️ <strong>Single-Use Security Enforcement:</strong> This system applies strict rules. Each subject can only generate ONE QR session code per day. Students scanning within the first 10 minutes are recorded as <strong>Present</strong>. Scans from 10 to 30 minutes are marked as <strong>Late</strong>. Beyond 30 minutes, the session key expires automatically.
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    const now = new Date();
                    const dayLabels = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                    const todayLabel = dayLabels[now.getDay()];
                    const activeMatch = classes.find(c => {
                      const expanded = expandDaysToSpecificOnesVal(c.days);
                      return expanded.includes(todayLabel);
                    }) || classes.find(c => c.id === activeQRClass) || classes[0];
                    
                    if (!activeMatch) return;

                    // Enforce "it can only generate one time in every subject today"
                    if (activeMatch.qrGeneratedAt) {
                      const lastGenDate = new Date(activeMatch.qrGeneratedAt).toDateString();
                      const todayDate = new Date().toDateString();
                      if (lastGenDate === todayDate) {
                        if (typeof window !== 'undefined' && (window as any).showToast) {
                          (window as any).showToast(`QR session already generated once for ${activeMatch?.code} today! Policy restricts to single generation daily.`, "error");
                        } else {
                          alert(`🚫 QR session has already been generated once for ${activeMatch?.code} today! In compliance with class policy rules, you can only generate a QR session code one time.`);
                        }
                        speakText(`Registration is already occupied for today`, accessibility.readAloud);
                        return;
                      }
                    }

                    const generatedKey = 'CODE_' + activeMatch.code.toUpperCase() + '_' + Math.random().toString(36).substring(4, 9).toUpperCase();
                    
                    // Propagate to App parent state
                    onEditClass({
                      ...activeMatch,
                      qrToken: generatedKey,
                      qrGeneratedAt: Date.now()
                    });

                    setQrToken(generatedKey);
                    setTimeLeft(1800); // 30 minutes countdown (1800 seconds!)
                    onChangeFacultyStatus('in-class');
                    speakText(`Successfully initialized 30 minute QR session code for ${activeMatch.name}. Status automatically switched to In Class.`, accessibility.readAloud);
                  }}
                  type="button"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shadow-md shadow-blue-500/10 text-center"
                >
                  Generate 30-Min Session Code
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. NOTIFICATIONS VIEW */}
      {activeScreen === 'notifications' && (
        <motion.div
          key="notifications"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-4 text-left animate-fade-in"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-150 dark:border-zinc-850/60 pb-4">
            <div className="flex items-start gap-3">
              <button 
                onClick={() => setScreen('dashboard')} 
                type="button"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-all active:scale-95 shadow-sm shrink-0 select-none mt-0.5"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-emerald-500" />
                  Notification logs
                </h2>
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mt-1 font-mono">Administrative records & system alerts</p>
              </div>
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={onMarkAllNotificationsRead}
                  className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-650 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                >
                  Mark all as read
                </button>
                <button
                  type="button"
                  onClick={onClearAllNotifications}
                  className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider bg-red-600/10 hover:bg-red-600 hover:text-white dark:bg-red-950/20 border border-red-500/10 rounded-xl text-red-600 dark:text-red-400 transition-all cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Search and Classification Filters Block */}
          <div className="flex gap-2 bg-zinc-50/50 dark:bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-150 dark:border-zinc-900">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-405 dark:text-zinc-500" />
              <input
                type="text"
                value={notifSearch}
                onChange={(e) => setNotifSearch(e.target.value)}
                placeholder="Search notification logs..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-base md:text-xs font-medium placeholder-zinc-400 text-zinc-850 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {notifSearch && (
                <button
                  type="button"
                  onClick={() => setNotifSearch('')}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Compact Dropdown Filter with Icon */}
            <div className="relative shrink-0 w-9 h-9 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:border-zinc-305 transition-all cursor-pointer" title="Filter notification logs">
              <SlidersHorizontal className="w-4 h-4 text-zinc-500 dark:text-zinc-400 animate-pulse" />
              <select
                value={notifFilter}
                onChange={(e) => {
                  const val = e.target.value as 'all' | 'alerts' | 'updates';
                  setNotifFilter(val);
                  speakText(`Filter set to ${val}`, accessibility.readAloud);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="all" className="dark:bg-zinc-950">ALL ({notifications.length})</option>
                <option value="alerts" className="dark:bg-zinc-950">ALERTS ({notifications.filter(n => n.type === 'alert' || n.type === 'warning').length})</option>
                <option value="updates" className="dark:bg-zinc-950">UPDATES ({notifications.filter(n => n.type === 'info' || n.type === 'success').length})</option>
              </select>
            </div>
          </div>

          {/* List Section */}
          <div className="space-y-2.5">
            {(() => {
              // Apply active classification search & type filter logic
              const filtered = notifications.filter(notif => {
                const matchesSearch = (notif.title || '').toLowerCase().includes(notifSearch.toLowerCase()) || 
                                     (notif.message || '').toLowerCase().includes(notifSearch.toLowerCase());
                
                if (!matchesSearch) return false;

                if (notifFilter === 'alerts') {
                  return notif.type === 'alert' || notif.type === 'warning';
                }
                if (notifFilter === 'updates') {
                  return notif.type === 'info' || notif.type === 'success';
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 space-y-2">
                    <p className="text-xs text-zinc-400 font-bold">No notifications match your active search filter.</p>
                    <button
                      type="button"
                      onClick={() => { setNotifSearch(''); setNotifFilter('all'); }}
                      className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </div>
                );
              }

              return filtered.map((notif) => (
                <div 
                  key={notif.id}
                  className={`p-3.5 rounded-xl bg-white dark:bg-zinc-950 border ${
                    notif.read
                      ? 'border-zinc-200/50 dark:border-zinc-900/60 opacity-80'
                      : 'border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.01)]'
                  } flex items-start gap-3 text-left transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/20`}
                >
                  <div className="shrink-0 mt-1">
                    <span className={`w-2 h-2 rounded-full block ${
                      notif.type === 'alert' ? 'bg-red-500' :
                      notif.type === 'warning' ? 'bg-amber-550 bg-amber-500' :
                      notif.type === 'success' ? 'bg-emerald-500' :
                      'bg-indigo-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2.5">
                      <h4 className={`text-xs font-bold truncate ${notif.read ? 'text-zinc-655 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[8px] font-mono font-black text-zinc-400 dark:text-zinc-500 shrink-0 uppercase tracking-widest">{notif.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug font-medium">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </motion.div>
      )}

      {/* 5. PROFILE TAB */}
      {activeScreen === 'profile' && (
        <motion.div
          key="profile"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-6 text-left animate-fade-in"
        >
          <div className="space-y-6 text-left">
            <div className="flex items-start gap-3 border-b border-zinc-100 dark:border-zinc-900 pb-4">
              <button 
                onClick={() => setScreen('dashboard')} 
                type="button"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-all active:scale-95 shadow-sm shrink-0 select-none mt-0.5"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 animate-fade-in">Profile Information</h2>
                <p className="text-xs text-zinc-400 mt-1">Manage and update your faculty login profile details and electronic signatures.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-zinc-100 dark:border-zinc-900 mb-5">
              <div className="relative group shrink-0">
                <img 
                  src={profileAvatar} 
                  alt="Faculty Avatar" 
                  className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500/20 shadow-md" 
                />
                <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer shadow-md flex items-center justify-center transition-transform active:scale-90">
                  <Camera className="w-3.5 h-3.5" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageFileChange}
                    className="hidden" 
                  />
                </label>
              </div>

              <div className="text-center sm:text-left min-w-0">
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 truncate">Professor {profileName}</h3>
                <p className="text-xs text-zinc-400 truncate">{profileEmail}</p>
                <div className="flex flex-wrap gap-2 mt-2.5 justify-center sm:justify-start">
                  <span className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-850 text-zinc-500 rounded border border-zinc-200 dark:border-zinc-800">
                    FAC_ID: {userProfile.facultyId || "FAC-19034"}
                  </span>
                  <span className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-800">
                    Dept: {userProfile.department || "Information systems"}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              onUpdateProfile({
                ...userProfile,
                name: profileName,
                email: profileEmail,
                avatar: profileAvatar
              });
              setProfileSavedMsg(true);
              speakText("Profile details fully updated in database", accessibility.readAloud);
              setTimeout(() => setProfileSavedMsg(false), 3000);
            }} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-widest">Professor Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-widest">Academic Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Upload image helper drag-n-drop simulated box */}
              <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-center">
                <UploadCloud className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                <p className="text-[11px] font-bold text-zinc-650 dark:text-zinc-300 font-sans">Drag profile files here or press camera badge</p>
                <p className="text-[9px] text-zinc-400 mt-0.5">Supports PNG, JPG, WebP up to 3MB files which encode instantly to local profiles.</p>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-wider hover:bg-emerald-400 cursor-pointer transition-all"
                >
                  Save Profile Details
                </button>

                {profileSavedMsg && (
                  <span className="text-xs text-emerald-500 font-extrabold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                    <CheckCircle className="w-4 h-4" />
                    Profile synced globally!
                  </span>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* Roster detail modal */}
      <SubjectDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        cls={selectedClassDetail}
        enrollments={enrollments}
        records={attendanceRecords}
        facultyStatuses={facultyStatuses}
        isDark={accessibility.theme === 'dark'}
        userRole="faculty"
      />

      {/* Messages tab screen */}
      {activeScreen === 'messages' && (
        <motion.div
          key="messages"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-4.5rem)] flex flex-col text-left overflow-hidden pb-0"
        >
          <Messages 
            userProfile={userProfile} 
            classes={classes} 
            enrollments={enrollments} 
            accessibility={accessibility} 
            setScreen={setScreen}
            onBack={() => setScreen('dashboard')}
            initialContactId={selectedChatContact}
          />
        </motion.div>
      )}

      {/* 5B. EXCUSE LETTERS INBOX VIEW */}
      {activeScreen === 'excuse-inbox' && (() => {
        const totalCount = excuseLetters.length;
        const pendingCount = excuseLetters.filter(l => l.status === 'pending').length;
        const validCount = excuseLetters.filter(l => l.status === 'valid' || l.status === 'approved').length;
        const invalidCount = excuseLetters.filter(l => l.status === 'invalid' || l.status === 'rejected').length;
        
        const pendingPct = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;
        const validPct = totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 0;
        const invalidPct = totalCount > 0 ? Math.round((invalidCount / totalCount) * 100) : 0;
        const resolvedPct = totalCount > 0 ? Math.round(((validCount + invalidCount) / totalCount) * 100) : 100;

        const filteredExcuses = excuseLetters.filter(letter => {
          if (excuseFilter === 'pending') {
            return letter.status === 'pending';
          } else if (excuseFilter === 'valid') {
            return letter.status === 'valid' || letter.status === 'approved';
          } else {
            return letter.status === 'invalid' || letter.status === 'rejected';
          }
        });

        return (
          <motion.div
            key="excuse-inbox"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 text-left"
          >
            <div className="pb-4 border-b border-zinc-150 dark:border-zinc-850/60">
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2 text-xl">
                      <Inbox className="w-5.5 h-5.5 text-emerald-500" />
                      Excuse Letters Inbox & Review
                    </h2>
                    <div className="mt-0.5">
                      <p className="text-xs text-zinc-400">Review filed excuse applications and execute quick-action approvals to update student attendance records.</p>
                    </div>
                  </div>

                  {pendingCount > 0 && onUpdateExcuseStatus && (
                    <button
                      type="button"
                      onClick={() => {
                        const pendingLetters = excuseLetters.filter(l => l.status === 'pending');
                        pendingLetters.forEach(l => onUpdateExcuseStatus(l.id, 'valid'));
                        speakText(`Approved all ${pendingLetters.length} pending excuse letters in batch.`, accessibility.readAloud);
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-2 shadow-sm self-start sm:self-auto"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Quick Approve All Pending ({pendingCount})
                    </button>
                  )}
                </div>

                {/* Status Summary Bar Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">
                        Review Status Distribution
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
                        {totalCount} Total Requests
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px]">
                      <span className="text-amber-500 font-bold">● {pendingPct}% Pending</span>
                      <span className="text-emerald-500 font-bold">● {validPct}% Valid</span>
                      <span className="text-red-500 font-bold">● {invalidPct}% Invalid</span>
                      <span className="text-zinc-400 font-semibold border-l border-zinc-200 dark:border-zinc-800 pl-2">
                        {resolvedPct}% Resolved
                      </span>
                    </div>
                  </div>

                  {/* Multi-Segment Status Progress Bar */}
                  <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${validPct}%` }} 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      title={`Declared Valid: ${validCount} (${validPct}%)`} 
                    />
                    <div 
                      style={{ width: `${pendingPct}%` }} 
                      className="h-full bg-amber-500 transition-all duration-500" 
                      title={`Pending Review: ${pendingCount} (${pendingPct}%)`} 
                    />
                    <div 
                      style={{ width: `${invalidPct}%` }} 
                      className="h-full bg-red-500 transition-all duration-500" 
                      title={`Declared Invalid: ${invalidCount} (${invalidPct}%)`} 
                    />
                  </div>
                </div>

                {/* Filter Selector Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setExcuseFilter('pending');
                      speakText("Showing pending review inbox.", accessibility.readAloud);
                    }}
                    className={`p-4 rounded-xl text-left border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none ${
                      excuseFilter === 'pending'
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/10 shadow-sm'
                        : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Pending Review</span>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    </div>
                    <p className="text-xl font-black text-amber-500 mt-1 font-mono">
                      {pendingCount}
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-1">Awaiting quick-action review</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExcuseFilter('valid');
                      speakText("Showing declared valid archive.", accessibility.readAloud);
                    }}
                    className={`p-4 rounded-xl text-left border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none ${
                      excuseFilter === 'valid'
                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm'
                        : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Declared Valid</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <p className="text-xl font-black text-emerald-500 mt-1 font-mono">
                      {validCount}
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-1">Auto-excused in attendance records</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExcuseFilter('invalid');
                      speakText("Showing declared invalid archive.", accessibility.readAloud);
                    }}
                    className={`p-4 rounded-xl text-left border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none ${
                      excuseFilter === 'invalid'
                        ? 'bg-red-500/10 border-red-500 ring-2 ring-red-500/10 shadow-sm'
                        : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Declared Invalid</span>
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    </div>
                    <p className="text-xl font-black text-red-500 mt-1 font-mono">
                      {invalidCount}
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-1">Flagged / rejected requests</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredExcuses.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-850 text-zinc-500 text-xs">
                  {excuseFilter === 'pending' ? (
                    <div className="space-y-2 py-4">
                      <p className="text-base font-bold text-zinc-800 dark:text-zinc-250">✨ No Pending Reviews Left!</p>
                      <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                        All student excuse letters have been successfully reviewed and processed into their specific storage vaults.
                      </p>
                    </div>
                  ) : excuseFilter === 'valid' ? (
                    <div className="py-4">
                      <p className="text-[11px] text-zinc-400">The declared valid storage vault is currently empty.</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <p className="text-[11px] text-zinc-400">The declared invalid storage vault is currently empty.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence initial={false}>
                    {filteredExcuses.map(letter => {
                      const isPending = letter.status === 'pending';
                      const isValid = letter.status === 'valid' || letter.status === 'approved';
                      const isInvalid = letter.status === 'invalid' || letter.status === 'rejected';

                      return (
                        <motion.div
                          key={letter.id}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={`p-6 rounded-3xl bg-white dark:bg-zinc-950 border shadow-sm space-y-4 transition-all w-full text-left relative overflow-hidden ${
                            isPending ? 'border-amber-500/30 dark:border-amber-500/30 ring-1 ring-amber-500/10' :
                            isValid ? 'border-emerald-500/20 dark:border-emerald-500/20' :
                            'border-zinc-200 dark:border-zinc-850'
                          }`}
                        >
                          {/* Left Accent Ribbon */}
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${
                            isPending ? 'bg-amber-500' :
                            isValid ? 'bg-emerald-500' :
                            'bg-red-500'
                          }`} />

                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pl-1">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{letter.studentName}</span>
                                <span className="text-[9px] font-mono text-zinc-400 py-0.5 px-2 bg-zinc-100 dark:bg-zinc-900 rounded-full">{letter.studentId || 'STU-OFFICIAL'}</span>
                                <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 px-2 py-0.5 rounded-full">{letter.className}</span>
                                {letter.excuseType && (
                                  <span className="text-[9px] font-extrabold uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                                    🏷️ {letter.excuseType}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-1">Duration: <span className="font-semibold text-zinc-850 dark:text-zinc-200">{letter.startDate}</span> to <span className="font-semibold text-zinc-850 dark:text-zinc-200">{letter.endDate}</span></p>
                            </div>

                            <div className="flex items-center gap-1.5 self-start">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase">Decision Status:</span>
                              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                                isValid ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                isInvalid ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                                {isValid ? 'valid (approved)' : isInvalid ? 'invalid (rejected)' : 'pending review'}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 pl-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Filed Reason & Explanations</p>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 italic mt-1.5 font-sans leading-relaxed">"{letter.reason}"</p>
                            {letter.attachmentName && (
                              <div className="flex items-center gap-2 mt-3 p-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl w-fit cursor-pointer">
                                <span className="text-[10px] text-emerald-500 font-mono">📎 {letter.attachmentName}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Action Buttons for Approve / Reject */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-900">
                            <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                              {isPending ? (
                                <span className="text-amber-500 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                  Action Required: Verify student excuse claim
                                </span>
                              ) : isValid ? (
                                <span className="text-emerald-500 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" /> Approved & attendance marked Excused
                                </span>
                              ) : (
                                <span className="text-red-500 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> Marked Invalid & Archived
                                </span>
                              )}
                            </div>

                            {onUpdateExcuseStatus && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateExcuseStatus(letter.id, 'valid');
                                    speakText(`Approved excuse letter for ${letter.studentName}. Attendance converted to Excused.`, accessibility.readAloud);
                                  }}
                                  title="Approve request and immediately convert attendance to Excused"
                                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase cursor-pointer flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                                    isValid
                                      ? 'bg-emerald-500 text-black shadow-sm font-black'
                                      : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                  }`}
                                >
                                  <Check className="w-4 h-4 stroke-[3]" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateExcuseStatus(letter.id, 'invalid');
                                    speakText(`Rejected excuse letter for ${letter.studentName}.`, accessibility.readAloud);
                                  }}
                                  title="Reject request"
                                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase cursor-pointer flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                                    isInvalid
                                      ? 'bg-red-500 text-white shadow-sm font-black'
                                      : 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20'
                                  }`}
                                >
                                  <X className="w-4 h-4 stroke-[3]" />
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>

                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* 6. STUDENTS MONITORING VIEW */}
      {activeScreen === 'students-monitoring' && (
        <motion.div
          key="students-monitoring"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-left"
        >
          <div className="pb-4 border-b border-zinc-150 dark:border-zinc-850/60">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <button 
                  onClick={() => setScreen('dashboard')} 
                  type="button"
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-all active:scale-95 shadow-sm shrink-0 select-none mt-0.5"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-500" />
                </button>
                <div className="text-left">
                  <h2 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-emerald-500" />
                    Active Student Rosters & At-Risk Monitoring
                  </h2>
                  <p className="text-xs text-zinc-400 text-left mt-1">Roster lists and interactive health metrics for your assigned class rosters.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center select-none">
                {/* Collapsible Date Filter Button with Floating Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showDateFilters;
                      setShowDateFilters(next);
                      speakText(next ? "Showing date range filters popover" : "Hiding date range filters popover", accessibility.readAloud);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      showDateFilters || exportStartDate || exportEndDate
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                        : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{exportStartDate || exportEndDate ? 'Date Filter: ON' : 'Filter by Date'}</span>
                  </button>

                  {/* Floating Date Filter Panel */}
                  {showDateFilters && (
                    <div className="absolute left-0 mt-2 z-50 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850 shadow-2xl flex flex-col gap-2.5 min-w-[245px] animate-fade-in text-left">
                      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 pb-1.5 flex justify-between items-center">
                        <span>Filter Logs by Date</span>
                        {(exportStartDate || exportEndDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setExportStartDate('');
                              setExportEndDate('');
                              speakText("Export date range cleared", accessibility.readAloud);
                            }}
                            className="text-[8px] text-red-500 hover:text-red-600 font-extrabold uppercase tracking-wide transition-all"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-1.5 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-1.5 rounded-lg border border-zinc-150 dark:border-zinc-800/60">
                          <span className="text-[8px] uppercase font-black font-mono tracking-wider text-zinc-400">Start:</span>
                          <input 
                            type="date"
                            value={exportStartDate}
                            onChange={(e) => {
                              setExportStartDate(e.target.value);
                              speakText(`Start date updated to ${e.target.value}`, accessibility.readAloud);
                            }}
                            className="bg-transparent border-none text-[10.5px] font-mono focus:outline-none text-zinc-800 dark:text-zinc-200 outline-none p-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-1.5 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-1.5 rounded-lg border border-zinc-150 dark:border-zinc-800/60">
                          <span className="text-[8px] uppercase font-black font-mono tracking-wider text-zinc-400">End:</span>
                          <input 
                            type="date"
                            value={exportEndDate}
                            onChange={(e) => {
                              setExportEndDate(e.target.value);
                              speakText(`End date updated to ${e.target.value}`, accessibility.readAloud);
                            }}
                            className="bg-transparent border-none text-[10.5px] font-mono focus:outline-none text-zinc-800 dark:text-zinc-200 outline-none p-0 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-900">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDateFilters(false);
                            speakText("Date range filters applied", accessibility.readAloud);
                          }}
                          className="w-full text-center py-1 text-[9px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black rounded transition-all active:scale-95 cursor-pointer"
                        >
                          Apply Filter
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden sm:block mx-1"></div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportSelectedClassAttendance}
                    className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-750 dark:text-zinc-300 font-extrabold uppercase tracking-wider flex items-center gap-1 px-2.5 py-1.5 text-[10.5px] transition-all cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Export Class</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAllFacultyAttendance}
                    className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider flex items-center gap-1 px-2.5 py-1.5 text-[10.5px] shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-black" />
                    <span>Export All</span>
                  </button>
                </div>
              </div>
            </div>

              {/* Subject Filter tab Selection Option Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans w-full p-2.5 sm:p-3 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm shadow-zinc-950/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full max-w-md">
                  <label htmlFor="faculty-class-monitor-select" className="text-xs font-extrabold text-zinc-450 dark:text-zinc-400 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-emerald-500" />
                    Select Class:
                  </label>
                  <div className="relative w-full">
                    <select
                      id="faculty-class-monitor-select"
                      value={selectedMonitoringClassId}
                      onChange={(e) => {
                        setSelectedMonitoringClassId(e.target.value);
                        speakText(`Displaying student roster for class code ${classes.find(c => c.id === e.target.value)?.code || ''}`, accessibility.readAloud);
                      }}
                      className="w-full appearance-none px-4 py-2 text-xs md:text-xs bg-white/90 dark:bg-zinc-950/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500 shadow-2xs cursor-pointer pr-10"
                    >
                      {sortedClasses.map((cls) => {
                        const count = enrollments.filter(e => e.classId === cls.id).length;
                        return (
                          <option key={cls.id} value={cls.id}>
                            {cls.code}: {cls.name} ({count} student{count === 1 ? '' : 's'})
                          </option>
                        );
                      })}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-zinc-400">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Indicator of records that fit context */}
                <div className="text-[11px] text-zinc-400 font-medium">
                  {(() => {
                    const facIds = classes.map(c => c.id);
                    let filteredAll = attendanceRecords.filter(r => facIds.includes(r.classId));
                    let filteredSel = [...monClassRecords];
                    if (exportStartDate) {
                      filteredAll = filteredAll.filter(r => r.date >= exportStartDate);
                      filteredSel = filteredSel.filter(r => r.date >= exportStartDate);
                    }
                    if (exportEndDate) {
                      filteredAll = filteredAll.filter(r => r.date <= exportEndDate);
                      filteredSel = filteredSel.filter(r => r.date <= exportEndDate);
                    }
                    return (
                      <div className="text-left sm:text-right flex flex-col sm:items-end gap-0.5">
                        <div>Selected Class Logs: <strong className="text-emerald-500">{filteredSel.length}</strong> record{filteredSel.length === 1 ? '' : 's'}</div>
                        <div>Total Assigned Logs: <strong className="text-emerald-500">{filteredAll.length}</strong> record{filteredAll.length === 1 ? '' : 's'}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

          {/* Roster detail area */}
          {activeMonClass ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* List of enrolled students in matched class */}
              <div className="lg:col-span-8 space-y-4">
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm">
                  {/* Tier 1: Header Title & Roster Status Indicators */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-150 dark:border-zinc-900">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                        <span>Class Enrolled Roster</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                          {monEnrollments.length} {monEnrollments.length === 1 ? 'Student' : 'Students'}
                        </span>
                      </h3>
                      <p className="text-[10px] text-zinc-400 mt-0.5 truncate">Real-time attendance logs & per-session verification</p>
                    </div>

                    {/* Date Selector Pill & Health Filters */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {/* Interactive Edit Date Button with Popover */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            const next = !showEditDatePopover;
                            setShowEditDatePopover(next);
                            speakText(next ? "Opened roster edit date selector" : "Closed roster edit date selector", accessibility.readAloud);
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-mono"
                        >
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Date: {selectedRosterDate}</span>
                        </button>

                        {/* Floating Edit Date Panel */}
                        {showEditDatePopover && (
                          <div className="absolute right-0 mt-2 z-50 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850 shadow-2xl flex flex-col gap-2 min-w-[210px] animate-fade-in text-left">
                            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 pb-1 flex justify-between items-center">
                              <span>Select Roster Session Date</span>
                            </div>

                            <div className="flex flex-col gap-1 bg-zinc-50 dark:bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-150 dark:border-zinc-800/60">
                              <span className="text-[8px] uppercase font-black font-mono tracking-wider text-zinc-400">Session Date:</span>
                              <input 
                                type="date"
                                value={selectedRosterDate}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setSelectedRosterDate(e.target.value);
                                    speakText(`Roster editing on date ${e.target.value}`, accessibility.readAloud);
                                  }
                                }}
                                className="bg-transparent border-none text-[11px] font-mono focus:outline-none text-zinc-800 dark:text-zinc-200 outline-none p-0 cursor-pointer w-full"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-900">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowEditDatePopover(false);
                                  speakText("Edit date popover closed", accessibility.readAloud);
                                }}
                                className="w-full text-center py-1 text-[9px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black rounded transition-all active:scale-95 cursor-pointer"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Roster Filter Pills */}
                      <div className="flex items-center bg-zinc-50 dark:bg-zinc-900 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setRosterFilter('all')}
                          className={`px-2 py-1 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                            rosterFilter === 'all' 
                              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs' 
                              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                          }`}
                        >
                          All ({monEnrollments.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRosterFilter('flagged')}
                          className={`px-2 py-1 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                            rosterFilter === 'flagged' 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                              : 'text-zinc-500 hover:text-red-500'
                          }`}
                        >
                          &lt;75% At-Risk
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tier 2: Dedicated Action & Search Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850">
                    {/* Left: Fluid Student Directory Search */}
                    <div className="relative flex-1 min-w-[200px]">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-zinc-400 pointer-events-none">
                        <Search className="w-3.5 h-3.5 text-emerald-500" />
                      </span>
                      <input
                        type="text"
                        className="w-full pl-8 pr-6 py-1.5 text-xs bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 outline-none text-zinc-800 dark:text-zinc-200 font-medium placeholder:text-zinc-400"
                        placeholder="Search student by name or ID..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                      />
                      {studentSearchQuery && (
                        <button 
                          onClick={() => setStudentSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer font-black text-xs"
                          type="button"
                          title="Clear search"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Right: Roster Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Toggle Quick Edit Mode */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !showQuickAttendanceEdit;
                          setShowQuickAttendanceEdit(next);
                          speakText(next ? "Enabled manual roster correction mode" : "Disabled manual roster correction mode", accessibility.readAloud);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                          showQuickAttendanceEdit
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs'
                            : 'bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <Settings className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{showQuickAttendanceEdit ? 'Edit Mode: ON' : 'Quick Edit'}</span>
                      </button>

                      {/* Batch Attendance Override: Mark All Excused (University Suspension / Holiday) */}
                      <button
                        type="button"
                        onClick={() => {
                          setBatchActionType('excused');
                          setShowBatchMarkConfirmModal(true);
                          speakText("Open confirmation to mark entire session excused or university holiday", accessibility.readAloud);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 active:scale-95"
                        title="Mark entire class session as Excused / Official University Suspension or Holiday"
                      >
                        <span>🏛️ Mark All Excused / Holiday</span>
                      </button>

                      {/* Batch Attendance Override Button with Confirmation Safety */}
                      <button
                        type="button"
                        onClick={() => {
                          setBatchActionType('present');
                          setShowBatchMarkConfirmModal(true);
                          speakText("Open confirmation to mark all present", accessibility.readAloud);
                        }}
                        className="px-3 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs active:scale-95"
                        title="Mark all enrolled students as Present for selected date"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                        <span>⚡ Mark All Present</span>
                      </button>
                    </div>
                  </div>



                  {(() => {
                    let filteredStudents = monEnrollments.filter(student => 
                      (student.studentName || '').toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                      (student.studentId && student.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                    );

                    // Apply rosterFilter
                    if (rosterFilter === 'flagged') {
                      filteredStudents = filteredStudents.filter(student => {
                        const studentRecords = attendanceRecords.filter(
                          r => r.classId === activeMonClass.id && 
                          (r.studentId === student.studentId || r.studentName === student.studentName)
                        );
                        const pres = studentRecords.filter(r => r.status === 'present').length;
                        const late = studentRecords.filter(r => r.status === 'late').length;
                        const total = studentRecords.length;
                        const rate = total > 0 ? Math.round(((pres + late) / total) * 100) : 100;
                        return rate < 75;
                      });
                    } else if (rosterFilter === 'borderline') {
                      filteredStudents = filteredStudents.filter(student => {
                        const studentRecords = attendanceRecords.filter(
                          r => r.classId === activeMonClass.id && 
                          (r.studentId === student.studentId || r.studentName === student.studentName)
                        );
                        const pres = studentRecords.filter(r => r.status === 'present').length;
                        const late = studentRecords.filter(r => r.status === 'late').length;
                        const total = studentRecords.length;
                        const rate = total > 0 ? Math.round(((pres + late) / total) * 100) : 100;
                        return rate >= 75 && rate < 85;
                      });
                    }

                    if (monEnrollments.length === 0) {
                      return (
                        <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs font-medium">
                          No student registration records found in academic ledger table for this class.
                        </div>
                      );
                    }

                    if (filteredStudents.length === 0) {
                      return (
                        <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs font-medium animate-fade-in">
                          No students match "{studentSearchQuery}"
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-900/60">
                        {filteredStudents.map((student, sIdx) => {
                          const studentRecords = attendanceRecords.filter(
                            r => r.classId === activeMonClass.id && 
                            (r.studentId === student.studentId || r.studentName === student.studentName)
                          );

                          // Find attendance record matching EXACTLY selectedRosterDate
                          const dateRecord = studentRecords.find(r => r.date === selectedRosterDate);
                          
                          const standing = calculateStudentStanding(studentRecords);
                          const pres = standing.presentCount;
                          const late = standing.lateCount;
                          const exc = standing.excusedCount;
                          const abs = standing.absentCount;
                          const rateClamped = standing.attendanceRate;
                          const isUnderMonitoring = standing.isDropped || standing.status === 'warning';

                          return (
                            <motion.div
                              key={student.id || student.studentId || sIdx}
                              initial={{ opacity: 0, scale: 0.97, y: 6 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ 
                                duration: 0.22, 
                                ease: [0.16, 1, 0.3, 1],
                                delay: Math.min(sIdx * 0.025, 0.25)
                              }}
                              className="py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-zinc-50/60 dark:hover:bg-zinc-900/20 px-2 sm:px-2.5 rounded-xl transition-all"
                            >
                              {/* Left side profile */}
                              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
                                <img 
                                  src={student.studentAvatar} 
                                  alt={student.studentName} 
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-1.5 leading-snug">
                                    <span className="truncate">{student.studentName}</span>
                                    {standing.isDropped ? (
                                      <span 
                                        className="px-1.5 py-0.5 rounded-md text-[7.5px] font-black uppercase tracking-wide text-red-500 bg-red-500/10 border border-red-500/20 shrink-0"
                                        title={`Dropped: ${standing.dropReasons.join(', ')}`}
                                      >
                                        🚫 Dropped
                                      </span>
                                    ) : standing.status === 'warning' ? (
                                      <span 
                                        className="px-1.5 py-0.5 rounded-md text-[7.5px] font-black uppercase tracking-wide text-amber-500 bg-amber-500/10 border border-amber-500/20 shrink-0"
                                        title={`Warning: ${standing.warningReasons.join(', ')}`}
                                      >
                                        ⚠️ Warning
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md text-[7.5px] font-black uppercase tracking-wide text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                                        Good
                                      </span>
                                    )}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <p className="text-[9.5px]/none text-zinc-400 dark:text-zinc-500 font-mono">{student.studentId}</p>
                                    {standing.isDropped && standing.dropReasons.length > 0 && (
                                      <span className="text-[8px] text-red-500 font-bold">
                                        • {standing.dropReasons[0]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Center stats indicators */}
                              <div className="flex items-center gap-4 sm:gap-5 justify-between sm:justify-end grow font-mono text-[10.5px]">
                                <div className="text-center">
                                  <span className="block text-[7.5px] text-zinc-400 font-sans font-black uppercase tracking-wider mb-0.5">ATTEND RATE</span>
                                  <span className={`font-black ${standing.isDropped ? 'text-red-500' : standing.status === 'warning' ? 'text-amber-500' : 'text-zinc-800 dark:text-zinc-200'}`}>{rateClamped}%</span>
                                </div>
                                <div className="text-center font-bold">
                                  <span className="block text-[7.5px] text-zinc-400 font-sans font-black uppercase tracking-wider mb-0.5" title="Present / Late / Excused / Absent">LOGS (P/L/E/A)</span>
                                  <span className="text-zinc-700 dark:text-zinc-300">
                                    <span className="text-emerald-500 font-black">{pres}</span>
                                    <span className="text-zinc-300 dark:text-zinc-700 mx-0.5">/</span>
                                    <span className="text-amber-500 font-black">{late}</span>
                                    <span className="text-zinc-300 dark:text-zinc-700 mx-0.5">/</span>
                                    <span className="text-sky-500 font-black">{exc}</span>
                                    <span className="text-zinc-300 dark:text-zinc-700 mx-0.5">/</span>
                                    <span className="text-red-500 font-black">{abs}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Right side single-date editor or quiet status badge */}
                              {showQuickAttendanceEdit ? (
                                <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 select-none animate-fade-in">
                                  <div className="flex items-center gap-1">
                                    <span className="hidden sm:inline w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 font-mono">
                                      {selectedRosterDate}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                    {(['present', 'late', 'absent', 'excused'] as const).map(statusOpt => {
                                      const isActive = dateRecord?.status === statusOpt;
                                      return (
                                        <button
                                          key={statusOpt}
                                          type="button"
                                          onClick={() => {
                                            if (dateRecord) {
                                              onUpdateAttendanceRecord && onUpdateAttendanceRecord(dateRecord.id, statusOpt);
                                            } else {
                                              onAddAttendanceRecord && onAddAttendanceRecord({
                                                classId: activeMonClass.id,
                                                className: activeMonClass.name,
                                                classCode: activeMonClass.code,
                                                date: selectedRosterDate,
                                                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                                                status: statusOpt,
                                                role: 'student',
                                                studentName: student.studentName,
                                                studentId: student.studentId || '2023-10492'
                                              });
                                            }
                                            speakText(`${student.studentName} marked ${statusOpt} on ${selectedRosterDate}`, accessibility.readAloud);
                                          }}
                                          className={`px-1.5 sm:px-2 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-md transition-all duration-150 cursor-pointer ${
                                            isActive
                                              ? statusOpt === 'present' ? 'bg-emerald-500 text-black font-extrabold shadow-xs scale-[0.98]' :
                                                statusOpt === 'late' ? 'bg-amber-500 text-black font-extrabold shadow-xs scale-[0.98]' :
                                                statusOpt === 'excused' ? 'bg-sky-500 text-white font-extrabold shadow-xs scale-[0.98]' :
                                                'bg-red-500 text-white font-extrabold shadow-xs scale-[0.98]'
                                              : 'bg-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                                          }`}
                                        >
                                          {statusOpt === 'excused' ? 'exc' : statusOpt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                /* Quiet indicator for current date status */
                                <div className="shrink-0 flex items-center justify-end select-none min-w-[70px]">
                                  {dateRecord ? (
                                    <span className={`px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider border font-mono ${
                                      dateRecord.status === 'present' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                      dateRecord.status === 'late' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                      dateRecord.status === 'excused' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                                      'bg-red-500/10 text-red-500 border-red-500/25'
                                    }`}>
                                      {dateRecord.status}
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] text-zinc-400 dark:text-zinc-600 font-medium font-mono uppercase tracking-wider italic">
                                      no log
                                    </span>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Roster summary analysis widget with interactive SVG metrics */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm text-left space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-300">
                    Subject Metrics
                  </h4>

                  <div className="border border-zinc-200 dark:border-zinc-900 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-950/60 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Class Session Rate Counts</p>
                    
                    {/* Visual metrics bar charts */}
                    <div className="space-y-3.5 text-left">
                      <div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 mb-1">
                          <span>PRESENT TOTALS</span>
                          <span className="font-mono text-emerald-500 font-extrabold">{monClassPresents} Logs</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, monClassPresentsRate)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 mb-1">
                          <span>LATE CHECK-INS</span>
                          <span className="font-mono text-amber-500 font-extrabold">{monClassLates} Logs</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, monClassLatesRate)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 mb-1">
                          <span>ABSENT TOTALS</span>
                          <span className="font-mono text-red-500 font-extrabold">{monClassAbsents} Logs</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, monClassAbsentsRate)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 mb-1">
                          <span>STUDENTS AT RISK</span>
                          <span className="font-mono text-red-400 font-extrabold">{monClassAtRisk} Students</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, monClassAtRiskRate)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl relative overflow-hidden">
                    <div className="flex gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-extrabold text-red-500">Critical Lateness Target</h5>
                        <p className="text-[10px] text-zinc-400 leading-normal mt-1">
                          Students with less than 85% computed status attendance rate are highlighted in the student dashboard and reported instantly to administration records.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 border border-dashed rounded-3xl bg-white dark:bg-zinc-950 text-center text-zinc-400 text-xs">
              No subjects listed. Create class registers in My Classes first.
            </div>
          )}

        </motion.div>
      )}

      {/* Help Center View Panel */}
      {activeScreen === 'help-center' && (
        <motion.div
          key="help-center"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <HelpCenter 
            userProfile={userProfile} 
            accessibility={accessibility} 
            onBack={() => setScreen('dashboard')} 
          />
        </motion.div>
      )}
      </AnimatePresence>

      {/* Faculty Commencement Alarm Clock popup modal */}
      {isFacultyAlarmOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3.5xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-2xl relative animate-scale-up space-y-5 text-left border-2 border-emerald-500/25">
            <button
              onClick={() => setIsFacultyAlarmOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-650 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-500 text-black rounded-full flex items-center justify-center font-bold mx-auto animate-bounce text-lg">
                ⏰
              </div>
              <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Class Commencement Alarm</h3>
              <p className="text-xs text-zinc-400 leading-normal">
                Your assigned scheduled curriculum class is commencing in 5 minutes! Declare your session status instantly to broadcast to student registers.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">COMMENCING SUBJECT</label>
                <select
                  value={selectedAlarmClassId}
                  onChange={(e) => {
                    setSelectedAlarmClassId(e.target.value);
                    const found = classes.find(c => c.id === e.target.value);
                    if (found) setFacultyAlarmRoom(found.room);
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-905 outline-none text-zinc-900 dark:text-zinc-150 font-black"
                >
                  {sortedClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.code}: {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider font-bold">ROOM CHANGE OPTION</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={facultyAlarmRoom}
                    onChange={(e) => setFacultyAlarmRoom(e.target.value)}
                    placeholder="e.g. Room 303-C"
                    className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-900 outline-none text-zinc-900 dark:text-zinc-100 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-bold">SELECT ATTEND CODE UPDATE</p>
                
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => {
                      handleCommitFacultyAlarmUpdate('attend');
                    }}
                    className="p-3 bg-emerald-500 hover:bg-emerald-400 cursor-pointer rounded-xl text-black font-black uppercase text-[10px] tracking-wider text-center transition-transform active:scale-95"
                  >
                    Attend
                  </button>
                  <button
                    onClick={() => {
                      handleCommitFacultyAlarmUpdate('cancel');
                    }}
                    className="p-3 bg-red-500 hover:bg-red-400 cursor-pointer rounded-xl text-white font-black uppercase text-[10px] tracking-wider text-center transition-transform active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleCommitFacultyAlarmUpdate('late');
                    }}
                    className="p-3 bg-amber-500 hover:bg-amber-400 cursor-pointer rounded-xl text-black font-black uppercase text-[10px] tracking-wider text-center transition-transform active:scale-95"
                  >
                    Late Arrival
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-zinc-400 text-center font-mono">
              ClassPulse Standard Broadcast Protocol (Instant sync)
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmClass && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Drop Course Confirmation</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Are you absolutely sure you want to drop course <span className="font-bold text-red-500">{deleteConfirmClass.code}</span>?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmClass(null)}
                className="flex-1 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClass(deleteConfirmClass.id);
                  setDeleteConfirmClass(null);
                  speakText(`Class dropped successfully`, accessibility.readAloud);
                }}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 cursor-pointer"
              >
                Confirm Drop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatched Warning Email Log Modal */}
      {dispatchedEmailsModalOpen && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-3xl max-w-2xl w-full text-left space-y-4 shadow-2xl relative animate-scale-up max-h-[85vh] flex flex-col">
            <button
              onClick={() => setDispatchedEmailsModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-650 cursor-pointer p-1 rounded-full bg-zinc-100 dark:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-900 pb-3 shrink-0">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                  📧 Dispatched Absence Warning Email Audit Trail
                </h3>
                <p className="text-xs text-zinc-400">
                  Automated warning notices dispatched to students & academic advisors for &lt;75% attendance threshold.
                </p>
              </div>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {(() => {
                const logs: DispatchedWarningEmail[] = JSON.parse(localStorage.getItem('classpulse_dispatched_emails') || '[]');
                if (logs.length === 0) {
                  return (
                    <div className="py-12 text-center text-zinc-400 text-xs">
                      No warning emails dispatched yet. Click "⚡ Auto-Dispatch Warning Emails" in the At-Risk view.
                    </div>
                  );
                }

                return logs.map((log) => (
                  <div key={log.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{log.studentName}</span>
                        <span className="font-mono text-[10px] text-zinc-400">({log.studentId})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase">
                          Rate: {log.attendanceRate}%
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase flex items-center gap-1">
                          <Check className="w-3 h-3" /> {log.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                      <div><strong className="text-zinc-700 dark:text-zinc-300">To:</strong> {log.studentEmail}</div>
                      <div><strong className="text-zinc-700 dark:text-zinc-300">CC Advisor:</strong> {log.advisorEmail}</div>
                      <div><strong className="text-zinc-700 dark:text-zinc-300">Subject:</strong> {log.classCode} ({log.className})</div>
                      <div><strong className="text-zinc-700 dark:text-zinc-300">Dispatched:</strong> {log.dispatchedAt}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 text-[10.5px] text-zinc-600 dark:text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {log.body}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDispatchedEmailsModalOpen(false)}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Batch Mass Attendance Update */}
      {showBatchMarkConfirmModal && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-3xl max-w-md w-full text-left space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-900">
              <div className={`p-2.5 rounded-2xl border ${
                batchActionType === 'excused' 
                  ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' 
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              }`}>
                <CheckSquare className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {batchActionType === 'excused' ? '🏛️ Batch Excuse / University Suspension' : '⚡ Confirm Mass Attendance (Present)'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {batchActionType === 'excused' 
                    ? 'Mark whole class session as Excused due to official suspension or university event' 
                    : 'Bulk mark enrolled students as Present for this date'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
              {/* Mode Toggle */}
              <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setBatchActionType('present')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    batchActionType === 'present'
                      ? 'bg-emerald-500 text-black shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  ⚡ Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => setBatchActionType('excused')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    batchActionType === 'excused'
                      ? 'bg-sky-500 text-black shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  🏛️ Mark All Excused
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-850 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Course:</span>
                  <span className="font-extrabold text-zinc-900 dark:text-zinc-100">
                    {activeMonClass ? `${activeMonClass.code} - ${activeMonClass.name}` : 'Current Course'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Session Date:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedRosterDate}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Enrolled Students:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-mono">
                    {monEnrollments.length} {monEnrollments.length === 1 ? 'student' : 'students'}
                  </span>
                </div>
              </div>

              {batchActionType === 'excused' && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    Official Suspension / Excused Reason:
                  </label>
                  <select
                    value={batchExcusedReason}
                    onChange={(e) => setBatchExcusedReason(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-sky-500 outline-none text-zinc-900 dark:text-zinc-100 font-semibold"
                  >
                    <option value="Official MSU University Holiday / Suspension">Official MSU University Holiday / Suspension</option>
                    <option value="Severe Weather / Marawi Rainstorm & Flooding Suspension">Severe Weather / Marawi Rainstorm & Flooding Suspension</option>
                    <option value="University Convocations / General Assembly">University Convocations / General Assembly</option>
                    <option value="MSU System Athletic & Cultural Meet">MSU System Athletic & Cultural Meet</option>
                    <option value="Campus-wide Transportation / 4th St Disruption">Campus-wide Transportation / 4th St Disruption</option>
                    <option value="College Academic Day / Faculty Colloquium">College Academic Day / Faculty Colloquium</option>
                  </select>
                </div>
              )}

              <div className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                batchActionType === 'excused'
                  ? 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
              }`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This action will mark attendance records for all <strong>{monEnrollments.length} enrolled students</strong> in this section as <strong>{batchActionType === 'excused' ? 'Excused (Official Suspension)' : 'Present'}</strong> on {selectedRosterDate}.
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-zinc-150 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setShowBatchMarkConfirmModal(false)}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer text-center transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBatchMarkConfirmModal(false);
                  handleBatchAttendanceOverride(batchActionType);
                }}
                className={`flex-1 py-2.5 text-black rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer text-center transition-all shadow-sm active:scale-95 ${
                  batchActionType === 'excused'
                    ? 'bg-sky-400 hover:bg-sky-300'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                {batchActionType === 'excused' ? 'Confirm Batch Excuse' : 'Yes, Mark All Present'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
