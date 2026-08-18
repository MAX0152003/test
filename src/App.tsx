import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Role, 
  ClassSession, 
  AppNotification, 
  AttendanceRecord, 
  UserProfile, 
  AccessibilityConfig, 
  FacultyStatus, 
  Enrollment,
  Announcement,
  LeaveRequest,
  LabRoom,
  ViewDensity
} from './types';
import { 
  syncClassesFromFirestore,
  saveClassToFirestore,
  deleteClassFromFirestore,
  syncAttendanceFromFirestore,
  saveAttendanceToFirestore,
  saveUserProfileToFirestore,
  syncAllAccountsFromFirestore,
  syncFacultyStatusesFromFirestore,
  saveFacultyStatusToFirestore,
  listenToFacultyStatuses,
  syncExcuseLettersFromFirestore,
  saveExcuseLetterToFirestore,
  listenToExcuseLetters,
  listenToClasses,
  listenToAttendance,
  listenToRegisteredUsers,
  listenToCredentials,
  listenToPasswordResets,
  claimSessionLinkFromFirestore,
  forceResyncAllFromFirestore
} from './lib/firestoreSync';
import { normalizeUserIdentity } from './lib/authUtils';
import AccountLinkQRModal from './components/AccountLinkQRModal';
import { 
  INITIAL_CLASSES, 
  INITIAL_FACULTY_STATUSES, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_ATTENDANCE_RECORDS,
  DEFAULT_STUDENT_PROFILE,
  DEFAULT_FACULTY_PROFILE,
  DEFAULT_ADMIN_PROFILE
} from './data';
import { 
  registerAlarmServiceWorker, 
  checkActiveScheduleAlarms, 
  requestSystemNotificationPermission,
  triggerClassAlarmNotification,
  ClassAlarmPayload
} from './lib/classAlarmScheduler';
import { auth } from './lib/googleAuth';
import Sidebar from './components/Sidebar';
import DashboardStudent from './components/DashboardStudent';
import DashboardFaculty from './components/DashboardFaculty';
import DashboardAdmin from './components/DashboardAdmin';
import AuthScreens from './components/AuthScreens';
import AccessibilitySettings, { speakText } from './components/AccessibilitySettings';
import SettingsPage from './components/Settings';
import { 
  Wifi, 
  WifiOff, 
  Settings, 
  X, 
  HelpCircle,
  Bell,
  Search,
  LayoutDashboard,
  Activity,
  Inbox,
  Menu,
  Users,
  CalendarDays,
  UserCircle,
  Scan,
  MessageSquare,
  QrCode,
  CheckCircle
} from 'lucide-react';

// Safe Local Storage Wrapper to prevent app crashes due to QuotaExceededError or browser iframe restrictions
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[ClassPulse] Failed to read "${key}" from localStorage:`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[ClassPulse] Failed to write "${key}" to localStorage:`, e);
      // If we hit QuotaExceededError, try to prune non-critical state (like cached history/toasts) to recover workspace
      if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.message?.includes('quota'))) {
        try {
          localStorage.removeItem('cp_notifications');
          localStorage.removeItem('cp_records');
          localStorage.setItem(key, value);
        } catch (_) {}
      }
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[ClassPulse] Failed to remove "${key}" from localStorage:`, e);
    }
  }
};

export default function App() {
  // Synchronously purge old cache/demo data to guarantee a fresh zero-record start
  if (typeof window !== 'undefined' && !safeStorage.getItem('cp_purged_v7')) {
    safeStorage.removeItem('cp_classes');
    safeStorage.removeItem('cp_records');
    safeStorage.removeItem('cp_notifications');
    safeStorage.removeItem('cp_faculty_statuses');
    safeStorage.removeItem('classpulse_student_leaves');
    safeStorage.removeItem('cp_enrollments');
    safeStorage.removeItem('cp_announcements');
    safeStorage.removeItem('classpulse_registered_users');
    safeStorage.removeItem('classpulse_registered_admins');
    safeStorage.removeItem('classpulse_custom_passwords');
    safeStorage.removeItem('classpulse_password_reset_requests');
    safeStorage.removeItem('cp_lab_rooms');
    safeStorage.removeItem('cp_offline_queue_count');
    safeStorage.removeItem('cp_user');
    safeStorage.removeItem('cp_screen');
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cp_support_tickets_') || k.startsWith('cp_chat_') || k.startsWith('cp_'))) {
          localStorage.removeItem(k);
        }
      }
    } catch (_) {}
    safeStorage.setItem('cp_purged_v7', 'true');
  }

  // Global App-level Toast System
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);

  React.useEffect(() => {
    (window as any).showToast = (message: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
      setToast({ message, type });
    };
    return () => {
      delete (window as any).showToast;
    };
  }, []);

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 1. Core State Managers (Local Storage integrated)
  const [user, setUser] = React.useState<UserProfile | null>(() => {
    const cached = safeStorage.getItem('cp_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing cp_user:", e);
      }
    }
    return null;
  });

  const [activeScreen, setActiveScreen] = React.useState<string>(() => {
    return safeStorage.getItem('cp_screen') || 'dashboard';
  });

  const [selectedChatContact, setSelectedChatContact] = React.useState<{ id: string; name?: string; ts?: number } | undefined>(undefined);

  const [isMobileBarVisible, setIsMobileBarVisible] = React.useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
  const lastScrollTopRef = React.useRef(0);

  React.useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active || !(active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const isShrunk = window.innerHeight - window.visualViewport.height > 120;
        if (isShrunk) {
          setIsKeyboardOpen(true);
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  const mainScrollRef = React.useRef<HTMLDivElement>(null);
  const prevLabRoomsRef = React.useRef<Record<string, 'occupied' | 'available' | 'maintenance'>>({});
  const touchStartYRef = React.useRef<number | null>(null);

  // Robust multi-tier scroll and gesture detection for mobile & iOS devices
  React.useEffect(() => {
    const handleScrollEvent = (e?: Event) => {
      let currentTop = 0;
      if (mainScrollRef.current) {
        currentTop = mainScrollRef.current.scrollTop;
      }
      if (!currentTop && typeof window !== 'undefined') {
        currentTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      }
      
      const diff = currentTop - lastScrollTopRef.current;

      if (diff > 8 && currentTop > 30) {
        setIsMobileBarVisible(false);
      } else if (diff < -8 || currentTop <= 25) {
        setIsMobileBarVisible(true);
      }

      lastScrollTopRef.current = Math.max(0, currentTop);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartYRef.current === null || !e.touches || e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartYRef.current - currentY; // Positive = scrolling down

      if (deltaY > 18) {
        // Swiping finger upwards (scrolling down the content) -> Hide dock
        setIsMobileBarVisible(false);
      } else if (deltaY < -18) {
        // Swiping finger downwards (scrolling up the content) -> Show dock
        setIsMobileBarVisible(true);
      }
    };

    const handleTouchEnd = () => {
      touchStartYRef.current = null;
    };

    // Attach to window and document with capture mode for deep nested scroll event interception
    window.addEventListener('scroll', handleScrollEvent, { passive: true, capture: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });

    const mainEl = mainScrollRef.current;
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScrollEvent, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScrollEvent, { capture: true } as any);
      window.removeEventListener('touchstart', handleTouchStart, { capture: true } as any);
      window.removeEventListener('touchmove', handleTouchMove, { capture: true } as any);
      window.removeEventListener('touchend', handleTouchEnd, { capture: true } as any);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScrollEvent);
      }
    };
  }, [user, activeScreen]);

  const handleSetScreen = (screenId: string, contactObj?: { id: string; name?: string; ts?: number }) => {
    if (screenId === activeScreen && !contactObj) {
      window.dispatchEvent(new CustomEvent('reset-screen-state', { detail: { screenId } }));
    }
    if (screenId === 'messages') {
      if (contactObj) {
        setSelectedChatContact(contactObj);
      } else {
        setSelectedChatContact(undefined);
      }
    } else {
      setSelectedChatContact(undefined);
    }
    setActiveScreen(screenId);
    setTimeout(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const sanitizeDays = (days: string[]): string[] => {
    const mapped = new Set<string>();
    (days || []).forEach(d => {
      const clean = d.trim().toUpperCase();
      if (clean === 'MW' || clean === 'MON' || clean === 'WED' || clean === 'MONDAY' || clean === 'WEDNESDAY' || clean === 'MON, WED' || clean === 'MON,WED') {
        mapped.add('MW');
      } else if (clean === 'TTH' || clean === 'TUE' || clean === 'THU' || clean === 'TUESDAY' || clean === 'THURSDAY' || clean === 'TUE, THU' || clean === 'TUE,THU') {
        mapped.add('TTh');
      } else if (clean === 'S' || clean === 'SAT' || clean === 'SATURDAY') {
        mapped.add('S');
      } else if (clean === 'A' || clean === 'SUN' || clean === 'SUNDAY') {
        mapped.add('A');
      } else if (clean === 'FRI' || clean === 'FRIDAY' || clean === 'FS' || clean === 'F') {
        mapped.add('MW');
      } else {
        const parts = clean.split(/[\s,]+/);
        if (parts.length > 1) {
          parts.forEach(p => {
            const subClean = p.trim();
            if (['MW', 'MON', 'WED', 'MONDAY', 'WEDNESDAY', 'FRI', 'FRIDAY', 'F'].includes(subClean)) {
              mapped.add('MW');
            } else if (['TTH', 'TUE', 'THU', 'TUESDAY', 'THURSDAY'].includes(subClean)) {
              mapped.add('TTh');
            } else if (['S', 'SAT', 'SATURDAY'].includes(subClean)) {
              mapped.add('S');
            } else if (['A', 'SUN', 'SUNDAY'].includes(subClean)) {
              mapped.add('A');
            }
          });
        } else {
          mapped.add('MW');
        }
      }
    });
    if (mapped.size === 0) mapped.add('MW');
    return Array.from(mapped);
  };

  const [classes, setClasses] = React.useState<ClassSession[]>(() => {
    const cached = safeStorage.getItem('cp_classes');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ClassSession[];
        return parsed.map(c => ({
          ...c,
          days: sanitizeDays(c.days)
        }));
      } catch (e) {
        console.error("Error parsing cp_classes:", e);
      }
    }
    return INITIAL_CLASSES.map(c => ({
      ...c,
      days: sanitizeDays(c.days)
    }));
  });

  const [attendanceRecords, setAttendanceRecords] = React.useState<AttendanceRecord[]>(() => {
    const cached = safeStorage.getItem('cp_records');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing cp_records:", e);
      }
    }
    return INITIAL_ATTENDANCE_RECORDS;
  });

  const [notifications, setNotifications] = React.useState<AppNotification[]>(() => {
    const cached = safeStorage.getItem('cp_notifications');
    let raw: AppNotification[] = INITIAL_NOTIFICATIONS;
    if (cached) {
      try {
        raw = JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing cp_notifications:", e);
      }
    }
    const seen = new Set<string>();
    return raw.filter(n => {
      if (!n || !n.id || seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  });

  const [facultyStatuses, setFacultyStatuses] = React.useState<FacultyStatus[]>(() => {
    const cached = safeStorage.getItem('cp_faculty_statuses');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing cp_faculty_statuses:", e);
      }
    }
    return INITIAL_FACULTY_STATUSES;
  });

  const [excuseLetters, setExcuseLetters] = React.useState<LeaveRequest[]>(() => {
    const cached = safeStorage.getItem('classpulse_student_leaves');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
        setIsMobileBarVisible(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => {
          const next = !prev;
          setIsMobileBarVisible(!next);
          return next;
        });
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsMobileBarVisible(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  React.useEffect(() => {
    safeStorage.setItem('classpulse_student_leaves', JSON.stringify(excuseLetters));
  }, [excuseLetters]);

  const [accessibility, setAccessibility] = React.useState<AccessibilityConfig>(() => {
    const cached = safeStorage.getItem('cp_accessibility');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.theme === 'light' || parsed.theme === 'dark') {
          return {
            theme: parsed.theme,
            readAloud: !!parsed.readAloud
          };
        }
      } catch (e) {}
    }
    return {
      theme: 'light', // default theme is now an elegant light/warm-slate vibe
      readAloud: false
    };
  });

  const [viewDensity, setViewDensity] = React.useState<ViewDensity>(() => {
    const cached = safeStorage.getItem('cp_pref_view_density');
    if (cached === 'compact' || cached === 'comfortable' || cached === 'spacious') return cached as ViewDensity;
    return safeStorage.getItem('cp_pref_compact_mode') === 'true' ? 'compact' : 'comfortable';
  });

  const [compactMode, setCompactMode] = React.useState(() => {
    return safeStorage.getItem('cp_pref_compact_mode') === 'true' || safeStorage.getItem('cp_pref_view_density') === 'compact';
  });

  const handleUpdateDensity = (newDensity: ViewDensity) => {
    setViewDensity(newDensity);
    const isCompact = newDensity === 'compact';
    setCompactMode(isCompact);
    safeStorage.setItem('cp_pref_view_density', newDensity);
    safeStorage.setItem('cp_pref_compact_mode', String(isCompact));
  };

  const [colorAccent, setColorAccent] = React.useState(() => {
    return safeStorage.getItem('cp_pref_color_accent') || 'emerald';
  });

  const [enrollments, setEnrollments] = React.useState<Enrollment[]>(() => {
    const cached = safeStorage.getItem('cp_enrollments');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing cp_enrollments:", e);
      }
    }
    
    return [];
  });

  const [announcements, setAnnouncements] = React.useState<Announcement[]>(() => {
    const cached = safeStorage.getItem('cp_announcements');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing cp_announcements:", e);
      }
    }
    return [];
  });

  const [labRooms, setLabRooms] = React.useState<LabRoom[]>(() => {
    const cached = safeStorage.getItem('cp_lab_rooms');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r: LabRoom) => ({
            ...r,
            buildingCluster: r.buildingCluster || r.building || (r.name.includes('Sci') ? 'Science & Mathematics Complex' : r.name.includes('Eng') ? 'College of Engineering Wing' : 'CICS Complex (Information & Computing Sciences)')
          }));
        }
      } catch (e) {
        console.error("Error parsing cp_lab_rooms:", e);
      }
    }
    return [
      {
        id: 'lab-cics-1',
        name: 'CICS Multimedia Lab 1 (Room 201)',
        capacity: 45,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 45,
        scannersActive: true,
        activeScannerLogs: [],
        floor: '2nd Floor',
        buildingCluster: 'CICS Complex (Information & Computing Sciences)'
      },
      {
        id: 'lab-cics-2',
        name: 'CICS Software Eng. Lab 2 (Room 204)',
        capacity: 40,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 40,
        scannersActive: true,
        activeScannerLogs: [],
        floor: '2nd Floor',
        buildingCluster: 'CICS Complex (Information & Computing Sciences)'
      },
      {
        id: 'lab-cics-3',
        name: 'CICS Cyber Lecture Hall 101',
        capacity: 60,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 20,
        scannersActive: true,
        activeScannerLogs: [],
        floor: '1st Floor',
        buildingCluster: 'CICS Complex (Information & Computing Sciences)'
      },
      {
        id: 'lab-sci-1',
        name: 'Science Complex Physics Lab A',
        capacity: 35,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 30,
        scannersActive: true,
        activeScannerLogs: [],
        floor: '3rd Floor',
        buildingCluster: 'Science & Mathematics Complex'
      },
      {
        id: 'lab-sci-2',
        name: 'Chemistry Analytical Lab 302',
        capacity: 30,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 15,
        scannersActive: true,
        activeScannerLogs: [],
        floor: '3rd Floor',
        buildingCluster: 'Science & Mathematics Complex'
      },
      {
        id: 'lab-eng-1',
        name: 'Engineering Wing CAD/CAM Studio',
        capacity: 50,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 50,
        scannersActive: true,
        activeScannerLogs: [],
        floor: '1st Floor',
        buildingCluster: 'College of Engineering Wing'
      },
      {
        id: 'lab-eng-2',
        name: 'Robotics & Electronics Workshop 105',
        capacity: 30,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 25,
        scannersActive: true,
        activeScannerLogs: [],
        floor: '1st Floor',
        buildingCluster: 'College of Engineering Wing'
      },
      {
        id: 'lab-kf-1',
        name: 'King Faisal Islamic Studies Amphitheater',
        capacity: 80,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 10,
        scannersActive: true,
        activeScannerLogs: [],
        floor: '1st Floor',
        buildingCluster: 'King Faisal Center for Islamic Studies'
      },
      {
        id: 'lab-lib-1',
        name: 'University Library IT Training Center',
        capacity: 50,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 50,
        scannersActive: true,
        activeScannerLogs: [],
        floor: '2nd Floor',
        buildingCluster: 'University Library & IT Center'
      }
    ];
  });

  const [isOffline, setIsOffline] = React.useState<boolean>(() => {
    return safeStorage.getItem('cp_offline') === 'true';
  });

  const [offlineQueueCount, setOfflineQueueCount] = React.useState<number>(() => {
    const cached = safeStorage.getItem('cp_offline_queue_count');
    return cached ? parseInt(cached, 10) : 0;
  });

  // Action/simulation trackers
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncDoneBanner, setSyncDoneBanner] = React.useState(false);
  const [isAccPanelOpen, setIsAccPanelOpen] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isAccountLinkModalOpen, setIsAccountLinkModalOpen] = React.useState(false);

  // Synchronize Dark / Light class on the HTML document element
  React.useEffect(() => {
    if (accessibility.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [accessibility.theme]);

  // Firestore Auth & Sync setup
  React.useEffect(() => {
    if (isOffline) return;

    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribeAuth();
  }, [isOffline]);

  // Firestore Sync Data on mount: pulls down classes, attendance records, users and credentials to sync across devices
  React.useEffect(() => {
    // Check if URL contains session_token for QR session handoff
    if (typeof window !== 'undefined' && window.location.search.includes('session_token=')) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('session_token');
      if (token) {
        claimSessionLinkFromFirestore(false, token).then((claimedProfile) => {
          if (claimedProfile) {
            const normUser = normalizeUserIdentity(claimedProfile);
            handleLoginSuccess(normUser.role as Role, normUser.name, normUser.email);
            speakText(`Session synchronized from QR code. Welcome back, ${normUser.name}!`, accessibility.readAloud);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });
      }
    }

    syncClassesFromFirestore(false, (fetchedClasses) => {
      setClasses(fetchedClasses);
      safeStorage.setItem('cp_classes', JSON.stringify(fetchedClasses));
    });
    syncAttendanceFromFirestore(false, (fetchedRecords) => {
      setAttendanceRecords(fetchedRecords);
      safeStorage.setItem('cp_records', JSON.stringify(fetchedRecords));
    });
    syncFacultyStatusesFromFirestore(false, (fetchedStatuses) => {
      setFacultyStatuses(fetchedStatuses);
      safeStorage.setItem('cp_faculty_statuses', JSON.stringify(fetchedStatuses));
    });
    syncExcuseLettersFromFirestore(false, (fetchedLetters) => {
      setExcuseLetters(fetchedLetters);
      safeStorage.setItem('classpulse_student_leaves', JSON.stringify(fetchedLetters));
    });
    syncAllAccountsFromFirestore(false);

    const unsubClasses = listenToClasses(false, (fetchedClasses) => {
      setClasses(fetchedClasses);
      safeStorage.setItem('cp_classes', JSON.stringify(fetchedClasses));
    });
    const unsubAttendance = listenToAttendance(false, (fetchedRecords) => {
      setAttendanceRecords(fetchedRecords);
      safeStorage.setItem('cp_records', JSON.stringify(fetchedRecords));
    });
    const unsubFaculty = listenToFacultyStatuses(false, (fetchedStatuses) => {
      setFacultyStatuses(fetchedStatuses);
      safeStorage.setItem('cp_faculty_statuses', JSON.stringify(fetchedStatuses));
    });
    const unsubExcuses = listenToExcuseLetters(false, (fetchedLetters) => {
      setExcuseLetters(fetchedLetters);
      safeStorage.setItem('classpulse_student_leaves', JSON.stringify(fetchedLetters));
    });
    const unsubUsers = listenToRegisteredUsers(false);
    const unsubCreds = listenToCredentials(false);
    const unsubResets = listenToPasswordResets(false);

    return () => {
      unsubClasses();
      unsubAttendance();
      unsubFaculty();
      unsubExcuses();
      unsubUsers();
      unsubCreds();
      unsubResets();
    };
  }, []);

  // Firestore Sync Data: pulls down classes and attendance records once online
  React.useEffect(() => {
    if (isOffline) return;

    if (user) {
      setIsSyncing(true);
      Promise.all([
        syncClassesFromFirestore(false, (fetchedClasses) => {
          setClasses(fetchedClasses);
          safeStorage.setItem('cp_classes', JSON.stringify(fetchedClasses));
        }),
        syncAttendanceFromFirestore(false, (fetchedRecords) => {
          setAttendanceRecords(fetchedRecords);
          safeStorage.setItem('cp_records', JSON.stringify(fetchedRecords));
        }),
        syncFacultyStatusesFromFirestore(false, (fetchedStatuses) => {
          setFacultyStatuses(fetchedStatuses);
          safeStorage.setItem('cp_faculty_statuses', JSON.stringify(fetchedStatuses));
        }),
        syncExcuseLettersFromFirestore(false, (fetchedLetters) => {
          setExcuseLetters(fetchedLetters);
          safeStorage.setItem('classpulse_student_leaves', JSON.stringify(fetchedLetters));
        }),
        saveUserProfileToFirestore(false, user)
      ])
        .then(() => {
          console.log("Initial Firestore synchronization completed successfully.");
        })
        .catch((err) => {
          console.error("Error during Firestore initialization:", err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [isOffline, !!user]);

  // 2. Persistent side-effects
  React.useEffect(() => {
    if (user) {
      safeStorage.setItem('cp_user', JSON.stringify(user));
    } else {
      safeStorage.removeItem('cp_user');
    }
  }, [user]);

  React.useEffect(() => {
    safeStorage.setItem('cp_screen', activeScreen);
  }, [activeScreen]);

  React.useEffect(() => {
    safeStorage.setItem('cp_classes', JSON.stringify(classes));
  }, [classes]);

  React.useEffect(() => {
    safeStorage.setItem('cp_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  React.useEffect(() => {
    safeStorage.setItem('cp_notifications', JSON.stringify(notifications));
  }, [notifications]);

  React.useEffect(() => {
    safeStorage.setItem('cp_faculty_statuses', JSON.stringify(facultyStatuses));
  }, [facultyStatuses]);

  React.useEffect(() => {
    safeStorage.setItem('cp_accessibility', JSON.stringify(accessibility));
  }, [accessibility]);

  React.useEffect(() => {
    safeStorage.setItem('cp_enrollments', JSON.stringify(enrollments));
  }, [enrollments]);

  React.useEffect(() => {
    safeStorage.setItem('cp_announcements', JSON.stringify(announcements));
  }, [announcements]);

  // Automated Absence Alert Monitor: Flags students with 3+ consecutive unexcused absences in major subjects
  // and dispatches alert pings to assigned department chair and academic adviser
  React.useEffect(() => {
    if (classes.length === 0 || enrollments.length === 0 || attendanceRecords.length === 0) return;

    try {
      const alertedMap: Record<string, number> = JSON.parse(safeStorage.getItem('cp_consecutive_absence_alerts') || '{}');
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const newAlerts: AppNotification[] = [];
      const newDispatches: any[] = [];

      enrollments.forEach(enr => {
        if (enr.deletedByStudent) return;
        const matchedClass = classes.find(c => c.id === enr.classId);
        if (!matchedClass) return;

        // Filter attendance records for this student and class
        const studentRecords = attendanceRecords.filter(
          r => r.classId === enr.classId && 
          (r.studentId === enr.studentId || r.studentName === enr.studentName || (enr.studentEmail && r.studentEmail === enr.studentEmail))
        );

        // Sort descending by date
        const sorted = [...studentRecords].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        let consecutiveAbs = 0;
        for (const r of sorted) {
          if (r.status === 'absent') {
            consecutiveAbs++;
          } else if (r.status === 'excused') {
            continue;
          } else {
            break;
          }
        }

        if (consecutiveAbs >= 3) {
          const alertKey = `${enr.studentId || enr.studentName}_${matchedClass.id}_3abs`;
          const lastAlerted = alertedMap[alertKey] || 0;

          // Check if alerted within last 24 hours
          if (now - lastAlerted > ONE_DAY_MS) {
            alertedMap[alertKey] = now;

            const notif: AppNotification = {
              id: 'notif-3abs-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              title: `⚠️ 3 Consecutive Absences: ${enr.studentName || 'Student'}`,
              message: `Early Warning Policy: ${enr.studentName || 'Student'} has accumulated ${consecutiveAbs} consecutive unexcused absences in ${matchedClass.code} (${matchedClass.name}). Alert dispatched to Academic Adviser & Department Chair.`,
              timestamp: 'Just Now',
              type: 'alert',
              read: false
            };
            newAlerts.push(notif);

            const emailDispatch = {
              id: 'email-auto-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              studentId: enr.studentId || 'STU-OFFICIAL',
              studentName: enr.studentName || 'Student Candidate',
              studentEmail: enr.studentEmail || `${enr.studentId || 'student'}@msumain.edu.ph`,
              classCode: matchedClass.code,
              className: matchedClass.name,
              attendanceRate: Math.round(((sorted.filter(r => r.status === 'present' || r.status === 'late').length) / (sorted.length || 1)) * 100),
              advisorEmail: 'cics.academic.adviser@msumain.edu.ph',
              departmentChairEmail: 'cics.deptchair@msumain.edu.ph',
              dispatchedAt: new Date().toLocaleString(),
              status: 'Delivered',
              subject: `⚠️ AUTOMATED ATTENDANCE ALERT: 3 Consecutive Absences - ${enr.studentName} in ${matchedClass.code}`,
              body: `OFFICIAL MSU EARLY INTERVENTION NOTICE\n\nStudent: ${enr.studentName} (${enr.studentId || 'ID Pending'})\nSubject: ${matchedClass.code} - ${matchedClass.name}\nConsecutive Unexcused Absences: ${consecutiveAbs}\n\nNotice has been automatically routed to the Academic Adviser and Department Chair for immediate student counseling and intervention under MSU Academic Attendance Guidelines.`
            };
            newDispatches.push(emailDispatch);
          }
        }
      });

      if (newAlerts.length > 0) {
        safeStorage.setItem('cp_consecutive_absence_alerts', JSON.stringify(alertedMap));
        setNotifications(prev => [...newAlerts, ...prev]);

        const existingDispatches = JSON.parse(safeStorage.getItem('classpulse_dispatched_emails') || '[]');
        safeStorage.setItem('classpulse_dispatched_emails', JSON.stringify([...newDispatches, ...existingDispatches]));

        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(`⚠️ Automated Absence Monitor: ${newAlerts.length} student(s) flagged with 3+ consecutive absences. Alerts dispatched.`, "warning");
        }
      }
    } catch (e) {
      console.error("Error running automated absence monitor:", e);
    }
  }, [attendanceRecords, enrollments, classes]);

  // Automatically analyze and detect if non-maintenance rooms are occupied or available
  React.useEffect(() => {
    let changed = false;
    const normalized = labRooms.map(rm => {
      if (rm.status === 'maintenance') {
        return rm;
      }
      const isOccupied = rm.currentOccupancy > 0 || (typeof rm.activeClass === 'string' && rm.activeClass.trim() !== '');
      const correctStatus = isOccupied ? 'occupied' : 'available';
      if (rm.status !== correctStatus) {
        changed = true;
        return { ...rm, status: correctStatus };
      }
      return rm;
    });
    if (changed) {
      setLabRooms(normalized);
    }
  }, [labRooms]);

  React.useEffect(() => {
    safeStorage.setItem('cp_lab_rooms', JSON.stringify(labRooms));
  }, [labRooms]);

  // Track room status changes and send 'Room Status Alert' to faculty under schedule
  React.useEffect(() => {
    if (labRooms.length === 0) return;

    // A. Initialize prevLabRoomsRef on mounting
    if (Object.keys(prevLabRoomsRef.current).length === 0) {
      const initialMap: Record<string, 'occupied' | 'available' | 'maintenance'> = {};
      labRooms.forEach(rm => {
        initialMap[rm.id] = rm.status;
      });
      prevLabRoomsRef.current = initialMap;
      return;
    }

    // B. Check for status transitions
    labRooms.forEach(rm => {
      const prevStatus = prevLabRoomsRef.current[rm.id];
      if (prevStatus !== undefined && prevStatus !== rm.status) {
        // Find classes that are in this laboratory room
        const affectedClasses = classes.filter(cls => {
          const clsRoomLower = (cls.room || '').toLowerCase().trim();
          const rmNameLower = (rm.name || '').toLowerCase().trim();
          const tempRoomLower = cls.tempRoom ? cls.tempRoom.toLowerCase().trim() : '';

          return (
            rmNameLower.includes(clsRoomLower) ||
            clsRoomLower.includes(rmNameLower) ||
            (tempRoomLower && (rmNameLower.includes(tempRoomLower) || tempRoomLower.includes(rmNameLower)))
          );
        });

        if (affectedClasses.length > 0) {
          // Identify unique faculty members affected
          const uniqueFacultyMap = new Map<string, { id: string; name: string }>();
          affectedClasses.forEach(cls => {
            if (cls.facultyId) {
              uniqueFacultyMap.set(cls.facultyId, { id: cls.facultyId, name: cls.facultyName });
            }
          });

          uniqueFacultyMap.forEach((fac) => {
            const newNotif: AppNotification = {
              id: 'notif-room-alert-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
              title: `Room Alert: ${rm.name} Status Change`,
              message: `Attention Instructor ${fac.name}: The laboratory room "${rm.name}" assigned under your course schedule has been updated from "${prevStatus}" to "${rm.status}". Please adapt your physical terminal coordinates or syllabus if required.`,
              timestamp: 'Just Now',
              type: 'alert',
              read: false
            };

            setNotifications(prev => {
              if (prev.some(n => n.title === newNotif.title && n.message === newNotif.message)) {
                return prev;
              }
              return [newNotif, ...prev];
            });

            // Trigger real device pop-up screen notification & sound alarm
            triggerClassAlarmNotification({
              title: `🏢 Room Update: ${rm.name} is now ${rm.status.toUpperCase()}`,
              message: `Assigned course room "${rm.name}" changed from ${prevStatus} to ${rm.status}. Tap to view schedule.`,
              room: rm.name,
              type: 'room_change',
              screen: 'schedule'
            }).catch(() => {});

            speakText(`Push Alert: Laboratory room "${rm.name}" is now "${rm.status}".`, accessibility.readAloud);
            
            if (typeof window !== 'undefined' && (window as any).showToast) {
              (window as any).showToast(`Status Alert sent to faculty ${fac.name} for room ${rm.name}`, "info");
            }
          });
        }
      }
      prevLabRoomsRef.current[rm.id] = rm.status;
    });
  }, [labRooms, classes, accessibility.readAloud]);

  // Register Background Notification Service Worker on app load
  React.useEffect(() => {
    registerAlarmServiceWorker();
    
    // Auto-check system notification permission if enabled in preferences
    const scheduleAlarmsPref = safeStorage.getItem('cp_pref_schedule_alarms') !== 'false';
    if (scheduleAlarmsPref && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        requestSystemNotificationPermission().catch(() => {});
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Continuous background schedule alarm monitor (runs every 10s like a built-in alarm clock)
  React.useEffect(() => {
    const alarmsEnabled = safeStorage.getItem('cp_pref_schedule_alarms') !== 'false';
    if (!alarmsEnabled || !user) return;

    const runAlarmCheck = () => {
      checkActiveScheduleAlarms(classes, enrollments, user, (alarm: ClassAlarmPayload) => {
        const newNotif: AppNotification = {
          id: 'alarm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          title: alarm.title,
          message: alarm.message,
          timestamp: 'Just Now',
          type: alarm.type === 'late_warning' ? 'warning' : alarm.type === 'started' ? 'success' : 'info',
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(alarm.title, alarm.type === 'late_warning' ? 'warning' : 'success');
        }
      });
    };

    runAlarmCheck();
    const interval = setInterval(runAlarmCheck, 10000);
    return () => clearInterval(interval);
  }, [classes, enrollments, user]);

  // Listen to custom navigation events from notifications & service worker
  React.useEffect(() => {
    const handleNavEvent = (e: any) => {
      if (e.detail?.screen) {
        handleSetScreen(e.detail.screen);
      }
    };
    window.addEventListener('classpulse-navigate', handleNavEvent);
    return () => window.removeEventListener('classpulse-navigate', handleNavEvent);
  }, []);

  React.useEffect(() => {
    safeStorage.setItem('cp_offline', String(isOffline));
  }, [isOffline]);

  React.useEffect(() => {
    safeStorage.setItem('cp_offline_queue_count', String(offlineQueueCount));
  }, [offlineQueueCount]);

  // Global keyboard shortcuts for desktop & Windows users
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && user) {
        let targetScreen = '';
        switch ((e.key || '').toLowerCase()) {
          case 'd':
          case '1':
            targetScreen = 'dashboard';
            break;
          case 's':
          case '2':
            targetScreen = user.role === 'student' ? 'schedule' : 'schedule-editor';
            break;
          case 'a':
          case '3':
            targetScreen = user.role === 'student' ? 'attendance' : user.role === 'faculty' ? 'qr-generator' : 'rooms';
            break;
          case 'm':
          case '4':
            targetScreen = 'messages';
            break;
          case 'n':
          case '5':
            targetScreen = 'notifications';
            break;
          case 'p':
          case '6':
            targetScreen = 'profile';
            break;
          case 'o':
          case '7':
            targetScreen = 'settings';
            break;
          default:
            return;
        }

        if (targetScreen) {
          e.preventDefault();
          handleSetScreen(targetScreen);
          if (typeof window !== 'undefined' && (window as any).showToast) {
            (window as any).showToast(`HotKey Shortcut: Switched to ${targetScreen.toUpperCase()}!`, 'info');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user]);

  // Process offline attendance queue and auto-upload to Firestore when online
  const processOfflineQueueAndSync = React.useCallback(async () => {
    setIsSyncing(true);
    let pendingQueue: AttendanceRecord[] = [];
    try {
      pendingQueue = JSON.parse(safeStorage.getItem('cp_pending_attendance_queue') || '[]');
    } catch {}

    let uploadedCount = 0;
    if (pendingQueue.length > 0) {
      // Deduplicate queue items before sending to Firestore
      const dedupeMap = new Map<string, AttendanceRecord>();
      for (const rec of pendingQueue) {
        const key = `${rec.studentId || rec.studentName || 'anon'}_${rec.classId}_${rec.date}`;
        dedupeMap.set(key, rec);
      }
      const uniqueRecords = Array.from(dedupeMap.values());

      for (const rec of uniqueRecords) {
        try {
          await saveAttendanceToFirestore(false, rec);
          uploadedCount++;
        } catch (err) {
          console.error("Failed to upload pending offline attendance record:", rec, err);
        }
      }
      safeStorage.removeItem('cp_pending_attendance_queue');
      setOfflineQueueCount(0);
    }

    try {
      await forceResyncAllFromFirestore(false, {
        onClassesSync: (fetchedClasses) => setClasses(fetchedClasses),
        onAttendanceSync: (fetchedRecords) => setAttendanceRecords(fetchedRecords)
      });
    } catch (err) {
      console.warn("Error force-resyncing Firestore:", err);
    }

    setIsSyncing(false);
    setSyncDoneBanner(true);
    setTimeout(() => setSyncDoneBanner(false), 3800);

    const messageStr = uploadedCount > 0
      ? `Auto-Uploaded ${uploadedCount} offline attendance scan(s) to Firestore cloud database!`
      : 'All offline local records successfully synchronized with Firestore cloud registry.';

    const syncNotif: AppNotification = {
      id: 'notif-autosync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      title: 'Database Auto-Synchronized',
      message: messageStr,
      timestamp: 'Just Now',
      type: 'success',
      read: false
    };
    setNotifications(prev => [syncNotif, ...prev]);
    speakText(messageStr, accessibility.readAloud);
  }, [accessibility.readAloud]);

  // Window network event listener for auto reconnection upload
  React.useEffect(() => {
    const handleWindowOnline = () => {
      console.log("[Network] Device came back online! Triggering automatic queue upload & sync...");
      setIsOffline(false);
      processOfflineQueueAndSync();
    };

    window.addEventListener('online', handleWindowOnline);
    return () => window.removeEventListener('online', handleWindowOnline);
  }, [processOfflineQueueAndSync]);

  // Periodic automatic silent background sync when online (no manual clicking needed)
  React.useEffect(() => {
    if (isOffline) return;
    const interval = setInterval(() => {
      let pendingQueue: AttendanceRecord[] = [];
      try {
        pendingQueue = JSON.parse(safeStorage.getItem('cp_pending_attendance_queue') || '[]');
      } catch {}
      if (pendingQueue.length > 0) {
        processOfflineQueueAndSync();
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [isOffline, processOfflineQueueAndSync]);

  // Synchronize when offline state is flipped back to online
  const handleToggleOffline = () => {
    if (isOffline) {
      setIsOffline(false);
      speakText("Restoring network link. Auto-uploading offline attendance scans to cloud.", accessibility.readAloud);
      processOfflineQueueAndSync();
    } else {
      setIsOffline(true);
      speakText("Network connection paused. Offline QR scanning mode active.", accessibility.readAloud);
    }
  };

  const filteredNotificationsForMe = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') {
      return notifications;
    }
    if (user.role === 'faculty') {
      return notifications.filter(n => {
        if (n.id && n.id.startsWith('notif-room-alert-')) {
          return true;
        }

        const isFacultyStatusUpdate = 
          /status updated/i.test(n.title) ||
          /status updated/i.test(n.message) ||
          /unavailable|available|teaching|consultation/i.test(n.title) ||
          /unavailable|available|teaching|consultation/i.test(n.message);
        
        if (isFacultyStatusUpdate) return false;

        const isStudentAttendanceWarning = 
          n.type === 'warning' || 
          n.type === 'alert' || 
          /absent|late|attendance|warning|alert/i.test(n.title) || 
          /absent|late|attendance|warning|alert/i.test(n.message);

        const isAdminAnnouncement = 
          n.type === 'info' || 
          /announcement|notice|circular|admin/i.test(n.title) || 
          /announcement|notice|circular|admin/i.test(n.message) ||
          n.senderRole === 'admin';

        return isStudentAttendanceWarning || isAdminAnnouncement;
      });
    }
    return notifications;
  }, [notifications, user]);
 
  // Auth operations
  const getRegisteredUserByEmail = (emailStr?: string) => {
    if (!emailStr) return null;
    try {
      const registeredUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
      return registeredUsers.find((u: any) => u.email && emailStr && u.email.toLowerCase() === emailStr.toLowerCase().trim());
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleLoginSuccess = (role: Role, name?: string, email?: string) => {
    let profile: UserProfile;
    const currentFbUser = auth.currentUser;
    const registered = getRegisteredUserByEmail(email);
    let resolvedId = (currentFbUser && !currentFbUser.isAnonymous && currentFbUser.email?.toLowerCase() === email?.toLowerCase())
      ? currentFbUser.uid
      : (registered?.id || 'usr-' + Math.random().toString(36).substring(2, 9));

    if (role === 'admin') {
      if (email?.toLowerCase().trim() === 'admin@msu.edu.ph') {
        resolvedId = 'admin-01';
      } else {
        resolvedId = registered?.uid || registered?.id || 'admin-' + Math.random().toString(36).substring(2, 7);
      }
    }

    if (role === 'student') {
      profile = {
        id: resolvedId,
        name: name || registered?.name || 'New Student',
        email: email || registered?.email || '',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        studentId: registered?.uid || '2023-' + Math.floor(10000 + Math.random() * 90000),
        department: registered?.department || 'CCS Department',
        bio: 'Registered securely via ClassPulse.'
      };
    } else if (role === 'faculty') {
      profile = {
        id: resolvedId,
        name: name || registered?.name || 'New Faculty',
        email: email || registered?.email || '',
        role: 'faculty',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
        facultyId: registered?.uid || 'FAC-' + Math.floor(10000 + Math.random() * 90000),
        department: registered?.department || 'College of Computer Studies',
        bio: 'Registered securely via ClassPulse.'
      };
    } else {
      profile = {
        id: resolvedId,
        name: name || registered?.name || 'New Admin',
        email: email || registered?.email || '',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        department: registered?.department || 'Academic Registrar Board',
        bio: 'Registered securely via ClassPulse.'
      };
    }
 
    const normalizedProfile = normalizeUserIdentity(profile);
    setUser(normalizedProfile);
    saveUserProfileToFirestore(false, normalizedProfile).catch(err => console.error("Firestore user profile error:", err));
    setActiveScreen('dashboard');
    speakText(`Welcome to ClassPulse. Successfully loaded your ${role} dashboard.`, accessibility.readAloud);
  };
 
  const handleLogout = () => {
    setUser(null);
    setActiveScreen('dashboard');
    safeStorage.removeItem('cp_user');
    safeStorage.removeItem('cp_pending_attendance_queue');
    safeStorage.removeItem('cp_offline_queue_count');
    safeStorage.removeItem('classpulse_active_session_token');
    
    // Privacy protection on public/shared computer lab terminals
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch (e) {}
    }
  };

  const getBottomNavItems = () => {
    if (!user) return [];
    switch (user.role) {
      case 'student':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'schedule', label: 'Schedule', icon: CalendarDays },
          { id: 'attendance', label: 'QR Scan', icon: Scan },
          { id: 'messages', label: 'Messages', icon: MessageSquare },
          { id: 'menu_toggle', label: 'Menu', icon: Menu }
        ];
      case 'faculty':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'schedule-editor', label: 'Classes', icon: CalendarDays },
          { id: 'qr-generator', label: 'QR Code', icon: Scan },
          { id: 'excuse-inbox', label: 'Excuses', icon: Inbox },
          { id: 'menu_toggle', label: 'Menu', icon: Menu }
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'schedule-editor', label: 'Schedules', icon: CalendarDays },
          { id: 'profile', label: 'Profile', icon: UserCircle },
          { id: 'menu_toggle', label: 'Menu', icon: Menu }
        ];
    }
  };

  // Student logs attendance via QR code simulation scan
  const handleRecordAttendance = (classId: string, status: 'present' | 'late') => {
    const matchedClass = classes.find(c => c.id === classId);
    if (!matchedClass) return;

    // A. AUTOMATIC ENROLLMENT SERVICE INTERCEPTOR
    const existingEnrollment = enrollments.find(
      e => e.classId === classId && (e.studentId === user?.studentId || e.studentEmail === user?.email)
    );

    if (existingEnrollment) {
      if (existingEnrollment.deletedByStudent) {
        // Automatically restore!
        setEnrollments(prev => prev.map(e => {
          if (e.id === existingEnrollment.id) {
            return { ...e, deletedByStudent: false };
          }
          return e;
        }));
        
        const restoreNotif: AppNotification = {
          id: 'notif-restore-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          title: 'Class Enrollment Restored',
          message: `QR Scan success: Restored your active enrollment for ${matchedClass.code} (${matchedClass.name}) and connected your attend record history cleanly!`,
          timestamp: 'Just Now',
          type: 'success',
          read: false
        };
        setNotifications(prev => [restoreNotif, ...prev]);
        speakText(`Resumed class enrollment for ${matchedClass.name}`, accessibility.readAloud);
      }
    } else if (user && user.role === 'student') {
      const newEnrolID = 'enr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      const newEnrollmentRecord: Enrollment = {
        id: newEnrolID,
        studentId: user.studentId || '2023-10492',
        studentName: user.name,
        studentEmail: user.email,
        studentAvatar: user.avatar,
        classId: classId,
        enrolledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setEnrollments(prev => [...prev, newEnrollmentRecord]);

      // Trigger educational success toast
      const automaticNotif: AppNotification = {
        id: 'notif-autoenr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        title: 'Auto-Enrolled in Subject',
        message: `System scan verified: You were not joined in ${matchedClass.code} (${matchedClass.name}). Automatically created student enrollment ledger record in system table successfully!`,
        timestamp: 'Just Now',
        type: 'success',
        read: false
      };
      setNotifications(prev => [automaticNotif, ...prev]);
      speakText(`Auto-registered course registration for ${matchedClass.name}`, accessibility.readAloud);
    }

    // B. LOG ATTENDANCE LOG (With Deduplication protection)
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayISO = new Date().toISOString().split('T')[0];
    const studentIdentifier = user?.studentId || user?.id || user?.email || '2023-10492';

    let finalRecord: AttendanceRecord;
    const existingIndex = attendanceRecords.findIndex(
      r => r.classId === classId && (r.studentId === studentIdentifier || r.studentName === user?.name) && r.date === todayISO
    );

    if (existingIndex >= 0) {
      finalRecord = {
        ...attendanceRecords[existingIndex],
        time: timeString,
        status,
        className: matchedClass.name,
        classCode: matchedClass.code
      };
      setAttendanceRecords(prev => prev.map((r, idx) => idx === existingIndex ? finalRecord : r));
    } else {
      finalRecord = {
        id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        classId,
        className: matchedClass.name,
        classCode: matchedClass.code,
        date: todayISO,
        time: timeString,
        status,
        role: 'student',
        studentName: user?.name || 'John Doe',
        studentId: studentIdentifier
      };
      setAttendanceRecords(prev => [...prev, finalRecord]);
    }

    const isCurrentlyOffline = isOffline || (typeof navigator !== 'undefined' && !navigator.onLine);

    if (isCurrentlyOffline) {
      let pendingQueue: AttendanceRecord[] = [];
      try {
        pendingQueue = JSON.parse(safeStorage.getItem('cp_pending_attendance_queue') || '[]');
      } catch {}
      
      // Deduplicate offline queue by student + class + date
      const queueIdx = pendingQueue.findIndex(
        q => q.classId === classId && (q.studentId === studentIdentifier || q.studentName === user?.name) && q.date === todayISO
      );
      if (queueIdx >= 0) {
        pendingQueue[queueIdx] = finalRecord;
      } else {
        pendingQueue.push(finalRecord);
      }

      safeStorage.setItem('cp_pending_attendance_queue', JSON.stringify(pendingQueue));
      setOfflineQueueCount(pendingQueue.length);

      const offlineNotif: AppNotification = {
        id: 'notif-offline-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        title: 'Offline Attendance Cached',
        message: `Saved QR scan for ${matchedClass.code} (${status.toUpperCase()}) in local queue. Will automatically upload to Firestore database once reconnected online!`,
        timestamp: 'Just Now',
        type: 'info',
        read: false
      };
      setNotifications(prev => [offlineNotif, ...prev]);
    } else {
      saveAttendanceToFirestore(false, finalRecord).catch(err => console.error("Firestore save attendance error:", err));
    }

    // Send warning if late, else success
    const alertType = status === 'late' ? 'warning' : 'success';
    const msg = status === 'late' 
      ? `Recorded attendance for ${matchedClass.code} at ${timeString} marked as late.`
      : `Checked into ${matchedClass.code} successfully as present.`;

    // Automatically set the instructor of this class to 'in-class' status
    const facName = matchedClass.facultyName;
    const facId = matchedClass.facultyId;
    setFacultyStatuses(prev => {
      const hasMatch = prev.some(f => (facId && f.id === facId) || (facName && (f.name || '').toLowerCase() === facName.toLowerCase()) || f.id === 'fac-1');
      if (hasMatch) {
        return prev.map(f => ((facId && f.id === facId) || (facName && (f.name || '').toLowerCase() === facName.toLowerCase()) || (f.id === 'fac-1' && !facId && !facName)) ? { ...f, status: 'in-class' } : f);
      } else if (facName || facId) {
        return [
          {
            id: facId || 'fac-dyn-' + Date.now(),
            name: facName || 'Faculty Instructor',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
            status: 'in-class',
            room: matchedClass.room || 'Room 303'
          },
          ...prev
        ];
      }
      return prev;
    });

    const newNotif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      title: status === 'late' ? 'Checked in late' : 'Checked In successfully',
      message: msg,
      timestamp: 'Just Now',
      type: alertType,
      read: false
    };

    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleDropSubject = (classId: string) => {
    setEnrollments(prev => prev.map(e => {
      if (e.classId === classId && (e.studentId === user?.studentId || e.studentEmail === user?.email)) {
        return { ...e, deletedByStudent: true };
      }
      return e;
    }));
    
    const dropNotif: AppNotification = {
      id: 'notif-drop-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      title: 'Subject Removed',
      message: `You dropped your local registration for this class. Note that your official register logs and attendance records with the Faculty remains fully unchanged and secure.`,
      timestamp: 'Just Now',
      type: 'warning',
      read: false
    };
    setNotifications(prev => [dropNotif, ...prev]);
    speakText("Subject removed from student dashboard. Faculty record remains unaffected.", accessibility.readAloud);
  };

  const handleEnrollSubject = (classId: string) => {
    const matchedClass = classes.find(c => c.id === classId);
    if (!matchedClass) return;

    const existingEnrollment = enrollments.find(
      e => e.classId === classId && (e.studentId === user?.studentId || e.studentEmail === user?.email)
    );

    if (existingEnrollment) {
      if (existingEnrollment.deletedByStudent) {
        setEnrollments(prev => prev.map(e => {
          if (e.id === existingEnrollment.id) {
            return { ...e, deletedByStudent: false };
          }
          return e;
        }));
        
        const restoreNotif: AppNotification = {
          id: 'notif-restore-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          title: 'Class Enrollment Restored',
          message: `Subject Restored: You resumed your active enrollment for ${matchedClass.code} (${matchedClass.name}) and connected your previous attendance records history successfully!`,
          timestamp: 'Just Now',
          type: 'success',
          read: false
        };
        setNotifications(prev => [restoreNotif, ...prev]);
        speakText(`Resumed class enrollment for ${matchedClass.name}`, accessibility.readAloud);
      }
    } else if (user && user.role === 'student') {
      const newEnrolID = 'enr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      const newEnrollmentRecord: Enrollment = {
        id: newEnrolID,
        studentId: user.studentId || '2023-10492',
        studentName: user.name,
        studentEmail: user.email,
        studentAvatar: user.avatar,
        classId: classId,
        enrolledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setEnrollments(prev => [...prev, newEnrollmentRecord]);

      const automaticNotif: AppNotification = {
        id: 'notif-autoenr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        title: 'Subject Registered Successfully',
        message: `Course Joined: You joined ${matchedClass.code} (${matchedClass.name}). Your attendance will now be tracked actively in the system.`,
        timestamp: 'Just Now',
        type: 'success',
        read: false
      };
      setNotifications(prev => [automaticNotif, ...prev]);
      speakText(`Registered course enrollment for ${matchedClass.name}`, accessibility.readAloud);
    }
  };

  // Profile Update callback - ensures propagation to enrollments globally
  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setUser(updatedProfile);
    saveUserProfileToFirestore(false, updatedProfile).catch(err => console.error("Firestore update profile error:", err));

    // Update the local enrollments list matching this student IDs
    setEnrollments(prev => prev.map(e => {
      if (e.studentId === updatedProfile.studentId || e.studentEmail === updatedProfile.email) {
        return {
          ...e,
          studentName: updatedProfile.name,
          studentEmail: updatedProfile.email,
          studentAvatar: updatedProfile.avatar
        };
      }
      return e;
    }));

    // If faculty, update faculty statuses array
    if (updatedProfile.role === 'faculty') {
      setFacultyStatuses(prev => prev.map(f => {
        if (f.id === updatedProfile.facultyId || f.name === user?.name) {
          return {
            ...f,
            name: updatedProfile.name,
            avatar: updatedProfile.avatar
          };
        }
        return f;
      }));
    }

    speakText("Profile details persisted and propagated", accessibility.readAloud);
  };

  // Faculty Actions: Add Class
  const handleAddClass = (newClass: Omit<ClassSession, 'id'>) => {
    const freshClass: ClassSession = {
      ...newClass,
      days: sanitizeDays(newClass.days),
      id: 'class-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    };
    setClasses(prev => [freshClass, ...prev]);
    saveClassToFirestore(false, freshClass).catch(err => console.error("Firestore add class error:", err));

    // Add alert
    const newNotif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      title: 'Class schedule added',
      message: `Course ${freshClass.code} - ${freshClass.name} added to visual registries.`,
      timestamp: 'Just Now',
      type: 'success',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Faculty Actions: Edit Class
  const handleEditClass = (updatedClass: ClassSession) => {
    const existingClass = classes.find(c => c.id === updatedClass.id);
    const sanitizedClass = {
      ...updatedClass,
      days: sanitizeDays(updatedClass.days)
    };

    if (existingClass) {
      const roomChanged = existingClass.room !== sanitizedClass.room;
      const timeChanged = existingClass.startTime !== sanitizedClass.startTime || existingClass.endTime !== sanitizedClass.endTime;

      if (roomChanged || timeChanged) {
        const changeDesc = roomChanged && timeChanged
          ? `Room location updated to "${sanitizedClass.room}" & time adjusted to ${sanitizedClass.startTime} - ${sanitizedClass.endTime}`
          : roomChanged
          ? `Room location updated to "${sanitizedClass.room}"`
          : `Class schedule time updated to ${sanitizedClass.startTime} - ${sanitizedClass.endTime}`;

        const pushNotif: AppNotification = {
          id: 'notif-push-room-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          title: `📢 Push Alert: ${sanitizedClass.code} Schedule/Room Changed`,
          message: `Attention Students of ${sanitizedClass.name} (${sanitizedClass.code}): ${changeDesc}. Please take note of these new room/time coordinates!`,
          timestamp: 'Just Now',
          type: 'alert',
          read: false
        };

        setNotifications(prev => [pushNotif, ...prev]);
        speakText(`Push Alert: Schedule or room changed for ${sanitizedClass.code}. ${changeDesc}`, accessibility.readAloud);
        
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(`📢 Instant Push Alert dispatched to students for ${sanitizedClass.code}!`, "info");
        }
      }
    }

    setClasses(prev => prev.map(c => c.id === sanitizedClass.id ? sanitizedClass : c));
    saveClassToFirestore(false, sanitizedClass).catch(err => console.error("Firestore edit class error:", err));
  };

  // Faculty Actions: Delete Class
  const handleDeleteClass = (classId: string) => {
    const classToDelete = classes.find(c => c.id === classId);
    
    setClasses(prev => prev.filter(c => c.id !== classId));
    setEnrollments(prev => prev.filter(e => e.classId !== classId));
    setAttendanceRecords(prev => prev.filter(ar => ar.classId !== classId));
    setExcuseLetters(prev => prev.filter(el => el.classId !== classId));

    if (classToDelete) {
      setLabRooms(prev => prev.map(rm => {
        if (rm.activeClass === classToDelete.code || rm.activeClass === classToDelete.name) {
          return {
            ...rm,
            status: 'available',
            currentOccupancy: 0,
            activeClass: ''
          };
        }
        return rm;
      }));
    }

    deleteClassFromFirestore(false, classId).catch(err => console.error("Firestore delete class error:", err));
  };

  // Admin Action: Hard Reset & System Purge
  const handleResetSystem = async () => {
    // 1. Wipe local state immediately for visual responsiveness
    setClasses([]);
    setAttendanceRecords([]);
    setNotifications([]);
    setEnrollments([]);
    setExcuseLetters([]);
    setAnnouncements([]);
    setFacultyStatuses([]);

    // 2. Clear LocalStorage caches completely
    safeStorage.removeItem('cp_classes');
    safeStorage.removeItem('cp_records');
    safeStorage.removeItem('cp_notifications');
    safeStorage.removeItem('cp_faculty_statuses');
    safeStorage.removeItem('classpulse_student_leaves');
    safeStorage.removeItem('cp_enrollments');
    safeStorage.removeItem('cp_announcements');
    safeStorage.removeItem('classpulse_registered_users');
    safeStorage.removeItem('classpulse_registered_admins');
    safeStorage.removeItem('classpulse_custom_passwords');
    safeStorage.removeItem('classpulse_password_reset_requests');

    // 3. Dispatch storage sync events so listening components reload state
    window.dispatchEvent(new Event('registered-users-changed'));
    window.dispatchEvent(new Event('registered-admins-changed'));
    window.dispatchEvent(new Event('password-reset-requests-changed'));

    // 4. Force user logout
    handleLogout();

    // 5. System reset completed locally
    console.log("Local system caches successfully purged.");
  };

  // Cascade laboratory/room deletion to classes
  const handleUpdateLabRooms = (updatedRooms: LabRoom[]) => {
    setLabRooms(updatedRooms);
    const deletedRooms = labRooms.filter(oldRm => !updatedRooms.some(newRm => newRm.id === oldRm.id));
    if (deletedRooms.length > 0) {
      const deletedRoomNames = deletedRooms.map(r => r.name);
      setClasses(prev => prev.map(c => {
        if (deletedRoomNames.includes(c.room)) {
          return { ...c, room: 'TBA' };
        }
        return c;
      }));
    }
  };

  // Faculty Actions: Change Consultation availability Status
  const handleChangeFacultyStatus = (status: 'available' | 'in-class' | 'unavailable') => {
    if (!user) return;
    
    const targetId = user.facultyId || user.id || 'fac-01';
    const updatedStatusObj: FacultyStatus = {
      id: targetId,
      name: user.name,
      avatar: user.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
      status: status,
      room: 'Consultation Office 303'
    };

    // Update local statuses array (so students see this changed status in real-time!)
    setFacultyStatuses(prev => {
      const exists = prev.some(f => f.name === user.name || f.id === targetId || f.id === 'fac-1' || f.id === 'fac-01');
      if (exists) {
        return prev.map(f => (f.name === user.name || f.id === targetId || f.id === 'fac-1' || f.id === 'fac-01') ? { ...f, status, name: user.name, avatar: user.avatar || f.avatar } : f);
      } else {
        return [updatedStatusObj, ...prev];
      }
    });

    // Save to Firestore so student dashboard and all devices receive it in real-time
    saveFacultyStatusToFirestore(isOffline, updatedStatusObj).catch(err => console.error("Firestore save faculty status error:", err));

    const statusLabels = {
      available: 'Available',
      'in-class': 'In Class',
      unavailable: 'Away'
    };
    const notifTitle = `Status updated to ${statusLabels[status]}`;
    const statusMessages = {
      available: `${user.name} is now available in Consultation Office.`,
      'in-class': `${user.name} is currently teaching a section.`,
      unavailable: `${user.name} was marked as away / unavailable.`
    };

    const newNotif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      title: notifTitle,
      message: statusMessages[status],
      timestamp: 'Just Now',
      type: 'info',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Shared Attendance Correction Action
  const handleUpdateAttendanceRecord = (recordId: string, status: 'present' | 'late' | 'absent' | 'excused') => {
    setAttendanceRecords(prev => prev.map(rec => rec.id === recordId ? { ...rec, status } : rec));
    
    // Find record context for logging
    const target = attendanceRecords.find(r => r.id === recordId);
    if (target) {
      const updatedRec = { ...target, status };
      saveAttendanceToFirestore(false, updatedRec).catch(err => console.error("Firestore update attendance error:", err));

      const newNotif: AppNotification = {
        id: 'notif-corr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        title: 'Attendance Corrected',
        message: `Status corrected: Student ${target.studentName || 'Record'} is now marked as ${status.toUpperCase()} in ${target.classCode}.`,
        timestamp: 'Just Now',
        type: 'info',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const handleAddAttendanceRecord = (newRec: Omit<AttendanceRecord, 'id'>) => {
    const record: AttendanceRecord = {
      ...newRec,
      id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    };
    setAttendanceRecords(prev => [...prev, record]);
    saveAttendanceToFirestore(false, record).catch(err => console.error("Firestore add attendance error:", err));
  };

  // Shared Excuse Application Action (Filed by student)
  const handleAddExcuseLetter = (newReq: LeaveRequest) => {
    setExcuseLetters(prev => [newReq, ...prev.filter(l => l.id !== newReq.id)]);
    safeStorage.setItem('classpulse_student_leaves', JSON.stringify([newReq, ...excuseLetters.filter(l => l.id !== newReq.id)]));
    saveExcuseLetterToFirestore(isOffline, newReq).catch(err => console.error("Firestore save excuse error:", err));

    const newNotif: AppNotification = {
      id: 'notif-exc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      title: 'Excuse Letter Filed',
      message: `Excuse application (${newReq.id}) for ${newReq.className || 'Class'} was submitted for faculty review.`,
      timestamp: 'Just Now',
      type: 'info',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Shared Excuse Status validation Action (Reviewed by faculty)
  const handleUpdateExcuseStatus = (id: string, status: 'pending' | 'valid' | 'invalid' | 'approved' | 'rejected') => {
    const finalStatus = status === 'approved' || status === 'valid' ? 'valid' : status === 'rejected' || status === 'invalid' ? 'invalid' : 'pending';
    let updatedExcuseObj: LeaveRequest | undefined;

    setExcuseLetters(prev => prev.map(ex => {
      if (ex.id === id) {
        updatedExcuseObj = { ...ex, status: finalStatus as any };
        return updatedExcuseObj;
      }
      return ex;
    }));

    const target = updatedExcuseObj || excuseLetters.find(e => e.id === id);
    if (target) {
      const persistedExcuse: LeaveRequest = { ...target, status: finalStatus as any };
      saveExcuseLetterToFirestore(isOffline, persistedExcuse).catch(err => console.error("Firestore save updated excuse error:", err));

      // If approved/valid, auto-update the student's attendance records to 'excused'
      if (finalStatus === 'valid') {
        const targetStartDate = target.startDate || (target.createdAt ? target.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
        const targetEndDate = target.endDate || targetStartDate;

        setAttendanceRecords(prev => {
          let updatedAny = false;
          const updatedList = prev.map(rec => {
            const isMatchingStudent = (rec.studentId && rec.studentId === target.studentId) || (rec.studentName && rec.studentName === target.studentName);
            const isMatchingClass = rec.classId === target.classId;
            const isWithinDateRange = rec.date >= targetStartDate && rec.date <= targetEndDate;

            if (isMatchingStudent && isMatchingClass && isWithinDateRange) {
              updatedAny = true;
              const excusedRec: AttendanceRecord = { ...rec, status: 'excused' };
              saveAttendanceToFirestore(false, excusedRec).catch(err => console.error("Firestore excused sync error:", err));
              return excusedRec;
            }
            return rec;
          });

          // If no existing record was found on the excused date, create a new excused record
          if (!updatedAny) {
            const classObj = classes.find(c => c.id === target.classId);
            const newExcusedRecord: AttendanceRecord = {
              id: 'rec-exc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
              classId: target.classId,
              className: target.className || classObj?.name || 'Class Session',
              classCode: classObj?.code || 'CRS',
              date: targetStartDate,
              time: '08:00 AM',
              status: 'excused',
              role: 'student',
              studentName: target.studentName,
              studentId: target.studentId,
              isSynced: false
            };
            saveAttendanceToFirestore(false, newExcusedRecord).catch(err => console.error("Firestore new excused sync error:", err));
            return [...updatedList, newExcusedRecord];
          }

          return updatedList;
        });

        const newNotif: AppNotification = {
          id: 'notif-exced-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          title: 'Excuse Approved & Record Excused',
          message: `Excuse Letter approved for ${target.studentName} in ${target.className}. Attendance record for ${targetStartDate} marked as EXCUSED (clearing unexcused absences).`,
          timestamp: 'Just Now',
          type: 'success',
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
        speakText(`Excuse letter approved for ${target.studentName}. Attendance record has been updated to excused.`, accessibility.readAloud);
      } else {
        const newNotif: AppNotification = {
          id: 'notif-exced-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          title: 'Excuse Decision Logged',
          message: `Excuse Letter ${id} (Student: ${target.studentName}) marked as ${finalStatus.toUpperCase()}.`,
          timestamp: 'Just Now',
          type: finalStatus === 'invalid' ? 'alert' : 'info',
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
      }
    }
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    speakText("Cleared all notifications", accessibility.readAloud);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    speakText("Marked all notifications as read", accessibility.readAloud);
  };

  // Clean, high density layout container matching Obsidian ClassPulse vibe
  const getThemeClass = (theme: 'light' | 'dark') => {
    switch (theme) {
      case 'light':
        return 'bg-zinc-50 text-zinc-900 font-sans tracking-tight min-h-screen selection:bg-emerald-500 selection:text-white transition-colors duration-300 relative';
      default:
        return 'bg-[#09090b] text-zinc-100 font-sans min-h-screen selection:bg-emerald-500 selection:text-black transition-colors duration-300 relative';
    }
  };

  return (
    <div 
      id="app-root-level-wrapper"
      className={`${getThemeClass(accessibility.theme)} theme-accent-${colorAccent} ${
        viewDensity === 'compact' 
          ? 'density-compact app-compact-mode' 
          : viewDensity === 'spacious' 
            ? 'density-spacious' 
            : 'density-comfortable'
      } trans-all-theme`}
    >
      
      {/* 1. AUTHENTICATOR ENVELOPE */}
      {!user ? (
        <AuthScreens 
          onLoginSuccess={handleLoginSuccess} 
          accessibility={accessibility} 
        />
      ) : (
        /* ================= FULL PAGE SERVICE GRID ================= */
        <div className="flex flex-col md:flex-row h-screen overflow-hidden">
          
          {/* Responsive Sidebar */}
          <Sidebar
            role={user.role}
            activeScreen={activeScreen}
            setScreen={handleSetScreen}
            onLogout={handleLogout}
            userName={user.name}
            userAvatar={user.avatar}
            unreadNotifications={filteredNotificationsForMe.filter(n => !n.read).length}
            unreadMessages={(() => {
              try {
                const cached = localStorage.getItem('cp_chat_messages_v2');
                const myId = user.role === 'student' 
                  ? (user.studentId || '2023-10492') 
                  : user.role === 'faculty' 
                    ? (user.facultyId || 'fac-1') 
                    : (user.id || 'admin-01');
                
                let msgs = [];
                if (cached) {
                  msgs = JSON.parse(cached);
                } else {
                  msgs = [
                    {
                      id: 'msg-seed-1',
                      senderId: 'fac-1',
                      senderName: 'Dr. Ahmad Khan',
                      senderRole: 'faculty',
                      receiverId: '2023-10492',
                      receiverName: 'John Doe',
                      message: 'Hello class, welcome to MSU Academic Portal! Here are the slides for session #1.',
                      timestamp: '10:00 AM',
                      read: false
                    },
                    {
                      id: 'msg-seed-2',
                      senderId: '2023-10492',
                      senderName: 'John Doe',
                      senderRole: 'student',
                      receiverId: 'CS-101',
                      receiverName: 'Introduction to Computer Science',
                      message: 'Has anyone finished compiling the web component blueprint?',
                      timestamp: '10:05 AM',
                      read: true
                    },
                    {
                      id: 'msg-seed-3',
                      senderId: 'sys-pulse',
                      senderName: 'System Pulse Bot',
                      senderRole: 'admin',
                      receiverId: 'CS-101',
                      receiverName: 'Introduction to Computer Science',
                      message: 'Welcome everyone to the channel! Here is our syllabus for this term. Please review.',
                      timestamp: '10:06 AM',
                      attachmentFile: { name: 'CS101_Syllabus_Revised.pdf', size: '1.4 MB' },
                      read: true
                    },
                    {
                      id: 'msg-seed-4',
                      senderId: 'fac-2',
                      senderName: 'Prof. Maria Santos',
                      senderRole: 'faculty',
                      receiverId: '2023-10492',
                      receiverName: 'John Doe',
                      message: 'Please review the exam guidelines before Friday morning.',
                      timestamp: '10:14 AM',
                      read: false
                    }
                  ];
                }
                
                return msgs.filter((m: any) => {
                  if (m.senderId === myId) return false;
                  if (m.read) return false;
                  if (m.receiverId === myId) return true;
                  if (m.receiverId === 'CS-101' && user.role === 'student') return true;
                  return false;
                }).length;
              } catch (e) {
                return 0;
              }
            })()}
            pendingExcuseCount={excuseLetters.filter(e => e.status === 'pending').length}
            accessibility={accessibility}
          />

          {/* Primary View Workspace */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
            
            {/* Top Offline Mode / Sync Persistent Banner */}
            {isOffline && (
              <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 px-3 sm:px-6 py-1.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shrink-0 font-medium z-20">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 shrink-0">Offline Mode Active</span>
                  <span className="hidden md:inline text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                    Attendance QR scans safely queued in local cache — will automatically upload to Firestore upon reconnecting.
                  </span>
                  {offlineQueueCount > 0 && (
                    <span className="bg-amber-500 text-black font-extrabold text-[10px] px-2 py-0.5 rounded-full shrink-0 shadow-xs">
                      {offlineQueueCount} queued
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleToggleOffline}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition-all cursor-pointer shrink-0 ml-2 shadow-xs"
                >
                  Go Online
                </button>
              </div>
            )}

            {/* Top Operational bar - Applies to all screen sizes including mobile */}
            <header className={`flex px-2.5 sm:px-6 py-2 sm:py-2.5 items-center justify-between gap-2 sm:gap-4 shrink-0 border-b border-zinc-200/80 dark:border-zinc-850/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md text-zinc-900 dark:text-zinc-100 relative ${
              isSearchOpen ? 'z-[100]' : 'z-30'
            }`}>
              
              {/* Left Header Logo & Role display */}
              <div className={`items-center gap-2 sm:gap-3 text-left shrink-0 transition-all duration-300 ${
                isSearchOpen ? 'hidden sm:flex' : 'flex'
              }`}>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-bold shadow-md shadow-emerald-500/10">
                  <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 hidden sm:inline">ClassPulse</span>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border shadow-2xs ${
                  user.role === 'student' ? 'bg-[#03213D] text-white border-[#03213D]/20' :
                  user.role === 'faculty' ? 'bg-emerald-600 text-white border-emerald-500/20' :
                  'bg-[#CC762A] text-white border-[#CC762A]/20'
                }`}>
                  {user.role === 'student' ? 'Student' : user.role === 'faculty' ? 'Faculty' : 'Admin'}
                </span>
              </div>

              {/* Header Search & Filter Bar */}
              <div 
                ref={searchContainerRef} 
                className={`transition-all duration-300 mx-1.5 sm:mx-2 relative z-[100] ${
                  isSearchOpen 
                    ? 'w-full max-w-full sm:max-w-sm md:max-w-md' 
                    : 'flex-1 max-w-xs sm:max-w-sm md:max-w-md'
                }`}
              >
                <div className="relative flex items-center z-[100] gap-2">
                  <div className="relative flex-1 flex items-center">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none shrink-0" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchOpen(true);
                        setIsMobileBarVisible(false);
                      }}
                      onFocus={() => {
                        setIsSearchOpen(true);
                        setIsMobileBarVisible(false);
                      }}
                      className="w-full pl-8 pr-7 py-1.5 sm:py-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/70 backdrop-blur-md text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-zinc-950 transition-all outline-none placeholder:text-zinc-400"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <kbd className="hidden sm:inline-block absolute right-2 px-1 py-0.2 text-[9px] font-mono font-bold text-zinc-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-2xs pointer-events-none">
                        ⌘K
                      </kbd>
                    )}
                  </div>
                  {isSearchOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setIsMobileBarVisible(true);
                      }}
                      className="sm:hidden px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 shrink-0 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Inline Glassmorphic Choices Dropdown Menu */}
                <AnimatePresence>
                  {isSearchOpen && (
                    <>
                      {/* Dimmed backdrop handler to dismiss pull-down dropdown when clicking outside */}
                      <div 
                        className="fixed inset-0 z-[90] bg-black/20 dark:bg-black/50 backdrop-blur-2xs" 
                        onClick={() => {
                          setIsSearchOpen(false);
                          setIsMobileBarVisible(true);
                        }} 
                      />

                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.97 }}
                        transition={{ type: "spring", damping: 25, stiffness: 350 }}
                        className="absolute top-full left-0 right-0 mt-2 z-[100] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-left max-h-[70vh]"
                      >
                        <div className="max-h-[60vh] overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar text-left">
                          {(() => {
                            const navMatches = [
                              { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
                              { id: 'schedule', title: 'Schedule', icon: CalendarDays },
                              { id: 'attendance', title: 'Attendance Scan', icon: Scan },
                              { id: 'inbox', title: 'Messages', icon: MessageSquare },
                              { id: 'notifications', title: 'Notifications', icon: Bell },
                              { id: 'help', title: 'Help Center', icon: HelpCircle },
                              { id: 'settings', title: 'Settings', icon: Settings },
                              { id: 'profile', title: 'Profile', icon: UserCircle }
                            ].filter(item => !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()));

                            const matchedClasses = classes.filter(cls => 
                              !searchQuery || 
                              cls.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (cls.facultyName && cls.facultyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (cls.room && cls.room.toLowerCase().includes(searchQuery.toLowerCase()))
                            );

                            return (
                              <>
                                {navMatches.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="px-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">Navigation Views</p>
                                    <div className="grid grid-cols-1 gap-0.5">
                                      {navMatches.map(item => {
                                        const IconComponent = item.icon;
                                        return (
                                          <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                              setActiveScreen(item.id);
                                              setIsSearchOpen(false);
                                              setIsMobileBarVisible(true);
                                              setSearchQuery('');
                                            }}
                                            className="w-full px-2.5 py-2 rounded-lg hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 text-left flex items-center gap-2.5 transition-colors group cursor-pointer"
                                          >
                                            <div className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-900 group-hover:bg-emerald-500 group-hover:text-black transition-colors shrink-0">
                                              <IconComponent className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300 group-hover:text-black" />
                                            </div>
                                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{item.title}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {matchedClasses.length > 0 && (
                                  <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                                    <p className="px-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">Classes & Courses ({matchedClasses.length})</p>
                                    <div className="grid grid-cols-1 gap-0.5">
                                      {matchedClasses.map(cls => (
                                        <button
                                          key={cls.id}
                                          type="button"
                                          onClick={() => {
                                            setActiveScreen('schedule');
                                            setIsSearchOpen(false);
                                            setIsMobileBarVisible(true);
                                            setSearchQuery('');
                                          }}
                                          className="w-full px-2.5 py-2 rounded-lg hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 text-left flex items-center justify-between gap-2 transition-colors group cursor-pointer"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 truncate">
                                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono shrink-0">{cls.code}</span>
                                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{cls.name}</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{cls.days} • {cls.startTime} • {cls.room}</p>
                                          </div>
                                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-500 shrink-0">
                                            {cls.studentsCount || 0} students
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {navMatches.length === 0 && matchedClasses.length === 0 && (
                                  <div className="py-6 text-center space-y-1.5">
                                    <Search className="w-6 h-6 text-zinc-300 dark:text-zinc-700 mx-auto" />
                                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">No results found for "{searchQuery}"</p>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Right controllers: Notification Bell & Profile Circle Avatar */}
              <div className={`items-center gap-2 sm:gap-2.5 shrink-0 transition-all duration-300 ${
                isSearchOpen ? 'hidden sm:flex' : 'flex'
              }`}>
                {/* Account Link QR Button */}
                <button
                  onClick={() => setIsAccountLinkModalOpen(true)}
                  type="button"
                  className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 transition-all cursor-pointer relative shrink-0"
                  title="Account Link QR Code (Desktop <-> Mobile Sync)"
                >
                  <QrCode className="w-4.5 h-4.5 text-emerald-500" />
                </button>

                <button
                  onClick={() => {
                    setActiveScreen('notifications');
                    speakText("Navigating to notification center", accessibility.readAloud);
                  }}
                  type="button"
                  className={`p-2 rounded-xl border flex items-center justify-center cursor-pointer transition-all relative border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
                    activeScreen === 'notifications'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 font-extrabold shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {filteredNotificationsForMe.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] font-black leading-none font-mono">
                      {filteredNotificationsForMe.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {/* Profile Circle Avatar (Active Session) */}
                <button
                  onClick={() => {
                    handleSetScreen('profile');
                    speakText("Navigating to user profile", accessibility.readAloud);
                  }}
                  type="button"
                  className={`relative p-0.5 rounded-full border transition-all cursor-pointer shrink-0 hover:scale-105 active:scale-95 ${
                    activeScreen === 'profile'
                      ? 'ring-2 ring-emerald-500 border-emerald-500'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50'
                  }`}
                  title={`${user.name} (${isOffline ? 'Offline Mode' : 'Cloud Synced'})`}
                >
                  <img
                    src={user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span 
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-950 ${
                      isOffline 
                        ? 'bg-amber-500 shadow-xs shadow-amber-500/50' 
                        : 'bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse'
                    }`} 
                    title={isOffline ? "Offline Mode (Local Storage)" : "Cloud Synced (Firestore)"}
                  />
                </button>
              </div>

            </header>

            {/* Offline Sync Banner alerts */}
            {syncDoneBanner && (
              <div className="m-4 sm:m-6 p-3.5 sm:p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-950 dark:text-emerald-300 flex items-center gap-3.5 shadow-md flex-row justify-between animate-fade-in text-left">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold">Database Synchronized</h5>
                    <p className="text-[11px] opacity-80 mt-0.5">All attendance records are up to date.</p>
                  </div>
                </div>
                <button onClick={() => setSyncDoneBanner(false)} className="text-xs hover:underline cursor-pointer font-bold shrink-0 text-emerald-500">Dismiss</button>
              </div>
            )}

            {/* Primary content grid layout block */}
            <main ref={mainScrollRef} className={`px-2 sm:px-3.5 md:px-5 pt-1.5 md:pt-2.5 max-w-7xl w-full mx-auto flex-1 overflow-y-auto ${
              activeScreen === 'messages' || activeScreen === 'tickets' 
                ? 'pb-24 md:pb-4 space-y-0' 
                : 'pb-32 sm:pb-28 md:pb-8 space-y-2.5 sm:space-y-4'
            }`}>
              
              {/* Accessibility options expansion widget */}
              {isAccPanelOpen && (
                <div className="relative animate-scale-up z-20">
                  <div className="absolute right-0 top-0 z-30">
                    <button 
                      onClick={() => setIsAccPanelOpen(false)}
                      type="button"
                      className="p-1 m-2 rounded-lg hover:bg-zinc-150 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <AccessibilitySettings
                    config={accessibility}
                    onChange={setAccessibility}
                    isOffline={isOffline}
                    onToggleOffline={handleToggleOffline}
                  />
                  <div className="h-4" /> {/* spacer below */}
                </div>
              )}

               {/* Dynamic screen layouts injection based on active role */}
              <AnimatePresence mode="wait">
                {activeScreen === 'settings' ? (
                  <motion.div
                    key="settings-screen"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full flex-1 flex flex-col"
                  >
                    <SettingsPage
                      userProfile={user}
                      accessibility={accessibility}
                      onUpdateProfile={handleUpdateProfile}
                      onUpdateAccessibility={setAccessibility}
                      onUpdateDensity={handleUpdateDensity}
                      onUpdateCompactMode={setCompactMode}
                      onUpdateColorAccent={setColorAccent}
                      setScreen={handleSetScreen}
                      classes={classes}
                      onOpenAccountLinkQR={() => setIsAccountLinkModalOpen(true)}
                      isOffline={isOffline}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="dashboard-screen"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full flex-1 flex flex-col text-left"
                  >
                    {user.role === 'student' && (
                      <DashboardStudent
                        activeScreen={activeScreen}
                        setScreen={handleSetScreen}
                        selectedChatContact={selectedChatContact}
                        classes={classes}
                        attendanceRecords={attendanceRecords.filter(r => 
                          r.studentId === user.studentId || 
                          r.studentName === user.name ||
                          r.studentId === user.id
                        )}
                        notifications={filteredNotificationsForMe}
                        facultyStatuses={facultyStatuses}
                        userProfile={user}
                        isOffline={isOffline}
                        accessibility={accessibility}
                        enrollments={enrollments}
                        onRecordAttendance={handleRecordAttendance}
                        onUpdateProfile={handleUpdateProfile}
                        onClearAllNotifications={handleClearAllNotifications}
                        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                        announcements={announcements}
                        excuseLetters={excuseLetters.filter(el => 
                          el.studentId === user.studentId || 
                          el.studentName === user.name ||
                          el.studentId === user.id
                        )}
                        onAddExcuseLetter={handleAddExcuseLetter}
                        onDropSubject={handleDropSubject}
                        onEnrollSubject={handleEnrollSubject}
                      />
                    )}

                    {user.role === 'faculty' && (
                      <DashboardFaculty
                        activeScreen={activeScreen}
                        setScreen={handleSetScreen}
                        selectedChatContact={selectedChatContact}
                        classes={classes.filter(c => 
                          c.facultyId === user.id || 
                          c.facultyId === user.facultyId || 
                          (c.facultyName && user.name && c.facultyName.toLowerCase() === user.name.toLowerCase())
                        )}
                        onAddClass={handleAddClass}
                        onEditClass={handleEditClass}
                        onDeleteClass={handleDeleteClass}
                        userProfile={user}
                        facultyStatus={facultyStatuses.find(f => f.name === user.name || f.id === user.facultyId || f.id === user.id || f.id === 'fac-1' || f.id === 'fac-01')?.status || 'available'}
                        onChangeFacultyStatus={handleChangeFacultyStatus}
                        accessibility={accessibility}
                        enrollments={enrollments}
                        attendanceRecords={attendanceRecords.filter(r => 
                          classes.some(c => 
                            c.id === r.classId && 
                            (c.facultyId === user.id || c.facultyId === user.facultyId || (c.facultyName && user.name && c.facultyName.toLowerCase() === user.name.toLowerCase()))
                          )
                        )}
                        notifications={filteredNotificationsForMe}
                        facultyStatuses={facultyStatuses}
                        onUpdateProfile={handleUpdateProfile}
                        onClearAllNotifications={handleClearAllNotifications}
                        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                        announcements={announcements}
                        excuseLetters={excuseLetters.filter(el => {
                          if (el.facultyId && (el.facultyId === user.id || el.facultyId === user.facultyId || el.facultyId === 'fac-1' || el.facultyId === 'fac-01')) return true;
                          if (el.facultyName && user.name && (el.facultyName.toLowerCase() === user.name.toLowerCase() || el.facultyName.toLowerCase().includes(user.name.toLowerCase()))) return true;
                          const facultyClasses = classes.filter(c => 
                            c.facultyId === user.id || 
                            c.facultyId === user.facultyId || 
                            (c.facultyName && user.name && c.facultyName.toLowerCase() === user.name.toLowerCase())
                          );
                          if (facultyClasses.some(c => c.id === el.classId || c.code === el.classCode || c.name === el.className)) return true;
                          if (facultyClasses.length > 0 && (!el.classId || !el.facultyId)) return true;
                          return false;
                        })}
                        onUpdateExcuseStatus={handleUpdateExcuseStatus}
                        onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
                        onAddAttendanceRecord={handleAddAttendanceRecord}
                        labRooms={labRooms}
                        onUpdateLabRooms={handleUpdateLabRooms}
                      />
                    )}

                    {user.role === 'admin' && (
                      <DashboardAdmin
                        activeScreen={activeScreen}
                        setScreen={handleSetScreen}
                        selectedChatContact={selectedChatContact}
                        classes={classes}
                        onAddClass={handleAddClass}
                        onEditClass={handleEditClass}
                        onDeleteClass={handleDeleteClass}
                        enrollments={enrollments}
                        attendanceRecords={attendanceRecords}
                        accessibility={accessibility}
                        announcements={announcements}
                        onUpdateAnnouncements={setAnnouncements}
                        userProfile={user}
                        onUpdateProfile={handleUpdateProfile}
                        onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
                        notifications={filteredNotificationsForMe}
                        onClearAllNotifications={handleClearAllNotifications}
                        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                        labRooms={labRooms}
                        onUpdateLabRooms={handleUpdateLabRooms}
                        excuseLetters={excuseLetters}
                        onUpdateExcuseStatus={handleUpdateExcuseStatus}
                        onResetSystem={handleResetSystem}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </main>

            {/* Mobile Bottom Navigation Bar (Deeply Adaptive, Thumb-Friendly Glassmorphic Dock with iOS Safe-Area support) */}
            <div className={`md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-4 sm:right-4 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800/80 px-2 py-1 flex justify-around items-center h-14 rounded-2xl shadow-xl shadow-zinc-950/15 transition-all duration-300 ease-in-out transform ${
              isKeyboardOpen 
                ? 'hidden opacity-0 pointer-events-none' 
                : isMobileBarVisible 
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-28 opacity-0 pointer-events-none'
            }`}>
              {getBottomNavItems().map(item => {
                const Icon = item.icon;
                const isActive = item.id === 'menu_toggle' ? false : activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'menu_toggle') {
                        window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
                      } else {
                        handleSetScreen(item.id);
                        speakText(`Switched to ${item.label}`, accessibility.readAloud);
                      }
                    }}
                    type="button"
                    className={`flex flex-col items-center justify-center gap-0.5 transition-all flex-1 py-1 cursor-pointer scale-100 active:scale-95 ${
                      isActive 
                        ? 'text-emerald-500 font-black' 
                        : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 transition-transform ${isActive ? 'scale-110 stroke-[2.5] text-emerald-500' : 'stroke-2 text-zinc-450 dark:text-zinc-455'}`} />
                    <span className="text-[9px] font-black tracking-wider uppercase">{item.label}</span>
                  </button>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* Dynamic Toast Alerts Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 15, transition: { duration: 0.15 } }}
            className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-sm p-3 rounded-2xl shadow-2xl bg-zinc-900/90 dark:bg-zinc-950/90 border border-zinc-800/80 text-white backdrop-blur-xl flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'warning' ? 'bg-amber-500' :
                toast.type === 'error' ? 'bg-red-500' :
                'bg-indigo-500'
              }`} />
              <p className="text-xs font-bold tracking-tight text-zinc-100 truncate pr-2">
                {toast.message}
              </p>
            </div>
            
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Close Notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Link QR Session Modal */}
      <AccountLinkQRModal
        isOpen={isAccountLinkModalOpen}
        onClose={() => setIsAccountLinkModalOpen(false)}
        userProfile={user}
        isOffline={isOffline}
        onSessionClaimed={(claimedProfile) => {
          const norm = normalizeUserIdentity(claimedProfile);
          handleLoginSuccess(norm.role as Role, norm.name, norm.email);
        }}
      />

    </div>
  );
}
