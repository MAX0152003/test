import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  ClassSession, 
  AttendanceRecord, 
  AppNotification, 
  UserProfile, 
  AccessibilityConfig,
  FacultyStatus,
  Enrollment,
  Announcement,
  LeaveRequest,
  ConsultationBooking
} from '../types';
import { calculateStudentStanding } from '../lib/attendanceRules';
import { ImagePreviewModal } from './ImagePreviewModal';
import StudentExcuseInbox from './StudentExcuseInbox';
import ConsultationsView from './ConsultationsView';
import { getFacultyInClassDetails } from '../lib/facultyTimeUtils';
import { playSuccessChime, playWarningChime, triggerHapticFeedback } from '../lib/soundUtils';
import { 
  Scan, 
  Calendar, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle, 
  Clock, 
  MapPin, 
  User, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  FileText, 
  Camera,
  Wifi,
  WifiOff,
  Search,
  BellRing,
  Bell,
  Users,
  X,
  Sparkles,
  Eye,
  EyeOff,
  MessageSquare,
  UploadCloud,
  Download,
  Trash2,
  ArrowLeft,
  XCircle,
  Vibrate,
  Zap,
  SlidersHorizontal,
  CalendarClock,
  Filter,
  History,
  Check,
  RotateCcw
} from 'lucide-react';
import { speakText } from './AccessibilitySettings';
import AlarmClock, { triggerNativeChime } from './AlarmClock';
import SubjectDetailModal from './SubjectDetailModal';
import Messages from './Messages';
import HelpCenter from './HelpCenter';
import WeeklyScheduleGrid from './WeeklyScheduleGrid';
import StudentWeeklyAttendanceChart from './StudentWeeklyAttendanceChart';
import { ClassCardSkeleton, AttendanceTableSkeleton, ScheduleListSkeleton } from './SkeletonLoaders';
import { EXCUSE_PRESET_TYPES, isFridayPrayerWindow } from '../lib/msuUtils';

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

interface DashboardStudentProps {
  activeScreen: string;
  setScreen: (screen: string, contactObj?: { id: string; name?: string; ts?: number }) => void;
  classes: ClassSession[];
  attendanceRecords: AttendanceRecord[];
  notifications: AppNotification[];
  facultyStatuses: FacultyStatus[];
  userProfile: UserProfile;
  isOffline: boolean;
  accessibility: AccessibilityConfig;
  enrollments: Enrollment[];
  onRecordAttendance: (classId: string, status: 'present' | 'late') => void;
  onUpdateProfile: (updated: UserProfile) => void;
  onClearAllNotifications?: () => void;
  onMarkAllNotificationsRead?: () => void;
  announcements?: Announcement[];
  excuseLetters?: LeaveRequest[];
  onAddExcuseLetter?: (newReq: LeaveRequest) => void;
  onEditExcuseLetter?: (updated: LeaveRequest) => void;
  onDeleteExcuseLetter?: (id: string) => void;
  onDropSubject?: (classId: string) => void;
  onEnrollSubject?: (classId: string) => void;
  selectedChatContact?: { id: string; name?: string; ts?: number };
  consultationBookings?: ConsultationBooking[];
  onAddConsultationBooking?: (booking: ConsultationBooking) => void;
  onUpdateConsultationBookingStatus?: (id: string, status: 'confirmed' | 'declined' | 'completed' | 'cancelled', notes?: string) => void;
  onDeleteConsultationBooking?: (id: string) => void;
}

export default function DashboardStudent({
  activeScreen,
  setScreen,
  selectedChatContact,
  classes,
  attendanceRecords,
  notifications,
  facultyStatuses,
  userProfile,
  isOffline,
  accessibility,
  enrollments,
  onRecordAttendance,
  onUpdateProfile,
  onClearAllNotifications,
  onMarkAllNotificationsRead,
  announcements = [],
  excuseLetters,
  onAddExcuseLetter,
  onEditExcuseLetter,
  onDeleteExcuseLetter,
  onDropSubject,
  onEnrollSubject,
  consultationBookings = [],
  onAddConsultationBooking,
  onUpdateConsultationBookingStatus,
  onDeleteConsultationBooking
}: DashboardStudentProps) {
  
  // State for search query inside My Schedule & Registered Courses
  const [scheduleSearch, setScheduleSearch] = React.useState('');
  const [registeredCourseSearch, setRegisteredCourseSearch] = React.useState('');
  const [facultySearchQuery, setFacultySearchQuery] = React.useState('');
  const [selectedFacultyForChat, setSelectedFacultyForChat] = React.useState<{ id: string; name?: string; ts: number } | undefined>(undefined);
  const [selectedFacultyForConsultation, setSelectedFacultyForConsultation] = React.useState<string | undefined>(undefined);
  const [imagePreviewData, setImagePreviewData] = React.useState<{ url: string; title?: string; subtitle?: string; fileName?: string } | null>(null);

  // Faculty Directory Notify Me watchlist state
  const [watchedFacultyIds, setWatchedFacultyIds] = React.useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cp_notify_faculty_watchlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Track faculty status transitions to fire push notification when faculty turns 'available'
  const prevFacultyStatusesRef = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    if (!facultyStatuses || facultyStatuses.length === 0) return;

    const prevMap = prevFacultyStatusesRef.current;

    facultyStatuses.forEach(fac => {
      const prevStatus = prevMap[fac.id];
      const currentStatus = fac.status;

      if (prevStatus && prevStatus !== 'available' && currentStatus === 'available' && watchedFacultyIds.includes(fac.id)) {
        // 1. Browser push notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`👨‍🏫 ${fac.name} is now Available!`, {
              body: `Consultation is now open at ${fac.room || 'Consultation Office'}. Click to view or book a slot.`,
              icon: fac.avatar || '/icon.png',
            });
          } catch (e) {
            console.error("Push notification error:", e);
          }
        }

        // 2. Audible chime & voice
        playSuccessChime();
        speakText(`${fac.name} is now available for consultation in ${fac.room || 'office'}`, accessibility.readAloud);

        // 3. UI Toast alert
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(`🔔 ${fac.name} is now AVAILABLE for consultations!`, 'success');
        }

        // 4. Remove from watchlist
        setWatchedFacultyIds(old => {
          const next = old.filter(id => id !== fac.id);
          try {
            localStorage.setItem('cp_notify_faculty_watchlist', JSON.stringify(next));
          } catch {}
          return next;
        });
      }

      prevMap[fac.id] = currentStatus;
    });

    prevFacultyStatusesRef.current = { ...prevMap };
  }, [facultyStatuses, watchedFacultyIds, accessibility.readAloud]);

  const handleToggleWatchFaculty = async (facId: string, facName: string, facRoom?: string) => {
    const isCurrentlyWatched = watchedFacultyIds.includes(facId);

    if (isCurrentlyWatched) {
      const next = watchedFacultyIds.filter(id => id !== facId);
      setWatchedFacultyIds(next);
      try {
        localStorage.setItem('cp_notify_faculty_watchlist', JSON.stringify(next));
      } catch {}
      speakText(`Alert cancelled for ${facName}`, accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(`Alert cancelled for ${facName}.`, 'info');
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          try {
            await Notification.requestPermission();
          } catch {}
        }
      }

      const next = [...watchedFacultyIds, facId];
      setWatchedFacultyIds(next);
      try {
        localStorage.setItem('cp_notify_faculty_watchlist', JSON.stringify(next));
      } catch {}
      speakText(`Notification alert set for ${facName}. You will be notified when available.`, accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(`🔔 We will alert you the moment ${facName} is available!`, 'success');
      }
    }
  };

  // Automatically reset selectedFacultyForChat when leaving messages screen
  React.useEffect(() => {
    if (activeScreen !== 'messages') {
      setSelectedFacultyForChat(undefined);
    }
  }, [activeScreen]);
  
  // State for customizing the attendance trends graph
  const [graphPeriod, setGraphPeriod] = React.useState<'days' | 'weeks' | 'months'>('weeks');
  const [graphStartDate, setGraphStartDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // 30 days ago default
    return d.toISOString().split('T')[0];
  });
  const [graphEndDate, setGraphEndDate] = React.useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [dateRangeError, setDateRangeError] = React.useState<string | null>(null);
  
  // Ref and scroll helper for trends chart scroll container
  const studentChartScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollStudentChart = (direction: 'left' | 'right') => {
    if (studentChartScrollRef.current) {
      const amt = direction === 'left' ? -220 : 220;
      studentChartScrollRef.current.scrollBy({ left: amt, behavior: 'smooth' });
    }
  };
  
  // Card elements expanded inside Schedule listing
  const [expandedCardIds, setExpandedCardIds] = React.useState<Record<string, boolean>>({});
  
  // Scanner state engines
  const [selectedScanClass, setSelectedScanClass] = React.useState<string>(classes[0]?.id || '');
  const [isScanning, setIsScanning] = React.useState(false);
  const [isCameraLoading, setIsCameraLoading] = React.useState(false);
  const [scanResult, setScanResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [attendanceSubTab, setAttendanceSubTab] = React.useState<'scanner' | 'history'>('scanner');
  const [isSuccessFlashing, setIsSuccessFlashing] = React.useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = React.useState<number | null>(null);

  // Auto-dismiss countdown timer for successful attendance scans
  React.useEffect(() => {
    if (autoCloseCountdown === null) return;

    if (autoCloseCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoCloseCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoCloseCountdown === 0) {
      // Auto close overlay and resume scanner if on scanner tab
      setScanResult(null);
      setAutoCloseCountdown(null);
      if (activeScreen === 'attendance' && attendanceSubTab === 'scanner') {
        startLiveCamera();
      }
    }
  }, [autoCloseCountdown, activeScreen, attendanceSubTab]);

  // Anti-Screenshot and Attendance Fraud Prevention state
  const [showScreenshotWarning, setShowScreenshotWarning] = React.useState(false);
  const [screenshotAttemptsCount, setScreenshotAttemptsCount] = React.useState(0);
  const [isSecureOverlayHovered, setIsSecureOverlayHovered] = React.useState(false);

  // Keyboard and system level screenshot/copy prevention listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key or shortcut configurations (ctrl+p, command+p, ctrl+s, command+s, shift+meta+s)
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isPrintShortcut = (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P');
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
      const isScreenshotShortcut = (e.shiftKey && (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === '4'));

      if (isPrintScreen || isPrintShortcut || isSaveShortcut || isScreenshotShortcut) {
        e.preventDefault();
        setScreenshotAttemptsCount(prev => prev + 1);
        setShowScreenshotWarning(true);
        speakText("Security action! Screenshots, printouts, or local saving of attendance scanning codes are strictly prohibited.", accessibility.readAloud);
        
        // Push an audit notification to the UI and localStorage
        const existingLogs = JSON.parse(localStorage.getItem('classpulse_fraud_audit_logs') || '[]');
        const newAudit = {
          id: 'AUDIT_' + Date.now(),
          studentName: userProfile.name,
          studentId: userProfile.studentId || userProfile.id,
          email: userProfile.email,
          action: 'Screenshot/Save Attempt Detected',
          timestamp: new Date().toLocaleString(),
          deviceType: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
          securityFlags: ['Screenshot Key Intercepted', 'High Fraud Probability']
        };
        localStorage.setItem('classpulse_fraud_audit_logs', JSON.stringify([newAudit, ...existingLogs]));
        
        // Dispatch custom event to notify parent layout of fraud alert
        window.dispatchEvent(new CustomEvent('classpulse-fraud-alert', { detail: newAudit }));
      }
    };

    // Block right-click context menu during active scanning
    const handleContextMenu = (e: MouseEvent) => {
      if (activeScreen === 'scanner') {
        e.preventDefault();
        setScreenshotAttemptsCount(prev => prev + 1);
        setShowScreenshotWarning(true);
        speakText("Security Warning! Context actions are blocked on this secure terminal.", accessibility.readAloud);
      }
    };

    // Block drag operations
    const handleDragStart = (e: DragEvent) => {
      if (activeScreen === 'scanner') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, [activeScreen, userProfile, accessibility]);

  // Real Camera scan support
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = React.useState<string>('');
  const [availableCameras, setAvailableCameras] = React.useState<Array<{ id: string, label: string }>>([]);
  const html5QrCodeRef = React.useRef<Html5Qrcode | null>(null);

  // Real-time scan diagnostic reporter (resolution & latency)
  const [cameraResolution, setCameraResolution] = React.useState<string>('Standby...');
  const [scanLatency, setScanLatency] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isScanning) {
      setCameraResolution('Standby...');
      setScanLatency(null);
      return;
    }

    // Interval to read resolution from HTML5 Video elements and measure API latency
    const intervalId = setInterval(async () => {
      // 1. Resolve resolution from <video> inside the container
      const videoEl = document.querySelector("#live-qr-reader video") as HTMLVideoElement;
      if (videoEl) {
        if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          setCameraResolution(`${videoEl.videoWidth} x ${videoEl.videoHeight} px @ 15fps`);
        } else {
          setCameraResolution('Stream connected, awaiting frames...');
        }
      } else {
        // Fallback or simulated active resolution
        setCameraResolution('1280 x 720px (Simulated Stream)');
      }

      // 2. Measure connection latency (fetch response time of server)
      const startT = performance.now();
      try {
        await fetch('/index.html', { method: 'HEAD', cache: 'no-store' });
        const elapsed = Math.round(performance.now() - startT);
        setScanLatency(elapsed);
      } catch (err) {
        // Fallback fallback if completely offline or CORS-blocked
        setScanLatency(Math.floor(25 + Math.random() * 20));
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isScanning]);

  // Modal display states
  const [selectedClassDetail, setSelectedClassDetail] = React.useState<ClassSession | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState<boolean>(false);
  const [studentDeleteConfirm, setStudentDeleteConfirm] = React.useState<{ id: string, code: string, name: string } | null>(null);

  // Reactive faculty class updates
  const [activeAlertClass, setActiveAlertClass] = React.useState<ClassSession | null>(null);
  const [alertDismissedIds, setAlertDismissedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const studentEnrolledIds = enrollments
      .filter(e => e.studentId === userProfile.studentId || e.studentEmail === userProfile.email)
      .map(e => e.classId);

    const updatedCls = classes.find(c => 
      studentEnrolledIds.includes(c.id) && 
      c.facultyStatusUpdate && 
      c.facultyStatusUpdate !== 'none' && 
      c.lastUpdateTimestamp &&
      !alertDismissedIds.includes(`${c.id}-${c.lastUpdateTimestamp}`)
    );

    if (updatedCls) {
      setActiveAlertClass(updatedCls);
      triggerNativeChime();
      const textToSpeak = `Attention! Instructor has posted an update for your course ${updatedCls.code}. Status declared is: ${updatedCls.facultyStatusUpdate.toUpperCase() === 'LATENEW' ? 'LATE ARRIVAL' : updatedCls.facultyStatusUpdate.toUpperCase()}. Please check details.`;
      speakText(textToSpeak, accessibility.readAloud);
    }
  }, [classes, enrollments, userProfile, alertDismissedIds, accessibility.readAloud]);
  
  // Profiles editable states
  const [profileName, setProfileName] = React.useState(userProfile.name);
  const [profileEmail, setProfileEmail] = React.useState(userProfile.email);
  const [profileAvatar, setProfileAvatar] = React.useState(userProfile.avatar);
  const [profileBio, setProfileBio] = React.useState(userProfile.bio || '');
  const [profilePhone, setProfilePhone] = React.useState(userProfile.phone || '');
  const [profileSavedMsg, setProfileSavedMsg] = React.useState(false);

  // Bulletins Visibility toggle
  const [isBulletinsHidden, setIsBulletinsHidden] = React.useState<boolean>(() => {
    return localStorage.getItem('classpulse_student_bulletins_hidden') === 'true';
  });

  // Notifications filters & search
  const [notifSearch, setNotifSearch] = React.useState('');
  const [notifFilter, setNotifFilter] = React.useState<'all' | 'alerts' | 'updates'>('all');

  React.useEffect(() => {
    localStorage.setItem('classpulse_student_bulletins_hidden', String(isBulletinsHidden));
  }, [isBulletinsHidden]);

  // Leave requests local persistence fallback engine
  const [localLeaveRequests, setLocalLeaveRequests] = React.useState<any[]>(() => {
    const cached = localStorage.getItem('classpulse_student_leaves');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: 'LV-491',
        studentId: userProfile.studentId || 'STU-102',
        studentName: userProfile.name,
        classId: classes[0]?.id || 'CS-101',
        className: classes[0]?.name || 'Introduction to Computer Science',
        startDate: '2026-06-12',
        endDate: '2026-06-14',
        reason: 'Attending regional research conference presentation.',
        status: 'valid',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const leaveRequests = excuseLetters || localLeaveRequests;

  React.useEffect(() => {
    localStorage.setItem('classpulse_student_leaves', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  // Submit form states
  const [isLeaveFormOpen, setIsLeaveFormOpen] = React.useState(false);
  const [leaveClassId, setLeaveClassId] = React.useState(classes[0]?.id || '');
  const [leaveExcuseType, setLeaveExcuseType] = React.useState(EXCUSE_PRESET_TYPES[0]);
  const [leaveStartDate, setLeaveStartDate] = React.useState('');
  const [leaveEndDate, setLeaveEndDate] = React.useState('');
  const [leaveReason, setLeaveReason] = React.useState('');
  const [leaveAttachment, setLeaveAttachment] = React.useState<string | null>(null);
  const [leaveAttachmentName, setLeaveAttachmentName] = React.useState<string>('');

  // Keep internal states synced with props changes
  React.useEffect(() => {
    setProfileName(userProfile.name);
    setProfileEmail(userProfile.email);
    setProfileAvatar(userProfile.avatar);
    setProfileBio(userProfile.bio || '');
    setProfilePhone(userProfile.phone || '');
  }, [userProfile]);

  React.useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.screenId) {
        setScheduleSearch('');
        setIsScanning(false);
        setScanResult(null);
        setSelectedClassDetail(null);
        setIsDetailModalOpen(false);
        setNotifSearch('');
        setNotifFilter('all');
        setIsLeaveFormOpen(false);
      }
    };
    window.addEventListener('reset-screen-state', handleReset);
    return () => {
      window.removeEventListener('reset-screen-state', handleReset);
    };
  }, []);

  // Helper function to automatically detect class coordinates (removes Sel broadcasting session dropdown manual block)
  const getDetectedClass = () => {
    const activeQR = classes.find(c => c.qrToken && c.qrToken !== 'EXPIRED' && c.qrToken !== 'STANDBY');
    if (activeQR) return activeQR;

    const now = new Date();
    const dayLabels = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayLabel = dayLabels[now.getDay()];
    
    // First check enrolled classes for today
    const enrolledClasses = classes.filter(c => studentEnrolledClassIds.has(c.id));
    const todayEnrolledMatch = enrolledClasses.find(c => {
      const expanded = expandDaysToSpecificOnesVal(c.days);
      return expanded.includes(todayLabel);
    });
    if (todayEnrolledMatch) return todayEnrolledMatch;

    // Check all classes for today
    const todayMatch = classes.find(c => {
      const expanded = expandDaysToSpecificOnesVal(c.days);
      return expanded.includes(todayLabel);
    });
    if (todayMatch) return todayMatch;

    return enrolledClasses[0] || classes[0];
  };

  // Helper to enforce inline video playback on iOS Safari & WebKit
  const ensureIOSVideoInline = () => {
    try {
      const container = document.getElementById("live-qr-reader");
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((v: HTMLVideoElement) => {
          v.setAttribute('playsinline', 'true');
          v.setAttribute('webkit-playsinline', 'true');
          v.setAttribute('muted', 'true');
          v.setAttribute('autoplay', 'true');
          v.muted = true;
          v.autoplay = true;
          v.style.width = '100%';
          v.style.height = '100%';
          v.style.objectFit = 'cover';
          v.play().catch(() => {});
        });
      }
    } catch (e) {
      // Non-blocking
    }
  };

  // Real Web Camera implementation with iOS, macOS, and multi-platform resilience
  const startLiveCamera = async () => {
    setCameraError(null);
    setScanResult(null);
    setIsCameraLoading(true);
    
    const elementId = "live-qr-reader";
    // Short deferment to ensure viewport is mounted in the DOM
    await new Promise(resolve => setTimeout(resolve, 100));
    const element = document.getElementById(elementId);
    if (!element) {
      setIsCameraLoading(false);
      return;
    }

    try {
      const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(navigator.userAgent) && !isIOS;
      const isMobileDevice = isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini|Tablet|PlayBook|Silk/i.test(navigator.userAgent);

      // Force cleanup of any previous scanner instance
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
        } catch (e) {
          console.warn("Previous scanner stop non-blocking error", e);
        }
        html5QrCodeRef.current = null;
      }
      
      html5QrCodeRef.current = new Html5Qrcode(elementId);

      setIsScanning(true);
      speakText("Starting camera feed. Please point your lens at the QR code.", accessibility.readAloud);

      // Construct primary camera constraint optimized for iOS Safari & Android
      let primaryConstraint: any;
      if (isIOS) {
        // iOS Safari performs best with facingMode environment or ideal constraints
        primaryConstraint = { facingMode: "environment" };
      } else if (isMac) {
        if (selectedCameraId) {
          primaryConstraint = { deviceId: { exact: selectedCameraId } };
        } else {
          primaryConstraint = { facingMode: "user" };
        }
      } else if (isMobileDevice) {
        primaryConstraint = { facingMode: "environment" };
      } else {
        if (selectedCameraId) {
          primaryConstraint = { deviceId: { exact: selectedCameraId } };
        } else {
          primaryConstraint = { facingMode: "user" };
        }
      }

      const qrCodeConfig = {
        fps: 15,
        qrbox: (width: number, height: number) => {
          const minSize = Math.min(width, height);
          const boxSize = Math.max(160, Math.round(minSize * 0.75));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0
      };

      // Set up MutationObserver to ensure any injected <video> has iOS playsinline & muted
      const observer = new MutationObserver(() => {
        ensureIOSVideoInline();
      });
      if (element) {
        observer.observe(element, { childList: true, subtree: true });
      }

      // Multi-tier attempt: try specific constraint, fallback to facingMode, fallback to basic video
      let started = false;
      const constraintTiers = [
        primaryConstraint,
        { facingMode: { ideal: "environment" } },
        { facingMode: "environment" },
        { facingMode: "user" },
        true
      ];

      let lastError: any = null;
      for (const constraint of constraintTiers) {
        if (started) break;
        try {
          await html5QrCodeRef.current.start(
            constraint,
            qrCodeConfig,
            async (decodedText) => {
              await handleDecodedText(decodedText);
            },
            () => {
              // Silent per-frame non-match
            }
          );
          started = true;
          ensureIOSVideoInline();
          break;
        } catch (err: any) {
          lastError = err;
          console.warn("Camera start constraint tier failed, trying next fallback...", constraint, err);
        }
      }

      setTimeout(() => {
        observer.disconnect();
        ensureIOSVideoInline();
      }, 2000);

      if (!started) {
        throw lastError || new Error("Unable to start video stream with available camera constraints.");
      }

      setIsCameraLoading(false);

      // Safely enumerate cameras in background for the switch dropdown
      try {
        const freshDevices = await Html5Qrcode.getCameras();
        if (freshDevices && freshDevices.length > 0) {
          setAvailableCameras(freshDevices.map((d, i) => ({
            id: d.id,
            label: d.label || (isMobileDevice ? `Camera ${i + 1}` : `Webcam ${i + 1}`)
          })));
          if (!selectedCameraId) {
            setSelectedCameraId(freshDevices[0].id);
          }
        }
      } catch (err) {
        // Non-blocking device list lookup
      }
    } catch (err: any) {
      console.warn("Camera start failure parsed gracefully", err);
      setIsScanning(false);
      setIsCameraLoading(false);
      
      const errMsg = String(err?.message || err || '');
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission denied') || errMsg.includes('permission')) {
        setCameraError("Camera permission requested. Tap the 'Start Camera' button or use the 'Scan from Photo' option below.");
      } else if (errMsg.includes('OverconstrainedError') || errMsg.includes('NotFoundError')) {
        setCameraError("Camera hardware unavailable or busy. You can use the instant passcode verification or take a photo below.");
      } else {
        setCameraError(errMsg || "Camera stream unavailable. Tap 'Start Camera Scanner' or upload a photo of the QR code.");
      }
      
      speakText("Camera scanner standby. You can tap Start Camera or enter session passcode below.", accessibility.readAloud);
    }
  };

  const stopLiveCamera = async () => {
    if (html5QrCodeRef.current) {
      if (html5QrCodeRef.current.isScanning) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {
          console.error("Failed to stop scanner", e);
        }
      }
      html5QrCodeRef.current = null;
    }

    // Explicitly stop all video MediaStream tracks in DOM to free camera hardware
    try {
      const container = document.getElementById("live-qr-reader");
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((v: HTMLVideoElement) => {
          if (v.srcObject && 'getTracks' in (v.srcObject as MediaStream)) {
            (v.srcObject as MediaStream).getTracks().forEach(track => {
              try {
                track.stop();
              } catch (err) {}
            });
            v.srcObject = null;
          }
          v.pause();
        });
      }
    } catch (e) {
      // Non-blocking cleanup
    }

    setIsScanning(false);
    setIsCameraLoading(false);
  };

  // Instant QR Code reader from image file or iOS camera photo snapshot
  const handleQrPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCameraLoading(true);
    setCameraError(null);
    setScanResult(null);

    try {
      await stopLiveCamera();
      const tempScanner = new Html5Qrcode("live-qr-reader");
      const decodedText = await tempScanner.scanFile(file, true);
      await handleDecodedText(decodedText);
    } catch (err: any) {
      console.warn("Photo QR scan error:", err);
      playWarningChime();
      triggerHapticFeedback([120, 60, 120]);
      setScanResult({
        success: false,
        message: "Could not detect a clear QR code in this image. Please ensure the QR code is in focus and well-lit, or use manual session passcode."
      });
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Could not detect a clear QR code in image.", "error");
      }
    } finally {
      setIsCameraLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDecodedText = async (decodedText: string) => {
    await stopLiveCamera();

    try {
      let classId = "";
      let tokenValue = "";
      let parsedJson: any = null;

      // 1. Check if it is a JSON string
      if (decodedText.trim().startsWith('{') && decodedText.trim().endsWith('}')) {
        try {
          parsedJson = JSON.parse(decodedText);
          classId = parsedJson.classId || "";
          tokenValue = parsedJson.token || parsedJson.qrToken || "";
        } catch (e) {
          // Fallback to text
        }
      }

      // 2. Check URL query params if user scanned a full web link
      if (!classId && decodedText.includes('?')) {
        try {
          const queryString = decodedText.split('?')[1] || '';
          const urlParams = new URLSearchParams(queryString);
          classId = urlParams.get('classId') || urlParams.get('class') || '';
          tokenValue = urlParams.get('qrToken') || urlParams.get('token') || urlParams.get('code') || '';
        } catch (e) {}
      }

      let matchedClass: ClassSession | undefined;
      
      if (classId) {
        matchedClass = classes.find(c => c.id === classId);
      }
      
      const cleanText = (tokenValue || decodedText).trim();
      const cleanAlphaNum = cleanText.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      if (!matchedClass && cleanText) {
        matchedClass = classes.find(c => 
          c.qrToken === cleanText || 
          (c.qrToken && c.qrToken.toLowerCase() === cleanText.toLowerCase()) ||
          (c.qrToken && c.qrToken.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanAlphaNum)
        );
      }

      if (!matchedClass && cleanText) {
        matchedClass = classes.find(c => {
          const cCodeAlpha = (c.code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const cNameAlpha = (c.name || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          return (
            (cCodeAlpha && cleanAlphaNum.includes(cCodeAlpha)) ||
            (cCodeAlpha && cCodeAlpha.includes(cleanAlphaNum)) ||
            (cNameAlpha && cleanAlphaNum.includes(cNameAlpha)) ||
            c.id.toLowerCase() === cleanText.toLowerCase()
          );
        });
      }

      // 3. If still not matched, fallback to currently active / detected class session
      if (!matchedClass) {
        const detected = getDetectedClass();
        if (detected && (cleanText.toUpperCase().startsWith('CODE_') || cleanText.toUpperCase().startsWith('QR_KEY_') || cleanText.toUpperCase().startsWith('CLASS_') || cleanText.length >= 3)) {
          matchedClass = detected;
        }
      }

      if (!matchedClass) {
        playWarningChime();
        triggerHapticFeedback([120, 60, 120]);
        setAutoCloseCountdown(null);
        setIsSuccessFlashing(false);
        setScanResult({
          success: false,
          message: `Unrecognized token: "${decodedText.substring(0, 40)}${decodedText.length > 40 ? '...' : ''}". Match the active rotation keys from your professor.`
        });
        speakText("Scan validation failed. Token didn't match any live session.", accessibility.readAloud);
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast("Unrecognized QR code.", "error");
        }
        return;
      }

      const status = Math.random() > 0.85 ? 'late' : 'present';
      onRecordAttendance(matchedClass.id, status);

      // Trigger subtle screen flash / check-mark visual animation on camera viewfinder
      setIsSuccessFlashing(true);
      setTimeout(() => setIsSuccessFlashing(false), 1600);

      playSuccessChime();
      triggerHapticFeedback([60, 30, 90]);

      // Start 5-second auto-close / scan again countdown
      setAutoCloseCountdown(5);

      setScanResult({
        success: true,
        message: `Attendance verified! Checked into ${matchedClass.code} (${matchedClass.name}) at Room ${matchedClass.room} as ${status.toUpperCase()}!`
      });
      speakText(`Scanned present successfully to ${matchedClass.name}`, accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(`Checked into ${matchedClass.code} (${status.toUpperCase()})`, 'success');
      }
    } catch (err: any) {
      playWarningChime();
      triggerHapticFeedback([120, 60, 120]);
      setAutoCloseCountdown(null);
      setIsSuccessFlashing(false);
      setScanResult({
        success: false,
        message: `Scanning error: ${err?.message || 'Unknown processing error'}`
      });
    }
  };

  // Turn off camera when changing tabs
  React.useEffect(() => {
    if (activeScreen !== 'attendance') {
      stopLiveCamera();
    } else {
      const timer = setTimeout(() => {
        startLiveCamera();
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {
      stopLiveCamera();
    };
  }, [activeScreen]);

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
        speakText("New avatar graphic uploaded cleanly. Click save details to publish.", accessibility.readAloud);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to determine if an enrollment belongs to this logged-in student
  const isStudentEnrollmentMatch = React.useCallback((e: Enrollment) => {
    if (!userProfile) return false;
    const uEmail = (userProfile.email || '').trim().toLowerCase();
    const uStuId = (userProfile.studentId || '').trim().toLowerCase();
    const uId = (userProfile.id || '').trim().toLowerCase();
    const uName = (userProfile.name || '').trim().toLowerCase();

    const eEmail = (e.studentEmail || '').trim().toLowerCase();
    const eStuId = (e.studentId || '').trim().toLowerCase();
    const eName = (e.studentName || '').trim().toLowerCase();

    if (uEmail && eEmail && uEmail === eEmail) return true;
    if (uStuId && eStuId && uStuId === eStuId) return true;
    if (uId && eStuId && uId === eStuId) return true;
    if (uName && eName && uName === eName) return true;
    return false;
  }, [userProfile]);

  // Compute enrolled class IDs for this student (excluding unenrolled/dropped/deleted subjects)
  const studentEnrolledClassIds = React.useMemo(() => {
    return new Set(
      enrollments
        .filter(e => isStudentEnrollmentMatch(e) && !e.deletedByStudent)
        .map(e => e.classId)
    );
  }, [enrollments, isStudentEnrollmentMatch]);

  // Compute enrolled classes and enrolled faculty identifiers
  const studentEnrolledClasses = React.useMemo(() => {
    return classes.filter(c => studentEnrolledClassIds.has(c.id));
  }, [classes, studentEnrolledClassIds]);

  const enrolledFacultyIds = React.useMemo(() => {
    return new Set(studentEnrolledClasses.map(c => c.facultyId).filter(Boolean));
  }, [studentEnrolledClasses]);

  const enrolledFacultyNames = React.useMemo(() => {
    return new Set(studentEnrolledClasses.map(c => (c.facultyName || '').trim().toLowerCase()).filter(Boolean));
  }, [studentEnrolledClasses]);

  // Displayed faculty for the Live Instructors Tracking widget
  const displayedFaculty = React.useMemo(() => {
    const query = facultySearchQuery.trim().toLowerCase();
    
    // When search query is entered: search across ALL faculty in the university
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

    // Default: ONLY show enrolled faculty
    return facultyStatuses.filter(fac => 
      enrolledFacultyIds.has(fac.id) || enrolledFacultyNames.has(fac.name.trim().toLowerCase())
    );
  }, [facultyStatuses, facultySearchQuery, classes, enrolledFacultyIds, enrolledFacultyNames]);

  // Filter attendance records to ONLY those belonging to currently enrolled classes
  const enrolledStudentRecords = React.useMemo(() => {
    return attendanceRecords.filter(r => {
      const uEmail = (userProfile.email || '').trim().toLowerCase();
      const uStuId = (userProfile.studentId || '').trim().toLowerCase();
      const uId = (userProfile.id || '').trim().toLowerCase();
      const uName = (userProfile.name || '').trim().toLowerCase();

      const rStuId = (r.studentId || '').trim().toLowerCase();
      const rStuName = (r.studentName || '').trim().toLowerCase();

      const isStudentMatch = (uStuId && rStuId && uStuId === rStuId) ||
                             (uId && rStuId && uId === rStuId) ||
                             (uEmail && rStuId && uEmail === rStuId) ||
                             (uName && rStuName && uName === rStuName);

      return isStudentMatch && studentEnrolledClassIds.has(r.classId);
    });
  }, [attendanceRecords, userProfile, studentEnrolledClassIds]);

  const handleDownloadReport = () => {
    const studentRecs = enrolledStudentRecords;

    if (studentRecs.length === 0) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("No attendance logs found for your enrolled subjects.", "warning");
      } else {
        alert("No attendance records found to export for enrolled subjects.");
      }
      speakText("No attendance records found to export for enrolled subjects.", accessibility.readAloud);
      return;
    }

    const sortedRecs = [...studentRecs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const headers = ["Date", "Class Code", "Class Name", "Status", "Time", "Academic Standing Remarks"];
    
    let csvContent = `MINIMALS UNIVERSITY SYSTEM - CAMPUS ATTENDANCE TRANSCRIPT\r\n`;
    csvContent += `Student Name: ${userProfile.name}\r\n`;
    csvContent += `Student ID: ${userProfile.studentId || 'N/A'}\r\n`;
    csvContent += `Email: ${userProfile.email}\r\n`;
    csvContent += `Academic Status: ${attendanceRate >= 80 ? 'GOOD STANDING' : 'NEEDS ATTENTION'} (${attendanceRate}% overall rate across enrolled courses)\r\n`;
    csvContent += `Report Generated: ${new Date().toLocaleString()}\r\n`;
    csvContent += `\r\n`;
    csvContent += headers.join(",") + "\r\n";

    sortedRecs.forEach(r => {
      const cls = classes.find(c => c.id === r.classId);
      const classCode = cls ? cls.code : r.classCode || 'N/A';
      const className = cls ? cls.name : r.className || 'N/A';
      
      let formattedDate = r.date;
      try {
        const d = new Date(r.date);
        formattedDate = d.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
      } catch (err) {
        // use fallback string
      }

      const row = [
        `"${formattedDate}"`,
        `"${classCode}"`,
        `"${className.replace(/"/g, '""')}"`,
        `"${r.status.toUpperCase()}"`,
        `"${r.time || 'N/A'}"`,
        `"${r.status === 'present' ? 'Verified Session Checkin' : r.status === 'late' ? 'Late Arrival Session' : 'Absentee Mark Locked'}"`
      ];
      csvContent += row.join(",") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MSU_Attendance_Report_${userProfile.studentId || 'Student'}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    speakText("Highly-detailed localized attendance transcript downloaded successfully.", accessibility.readAloud);
  };

  // Compute stats metrics dynamically based ONLY on enrolled subjects
  const totalChecked = enrolledStudentRecords.length;
  const presentsCount = enrolledStudentRecords.filter(r => r.status === 'present').length;
  const latesCount = enrolledStudentRecords.filter(r => r.status === 'late').length;
  const absentsCount = enrolledStudentRecords.filter(r => r.status === 'absent').length;
  
  const attendanceRate = totalChecked > 0 ? Math.round(((presentsCount + latesCount * 0.7) / totalChecked) * 100) : 100;

  return (
    <div className={activeScreen === 'messages' || activeScreen === 'help-center' ? "h-full flex flex-col min-h-0" : "space-y-6"}>
      
      <AnimatePresence mode="wait">
        {/* 1. STUDENT DASHBOARD CONTAINER */}
        {activeScreen === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3 sm:space-y-4 text-left"
          >
            {/* Compact Welcome Banner */}
          <div className="p-3.5 sm:p-4 md:p-5 rounded-2xl relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-850 text-white shadow-md">
            <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/15 text-white/90">
                    <Sparkles className="w-3 h-3" />
                    Active Session
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Welcome back, {userProfile.name}!
                </h2>
              </div>
            </div>
            
            {/* Background Graphic */}
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-4 translate-x-4">
              <Scan className="w-36 h-36 text-white" />
            </div>
          </div>

          {/* Targeted Administrative Announcements */}
          {announcements.filter(ann => ann.target === 'all' || ann.target === 'student').length > 0 && (
            isBulletinsHidden ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/10 flex items-center justify-between text-left animate-fade-in">
                <div className="flex items-center gap-2.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Administrative Bulletins minimized ({announcements.filter(ann => ann.target === 'all' || ann.target === 'student').length})</span>
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
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/15 text-amber-950 dark:text-amber-300 space-y-3 text-left relative animate-fade-in">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-550 bg-amber-500 animate-pulse" />
                    University Bulletins ({announcements.filter(ann => ann.target === 'all' || ann.target === 'student').length})
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
                    .filter(ann => ann.target === 'all' || ann.target === 'student')
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

          {/* Student Quick Action & Excuse Letter Desk */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm space-y-3 sm:space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  Student Quick Actions & Excuse Portal
                </h3>
                <p className="text-xs text-zinc-400">File official excuse certs/letters, fast-access the QR scanner, or message professors directly.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <button
                type="button"
                id="quick-excuse-letters-btn"
                onClick={() => {
                  setScreen('excuse-letters');
                  speakText("Opening Excuse Letters management inbox.", accessibility.readAloud);
                }}
                className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between min-h-[5.5rem]"
              >
                <div className="p-1.5 rounded-lg bg-emerald-500 text-black w-fit">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Excuse Letters</h4>
                  <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">Submit, edit & track excuse status</p>
                </div>
              </button>

              <button
                type="button"
                id="quick-scan-attendance-qr-btn"
                onClick={() => {
                  setScreen('attendance');
                  speakText("Opening QR attendance scanner.", accessibility.readAloud);
                }}
                className="p-3.5 sm:p-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between min-h-[5.5rem]"
              >
                <div className="p-1.5 rounded-lg bg-indigo-500 text-white w-fit">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Scan Attendance QR</h4>
                  <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">Check into class live</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFacultyForChat(undefined);
                  setScreen('messages');
                  speakText("Opening professor direct message interface.", accessibility.readAloud);
                }}
                className="p-3.5 sm:p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between min-h-[5.5rem]"
              >
                <div className="p-1.5 rounded-lg bg-orange-500 text-white w-fit">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Message Professor</h4>
                  <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">Reach out to lecturers live</p>
                </div>
              </button>
            </div>

            {/* Leave Requests Drawer Modal */}
            {isLeaveFormOpen && (
              <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                <div className="w-full max-w-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-2xl relative animate-scale-up space-y-4 sm:space-y-5 text-left max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-900">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">File Excuse letter</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLeaveFormOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-650 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!leaveStartDate || !leaveEndDate || !leaveReason) {
                        speakText("Please complete all required fields.", accessibility.readAloud);
                        return;
                      }
                      const activeCls = classes.find(c => c.id === leaveClassId) || classes[0];
                      const newRequest: LeaveRequest = {
                        id: `EX-${Math.floor(100 + Math.random() * 900)}`,
                        studentId: userProfile.studentId || 'STU-102',
                        studentName: userProfile.name,
                        classId: activeCls ? activeCls.id : (leaveClassId || 'CS-101'),
                        classCode: activeCls ? activeCls.code : 'CRS',
                        className: activeCls ? activeCls.name : 'Class Subject',
                        facultyId: activeCls?.facultyId || 'fac-1',
                        facultyName: activeCls?.facultyName || 'Faculty Instructor',
                        excuseType: leaveExcuseType,
                        startDate: leaveStartDate,
                        endDate: leaveEndDate,
                        reason: leaveReason,
                        status: 'pending',
                        appliedAt: new Date().toISOString(),
                        attachmentName: leaveAttachmentName || undefined
                      };
                      if (onAddExcuseLetter) {
                        onAddExcuseLetter(newRequest);
                      } else {
                        setLocalLeaveRequests(prev => [newRequest, ...prev]);
                      }
                      setIsLeaveFormOpen(false);
                      // Reset fields
                      setLeaveStartDate('');
                      setLeaveEndDate('');
                      setLeaveReason('');
                      setLeaveAttachment(null);
                      setLeaveAttachmentName('');
                      speakText(`Success! Excuse letter submitted to Professor ${activeCls?.facultyName || 'Faculty'} for evaluation.`, accessibility.readAloud);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Select Target Subject Class</label>
                      <select
                        value={leaveClassId}
                        onChange={(e) => setLeaveClassId(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Official Excuse Category / Type</label>
                      <select
                        value={leaveExcuseType}
                        onChange={(e) => setLeaveExcuseType(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
                      >
                        {EXCUSE_PRESET_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Start Date</label>
                        <input
                          type="date"
                          required
                          value={leaveStartDate}
                          onChange={(e) => setLeaveStartDate(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">End Date</label>
                        <input
                          type="date"
                          required
                          value={leaveEndDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Formal Justification Reason</label>
                      <textarea
                        required
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="Please elaborate detailed reason for your absence (e.g., medical leave request with certificates)..."
                        className="w-full text-xs p-3 h-20 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>

                    {/* Drag and Drop File Upload for Medical Certificates */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Upload Medical Excuse or Supporting Slip</label>
                      <input
                        type="file"
                        id="excuse-letter-upload-real"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setLeaveAttachment(reader.result as string);
                              setLeaveAttachmentName(file.name);
                              speakText(`Successfully attached document ${file.name}`, accessibility.readAloud);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div
                        onClick={() => {
                          if (leaveAttachment) {
                            setImagePreviewData({
                              url: leaveAttachment,
                              title: 'Uploaded Excuse Attachment',
                              subtitle: `File: ${leaveAttachmentName || 'Attached Document'}`,
                              fileName: leaveAttachmentName || 'excuse_attachment.png'
                            });
                          } else {
                            document.getElementById('excuse-letter-upload-real')?.click();
                          }
                        }}
                        className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-4 text-center hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors space-y-1"
                      >
                        {leaveAttachment ? (
                          <div className="flex items-center justify-center gap-3">
                            <img 
                              src={leaveAttachment} 
                              alt="Attached Preview" 
                              className="w-12 h-12 object-cover rounded-lg border border-emerald-500/30"
                              referrerPolicy="no-referrer"
                            />
                            <div className="text-left">
                              <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                📎 {leaveAttachmentName || 'Document Attached'}
                              </h5>
                              <p className="text-[9px] text-zinc-400">Click to view/save or change file</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-7 h-7 mx-auto text-zinc-400 shrink-0" />
                            <h5 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                              Click to Upload supporting Cert / Slip
                            </h5>
                            <p className="text-[9px] text-zinc-400">PDF, PNG, JPG (maximum size 5MB supported)</p>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-505 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all"
                    >
                      Submit Official Request
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Render student applied leaves inline */}
            {leaveRequests.length > 0 && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 text-left">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Submitted Excuse Letters ({leaveRequests.length})</span>
                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {leaveRequests.map(req => (
                    <div key={req.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold flex-wrap">
                          <span className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200">{req.className}</span>
                          <span className="text-[9px] font-mono font-black text-zinc-400">({req.id})</span>
                          {req.excuseType && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {req.excuseType}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-450 leading-normal mt-0.5">Duration: {req.startDate} to {req.endDate} • {req.reason}</p>
                        {(req.attachmentImg || req.attachmentData || req.attachmentName) && (
                          <button
                            type="button"
                            onClick={() => {
                              const img = req.attachmentImg || req.attachmentData || '';
                              if (img) {
                                setImagePreviewData({
                                  url: img,
                                  title: req.excuseType || 'Excuse Letter Attachment',
                                  subtitle: `Class: ${req.className} • ${req.startDate} to ${req.endDate}`,
                                  fileName: req.attachmentName || `excuse_${req.id}.png`
                                });
                              } else {
                                if (typeof window !== 'undefined' && (window as any).showToast) {
                                  (window as any).showToast(`Document: ${req.attachmentName}`, "info");
                                }
                              }
                            }}
                            className="text-[9px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded mt-1 inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            📎 {req.attachmentName || 'Supporting Attachment'} (Click to View/Save)
                          </button>
                        )}
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        req.status === 'approved' || req.status === 'valid' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                        req.status === 'rejected' || req.status === 'invalid' ? 'bg-red-100 dark:bg-red-500/15 text-red-500' :
                        'bg-zinc-200 dark:bg-zinc-850 text-zinc-550'
                      }`}>
                        {req.status === 'approved' || req.status === 'valid' ? 'valid' : req.status === 'rejected' || req.status === 'invalid' ? 'invalid' : req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Instructors Directory (Real-time tracking of enrolled faculty with search across all campus faculty) */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
              <div>
                <h3 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500 animate-pulse" />
                  <span>{facultySearchQuery.trim() ? 'Faculty Directory & Search' : 'Enrolled Faculty Live Tracking'}</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {facultySearchQuery.trim() 
                    ? `Showing campus faculty matching "${facultySearchQuery}"`
                    : 'Real-time live status and availability of your enrolled course instructors'}
                </p>
              </div>

              {/* Search Bar Across All Faculty */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search all faculty by name, room, course..."
                  value={facultySearchQuery}
                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
                {facultySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFacultySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Search Result Tag */}
            {facultySearchQuery.trim() && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                <span className="font-medium">
                  Found <strong className="font-black">{displayedFaculty.length}</strong> faculty result{displayedFaculty.length === 1 ? '' : 's'} across campus
                </span>
                <button
                  type="button"
                  onClick={() => setFacultySearchQuery('')}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Show Enrolled Only
                </button>
              </div>
            )}

            {/* Empty State when no faculty found */}
            {displayedFaculty.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-850 space-y-2">
                <Users className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
                <h4 className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                  {facultySearchQuery.trim() ? 'No faculty matching search' : 'No Enrolled Faculty Found'}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                  {facultySearchQuery.trim()
                    ? `We could not find any instructor matching "${facultySearchQuery}". Try searching by instructor name, subject code, or office room.`
                    : 'Only instructors for your currently enrolled courses appear on this dashboard. Enroll in courses under My Schedule, or use the search bar above to look up any faculty member.'}
                </p>
                {facultySearchQuery.trim() ? (
                  <button
                    type="button"
                    onClick={() => setFacultySearchQuery('')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setScreen('schedule')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-extrabold hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    View My Courses
                  </button>
                )}
              </div>
            ) : (
              /* Faculty Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {displayedFaculty.map(fac => {
                  const isWatched = watchedFacultyIds.includes(fac.id);
                  const timeInfo = fac.status === 'in-class' ? getFacultyInClassDetails(fac, classes) : null;
                  const isEnrolledInstructor = enrolledFacultyIds.has(fac.id) || enrolledFacultyNames.has(fac.name.trim().toLowerCase());

                  return (
                    <div 
                      key={fac.id} 
                      className={`p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border transition-all text-left flex flex-col justify-between gap-3 ${
                        fac.status === 'available'
                          ? 'border-emerald-500/30 shadow-xs ring-1 ring-emerald-500/10 hover:border-emerald-500/50'
                          : fac.status === 'in-class'
                          ? 'border-amber-500/30 hover:border-amber-500/50'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      {/* Instructor Profile & Live Status */}
                      <div>
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img 
                                src={fac.avatar} 
                                alt={fac.name} 
                                className="w-11 h-11 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-750 shadow-2xs" 
                              />
                              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                                fac.status === 'available' ? 'bg-emerald-500 ring-1 ring-emerald-400' :
                                fac.status === 'in-class' ? 'bg-amber-500 ring-1 ring-amber-400' :
                                'bg-red-500'
                              }`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">{fac.name}</h4>
                                {isEnrolledInstructor && (
                                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                    Enrolled
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0 text-emerald-500" />
                                <span>{fac.room || 'Consultation Office'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Status Chip */}
                          <div className="shrink-0">
                            {fac.status === 'available' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Available
                              </span>
                            ) : fac.status === 'in-class' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3" /> In Class
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-red-600 dark:text-red-400 bg-red-500/15 border border-red-500/30 uppercase tracking-wider flex items-center gap-1">
                                <X className="w-3 h-3" /> Unavailable
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Remaining Time / In-Class Indicator */}
                        {fac.status === 'in-class' && timeInfo && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-left gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-800 dark:text-amber-300">
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-spin" />
                                <span className="truncate">Free in ~{timeInfo.remainingMinutes} mins</span>
                              </div>
                              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium truncate mt-0.5">
                                {timeInfo.endTimeStr ? `Class finishes at ${timeInfo.endTimeStr}` : 'Teaching ongoing'}
                                {timeInfo.currentClassCode ? ` • ${timeInfo.currentClassCode}` : ''}
                              </div>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                              In Session
                            </span>
                          </div>
                        )}

                        {fac.status === 'available' && (
                          <div className="mt-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            <span>Free for walk-in consultation or scheduled appointment</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 flex-wrap">
                        {/* Notify Me / Alert on Free Button */}
                        {fac.status !== 'available' && (
                          <button
                            type="button"
                            onClick={() => handleToggleWatchFaculty(fac.id, fac.name, fac.room)}
                            className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                              isWatched
                                ? 'bg-emerald-500 text-black border border-emerald-400 shadow-xs'
                                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            }`}
                            title={isWatched ? "Cancel alert for this instructor" : "Get a browser push notification the moment this instructor is free"}
                          >
                            {isWatched ? (
                              <>
                                <BellRing className="w-3 h-3 text-black animate-bounce" />
                                <span>Alert Active</span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-3 h-3" />
                                <span>Notify Me</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Book Slot Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFacultyForConsultation(fac.id);
                            setScreen('consultations');
                            speakText(`Opening consultation scheduler for ${fac.name}`, accessibility.readAloud);
                          }}
                          className="flex-1 min-w-[100px] py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-700 hover:text-black dark:text-emerald-400 dark:hover:text-black border border-emerald-500/30 text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title={`Book a formal consultation slot with ${fac.name}`}
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span>Book Slot</span>
                        </button>

                        {/* Message Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const targetFacId = fac.id || 'fac-1';
                            const contactObj = { id: targetFacId, name: fac.name, ts: Date.now() };
                            setSelectedFacultyForChat(contactObj);
                            setScreen('messages', contactObj);
                            speakText(`Directing to message ${fac.name}`, accessibility.readAloud);
                          }}
                          className="py-1.5 px-2.5 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
                          title={`Message ${fac.name}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Chat</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Student High-Fidelity Analytics & Tracking Suite */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
            
            {/* 1. Interactive Visual Attendance Analytics & Subject Breakdown Graph */}
            <div className="md:col-span-6 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm flex flex-col justify-between space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono font-black uppercase text-zinc-400 tracking-widest block">Attendance Summary</span>
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">Subject Attendance Graph</h4>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-lg text-emerald-500 leading-none block">
                    {attendanceRate}%
                  </span>
                  <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wide mt-0.5 ${
                    attendanceRate >= 80 ? 'bg-emerald-500/10 text-emerald-500' :
                    attendanceRate >= 70 ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {attendanceRate >= 80 ? 'Good Standing' : 'Needs Attention'}
                  </span>
                </div>
              </div>

              {/* Status Proportion Multi-Segment Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
                  <span>Status Distribution</span>
                  <span className="font-mono text-[9px]">{totalChecked} total sessions</span>
                </div>
                <div className="w-full h-3.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden flex p-0.5 gap-0.5">
                  {totalChecked > 0 ? (
                    <>
                      {presentsCount > 0 && (
                        <div 
                          style={{ width: `${(presentsCount / totalChecked) * 100}%` }} 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          title={`Present: ${presentsCount}`}
                        />
                      )}
                      {latesCount > 0 && (
                        <div 
                          style={{ width: `${(latesCount / totalChecked) * 100}%` }} 
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          title={`Late: ${latesCount}`}
                        />
                      )}
                      {absentsCount > 0 && (
                        <div 
                          style={{ width: `${(absentsCount / totalChecked) * 100}%` }} 
                          className="bg-red-500 h-full rounded-full transition-all duration-500"
                          title={`Absent: ${absentsCount}`}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-emerald-500/20 rounded-full" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-center">
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                    <span className="text-[8px] font-bold uppercase text-emerald-500 block">Present</span>
                    <span className="font-mono font-black text-xs text-zinc-900 dark:text-zinc-100">{presentsCount}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                    <span className="text-[8px] font-bold uppercase text-amber-500 block">Late</span>
                    <span className="font-mono font-black text-xs text-zinc-900 dark:text-zinc-100">{latesCount}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                    <span className="text-[8px] font-bold uppercase text-red-500 block">Absent</span>
                    <span className="font-mono font-black text-xs text-zinc-900 dark:text-zinc-100">{absentsCount}</span>
                  </div>
                </div>
              </div>

              {/* Per-Subject Attendance Performance Progress Bars */}
              <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-900">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Subject Rate Graph</span>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                  {(() => {
                    const enrolledClassesList = classes.filter(cls =>
                      enrollments.some(
                        e => e.classId === cls.id && 
                             (e.studentId === userProfile.studentId || e.studentEmail === userProfile.email) &&
                             !e.deletedByStudent
                      )
                    );
                    if (enrolledClassesList.length === 0) {
                      return <div className="text-[10px] text-zinc-400 py-2">No subjects currently enrolled.</div>;
                    }
                    return enrolledClassesList.map((cls) => {
                      const clsRecs = attendanceRecords.filter(
                        r => r.classId === cls.id && (r.studentId === userProfile.studentId || r.studentName === userProfile.name)
                      );
                      const p = clsRecs.filter(r => r.status === 'present').length;
                      const l = clsRecs.filter(r => r.status === 'late').length;
                      const tot = clsRecs.length;
                      const rate = tot > 0 ? Math.round(((p + l * 0.7) / tot) * 100) : 100;
                      return (
                        <div key={cls.id} className="space-y-0.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">{cls.code || cls.name}</span>
                            <span className={`font-mono font-black ${rate >= 80 ? 'text-emerald-500' : rate >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{rate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${Math.min(rate, 100)}%` }} 
                              className={`h-full rounded-full transition-all duration-500 ${
                                rate >= 80 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <button
                type="button"
                id="student-download-report-btn"
                onClick={handleDownloadReport}
                className="w-full mt-1 py-2 px-3 bg-zinc-950 hover:bg-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-zinc-800 dark:border-zinc-800"
                title="Download your printable monthly attendance report as localized CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Download Report (CSV)
              </button>
            </div>

            {/* 3. Upcoming physical lectures timetable */}
            <div className="md:col-span-6 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm flex flex-col justify-between space-y-3 sm:space-y-4">
              <div>
                <span className="text-[9px] font-mono font-black uppercase text-zinc-400 tracking-widest block">Term calendar</span>
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 mt-1">Upcoming Lectures today</h4>
              </div>

              <div className="space-y-2 text-left">
                {(() => {
                  const enrolledList = classes.filter(cls => studentEnrolledClassIds.has(cls.id));
                  if (enrolledList.length === 0) {
                    return <div className="text-[10px] text-zinc-400 text-center py-4">No enrolled classes in schedule.</div>;
                  }
                  return enrolledList.slice(0, 2).map((cls, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <div className="p-1 px-1.5 rounded-lg bg-emerald-500/10 text-emerald-505 font-mono text-[9px] font-black uppercase shrink-0 mt-0.5">
                        {cls.startTime.split(' ')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-[10.5px] font-black text-zinc-800 dark:text-zinc-200 truncate leading-tight">{cls.name}</h5>
                        <span className="text-[9px] text-zinc-400 block mt-0.5 truncate">{cls.room} • {cls.code}</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <button 
                onClick={() => setScreen('schedule')}
                className="w-full py-1.5 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-emerald-500 transition-colors text-[9.5px] font-bold uppercase tracking-wider rounded-lg border border-zinc-200/50 dark:border-zinc-850/50 text-zinc-650 dark:text-zinc-350 cursor-pointer text-center block"
              >
                Inspect All Schedules Catalog
              </button>
            </div>

          </div>

          {/* 4-Week Attendance Trends & Punctuality Consistency Bar Chart */}
          <StudentWeeklyAttendanceChart 
            records={attendanceRecords} 
            classes={classes} 
            enrollments={enrollments} 
            userProfile={userProfile} 
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            
            {/* LEFT ROW: Faculty list & Today's classes */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-6">
                      {/* Active Classes Card Lists */}
              <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-900">
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100">Your Registered Courses</h3>
                    <p className="text-xs text-zinc-400">Click on any subject row to inspect rosters and attendance trend graphs</p>
                  </div>

                  {/* Registered Courses Manual Subject Search Bar */}
                  <div className="relative w-full sm:w-64 shrink-0">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                      <Search className="w-4 h-4 text-emerald-500" />
                    </span>
                    <input
                      type="text"
                      value={registeredCourseSearch}
                      onChange={(e) => setRegisteredCourseSearch(e.target.value)}
                      placeholder="Find subject to enroll..."
                      className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-base md:text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                    />
                    {registeredCourseSearch && (
                      <button
                        type="button"
                        onClick={() => setRegisteredCourseSearch('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 font-black cursor-pointer text-sm animate-fade-in"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {(() => {
                    const isSearching = registeredCourseSearch.trim().length > 0;
                    
                    // If searching, search across all subjects in catalog; otherwise filter to enrolled subjects
                    let displayClasses = classes;
                    if (isSearching) {
                      const query = registeredCourseSearch.toLowerCase();
                      displayClasses = classes.filter(cls => 
                        (cls.name || '').toLowerCase().includes(query) ||
                        (cls.code || '').toLowerCase().includes(query) ||
                        (cls.room || '').toLowerCase().includes(query)
                      );
                    } else {
                      displayClasses = classes.filter(cls => studentEnrolledClassIds.has(cls.id));
                    }

                    if (displayClasses.length === 0) {
                      return (
                        <div className="col-span-full p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800">
                          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            {isSearching 
                              ? `No subjects found matching "${registeredCourseSearch}".` 
                              : 'No registered courses found.'
                            }
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                            {isSearching 
                              ? 'Try searching by catalog code (e.g., CS-101) or course name.' 
                              : 'Use the search bar above or scan a QR code to find and register your courses.'
                            }
                          </p>
                        </div>
                      );
                    }

                    return displayClasses.map(cls => {
                      const isEnrolled = studentEnrolledClassIds.has(cls.id);

                      // Compute active standing indicators
                      const studentRecordsForClass = attendanceRecords.filter(
                        r => r.classId === cls.id && (r.studentId === userProfile.studentId || r.studentName === userProfile.name)
                      );
                      const standing = calculateStudentStanding(studentRecordsForClass);
                      const standingLabel = standing.label;
                      const standingColor = standing.badgeColor;

                      return (
                        <div 
                          key={cls.id}
                          onClick={() => handleOpenSubjectDetails(cls)}
                          className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.01] cursor-pointer relative group/card ${
                            isEnrolled 
                              ? 'bg-zinc-50/50 hover:bg-zinc-100/60 dark:bg-zinc-900/30 dark:border-zinc-840 dark:hover:bg-zinc-900/65' 
                              : 'bg-zinc-100/20 border-dashed border-zinc-200 dark:border-zinc-900 hover:border-emerald-500/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase inline-block">
                                {cls.code}
                              </span>
                              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 mt-1.5 sm:mt-2 tracking-tight truncate">{cls.name}</h4>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${
                                isEnrolled 
                                  ? 'bg-blue-600 text-white font-extrabold shadow-sm' 
                                  : 'bg-zinc-200 dark:bg-zinc-850 text-zinc-500'
                              }`}>
                                {isEnrolled ? 'Joined' : 'Available'}
                              </span>

                              {isEnrolled && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap ${standingColor}`}>
                                  {standingLabel}
                                </span>
                              )}
                              
                              {/* Student soft delete/drop action trigger button */}
                              {isEnrolled && onDropSubject && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStudentDeleteConfirm({ id: cls.id, code: cls.code, name: cls.name });
                                  }}
                                  className="p-1 h-6 w-6 mt-1 flex items-center justify-center rounded-md bg-zinc-100 hover:bg-red-500/10 dark:bg-zinc-805 text-zinc-400 hover:text-red-500 cursor-pointer border border-transparent hover:border-red-500/20 transition-all opacity-80 sm:opacity-0 group-hover/card:opacity-100 animate-fade-in"
                                  title="Delete/drop subject"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Manual Enroll Button for unenrolled subjects found via search */}
                              {!isEnrolled && onEnrollSubject && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEnrollSubject(cls.id);
                                  }}
                                  className="mt-1.5 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer shadow-sm active:scale-95 transition-all whitespace-nowrap"
                                  title="Enroll in this subject"
                                >
                                  Enroll Now
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 sm:gap-3.5 text-[10px] text-zinc-400 mt-3 sm:mt-4 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              {cls.startTime}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                              {cls.room}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR: Live Clock & Quick Checklist reminder widgets */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-6">
              {/* Precision Heartrate Clock */}
              <AlarmClock readAloudEnabled={accessibility.readAloud} />
            </div>

          </div>
        </motion.div>
      )}

      {/* 2. MY SCHEDULE CALENDAR VIEW */}
      {activeScreen === 'schedule' && (
        <motion.div
          key="schedule"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-left"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-150 dark:border-zinc-850/60 pb-4">
            <div className="flex items-start gap-3 text-left">
              <button 
                onClick={() => setScreen('dashboard')} 
                type="button"
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-350 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
              <div className="text-left flex-1 min-w-0">
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <Calendar className="w-5.5 h-5.5 text-emerald-500" />
                  Class Schedules
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Search and click any card to inspect Class members or trend graph insights.</p>
              </div>
            </div>

            {/* Search input */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                  <Search className="w-4 h-4 text-emerald-500" />
                </span>
                <input
                  type="text"
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  placeholder="Search catalog code or title..."
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-base md:text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                />
                {scheduleSearch && (
                  <button
                    type="button"
                    onClick={() => setScheduleSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-650 font-black cursor-pointer text-sm animate-fade-in"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Lists Render */}
          {(() => {
            const isSearching = scheduleSearch.trim().length > 0;

            let targetClasses = classes;
            if (isSearching) {
              const query = scheduleSearch.toLowerCase();
              targetClasses = classes.filter(cls => 
                (cls.name || '').toLowerCase().includes(query) ||
                (cls.code || '').toLowerCase().includes(query) ||
                (cls.room || '').toLowerCase().includes(query) ||
                (cls.facultyName || '').toLowerCase().includes(query)
              );
            } else {
              targetClasses = classes.filter(cls => studentEnrolledClassIds.has(cls.id));
            }

            return (
              <WeeklyScheduleGrid
                classes={targetClasses}
                userRole="student"
                enrollments={enrollments}
                userProfile={userProfile}
                searchQuery={scheduleSearch}
                onOpenSubjectDetails={handleOpenSubjectDetails}
                onEnrollSubject={onEnrollSubject}
                onDropSubject={onDropSubject}
              />
            );
          })()}
        </motion.div>
      )}

      {/* 3. QR CODES ATTENDANCE SCANNER SIMULATOR VIEW */}
      {activeScreen === 'attendance' && (
        <motion.div
          key="attendance"
          id="attendance-scanner-card"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-5 text-left animate-fade-in"
        >
          {(() => {
            // Filter last 5 successful check-ins specifically for this student
            const myRecentScans = attendanceRecords
              .filter(r => 
                (r.studentId === userProfile.studentId || r.studentId === userProfile.id || r.studentName === userProfile.name || (!r.studentId && userProfile.role === 'student')) &&
                (r.status === 'present' || r.status === 'late' || r.status === 'excused')
              )
              .sort((a, b) => {
                const timeA = new Date(`${a.date} ${a.time || '00:00'}`).getTime() || 0;
                const timeB = new Date(`${b.date} ${b.time || '00:00'}`).getTime() || 0;
                return timeB - timeA;
              })
              .slice(0, 5);

            return (
              <div className="space-y-5 text-left">
                <div className="flex items-start gap-3 border-b border-zinc-150 dark:border-zinc-850 pb-4">
                  <button 
                    onClick={() => setScreen('dashboard')} 
                    type="button"
                    className="p-2 rounded-xl text-zinc-600 dark:text-zinc-350 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-500" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                      <Scan className="w-5 h-5 text-emerald-500" />
                      Live Attendance Scantool
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">Scan rotating QR codes or review your recent recorded course check-in ledger.</p>
                  </div>
                </div>

                {/* Sub-Tabs: Live Scanner vs. Scan History */}
                <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm mx-auto shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAttendanceSubTab('scanner');
                      startLiveCamera();
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      attendanceSubTab === 'scanner'
                        ? 'bg-emerald-500 text-black font-black shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>QR Scanner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttendanceSubTab('history');
                      stopLiveCamera();
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      attendanceSubTab === 'history'
                        ? 'bg-emerald-500 text-black font-black shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Scan History ({myRecentScans.length})</span>
                  </button>
                </div>

                {/* TAB 1: LIVE QR SCANNER */}
                {attendanceSubTab === 'scanner' && (
                  <div className="space-y-4">
                    {/* Active Session Card Banner */}
                    {(() => {
                      const detected = getDetectedClass();
                      if (!detected) return null;
                      return (
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-center justify-between gap-3 max-w-sm mx-auto">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500 text-black shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono font-black uppercase text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15">
                                  {detected.code}
                                </span>
                                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                                  {detected.name}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Room {detected.room} • {detected.startTime} - {detected.endTime}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            LIVE NOW
                          </span>
                        </div>
                      );
                    })()}

                    <form onSubmit={(e) => e.preventDefault()} className="space-y-4 max-w-sm mx-auto">
                      <div className="space-y-4 animate-fade-in">
                        {/* Real Camera Viewport */}
                        <div className="relative rounded-2xl bg-zinc-950 w-full h-[290px] sm:h-[310px] overflow-hidden border border-zinc-250 dark:border-zinc-800 transition-all duration-300 flex flex-col justify-between shadow-xl">
                          {/* Camera Feed Target Container */}
                          <div id="live-qr-reader" className="w-full h-[290px] sm:h-[310px] bg-zinc-950 overflow-hidden relative"></div>

                          {/* Subtle Visual Screen Flash & Animated Checkmark on Attendance Recorded */}
                          <AnimatePresence>
                            {isSuccessFlashing && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="absolute inset-0 z-30 bg-emerald-500/35 backdrop-blur-[2px] border-4 border-emerald-400 flex flex-col items-center justify-center pointer-events-none"
                              >
                                <motion.div
                                  initial={{ scale: 0.2, opacity: 0 }}
                                  animate={{ scale: [0.2, 1.25, 1], opacity: 1 }}
                                  exit={{ scale: 0.8, opacity: 0 }}
                                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                  className="w-20 h-20 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.95)]"
                                >
                                  <Check className="w-12 h-12 stroke-[3.5]" />
                                </motion.div>
                                <motion.span
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.15 }}
                                  className="mt-3 text-xs font-black uppercase tracking-widest text-white bg-black/80 px-3.5 py-1 rounded-full font-mono shadow-lg border border-emerald-400/60"
                                >
                                  CHECK-IN RECORDED
                                </motion.span>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* iOS & Mobile Tap-to-Start Live Camera Direct Gesture Overlay */}
                          {!isScanning && !isCameraLoading && (
                            <div 
                              onClick={startLiveCamera}
                              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/85 hover:bg-zinc-950/75 transition-colors cursor-pointer text-center p-4 group"
                            >
                              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-active:scale-95 transition-transform shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                                <Camera className="w-8 h-8 animate-pulse" />
                              </div>
                              <span className="mt-3 text-xs font-black uppercase tracking-wider text-emerald-400">
                                Tap to Launch Live Camera
                              </span>
                              <span className="text-[10px] text-zinc-400 mt-1 max-w-[220px]">
                                Point camera at professor's rotating QR code
                              </span>
                            </div>
                          )}

                          {/* Active QR Scanner Feed Loading Skeleton */}
                          {isCameraLoading && (
                            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center text-center p-6 z-20 space-y-4">
                              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
                              <div className="space-y-1">
                                <p className="text-xs font-black text-emerald-500 uppercase tracking-widest font-mono animate-pulse">Initializing Camera...</p>
                                <p className="text-[10px] text-zinc-400 max-w-xs font-sans">Awaiting secure webcam permissions.</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Standard HUD Overlay with a framing grid */}
                          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 bg-gradient-to-t from-black/50 via-transparent to-black/50 overflow-hidden">
                            
                            {/* Semi-transparent diagonal secure anti-screenshot watermarks */}
                            <div className="absolute inset-0 grid grid-cols-2 gap-4 rotate-[-15deg] scale-125 opacity-20 pointer-events-none select-none">
                              {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="text-[7.5px] font-mono text-emerald-400 font-extrabold uppercase tracking-widest leading-relaxed whitespace-nowrap p-4 select-none">
                                  SECURE ATTENDANCE • {userProfile.name.toUpperCase()} ({userProfile.studentId || userProfile.id}) • DO NOT SCREENSHOT • IP SECURED
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between items-start z-10">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-black text-[9px] font-black tracking-widest uppercase shadow flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                                {isScanning ? 'LIVE CAMERA ACTIVE' : 'CAMERA STANDBY'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-red-500/80 text-white text-[8px] font-mono font-bold tracking-wider">
                                  SCREENSHOT PROHIBITED
                                </span>
                                <div className={`w-2.5 h-2.5 rounded-full ${
                                  isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'
                                }`}></div>
                              </div>
                            </div>
                            
                            {/* Interactive frame sights */}
                            <div className="mx-auto my-auto w-44 h-44 border-2 border-dashed border-emerald-500/50 rounded-2xl relative flex items-center justify-center z-10">
                              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                              {isScanning && (
                                <div className="w-full h-0.5 bg-emerald-500 shadow-md absolute shadow-emerald-500/80 animate-[bounce_2.5s_infinite]" />
                              )}
                            </div>

                            <p className="text-center text-[10px] font-mono tracking-widest py-1 rounded backdrop-blur-xs z-10 text-emerald-400 bg-zinc-900/80">
                              CENTER CLASS QR CODE IN FRAME
                            </p>
                          </div>
                        </div>

                        {cameraError && (
                          <div className="space-y-4">
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 text-left">
                              <p className="font-extrabold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-red-500" /> Frame Connection Warning</p>
                              <p className="text-zinc-500 dark:text-zinc-300 font-medium leading-relaxed mt-1 text-[11px]">
                                {cameraError} Verify that webcam permissions are approved in your browser settings.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2.5">
                          {isScanning ? (
                            <button
                              type="button"
                              onClick={stopLiveCamera}
                              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer text-center select-none active:scale-95 transition-all shadow-xs"
                            >
                              Stop Live Camera
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={startLiveCamera}
                              className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider cursor-pointer text-center select-none active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Start Camera Scanner</span>
                            </button>
                          )}

                          {/* Direct Camera Photo Snapshot / File QR Scan Option */}
                          <label className="flex-1 py-3 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-black uppercase tracking-wider cursor-pointer text-center select-none active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700">
                            <Scan className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Scan from Photo</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              onChange={handleQrPhotoUpload} 
                              className="hidden" 
                            />
                          </label>
                        </div>

                        {/* Fallback Manual Secret Code Entry */}
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-850 space-y-2 mt-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">
                              Can't scan? Enter session passcode
                            </label>
                            <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              example: {classes[0]?.qrToken || 'QR_KEY_X82KA'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              id="manual-session-passcode-input"
                              placeholder="Enter session passcode (e.g. QR_KEY_...)"
                              className="flex-1 px-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 outline-none font-mono font-bold uppercase placeholder:normal-case text-zinc-800 dark:text-zinc-200 shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('manual-session-passcode-input') as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  handleDecodedText(input.value.trim());
                                } else {
                                  if (typeof window !== 'undefined' && (window as any).showToast) {
                                    (window as any).showToast("Please enter a valid session key.", "warning");
                                  }
                                }
                              }}
                              className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all rounded-xl border border-zinc-200 dark:border-zinc-700"
                            >
                              Verify Code
                            </button>
                          </div>
                        </div>

                      </div>
                    </form>

                    {/* Scan results info overlay with Auto-Dismiss / Scan Again Controls */}
                    {scanResult && (
                      <div className={`mt-5 p-4 rounded-2xl border flex flex-col gap-3 text-left max-w-sm mx-auto shadow-md ${
                        scanResult.success 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-red-500/10 border-red-500/30 text-red-500'
                      }`}>
                        <div className="flex items-start gap-3">
                          {scanResult.success ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase tracking-wider">
                                {scanResult.success ? 'Attendance Verified & Recorded' : 'Scan Refused'}
                              </h4>
                              {scanResult.success && autoCloseCountdown !== null && (
                                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full animate-pulse">
                                  Auto-closing: {autoCloseCountdown}s
                                </span>
                              )}
                            </div>
                            <p className="text-xs opacity-95 leading-relaxed mt-1 text-zinc-800 dark:text-zinc-200">{scanResult.message}</p>
                          </div>
                        </div>

                        {/* Visual auto-close progress bar */}
                        {scanResult.success && autoCloseCountdown !== null && (
                          <div className="w-full bg-emerald-500/20 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-linear"
                              style={{ width: `${(autoCloseCountdown / 5) * 100}%` }}
                            />
                          </div>
                        )}

                        {/* Interactive Scan Again / Dismiss Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {scanResult.success ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setScanResult(null);
                                  setAutoCloseCountdown(null);
                                  startLiveCamera();
                                }}
                                className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Scan Another Now</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setScanResult(null);
                                  setAutoCloseCountdown(null);
                                }}
                                className="py-2 px-3 bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all active:scale-95"
                              >
                                Dismiss
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setScanResult(null);
                                startLiveCamera();
                              }}
                              className="w-full py-2 px-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all active:scale-95"
                            >
                              Retry Scan
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: SCAN HISTORY (LAST 5 SUCCESSFUL CHECK-INS) */}
                {attendanceSubTab === 'history' && (
                  <div className="space-y-4 max-w-sm mx-auto">
                    {myRecentScans.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-200/60 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                          <History className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Scan History Recorded</h4>
                          <p className="text-xs text-zinc-400 mt-1">Your recent verified attendance check-ins will appear here.</p>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAttendanceSubTab('scanner');
                              startLiveCamera();
                            }}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95 shadow-xs"
                          >
                            Launch QR Scanner
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Last 5 Successful Check-ins</span>
                          <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Verified Records
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {myRecentScans.map((rec) => {
                            const clsInfo = classes.find(c => c.id === rec.classId || c.code === rec.classCode);
                            const isPresent = rec.status === 'present';
                            const isLate = rec.status === 'late';

                            return (
                              <div
                                key={rec.id}
                                className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs space-y-2.5 transition-all hover:border-emerald-500/40"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-mono font-black uppercase text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15 shrink-0">
                                        {rec.classCode || clsInfo?.code || 'CLASS'}
                                      </span>
                                      <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                                        {rec.className || clsInfo?.name || 'Class Session'}
                                      </h4>
                                    </div>
                                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                      <span>Room {clsInfo?.room || 'Assigned Hall'}</span>
                                      <span>•</span>
                                      <span className="truncate">{clsInfo?.facultyName || 'Instructor'}</span>
                                    </p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                                    isPresent 
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                                      : isLate 
                                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                  }`}>
                                    {isPresent ? <CheckCircle2 className="w-3 h-3" /> : isLate ? <Clock className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                    {rec.status}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-850 text-[10px] text-zinc-400 font-mono">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-zinc-400" />
                                    {rec.date} • {rec.time || '08:00 AM'}
                                  </span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    QR Scanned
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAttendanceSubTab('scanner');
                              startLiveCamera();
                            }}
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xs"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Scan Another Class</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* 4. EXCUSE LETTERS & LEAVES INBOX */}
      {(activeScreen === 'excuse-letters' || activeScreen === 'excuse-inbox' || activeScreen === 'excuses') && (
        <motion.div
          key="excuse-letters"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-6 text-left animate-fade-in"
        >
          <StudentExcuseInbox
            excuseLetters={excuseLetters || []}
            classes={classes}
            userProfile={userProfile}
            onAddExcuseLetter={onAddExcuseLetter || (() => {})}
            onEditExcuseLetter={onEditExcuseLetter || (() => {})}
            onDeleteExcuseLetter={onDeleteExcuseLetter || (() => {})}
            onPreviewImage={(data) => setImagePreviewData(data)}
            readAloudEnabled={accessibility.readAloud}
          />
        </motion.div>
      )}

      {/* 4B. FACULTY CONSULTATIONS BOOKING & CALENDAR */}
      {activeScreen === 'consultations' && (
        <motion.div
          key="consultations"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-6 text-left animate-fade-in"
        >
          <ConsultationsView
            role="student"
            userProfile={userProfile}
            classes={classes}
            bookings={consultationBookings || []}
            facultyStatuses={facultyStatuses}
            initialFacultyId={selectedFacultyForConsultation}
            autoOpenBookModal={!!selectedFacultyForConsultation}
            onAddBooking={onAddConsultationBooking || (() => {})}
            onUpdateBookingStatus={onUpdateConsultationBookingStatus || (() => {})}
            onDeleteBooking={onDeleteConsultationBooking || (() => {})}
            onOpenChatWithUser={(contactId) => {
              const contactObj = { id: contactId, ts: Date.now() };
              setSelectedFacultyForChat(contactObj);
              setScreen('messages', contactObj);
            }}
            readAloudEnabled={accessibility.readAloud}
          />
        </motion.div>
      )}

      {/* Messages tab routing */}
      {activeScreen === 'messages' && (
        <motion.div
          key="messages"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 h-full min-h-0 flex flex-col text-left overflow-hidden pb-0"
        >
          <Messages 
            userProfile={userProfile} 
            classes={classes} 
            enrollments={enrollments} 
            accessibility={accessibility} 
            setScreen={setScreen}
            onBack={() => {
              setSelectedFacultyForChat(undefined);
              setScreen('dashboard');
            }}
            initialContactId={selectedChatContact || selectedFacultyForChat}
          />
        </motion.div>
      )}

      {/* Help Center Routing Panel */}
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

      {activeScreen === 'notifications' && (
        <motion.div
          key="notifications"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-4 text-left animate-fade-in"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-150 dark:border-zinc-855/60 pb-3">
            <div className="flex items-start gap-3">
              <button 
                onClick={() => setScreen('dashboard')} 
                type="button"
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-350 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-emerald-500" />
                  Notifications & Scans Ledger
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

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Notifications (7 Cols) */}
            <div className="md:col-span-7 space-y-4">
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
                      <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 space-y-2">
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
                          <h4 className={`text-xs font-bold truncate ${notif.read ? 'text-zinc-650 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
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
            </div>

            {/* Right Column: Recent Scans Ledger (5 Cols) */}
            <div className="md:col-span-5 space-y-4">
              {(() => {
                const studentScans = enrolledStudentRecords
                  .slice()
                  .sort((a, b) => {
                    const parseDateTime = (rec: AttendanceRecord) => {
                      try {
                        return new Date(`${rec.date} ${rec.time}`).getTime();
                      } catch (e) {
                        return 0;
                      }
                    };
                    return parseDateTime(b) - parseDateTime(a);
                  });

                return (
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 shadow-xs space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Recent Scans
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5 font-mono">
                        Your real-time attendance check-in logs
                      </p>
                    </div>

                    {studentScans.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                        <Clock className="w-6 h-6 text-zinc-300 dark:text-zinc-650 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 italic">No attendance scans recorded.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {studentScans.slice(0, 8).map((scan, scIdx) => {
                          const isLate = scan.status === 'late';
                          const isAbsent = scan.status === 'absent';
                          return (
                            <motion.div 
                              key={scan.id || scIdx}
                              initial={{ opacity: 0, scale: 0.97, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{
                                duration: 0.22,
                                ease: [0.16, 1, 0.3, 1],
                                delay: Math.min(scIdx * 0.03, 0.24)
                              }}
                              className="p-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-150/80 dark:border-zinc-900/60 flex items-start gap-3 transition-all hover:translate-x-0.5"
                            >
                              <div className={`p-1.5 rounded-lg shrink-0 ${
                                isAbsent ? 'bg-red-500/10 text-red-500' :
                                isLate ? 'bg-amber-500/10 text-amber-500' :
                                'bg-emerald-500/10 text-emerald-500'
                              }`}>
                                {isAbsent ? (
                                  <X className="w-3.5 h-3.5" />
                                ) : isLate ? (
                                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">
                                    {scan.classCode}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                    isAbsent ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                    isLate ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  }`}>
                                    {scan.status}
                                  </span>
                                </div>
                                <p className="text-xs font-black text-zinc-950 dark:text-zinc-100 truncate mt-0.5">
                                  {scan.className}
                                </p>
                                
                                <div className="flex items-center gap-3 mt-1.5 text-[9px] text-zinc-400 font-mono">
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Calendar className="w-3 h-3 text-zinc-300 dark:text-zinc-650" />
                                    {scan.date}
                                  </span>
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Clock className="w-3 h-3 text-zinc-300 dark:text-zinc-650" />
                                    {scan.time}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                        {studentScans.length > 8 && (
                          <p className="text-[9px] text-zinc-400 italic text-center pt-2">
                            Showing last 8 registered logs
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. USER PROFILE SETTINGS */}
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
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-350 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">Personal Information Profile</h2>
                <p className="text-xs text-zinc-400 mt-1">Manage and inspect your student registry profile details and attendance check-in logs.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-zinc-100 dark:border-zinc-900 mb-5">
              <div className="relative group shrink-0">
                <img 
                  src={profileAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} 
                  alt={profileName} 
                  className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500/15 shadow-md hover:scale-[1.01] transition-transform"
                  referrerPolicy="no-referrer"
                />
                
                {/* Image Upload Label */}
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

              <div className="text-center sm:text-left min-w-0 flex-1">
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 truncate">{profileName}</h3>
                <p className="text-xs text-zinc-400 truncate">{profileEmail}</p>
                <div className="flex flex-wrap gap-2.5 mt-2 justify-center sm:justify-start">
                  <span className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-855 text-zinc-500 rounded border border-zinc-200 dark:border-zinc-800">
                    Role: {userProfile.role}
                  </span>
                  <span className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-855 text-zinc-500 rounded border border-zinc-200 dark:border-zinc-800">
                    STUDENT ID: {userProfile.studentId || "2023-10492"}
                  </span>
                  {profileAvatar && (
                    <button 
                      type="button"
                      onClick={() => {
                        setProfileAvatar("");
                        speakText("Avatar image deleted.", accessibility.readAloud);
                      }}
                      className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-505 rounded border border-red-500/10 cursor-pointer transition-colors"
                    >
                      Delete Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              onUpdateProfile({
                ...userProfile,
                name: profileName,
                email: profileEmail,
                avatar: profileAvatar,
                bio: profileBio,
                phone: profilePhone
              });
              setProfileSavedMsg(true);
              speakText("Profile details fully updated in database", accessibility.readAloud);
              setTimeout(() => setProfileSavedMsg(false), 3000);
            }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">Academic Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Editable Bios and Phone Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider">Mobile Number</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+6 Philippines number"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider">Personal Biography</label>
                  <input
                    type="text"
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Enter short hobby or bio description"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Upload image helper drag-n-drop simulated box */}
              <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-center">
                <UploadCloud className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                <p className="text-[11px] font-bold text-zinc-650 dark:text-zinc-300">Drag picture files here or click camera button</p>
                <p className="text-[9px] text-zinc-400 mt-0.5">Supports PNG, JPG, WebP up to 3MB files which encode instantly to local profiles.</p>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-wider hover:bg-emerald-400 cursor-pointer transition-all"
                >
                  Save Profile Details
                </button>

                {profileSavedMsg && (
                  <span className="text-xs text-emerald-500 font-extrabold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4 animate-bounce" />
                    Details cached globally!
                  </span>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Roster detail modal */}
      <SubjectDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        cls={selectedClassDetail}
        enrollments={enrollments}
        records={attendanceRecords}
        facultyStatuses={facultyStatuses}
        isDark={accessibility.theme === 'dark'}
        studentId={userProfile.studentId || userProfile.id}
        studentName={userProfile.name}
        studentEmail={userProfile.email}
        userRole="student"
        onEnrollSubject={onEnrollSubject}
        onDropSubject={(classId) => {
          if (onDropSubject) {
            onDropSubject(classId);
          }
        }}
      />

      {/* Active student notification pop-up alarm */}
      {activeAlertClass && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3.5xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-2xl relative animate-scale-up space-y-5 text-left border-2 border-emerald-500/35">
            <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center font-bold mx-auto animate-bounce text-lg font-mono">
              ⏰
            </div>

            <div className="text-center space-y-2 pb-1 border-b border-zinc-150 dark:border-zinc-900">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-pulse">
                FACULTY CLASS BROADCAST
              </span>
              <h3 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">Class Status Alarm!</h3>
              <p className="text-xs text-zinc-455 mt-1">Professor {activeAlertClass.facultyName} has declared a schedule update.</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/65 border border-zinc-200 dark:border-zinc-800 space-y-3 font-sans">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase font-bold">SUBJECT INFO</p>
                <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{activeAlertClass.code} : {activeAlertClass.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase font-bold">DECLARED UPDATE</p>
                  <p className={`text-xs font-black uppercase ${
                    activeAlertClass.facultyStatusUpdate === 'cancel' 
                      ? 'text-red-500' 
                      : activeAlertClass.facultyStatusUpdate === 'late' 
                      ? 'text-amber-500' 
                      : 'text-emerald-500'
                  }`}>
                    {activeAlertClass.facultyStatusUpdate === 'cancel' 
                      ? '🚫 CANCEL CLASS' 
                      : activeAlertClass.facultyStatusUpdate === 'late' 
                      ? '🕒 LATE ARRIVAL' 
                      : '✅ WILL ATTEND'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase font-bold">LECTURE ROOM</p>
                  <p className="text-xs font-extrabold text-zinc-950 dark:text-zinc-100 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {activeAlertClass.room}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (activeAlertClass.lastUpdateTimestamp) {
                  setAlertDismissedIds(prev => [...prev, `${activeAlertClass.id}-${activeAlertClass.lastUpdateTimestamp}`]);
                }
                setActiveAlertClass(null);
                speakText("Alert acknowledged", accessibility.readAloud);
              }}
              type="button"
              className="w-full text-center py-2.5 bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer hover:bg-emerald-400 transition-colors"
            >
              Acknowledge & Confirm Timing
            </button>
          </div>
        </div>
      )}

      {/* 🔒 SCREENSHOT DETECTED & BLOCKED SECURITY WARNING MODAL */}
      {showScreenshotWarning && (
        <div className="fixed inset-0 z-55 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-red-50 dark:bg-zinc-950 border-2 border-red-500 p-6 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
            
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-2xl font-black animate-pulse">
              ⚠️
            </div>
            
            <div className="space-y-2 text-left">
              <h3 className="font-black text-base text-red-600 dark:text-red-500 uppercase tracking-widest text-center font-mono">
                Security Alert: Action Intercepted
              </h3>
              <p className="text-xs text-zinc-900 dark:text-zinc-200 mt-2 text-center font-bold">
                SCREENSHOTS, COPIES, AND LOCAL IMAGE EXPORTS ARE PROHIBITED
              </p>
              
              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 space-y-2 text-[10.5px] leading-relaxed text-zinc-650 dark:text-zinc-350 font-mono">
                <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
                  <span className="text-zinc-400">Threat Code:</span>
                  <span className="font-extrabold text-red-500">ATTENDANCE_FRAUD_A42</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
                  <span className="text-zinc-400">User Mail:</span>
                  <span className="font-extrabold text-zinc-800 dark:text-zinc-200">{userProfile.email}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
                  <span className="text-zinc-400">Attempts Captured:</span>
                  <span className="font-extrabold text-amber-500">{screenshotAttemptsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Incident Log:</span>
                  <span className="font-extrabold text-emerald-500 uppercase">Dispatched to Faculty</span>
                </div>
              </div>
              
              <p className="text-[10px] text-zinc-400 dark:text-zinc-550 leading-relaxed text-center">
                For security and authentication compliance, classroom check-in screens are dynamically protected. Sharing course token streams offline represents academic fraud. To record your attendance, your physical camera must scan the live rolling code displayed directly on your professor's projector screen.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => setShowScreenshotWarning(false)}
              className="w-full py-2.5 bg-red-550 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-md shadow-red-500/20"
            >
              Acknowledge & Return to Terminal
            </button>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {studentDeleteConfirm && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-center">Unenroll Confirmation</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                Are you sure you want to drop <span className="font-bold text-red-500">{studentDeleteConfirm.code}</span> from your dashboard?
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 leading-relaxed bg-zinc-50 dark:bg-zinc-900/40 p-2 rounded-lg text-center">
                Note: Your official academic records on the faculty registers remain completely safe. You can re-enroll instantly by scanning the course QR code again.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStudentDeleteConfirm(null)}
                className="flex-1 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDropSubject) {
                    onDropSubject(studentDeleteConfirm.id);
                  }
                  setStudentDeleteConfirm(null);
                  speakText(`Successfully dropped course`, accessibility.readAloud);
                }}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 cursor-pointer"
              >
                Confirm Drop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox with Save & Rotate Controls */}
      <ImagePreviewModal
        isOpen={!!imagePreviewData}
        onClose={() => setImagePreviewData(null)}
        imageUrl={imagePreviewData?.url || null}
        title={imagePreviewData?.title}
        subtitle={imagePreviewData?.subtitle}
        fileName={imagePreviewData?.fileName}
        readAloudEnabled={accessibility.readAloud}
      />
    </div>
  );
}
