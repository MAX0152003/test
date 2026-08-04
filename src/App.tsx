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
  LabRoom
} from './types';
import { 
  syncClassesFromFirestore,
  saveClassToFirestore,
  deleteClassFromFirestore,
  syncAttendanceFromFirestore,
  saveAttendanceToFirestore,
  saveUserProfileToFirestore
} from './lib/firestoreSync';
import { auth, db } from './lib/googleAuth';
import { 
  INITIAL_CLASSES, 
  INITIAL_FACULTY_STATUSES, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_ATTENDANCE_RECORDS,
  DEFAULT_STUDENT_PROFILE,
  DEFAULT_FACULTY_PROFILE,
  DEFAULT_ADMIN_PROFILE
} from './data';
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
  Type, 
  Settings, 
  X, 
  RefreshCw, 
  CheckCircle,
  HelpCircle,
  Bell,
  LayoutDashboard,
  CalendarDays,
  Scan,
  MessageSquare,
  Users,
  Inbox,
  UserCircle,
  AlertTriangle,
  Info,
  Menu
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
  if (typeof window !== 'undefined' && !safeStorage.getItem('cp_purged_v5')) {
    safeStorage.removeItem('cp_classes');
    safeStorage.removeItem('cp_records');
    safeStorage.removeItem('cp_notifications');
    safeStorage.removeItem('cp_faculty_statuses');
    safeStorage.removeItem('classpulse_student_leaves');
    safeStorage.removeItem('cp_enrollments');
    safeStorage.removeItem('cp_announcements');
    safeStorage.removeItem('classpulse_registered_users');
    safeStorage.removeItem('classpulse_registered_admins');
    safeStorage.setItem('cp_purged_v5', 'true');
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

  const mainScrollRef = React.useRef<HTMLDivElement>(null);
  const prevLabRoomsRef = React.useRef<Record<string, 'occupied' | 'available' | 'maintenance'>>({});

  const handleSetScreen = (screenId: string) => {
    if (screenId === activeScreen) {
      window.dispatchEvent(new CustomEvent('reset-screen-state', { detail: { screenId } }));
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
        return JSON.parse(cached);
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

  const [compactMode, setCompactMode] = React.useState(() => {
    return safeStorage.getItem('cp_pref_compact_mode') === 'true';
  });

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
        return JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing cp_lab_rooms:", e);
      }
    }
    return [
      {
        id: 'lab-1',
        name: 'Room 201 - Advanced Web Lab',
        capacity: 40,
        status: 'occupied',
        currentOccupancy: 24,
        activeClass: 'ITE183 - Web Systems',
        devicesCount: 40,
        scannersActive: true,
        activeScannerLogs: [
          { id: 'log-1', timestamp: '09:04:15 AM', studentId: '2023-14923', studentName: 'John Doe', action: 'Scan IN', status: 'Present' },
          { id: 'log-2', timestamp: '09:04:45 AM', studentId: '2023-99124', studentName: 'Bob Carter', action: 'Scan IN', status: 'Present' },
          { id: 'log-3', timestamp: '09:05:01 AM', studentId: '2023-10492', studentName: 'Farhan Makil', action: 'Scan IN', status: 'Present' }
        ],
        floor: '2nd Floor'
      },
      {
        id: 'lab-2',
        name: 'Room 205 - Microprocessor Lab',
        capacity: 35,
        status: 'available',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 35,
        scannersActive: true,
        activeScannerLogs: [
          { id: 'log-4', timestamp: '08:50:12 AM', studentId: '2023-10492', studentName: 'James Dean', action: 'Scan OUT', status: 'Present' }
        ],
        floor: '2nd Floor'
      },
      {
        id: 'lab-3',
        name: 'Room 302 - Network Engineering Lab',
        capacity: 45,
        status: 'maintenance',
        currentOccupancy: 0,
        activeClass: '',
        devicesCount: 45,
        scannersActive: false,
        activeScannerLogs: [],
        floor: '3rd Floor'
      }
    ];
  });

  const [isOffline, setIsOffline] = React.useState<boolean>(() => {
    return safeStorage.getItem('cp_offline') === 'true';
  });

  const [offlineQueueCount, setOfflineQueueCount] = React.useState<number>(() => {
    const cached = safeStorage.getItem('cp_offline_queue_count');
    return cached ? parseInt(cached, 10) : 3;
  });

  // Action/simulation trackers
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncDoneBanner, setSyncDoneBanner] = React.useState(false);
  const [isAccPanelOpen, setIsAccPanelOpen] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

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

  // Firestore Sync Data: pulls down classes and attendance records once online
  React.useEffect(() => {
    if (isOffline) return;

    if (user) {
      setIsSyncing(true);
      Promise.all([
        syncClassesFromFirestore(isOffline, (fetchedClasses) => {
          setClasses(fetchedClasses);
        }),
        syncAttendanceFromFirestore(isOffline, (fetchedRecords) => {
          setAttendanceRecords(fetchedRecords);
        }),
        saveUserProfileToFirestore(isOffline, user)
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

  // Synchronize when offline state is flipped back to online
  const handleToggleOffline = () => {
    if (isOffline) {
      // Transitioning to online -> Simulate synchronization
      setIsOffline(false);
      setIsSyncing(true);
      speakText("Restoring network link. Synchronizing local cache with main campus nodes.", accessibility.readAloud);
      
      setTimeout(() => {
        setIsSyncing(false);
        setOfflineQueueCount(0);
        setSyncDoneBanner(true);
        speakText("Database synchronization completed. All attendance rosters are fully persistent.", accessibility.readAloud);
        
        // Add a notification toast dynamically
        const newNotif: AppNotification = {
          id: 'notif-sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          title: 'Offline records synchronized',
          message: 'Local logs for schedules and scan codes successfully merged into cloud registry.',
          timestamp: 'Just Now',
          type: 'success',
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
 
        setTimeout(() => setSyncDoneBanner(false), 3550);
      }, 1500);
    } else {
      setIsOffline(true);
      // Give it an initial simulated offline queue value if 0, so students immediately see the badge
      if (offlineQueueCount === 0) {
        setOfflineQueueCount(2);
      }
      speakText("Network connection paused. You are now working using persistent local-storage database mode.", accessibility.readAloud);
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
      if (email?.toLowerCase().trim() === 'admin2@msu.edu.ph') {
        resolvedId = 'admin-02';
      } else if (email?.toLowerCase().trim() === 'admin@msu.edu.ph') {
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
 
    setUser(profile);
    setActiveScreen('dashboard');
    speakText(`Welcome to ClassPulse. Successfully loaded your ${role} dashboard.`, accessibility.readAloud);
  };
 
  const handleLogout = () => {
    setUser(null);
    setActiveScreen('dashboard');
    safeStorage.removeItem('cp_user');
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

    // B. LOG ATTENDANCE LOG
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayISO = new Date().toISOString().split('T')[0];

    const newRecord: AttendanceRecord = {
      id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      classId,
      className: matchedClass.name,
      classCode: matchedClass.code,
      date: todayISO,
      time: timeString,
      status,
      role: 'student',
      studentName: user?.name || 'John Doe',
      studentId: user?.studentId || '2023-10492'
    };

    setAttendanceRecords(prev => [...prev, newRecord]);
    saveAttendanceToFirestore(isOffline, newRecord).catch(err => console.error("Firestore save attendance error:", err));

    if (isOffline) {
      setOfflineQueueCount(prev => prev + 1);
    }

    // Send warning if late, else success
    const alertType = status === 'late' ? 'warning' : 'success';
    const msg = status === 'late' 
      ? `Recorded attendance for ${matchedClass.code} at ${timeString} marked as late.`
      : `Checked into ${matchedClass.code} successfully as present.`;

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
    saveUserProfileToFirestore(isOffline, updatedProfile).catch(err => console.error("Firestore update profile error:", err));

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
    saveClassToFirestore(isOffline, freshClass).catch(err => console.error("Firestore add class error:", err));

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
    saveClassToFirestore(isOffline, sanitizedClass).catch(err => console.error("Firestore edit class error:", err));
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

    deleteClassFromFirestore(isOffline, classId).catch(err => console.error("Firestore delete class error:", err));
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
    
    // Update local statuses array (so students see this changed status in real-time!)
    setFacultyStatuses(prev => 
      prev.map(f => f.name === user.name || f.id === 'fac-1' ? { ...f, status } : f)
    );

    // Add dynamic notification info
    const notifTitle = `Status updated to ${status}`;
    const statusMessages = {
      available: `${user.name} is now available in Consultation Office.`,
      'in-class': `${user.name} is currently teaching a section.`,
      unavailable: `${user.name} was marked as unavailable.`
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
  const handleUpdateAttendanceRecord = (recordId: string, status: 'present' | 'late' | 'absent') => {
    setAttendanceRecords(prev => prev.map(rec => rec.id === recordId ? { ...rec, status } : rec));
    
    // Find record context for logging
    const target = attendanceRecords.find(r => r.id === recordId);
    if (target) {
      const updatedRec = { ...target, status };
      saveAttendanceToFirestore(isOffline, updatedRec).catch(err => console.error("Firestore update attendance error:", err));

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
    saveAttendanceToFirestore(isOffline, record).catch(err => console.error("Firestore add attendance error:", err));
  };

  // Shared Excuse Status validation Action
  const handleUpdateExcuseStatus = (id: string, status: 'pending' | 'valid' | 'invalid' | 'approved' | 'rejected') => {
    const finalStatus = status === 'approved' || status === 'valid' ? 'valid' : status === 'rejected' || status === 'invalid' ? 'invalid' : 'pending';
    setExcuseLetters(prev => prev.map(ex => ex.id === id ? { ...ex, status: finalStatus as any } : ex));
    
    const target = excuseLetters.find(e => e.id === id);
    if (target) {
      const newNotif: AppNotification = {
        id: 'notif-exced-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        title: 'Excuse Decision Logged',
        message: `Excuse Letter ${id} (Student: ${target.studentName}) marked as ${finalStatus.toUpperCase()}.`,
        timestamp: 'Just Now',
        type: 'success',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
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
      className={`${getThemeClass(accessibility.theme)} theme-accent-${colorAccent} ${compactMode ? 'app-compact-mode' : ''} trans-all-theme`}
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
            
            {/* Top Operational bar */}
            <header className="hidden md:flex px-6 py-4 border-b items-center justify-between gap-4 shrink-0 bg-white/85 dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-850/80 backdrop-blur-md text-zinc-900 dark:text-zinc-100">
              
              {/* Left Header Context title display matching image theme roles */}
              <div className="flex items-center gap-3 text-left">
                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-xs ${
                  user.role === 'student' ? 'bg-[#03213D] text-white border-[#03213D]/20' :
                  user.role === 'faculty' ? 'bg-emerald-600 text-white border-emerald-500/20' :
                  'bg-[#CC762A] text-white border-[#CC762A]/20'
                }`}>
                  {user.role === 'student' ? 'Student' : user.role === 'faculty' ? 'Faculty' : 'Admin'}
                </span>

                {/* Offline state label badge */}
                {isOffline && (
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-550/20 animate-pulse font-mono">
                    <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Offline Mode</span>
                    {offlineQueueCount > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-black leading-none uppercase shrink-0">
                        {offlineQueueCount} queued to sync
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Right controllers: Accessibility triggers & Quick Settings */}
              <div className="flex items-center gap-2.5">
                
                {/* Manual offline syncing progress spin */}
                {isSyncing && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing cloud...</span>
                  </div>
                )}

                 {/* Notification Bell routing button instead of settings */}
                <button
                  onClick={() => {
                    setActiveScreen('notifications');
                    speakText("Navigating to notification center", accessibility.readAloud);
                  }}
                  type="button"
                  className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition-all relative border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
                    activeScreen === 'notifications'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 font-extrabold shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                  title="Notification Center & System Logs"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {filteredNotificationsForMe.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-550 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] font-black leading-none font-mono">
                      {filteredNotificationsForMe.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              </div>

            </header>

            {/* Offline Sync Banner alerts (floating absolute / top) */}
            {syncDoneBanner && (
              <div className="m-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-950 dark:text-emerald-300 flex items-center gap-3.5 shadow-md flex-row justify-between animate-fade-in text-left">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h5 className="text-xs font-bold font-sans">Database Synchronized</h5>
                    <p className="text-[11px] opacity-90 mt-0.5">Your registers has been securely committed onto ClassPulse host nodes.</p>
                  </div>
                </div>
                <button onClick={() => setSyncDoneBanner(false)} className="text-xs hover:underline cursor-pointer font-bold shrink-0 text-emerald-500">Dismiss</button>
              </div>
            )}

            {/* Primary content grid layout block */}
            <main ref={mainScrollRef} className="px-2.5 sm:px-4 md:px-8 pt-2 md:pt-3 pb-24 md:pb-8 max-w-7xl w-full mx-auto space-y-6 flex-1 overflow-y-auto">
              
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
                      onUpdateCompactMode={setCompactMode}
                      onUpdateColorAccent={setColorAccent}
                      setScreen={handleSetScreen}
                      classes={classes}
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
                        onAddExcuseLetter={(newReq: any) => setExcuseLetters(prev => [newReq, ...prev])}
                        onDropSubject={handleDropSubject}
                        onEnrollSubject={handleEnrollSubject}
                      />
                    )}

                    {user.role === 'faculty' && (
                      <DashboardFaculty
                        activeScreen={activeScreen}
                        setScreen={handleSetScreen}
                        classes={classes.filter(c => 
                          c.facultyId === user.id || 
                          c.facultyId === user.facultyId || 
                          (c.facultyName && user.name && c.facultyName.toLowerCase() === user.name.toLowerCase())
                        )}
                        onAddClass={handleAddClass}
                        onEditClass={handleEditClass}
                        onDeleteClass={handleDeleteClass}
                        userProfile={user}
                        facultyStatus={facultyStatuses.find(f => f.name === user.name || f.id === 'fac-1')?.status || 'available'}
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
                        excuseLetters={excuseLetters.filter(el => 
                          classes.some(c => 
                            c.id === el.classId && 
                            (c.facultyId === user.id || c.facultyId === user.facultyId || (c.facultyName && user.name && c.facultyName.toLowerCase() === user.name.toLowerCase()))
                          )
                        )}
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

            {/* Mobile Bottom Navigation Bar (Deeply Adaptive, Thumb-Friendly) */}
            <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-850 px-3 py-2 flex justify-around items-center h-16 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
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
                    className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 py-1 cursor-pointer scale-100 active:scale-95 ${
                      isActive 
                        ? 'text-emerald-500 font-black' 
                        : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5] text-emerald-500' : 'stroke-2 text-zinc-450 dark:text-zinc-455'}`} />
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
            className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] p-3 rounded-xl shadow-xl bg-zinc-900/95 dark:bg-zinc-950/95 border border-zinc-805/80 text-white backdrop-blur-md flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'warning' ? 'bg-amber-550 bg-amber-500' :
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

    </div>
  );
}
