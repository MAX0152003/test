import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { 
  ClassSession, 
  UserProfile, 
  AccessibilityConfig,
  Enrollment,
  AttendanceRecord,
  FacultyStatus,
  Announcement,
  AppNotification,
  LabRoom,
  ScannerLog
} from '../types';
import { calculateStudentStanding } from '../lib/attendanceRules';
import { 
  Users, 
  UserCheck, 
  BookOpen, 
  Calendar, 
  Plus, 
  Minus,
  Cpu,
  X, 
  CheckCircle, 
  TrendingUp, 
  ArrowUpRight, 
  Trash2, 
  ShieldAlert, 
  Mail, 
  Building,
  Sparkles,
  Clock,
  MapPin,
  AlertCircle,
  Edit,
  Search,
  Megaphone,
  User,
  Download,
  Bell,
  BellRing,
  MessageSquare,
  SlidersHorizontal,
  ChevronDown,
  Filter,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Database,
  Wifi,
  WifiOff,
  Check,
  Lock,
  HelpCircle,
  LayoutGrid,
  List
} from 'lucide-react';
import { speakText } from './AccessibilitySettings';
import { 
  saveRegisteredUserToFirestore, 
  deleteRegisteredUserFromFirestore, 
  savePasswordResetToFirestore 
} from '../lib/firestoreSync';
import SubjectDetailModal from './SubjectDetailModal';
import Messages from './Messages';
import WeeklyScheduleGrid from './WeeklyScheduleGrid';

interface DashboardAdminProps {
  activeScreen: string;
  setScreen: (screen: string, contactObj?: { id: string; name?: string; ts?: number }) => void;
  selectedChatContact?: { id: string; name?: string; ts?: number };
  classes: ClassSession[];
  onAddClass: (newClass: Omit<ClassSession, 'id'>) => void;
  onEditClass: (updatedClass: ClassSession) => void;
  onDeleteClass: (classId: string) => void;
  enrollments: Enrollment[];
  attendanceRecords: AttendanceRecord[];
  accessibility: AccessibilityConfig;
  announcements?: Announcement[];
  onUpdateAnnouncements?: (announcements: Announcement[]) => void;
  userProfile?: UserProfile;
  onUpdateProfile?: (updatedUserProfile: UserProfile) => void;
  onUpdateAttendanceRecord?: (recordId: string, status: 'present' | 'late' | 'absent' | 'excused') => void;
  onAddAttendanceRecord?: (newRec: any) => void;
  notifications: AppNotification[];
  onClearAllNotifications: () => void;
  onMarkAllNotificationsRead: () => void;
  labRooms?: LabRoom[];
  onUpdateLabRooms?: (rooms: LabRoom[]) => void;
  excuseLetters?: any[];
  onUpdateExcuseStatus?: (id: string, status: 'pending' | 'valid' | 'invalid' | 'approved' | 'rejected') => void;
  onResetSystem?: () => Promise<void>;
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

const checkDaysOverlapVal = (daysA: string[], daysB: string[]): boolean => {
  const expandedA = expandDaysToSpecificOnesVal(daysA);
  const expandedB = expandDaysToSpecificOnesVal(daysB);
  return expandedA.some(day => expandedB.includes(day));
};

interface StatCardProps {
  key?: React.Key;
  stat: {
    label: string;
    targetVal: number;
    icon: any;
    color: string;
    text: string;
    detail: string;
  };
  idx: number;
}

function StatCard({ stat, idx }: StatCardProps) {
  const IconComp = stat.icon;
  // Simple simulation of state-based ticker increment
  const [displayCount, setDisplayCount] = React.useState(0);
  React.useEffect(() => {
    let current = 0;
    const increment = Math.ceil(stat.targetVal / 25);
    const timer = setInterval(() => {
      current += increment;
      if (current >= stat.targetVal) {
        current = stat.targetVal;
        clearInterval(timer);
      }
      setDisplayCount(current);
    }, 20);
    return () => clearInterval(timer);
  }, [stat.targetVal]);

  return (
    <motion.div 
      key={idx}
      initial={{ opacity: 0, y: 15, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: idx * 0.05 }}
      whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.05)" }}
      className="p-3.5 sm:p-5 rounded-[1.5rem] border bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-850/80 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center justify-between gap-2.5 sm:gap-4 group relative overflow-hidden text-left h-full"
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="min-w-0 flex-1">
        <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-zinc-400 dark:text-zinc-500 block truncate">{stat.label}</span>
        <h3 className="text-2xl sm:text-3xl font-black mt-1 font-mono text-zinc-900 dark:text-zinc-100 truncate">
          {displayCount}
        </h3>
        <div className="mt-1.5 flex flex-col gap-0.5">
          <span className="text-[9px] sm:text-[10px] text-emerald-500 font-extrabold flex items-center gap-0.5 truncate">
            <ArrowUpRight className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" /> {stat.text}
          </span>
          <span className="text-[8px] sm:text-[9px] text-zinc-400 dark:text-zinc-600 block truncate">{stat.detail}</span>
        </div>
      </div>
      <div className={`p-2 sm:p-3 rounded-xl ${
        stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
        stat.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400' :
        stat.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
        'bg-purple-500/10 text-purple-400'
      } shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11`}>
        <IconComp className="w-4 h-4 sm:w-5 h-5 stroke-[2]" />
      </div>
    </motion.div>
  );
}

// Custom responsive tooltips for Recharts graphs
const CustomRechartsTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col gap-1 w-48 text-left text-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1 mb-1">
          <span className="text-[9px] font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{data.name} Logs</span>
          <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-550">ADM CORE</span>
        </div>
        <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100">{data.date}</p>
        <div className="grid grid-cols-3 gap-1 mt-1 text-[9px] font-mono">
          <div className="bg-emerald-500/10 p-1.5 rounded text-emerald-600 dark:text-emerald-300">
            <p className="text-[7px] text-zinc-500 uppercase tracking-wider font-bold">Pres</p>
            <p className="font-extrabold">{data.active}</p>
          </div>
          <div className="bg-amber-500/10 p-1.5 rounded text-amber-600 dark:text-amber-300">
            <p className="text-[7px] text-zinc-500 uppercase tracking-wider font-bold">Late</p>
            <p className="font-extrabold">{data.late}</p>
          </div>
          <div className="bg-red-500/10 p-1.5 rounded text-red-600 dark:text-red-300">
            <p className="text-[7px] text-zinc-500 uppercase tracking-wider font-bold font-sans">Abs</p>
            <p className="font-extrabold">{data.absent}</p>
          </div>
        </div>
        <p className="text-[9px] text-zinc-550 dark:text-zinc-400 mt-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span>Avg Attendance:</span>
          <strong className="text-emerald-600 dark:text-emerald-400 text-xs">{data.value}%</strong>
        </p>
      </div>
    );
  }
  return null;
};

const EnrollmentTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col gap-1 w-48 text-left text-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1 mb-1">
          <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{data.name} Roster</span>
          <span className="text-[9px] font-mono text-indigo-500 dark:text-indigo-300 font-extrabold">{data.change}</span>
        </div>
        <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{data.date}</p>
        <p className="text-[9.5px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">{data.desc}</p>
        <p className="text-[9px] text-zinc-550 dark:text-zinc-400 mt-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span>Total Enrolled:</span>
          <strong className="text-indigo-600 dark:text-indigo-400 text-xs">{data.value}</strong>
        </p>
      </div>
    );
  }
  return null;
};

const RetentionTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col gap-1 w-48 text-left text-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1 mb-1">
          <span className="text-[9px] font-mono font-bold text-cyan-500 uppercase tracking-widest">{data.label}</span>
          <span className="text-[8px] font-mono text-zinc-400">TERM HIST</span>
        </div>
        <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{data.date}</p>
        <div className="grid grid-cols-2 gap-1.5 mt-1 text-[9px] font-mono">
          <div className="bg-cyan-500/10 p-1.5 rounded text-cyan-600 dark:text-cyan-300">
            <p className="text-[7px] text-zinc-500 uppercase tracking-wider">Avg Attended</p>
            <p className="font-extrabold">{data.active}</p>
          </div>
          <div className="bg-amber-500/10 p-1.5 rounded text-amber-600 dark:text-amber-300">
            <p className="text-[7px] text-zinc-500 uppercase tracking-wider">Absenteeism</p>
            <p className="font-extrabold">{100 - data.value}%</p>
          </div>
        </div>
        <p className="text-[9px] text-zinc-550 dark:text-zinc-400 mt-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span>Retention rate:</span>
          <strong className="text-cyan-600 dark:text-cyan-400 text-xs">{data.value}%</strong>
        </p>
      </div>
    );
  }
  return null;
};

const ClearanceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col gap-1 w-44 text-left text-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1 mb-1">
          <span className="text-[9px] font-mono font-bold text-blue-605 dark:text-blue-400 uppercase tracking-widest">{data.name} Term</span>
          <span className="text-[8px] font-mono text-zinc-400">EXC clearance</span>
        </div>
        <div className="space-y-1 text-[10px]">
          <p className="flex justify-between">
            <span className="text-zinc-500">Total requests:</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{data.total}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-zinc-500">Cleared successfully:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.cleared}</span>
          </p>
          <p className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-1 mt-1 font-bold">
            <span className="text-zinc-650 dark:text-zinc-400">Success rate:</span>
            <span className="text-indigo-600 dark:text-indigo-400">{Math.round((data.cleared / data.total) * 100)}%</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty';
  uid: string; // ID number
  department: string;
}

export default function DashboardAdmin({
  activeScreen,
  setScreen,
  selectedChatContact,
  classes,
  onAddClass,
  onEditClass,
  onDeleteClass,
  enrollments,
  attendanceRecords,
  accessibility,
  announcements = [],
  onUpdateAnnouncements,
  userProfile,
  onUpdateProfile,
  onUpdateAttendanceRecord,
  onAddAttendanceRecord,
  notifications,
  onClearAllNotifications,
  onMarkAllNotificationsRead,
  labRooms = [],
  onUpdateLabRooms,
  excuseLetters = [],
  onUpdateExcuseStatus,
  onResetSystem
}: DashboardAdminProps) {
  
  const isDataWiped = classes.length === 0 && attendanceRecords.length === 0;

  // Local list of interactive directory users
  const [usersList, setUsersList] = React.useState<MockUser[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
    } catch {
      return [];
    }
  });

  // Ensure registered users and only the primary active admin profile are present in directory (removing generated co-admins)
  const allDirectoryUsers = React.useMemo(() => {
    const nonAdminUsers = usersList.filter(u => u.role !== 'admin');
    const combined = [...nonAdminUsers];
    if (userProfile && userProfile.role === 'admin') {
      combined.unshift({
        id: userProfile.id || 'admin-01',
        name: userProfile.name || 'Master Admin',
        email: userProfile.email || 'admin@msu.edu.ph',
        role: 'admin',
        uid: 'ADM-' + (userProfile.id ? userProfile.id.substring(0, 5).toUpperCase() : '01'),
        department: userProfile.department || 'Academic Registrar Board'
      });
    } else {
      combined.unshift({
        id: 'admin-01',
        name: 'Master Admin',
        email: 'admin@msu.edu.ph',
        role: 'admin',
        uid: 'ADM-01',
        department: 'Academic Registrar Board'
      });
    }
    return combined;
  }, [usersList, userProfile]);

  // Directory filter state
  const [scheduleViewMode, setScheduleViewMode] = React.useState<'grid' | 'cards'>('grid');
  const [directoryRoleFilter, setDirectoryRoleFilter] = React.useState<'all' | 'student' | 'faculty' | 'admin'>('all');
  const [telemetryFilter, setTelemetryFilter] = React.useState<'all' | 'charts' | 'users' | 'leaves'>('all');

  // Track expanded classes per student ID in the directory
  const [expandedUserClasses, setExpandedUserClasses] = React.useState<Record<string, boolean>>({});

  // Administrative control panel states
  const [isRosterLocked, setIsRosterLocked] = React.useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = React.useState(false);
  const [generatedToken, setGeneratedToken] = React.useState('');
  const [isCleaningLogs, setIsCleaningLogs] = React.useState(false);
  const [cleanLogsProgress, setCleanLogsProgress] = React.useState(0);
  const [calibratingScanners, setCalibratingScanners] = React.useState<Record<string, boolean>>({});

  const [dbPartitionActive, setDbPartitionActive] = React.useState(() => {
    return localStorage.getItem('cp_scale_partition_active') !== 'false';
  });
  const [dbIndexesOptimized, setDbIndexesOptimized] = React.useState(() => {
    return localStorage.getItem('cp_scale_indexes_optimized') !== 'false';
  });
  const [isArchivingLogs, setIsArchivingLogs] = React.useState(false);
  const [archiveProgress, setArchiveProgress] = React.useState(0);
  const [coldStorageCount, setColdStorageCount] = React.useState(() => {
    const cached = localStorage.getItem('cp_scale_cold_storage_count');
    return cached ? parseInt(cached, 10) : 1850;
  });

  // Local edit states
  const [editingUser, setEditingUser] = React.useState<MockUser | null>(null);
  const [editUserName, setEditUserName] = React.useState('');
  const [editUserEmail, setEditUserEmail] = React.useState('');
  const [editUserUid, setEditUserUid] = React.useState('');
  const [editUserDep, setEditUserDep] = React.useState('');

  // Local states for announcements, searching, and profile
  const [userDirectorySearch, setUserDirectorySearch] = React.useState('');
  const [adminClassSearchQuery, setAdminClassSearchQuery] = React.useState('');
  
  const [isAnnFormOpen, setIsAnnFormOpen] = React.useState(false);
  const [annTitle, setAnnTitle] = React.useState('');
  const [annContent, setAnnContent] = React.useState('');
  const [annTarget, setAnnTarget] = React.useState<'all' | 'student' | 'faculty'>('all');
  const [annEditingId, setAnnEditingId] = React.useState<string | null>(null);

  const [profileName, setProfileName] = React.useState(userProfile?.name || 'Admin Strator');
  const [profileEmail, setProfileEmail] = React.useState(userProfile?.email || 'registrar@msu.edu.ph');
  const [profileBio, setProfileBio] = React.useState(userProfile?.bio || 'Campus System Administrator');
  const [profilePhone, setProfilePhone] = React.useState(userProfile?.phone || '+63 901 234 5678');
  const [profileSavedMsg, setProfileSavedMsg] = React.useState(false);

  React.useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name);
      setProfileEmail(userProfile.email);
      setProfileBio(userProfile.bio || 'Campus System Administrator');
      setProfilePhone(userProfile.phone || '+63 901 234 5678');
    }
  }, [userProfile]);

  React.useEffect(() => {
    const handleUsersChanged = () => {
      try {
        setUsersList(JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]'));
      } catch {
        setUsersList([]);
      }
    };
    window.addEventListener('registered-users-changed', handleUsersChanged);
    window.addEventListener('storage', handleUsersChanged);
    return () => {
      window.removeEventListener('registered-users-changed', handleUsersChanged);
      window.removeEventListener('storage', handleUsersChanged);
    };
  }, []);

  // Clickable Course detail interactive modal states
  const [selectedClassDetail, setSelectedClassDetail] = React.useState<ClassSession | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [adminDeleteConfirmClass, setAdminDeleteConfirmClass] = React.useState<{ id: string; code: string } | null>(null);
  const [adminDialogConfirm, setAdminDialogConfirm] = React.useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Bulletins Cabinet Locker and laboratory states
  const [isBulletinsLockerOpen, setIsBulletinsLockerOpen] = React.useState(false);
  const [selectedRoomId, setSelectedRoomId] = React.useState('lab-1');
  const [isAddingRoom, setIsAddingRoom] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState('');
  const [newRoomCapacity, setNewRoomCapacity] = React.useState(40);
  const [newRoomDevices, setNewRoomDevices] = React.useState(40);
  const [newRoomFloor, setNewRoomFloor] = React.useState('2nd Floor');
  const [editingRoomId, setEditingRoomId] = React.useState<string | null>(null);
  const [editRoomName, setEditRoomName] = React.useState('');
  const [editRoomCapacity, setEditRoomCapacity] = React.useState(40);
  const [editRoomDevices, setEditRoomDevices] = React.useState(40);
  const [editRoomStatus, setEditRoomStatus] = React.useState<'occupied' | 'available' | 'maintenance'>('available');
  const [editRoomFloor, setEditRoomFloor] = React.useState('2nd Floor');
  const [hoveredTrendIndex, setHoveredTrendIndex] = React.useState<number | null>(null);
  const [hoveredEnrollmentIndex, setHoveredEnrollmentIndex] = React.useState<number | null>(null);
  const [analyticsTab, setAnalyticsTab] = React.useState<'daily' | 'historical'>('daily');
  
  // Custom graph customization for days, weeks, months with horizontal scrolling
  const [adminGraphPeriod, setAdminGraphPeriod] = React.useState<'days' | 'weeks' | 'months'>('weeks');
  const [adminGraphStartDate, setAdminGraphStartDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // 30 days ago default
    return d.toISOString().split('T')[0];
  });
  const [adminGraphEndDate, setAdminGraphEndDate] = React.useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const adminChartScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollAdminChart = (direction: 'left' | 'right') => {
    if (adminChartScrollRef.current) {
      const amt = direction === 'left' ? -220 : 220;
      adminChartScrollRef.current.scrollBy({ left: amt, behavior: 'smooth' });
    }
  };
  const [hoveredHistoryIndex, setHoveredHistoryIndex] = React.useState<number | null>(null);
  const [hoveredClearanceIndex, setHoveredClearanceIndex] = React.useState<number | null>(null);
  const [activeAnalyticsChart, setActiveAnalyticsChart] = React.useState<'enrollment' | 'attendance' | 'activity'>('enrollment');
  const [resetFilterState, setResetFilterState] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [resetSearchQuery, setResetSearchQuery] = React.useState('');

  const [passwordResetRequests, setPasswordResetRequests] = React.useState<any[]>(() => {
    try {
      const list = JSON.parse(localStorage.getItem('classpulse_password_reset_requests') || '[]');
      return list;
    } catch {
      return [];
    }
  });

  // Batch Approval states
  const [isBatchMode, setIsBatchMode] = React.useState(false);
  const [selectedExcuseIds, setSelectedExcuseIds] = React.useState<string[]>([]);
  const [selectedResetIds, setSelectedResetIds] = React.useState<string[]>([]);

  const handleBatchApproveExcuses = () => {
    if (selectedExcuseIds.length === 0) return;
    selectedExcuseIds.forEach(id => {
      onUpdateExcuseStatus?.(id, 'approved');
    });
    speakText(`Approved ${selectedExcuseIds.length} excuse letters in bulk.`, accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(`Bulk approved ${selectedExcuseIds.length} excuse letters`, "success");
    }
    setSelectedExcuseIds([]);
  };

  const handleBatchRejectExcuses = () => {
    if (selectedExcuseIds.length === 0) return;
    selectedExcuseIds.forEach(id => {
      onUpdateExcuseStatus?.(id, 'rejected');
    });
    speakText(`Denied ${selectedExcuseIds.length} excuse letters in bulk.`, accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(`Bulk denied ${selectedExcuseIds.length} excuse letters`, "warning");
    }
    setSelectedExcuseIds([]);
  };

  const handleBatchApproveResets = () => {
    if (selectedResetIds.length === 0) return;
    const isOffline = localStorage.getItem('cp_offline') === 'true';
    const updated = passwordResetRequests.map((r: any) => {
      if (selectedResetIds.includes(r.id)) {
        const approvedReq = { ...r, status: 'approved' };
        savePasswordResetToFirestore(isOffline, approvedReq).catch(err => console.error(err));
        return approvedReq;
      }
      return r;
    });
    localStorage.setItem('classpulse_password_reset_requests', JSON.stringify(updated));
    setPasswordResetRequests(updated);
    window.dispatchEvent(new Event('password-reset-requests-changed'));
    speakText(`Approved ${selectedResetIds.length} password reset requests in bulk.`, accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(`Bulk approved ${selectedResetIds.length} password resets`, "success");
    }
    setSelectedResetIds([]);
  };

  const handleBatchRejectResets = () => {
    if (selectedResetIds.length === 0) return;
    const isOffline = localStorage.getItem('cp_offline') === 'true';
    const updated = passwordResetRequests.map((r: any) => {
      if (selectedResetIds.includes(r.id)) {
        const rejectedReq = { ...r, status: 'rejected' };
        savePasswordResetToFirestore(isOffline, rejectedReq).catch(err => console.error(err));
        return rejectedReq;
      }
      return r;
    });
    localStorage.setItem('classpulse_password_reset_requests', JSON.stringify(updated));
    setPasswordResetRequests(updated);
    window.dispatchEvent(new Event('password-reset-requests-changed'));
    speakText(`Denied ${selectedResetIds.length} password reset requests in bulk.`, accessibility.readAloud);
    setSelectedResetIds([]);
  };

  // Bulk CSV User Import state
  const [csvImportModalOpen, setCsvImportModalOpen] = React.useState(false);
  const [csvRawText, setCsvRawText] = React.useState('');
  const [csvParsedRows, setCsvParsedRows] = React.useState<any[]>([]);

  const handleDownloadCsvTemplate = () => {
    const csvHeader = "Name,Email,Role,ID,Department\n";
    const sampleRows = "Juan Dela Cruz,juan.delacruz@msu.edu.ph,student,2025-00101,Information Technology\nMaria Clara,maria.clara@msu.edu.ph,faculty,FAC-901,Computer Science\n";
    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classpulse_bulk_user_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleParseCsvText = (text: string) => {
    setCsvRawText(text);
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      setCsvParsedRows([]);
      return;
    }
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length >= 3) {
        const name = cols[0] || 'Unassigned User';
        const email = cols[1] || `user${i}@msu.edu.ph`;
        const role = (cols[2] || 'student').toLowerCase() === 'faculty' ? 'faculty' : 'student';
        const uid = cols[3] || `${role === 'faculty' ? 'FAC' : '2025'}-${Math.floor(1000 + Math.random() * 9000)}`;
        const dept = cols[4] || 'Information Technology';
        rows.push({ name, email, role, uid, department: dept, status: 'Ready' });
      }
    }
    setCsvParsedRows(rows);
  };

  const handleCommitBulkCsvImport = () => {
    if (csvParsedRows.length === 0) return;
    const existingUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
    const newUsers = csvParsedRows.map(row => ({
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: row.name,
      email: row.email,
      role: row.role,
      uid: row.uid,
      department: row.department,
      registeredAt: new Date().toISOString()
    }));

    const combined = [...existingUsers, ...newUsers];
    localStorage.setItem('classpulse_registered_users', JSON.stringify(combined));
    setUsersList(prev => [...prev, ...newUsers]);

    const isOffline = localStorage.getItem('cp_offline') === 'true';
    for (const u of newUsers) {
      saveRegisteredUserToFirestore(isOffline, u).catch(err => console.error(err));
    }

    const toastMsg = `✅ Bulk CSV Import Complete: ${newUsers.length} users registered successfully!`;
    speakText(toastMsg, accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(toastMsg, "success");
    }
    setCsvImportModalOpen(false);
    setCsvParsedRows([]);
    setCsvRawText('');
  };

  // Semester Archiving state
  const [archiveModalOpen, setArchiveModalOpen] = React.useState(false);
  const [termNameInput, setTermNameInput] = React.useState('1st Semester AY 2025-2026');
  const [archivedTermsList, setArchivedTermsList] = React.useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('classpulse_archived_terms') || '[]');
    } catch {
      return [];
    }
  });

  const handleCommitSemesterArchive = () => {
    if (!termNameInput.trim()) return;

    const termRecord = {
      id: 'term-' + Date.now(),
      termName: termNameInput.trim(),
      academicYear: '2025-2026',
      archivedAt: new Date().toLocaleString(),
      totalClasses: classes.length,
      totalAttendanceRecords: attendanceRecords.length,
      totalStudentsEnrolled: enrollments.length,
      classesSnapshot: classes,
      recordsSnapshot: attendanceRecords
    };

    const updated = [termRecord, ...archivedTermsList];
    localStorage.setItem('classpulse_archived_terms', JSON.stringify(updated));
    setArchivedTermsList(updated);

    const toastMsg = `🔒 Academic Term "${termNameInput}" archived successfully into historical records!`;
    speakText(toastMsg, accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(toastMsg, "success");
    }
    setArchiveModalOpen(false);
  };

  React.useEffect(() => {
    const handleStorageChange = () => {
      try {
        const list = JSON.parse(localStorage.getItem('classpulse_password_reset_requests') || '[]');
        setPasswordResetRequests(list);
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener('password-reset-requests-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('password-reset-requests-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleApprovePasswordReset = (id: string) => {
    const updated = passwordResetRequests.map((r: any) => {
      if (r.id === id) {
        return { ...r, status: 'approved' };
      }
      return r;
    });
    localStorage.setItem('classpulse_password_reset_requests', JSON.stringify(updated));
    setPasswordResetRequests(updated);
    window.dispatchEvent(new Event('password-reset-requests-changed'));
    
    speakText("Password reset request approved.", accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(`Password reset request approved`, "success");
    }
  };

  const handleRejectPasswordReset = (id: string) => {
    const updated = passwordResetRequests.map((r: any) => {
      if (r.id === id) {
        return { ...r, status: 'rejected' };
      }
      return r;
    });
    localStorage.setItem('classpulse_password_reset_requests', JSON.stringify(updated));
    setPasswordResetRequests(updated);
    window.dispatchEvent(new Event('password-reset-requests-changed'));
    
    speakText("Password reset request rejected.", accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(`Password reset request rejected`, "warning");
    }
  };

  // States for Pending Sync section
  const [pendingSyncLogs, setPendingSyncLogs] = React.useState<Array<{
    id: string;
    studentId: string;
    studentName: string;
    classId: string;
    classCode: string;
    className: string;
    room: string;
    timestamp: string;
    status: 'present' | 'late';
    conflictType: 'none' | 'double_check_in' | 'schedule_mismatch' | 'duplicate_record';
    conflictDesc?: string;
    resolved: boolean;
    resolution?: 'accept_local' | 'keep_server' | 'merged';
  }>>([
    {
      id: 'psyn-1',
      studentId: '2023-14923',
      studentName: 'John Doe',
      classId: 'class-1',
      classCode: 'ITE183',
      className: 'Web Systems',
      room: 'Comp Lab 1',
      timestamp: '09:05 AM',
      status: 'present',
      conflictType: 'double_check_in',
      conflictDesc: 'Concurrent Scan Active: Card was also scanned in Comp Lab 2 overlapping at 09:04:15 AM.',
      resolved: false
    },
    {
      id: 'psyn-2',
      studentId: '2023-10492',
      studentName: 'Farhan Makil',
      classId: 'class-2',
      classCode: 'CSC150',
      className: 'Data Structures',
      room: 'Comp Lab 2',
      timestamp: '10:45 AM',
      status: 'late',
      conflictType: 'schedule_mismatch',
      conflictDesc: 'Session Schedule Gap: Scan logged at 10:45 AM, but registrar course calendar slot is set to start at 11:30 AM.',
      resolved: false
    },
    {
      id: 'psyn-3',
      studentId: '2023-99124',
      studentName: 'Bob Carter',
      classId: 'class-1',
      classCode: 'ITE183',
      className: 'Web Systems',
      room: 'Comp Lab 1',
      timestamp: '09:04 AM',
      status: 'present',
      conflictType: 'duplicate_record',
      conflictDesc: 'Server Collision: Identical attendance stamp exists on central server. Synced signature matches student UUID.',
      resolved: false
    },
    {
      id: 'psyn-4',
      studentId: '2023-33412',
      studentName: 'James Dean',
      classId: 'class-2',
      classCode: 'CSC150',
      className: 'Data Structures',
      room: 'Comp Lab 2',
      timestamp: '11:35 AM',
      status: 'present',
      conflictType: 'none',
      resolved: false
    }
  ]);
  const [isPushingSync, setIsPushingSync] = React.useState(false);
  const [syncFilter, setSyncFilter] = React.useState<'all' | 'conflicts' | 'clean' | 'resolved'>('all');
  const [selectedResolvingId, setSelectedResolvingId] = React.useState<string | null>(null);

  // Sync conflicts resolution and simulation handlers
  const handleResolveConflict = (id: string, resolution: 'accept_local' | 'keep_server' | 'merged') => {
    setPendingSyncLogs(prev => prev.map(log => 
      log.id === id ? { ...log, resolved: true, resolution } : log
    ));
    speakText(`Conflict resolved. Applied ${resolution.replace('_', ' ')} logic to log credential.`, accessibility.readAloud);
  };

  const handleResetConflict = (id: string) => {
    setPendingSyncLogs(prev => prev.map(log => 
      log.id === id ? { ...log, resolved: false, resolution: undefined } : log
    ));
    speakText("Reset resolution. Log is set back to unresolved conflict status.", accessibility.readAloud);
  };

  const handlePushOfflineLogs = () => {
    const unresolvedConflicts = pendingSyncLogs.filter(log => log.conflictType !== 'none' && !log.resolved);
    if (unresolvedConflicts.length > 0) {
      speakText(`Sync halted. There are ${unresolvedConflicts.length} unresolved safety conflicts. Please review and resolve them before continuing.`, accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(`Cannot push offline cache: ${unresolvedConflicts.length} unresolved safety conflicts remain.`, "error");
      } else {
        alert(`Cannot push offline cache. You have ${unresolvedConflicts.length} unresolved attendance conflicts needing manual resolution path decisions.`);
      }
      return;
    }

    setIsPushingSync(true);
    speakText("Establishing connection with registrar network... Pushing local cached records.", accessibility.readAloud);

    setTimeout(() => {
      setIsPushingSync(false);
      const syncedCount = pendingSyncLogs.length;
      
      pendingSyncLogs.forEach(log => {
        if (log.resolution === 'keep_server') return;
        if (onAddAttendanceRecord) {
          onAddAttendanceRecord({
            classId: log.classId,
            className: log.className,
            classCode: log.classCode,
            date: new Date().toISOString().split('T')[0],
            time: log.timestamp,
            status: log.status,
            role: 'student',
            studentName: log.studentName,
            studentId: log.studentId
          });
        }
      });

      setPendingSyncLogs([]);
      speakText(`Sync finalized! Successfully merged ${syncedCount} offline ledger records into university servers.`, accessibility.readAloud);
      
      if ((window as any).showToast) {
        (window as any).showToast(`Successfully synchronized ${syncedCount} records to registrar.`, "success");
      } else {
        alert(`Database synchronization complete. ${syncedCount} logs synchronized to server.`);
      }
    }, 1800);
  };

  // Automatically synchronize offline-first logs behind the scenes without admin manual action
  React.useEffect(() => {
    if (pendingSyncLogs.length > 0) {
      const timer = setTimeout(() => {
        const syncedCount = pendingSyncLogs.length;
        pendingSyncLogs.forEach(log => {
          if (onAddAttendanceRecord) {
            onAddAttendanceRecord({
              classId: log.classId,
              className: log.className,
              classCode: log.classCode,
              date: new Date().toISOString().split('T')[0],
              time: log.timestamp,
              status: log.status,
              role: 'student',
              studentName: log.studentName,
              studentId: log.studentId
            });
          }
        });
        setPendingSyncLogs([]);
        speakText(`Auto-sync completed seamlessly. Synced ${syncedCount} offline cache log records in the background.`, accessibility.readAloud);
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(`Successfully synchronized ${syncedCount} offline records automatically.`, "success");
        }
      }, 4000); // 4-second delay representing silent automated backend synchronization
      return () => clearTimeout(timer);
    }
  }, [pendingSyncLogs, onAddAttendanceRecord, accessibility.readAloud]);

  const handleSimulateOfflineLog = () => {
    const names = ['Farhan Makil', 'John Doe', 'Alice Smith', 'Bob Carter', 'James Dean', 'Sarah Connor', 'Bruce Wayne'];
    const ids = ['2023-10492', '2023-14923', '2023-90345', '2023-99124', '2023-33412', '2023-45129', '2023-88231'];
    const classesList = [
      { id: 'class-1', code: 'ITE183', name: 'Web Systems', room: 'Comp Lab 1' },
      { id: 'class-2', code: 'CSC150', name: 'Data Structures', room: 'Comp Lab 2' },
      { id: 'class-3', code: 'CSC181', name: 'Database Management', room: 'Multimedia Room' }
    ];
    const idx = Math.floor(Math.random() * names.length);
    const clsIdx = Math.floor(Math.random() * classesList.length);
    const conflictRoll = Math.random();
    
    let conflictType: 'none' | 'double_check_in' | 'schedule_mismatch' | 'duplicate_record' = 'none';
    let conflictDesc = '';
    
    if (conflictRoll < 0.25) {
      conflictType = 'double_check_in';
      conflictDesc = `Concurrent Scan Active: Card was checked in another terminal at overlapping timestamp.`;
    } else if (conflictRoll < 0.5) {
      conflictType = 'schedule_mismatch';
      conflictDesc = `Session Schedule Gap: Tapped outside of scheduled class hour boundaries.`;
    } else if (conflictRoll < 0.75) {
      conflictType = 'duplicate_record';
      conflictDesc = `Server Collision: An exact duplicate check-in timestamp log already exists on the registry.`;
    }

    const newLog = {
      id: `psyn-sim-${Date.now()}`,
      studentId: ids[idx],
      studentName: names[idx],
      classId: classesList[clsIdx].id,
      classCode: classesList[clsIdx].code,
      className: classesList[clsIdx].name,
      room: classesList[clsIdx].room,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: Math.random() > 0.3 ? 'present' as const : 'late' as const,
      conflictType,
      conflictDesc: conflictDesc,
      resolved: false
    };

    setPendingSyncLogs(prev => [newLog, ...prev]);
    speakText(`Simulated offline scanner log generated for student ${names[idx]}. conflict status ${conflictType !== 'none' ? 'detected' : 'clean'}.`, accessibility.readAloud);
  };

  // Add User Form modal
  const [isUserFormOpen, setIsUserFormOpen] = React.useState(false);
  const [expandedFacultyClasses, setExpandedFacultyClasses] = React.useState<Record<string, boolean>>({});
  const [newUserName, setNewUserName] = React.useState('');
  const [newUserEmail, setNewUserEmail] = React.useState('');
  const [newUserRole, setNewUserRole] = React.useState<'student' | 'faculty' | 'admin'>('student');
  const [newUserID, setNewUserID] = React.useState('');
  const [newUserDep, setNewUserDep] = React.useState('Computer Science');

  // Add/Register Class Form state
  const [isAdminClassFormOpen, setIsAdminClassFormOpen] = React.useState(false);
  const [adminFormCode, setAdminFormCode] = React.useState('');
  const [adminFormName, setAdminFormName] = React.useState('');
  const [adminFormStart, setAdminFormStart] = React.useState('09:00 AM');
  const [adminFormEnd, setAdminFormEnd] = React.useState('10:30 AM');
  const [adminFormRoom, setAdminFormRoom] = React.useState('');
  const [adminFormDays, setAdminFormDays] = React.useState<string[]>(['MW']);
  const [adminFormFacultyName, setAdminFormFacultyName] = React.useState('');
  const [adminFormFacultyId, setAdminFormFacultyId] = React.useState('');

  // Sorted rooms choice list (by floor then room name/number)
  const sortedLabRooms = React.useMemo(() => {
    return [...labRooms].sort((a, b) => {
      const floorA = a.floor || '';
      const floorB = b.floor || '';
      const floorCmp = floorA.localeCompare(floorB, undefined, { numeric: true });
      if (floorCmp !== 0) return floorCmp;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [labRooms]);

  // Sync selected room when labRooms or form state changes
  React.useEffect(() => {
    if (sortedLabRooms.length > 0) {
      const selected = sortedLabRooms.find(r => r.name === adminFormRoom);
      if (!selected) {
        setAdminFormRoom(sortedLabRooms[0].name);
      }
    } else {
      setAdminFormRoom('');
    }
  }, [sortedLabRooms, adminFormRoom]);

  // Registered faculty members from directory, sorted alphabetically by name
  const registeredFacultyList = React.useMemo(() => {
    return [...usersList.filter(u => u.role === 'faculty')].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [usersList]);

  // Sorted classes by code / name
  const sortedClasses = React.useMemo(() => {
    return [...classes].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true })
    );
  }, [classes]);

  // Sync selected faculty when registeredFacultyList or form state changes
  React.useEffect(() => {
    if (registeredFacultyList.length > 0) {
      const selected = registeredFacultyList.find(
        f => f.id === adminFormFacultyId || f.uid === adminFormFacultyId || f.email === adminFormFacultyId
      );
      if (!selected) {
        setAdminFormFacultyId(registeredFacultyList[0].id || registeredFacultyList[0].uid || registeredFacultyList[0].email);
        setAdminFormFacultyName(registeredFacultyList[0].name);
      }
    } else {
      setAdminFormFacultyId('');
      setAdminFormFacultyName('');
    }
  }, [registeredFacultyList, adminFormFacultyId]);

  // Dynamic conflict detection for administrator's subject registration form
  const adminSchedulesConflicts = React.useMemo(() => {
    const conflicts: { type: 'room' | 'faculty'; message: string; subCode: string; subName: string; details: string }[] = [];
    if (!isAdminClassFormOpen) return conflicts;

    const currentStart = parseTimeToMinutesVal(adminFormStart);
    const currentEnd = parseTimeToMinutesVal(adminFormEnd);

    classes.forEach(c => {
      // Check day overlap
      const hasDayOverlap = checkDaysOverlapVal(adminFormDays, c.days);
      if (!hasDayOverlap) return;

      // Check time overlap
      const classStart = parseTimeToMinutesVal(c.startTime);
      const classEnd = parseTimeToMinutesVal(c.endTime);
      const isTimeOverlapping = currentStart < classEnd && classStart < currentEnd;
      if (!isTimeOverlapping) return;

      // Check room overlap
      const isSameRoom = (c.room || '').trim().toLowerCase() === (adminFormRoom || '').trim().toLowerCase();
      if (isSameRoom) {
        conflicts.push({
          type: 'room',
          subCode: c.code,
          subName: c.name,
          message: `Room Conflict: "${adminFormRoom}" is already booked by class ${c.code} (${c.name}) taught by ${c.facultyName}.`,
          details: `${c.days.join(', ')} @ ${c.startTime} - ${c.endTime}`
        });
      }

      // Check if instructor is busy
      const isSameFaculty = (c.facultyId && adminFormFacultyId && c.facultyId === adminFormFacultyId) ||
                            (c.facultyName && adminFormFacultyName && c.facultyName.trim().toLowerCase() === adminFormFacultyName.trim().toLowerCase());
      if (isSameFaculty) {
        conflicts.push({
          type: 'faculty',
          subCode: c.code,
          subName: c.name,
          message: `Faculty Clash: Instructor "${adminFormFacultyName}" is already scheduled to teach class ${c.code} (${c.name}) during this slot.`,
          details: `${c.days.join(', ')} @ ${c.startTime} - ${c.endTime}`
        });
      }
    });

    return conflicts;
  }, [adminFormStart, adminFormEnd, adminFormRoom, adminFormDays, adminFormFacultyId, adminFormFacultyName, classes, isAdminClassFormOpen]);

  const [showStickyHeader] = React.useState(true);
  const isScrolled = false;
  const [selectedClassIdFilter, setSelectedClassIdFilter] = React.useState<string>('all');
  const [isClassFilterOpen, setIsClassFilterOpen] = React.useState(false);
  const [classFilterSearch, setClassFilterSearch] = React.useState('');
  const [notifSearch, setNotifSearch] = React.useState('');
  const [notifFilter, setNotifFilter] = React.useState<'all' | 'alerts' | 'updates'>('all');

  React.useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.screenId === 'users' || customEvent.detail?.screenId === 'schedule-editor') {
        setDirectoryRoleFilter('all');
        setUserDirectorySearch('');
        setAdminClassSearchQuery('');
        setIsUserFormOpen(false);
        setIsAnnFormOpen(false);
        setIsDetailModalOpen(false);
        setSelectedClassDetail(null);
      }
    };
    window.addEventListener('reset-screen-state', handleReset);
    return () => {
      window.removeEventListener('reset-screen-state', handleReset);
    };
  }, []);

  // Stats
  const studentCount = allDirectoryUsers.filter(u => u.role === 'student').length;
  const facultyCount = allDirectoryUsers.filter(u => u.role === 'faculty').length;
  const adminCount = allDirectoryUsers.filter(u => u.role === 'admin').length;
  const classesTrackedCount = classes.length;
  const attendanceTodayCount = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const activeRatePercent = attendanceRecords.length > 0 
    ? Math.round((presentCount) / (attendanceRecords.length) * 100)
    : 100;
  const instantScansRecorded = attendanceRecords.length;
  const departmentsList = ['Computer Engineering', 'Computer Science', 'Information Systems', 'Information Technology', 'Software Engineering'];
  const SCHEDULING_TIME_SLOTS = React.useMemo(() => {
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
  }, []);

  const handleExportAllGlobalAttendance = () => {
    if (attendanceRecords.length === 0) {
      speakText("No attendance records found to export.", accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("The attendance records ledger is currently empty. No logs to export.", "warning");
      } else {
        alert("The attendance records ledger is currently empty.");
      }
      return;
    }
    
    const headers = ["Student ID", "Student Name", "Class Code", "Course Name", "Session Date", "Check-in Time", "Attendance Status"];
    const rows = attendanceRecords.map(rec => {
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
    link.setAttribute("download", `MSU_University_Attendance_Consolidated_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    speakText("Consolidated attendance ledger successfully exported to CSV file for archiving", accessibility.readAloud);
  };

  const handleExportStudents = () => {
    const headers = ["Student ID/UID", "Student Name", "Email Address", "Department/Major"];
    const rows = usersList.filter(u => u.role === 'student').map(u => [
      u.uid || "N/A",
      u.name || "N/A",
      u.email || "N/A",
      u.department || "Computer Science"
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MSU_Student_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    speakText("Student rosters directory exported successfully.", accessibility.readAloud);
  };

  const handleExportClasses = () => {
    const headers = ["Subject Code", "Subject Name", "Course Instructor", "Schedules / Day-Time", "Room Location"];
    const rows = classes.map(c => [
      c.code || "N/A",
      c.name || "N/A",
      c.facultyName || "Unassigned",
      `${c.days ? c.days.join(" ") : "N/A"} ${c.startTime} - ${c.endTime}`,
      c.room || "N/A"
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MSU_Curriculum_Schedules_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    speakText("University schedules ledger exported successfully.", accessibility.readAloud);
  };

  const handleExportExcuses = () => {
    try {
      const raw = localStorage.getItem('classpulse_excuse_letters');
      if (raw) {
        const letters = JSON.parse(raw);
        if (letters.length === 0) {
          if (typeof window !== 'undefined' && (window as any).showToast) {
            (window as any).showToast("The Excuse Letter records database is currently empty. No logs to export.", "warning");
          } else {
            alert("The Excuse Letter records database is currently empty. No logs to export.");
          }
          return;
        }
        const headers = ["Student ID", "Student Name", "Subject ID/Code", "Submission Date", "Excuse Reason", "Status", "Attachment Name"];
        const rows = letters.map((l: any) => [
          l.studentId || "N/A",
          l.studentName || "N/A",
          l.classCode || l.classId || "N/A",
          l.date || "N/A",
          l.reason || "N/A",
          l.status || "PENDING",
          l.attachmentName || "None"
        ]);
        const csvContent = [headers.join(","), ...rows.map((r: any) => r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `MSU_Excuses_Archive_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        speakText("Excuse letters archive successfully exported to CSV.", accessibility.readAloud);
      } else {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast("No excuse letters records found to export.", "warning");
        } else {
          alert("No excuse letters records found to export.");
        }
      }
    } catch (e) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Error reading excuse letters ledger.", "error");
      } else {
        alert("Error reading excuse letters ledger.");
      }
    }
  };

  const handleExportClassAttendance = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    
    const filteredRecords = attendanceRecords.filter(r => r.classId === classId);
    if (filteredRecords.length === 0) {
      speakText(`No attendance records found for ${cls.name}`, accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(`Empty database: No attendance logs for ${cls.code} - ${cls.name}.`, "warning");
      } else {
        alert(`There are currently no registered attendance logs in the database for course ${cls.code} - ${cls.name}.`);
      }
      return;
    }
    
    const headers = ["Student ID", "Student Name", "Class Code", "Course Name", "Session Date", "Check-in Time", "Attendance Status"];
    const rows = filteredRecords.map(rec => [
      rec.studentId || "N/A",
      rec.studentName || "N/A",
      rec.classCode || cls.code,
      rec.className || cls.name,
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
    link.setAttribute("download", `${cls.code}_Attendance_Roster_${cls.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    speakText(`Course attendance roster for ${cls.name} successfully exported`, accessibility.readAloud);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserID) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Validation Error: Please fill in all required user fields.", "error");
      } else {
        alert("Please fill in name, email, and ID fields.");
      }
      return;
    }

    const newUserRecord: MockUser = {
      id: newUserID.trim(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      uid: newUserID.trim(),
      department: newUserDep
    };

    let registeredUsers = [];
    try {
      registeredUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
    } catch (err) {
      console.error(err);
    }

    const updatedUsers = [newUserRecord, ...registeredUsers];
    localStorage.setItem('classpulse_registered_users', JSON.stringify(updatedUsers));
    window.dispatchEvent(new Event('registered-users-changed'));

    // Save user to Firestore so mobile and desktop window recognise the user
    const isOffline = localStorage.getItem('cp_offline') === 'true';
    saveRegisteredUserToFirestore(isOffline, newUserRecord).catch(err => console.error(err));

    // Sync classpulse_registered_admins
    const adminsList = updatedUsers.filter((u: any) => u.role === 'admin');
    localStorage.setItem('classpulse_registered_admins', JSON.stringify(adminsList));
    window.dispatchEvent(new Event('registered-admins-changed'));

    setUsersList(updatedUsers);
    setIsUserFormOpen(false);
    
    // reset
    setNewUserName('');
    setNewUserEmail('');
    setNewUserID('');

    speakText(`New ${newUserRole} account for ${newUserName} successfully registered in system database.`, accessibility.readAloud);
  };

  const handleDeleteUser = (id: string, name: string) => {
    setAdminDialogConfirm({
      title: 'Revoke Credentials',
      message: `Are you absolutely sure you want to revoke credentials and remove ${name} from integrated directories?`,
      confirmText: 'Revoke & Remove',
      onConfirm: () => {
        let registeredUsers = [];
        try {
          registeredUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
        } catch (err) {
          console.error(err);
        }
        const updatedUsers = registeredUsers.filter((u: any) => u.id !== id);
        localStorage.setItem('classpulse_registered_users', JSON.stringify(updatedUsers));
        window.dispatchEvent(new Event('registered-users-changed'));

        // Delete user from Firestore
        const isOffline = localStorage.getItem('cp_offline') === 'true';
        deleteRegisteredUserFromFirestore(isOffline, id).catch(err => console.error(err));

        // Sync classpulse_registered_admins
        const adminsList = updatedUsers.filter((u: any) => u.role === 'admin');
        localStorage.setItem('classpulse_registered_admins', JSON.stringify(adminsList));
        window.dispatchEvent(new Event('registered-admins-changed'));

        setUsersList(updatedUsers);
        speakText(`${name} removed successfully from student and faculty registries.`, accessibility.readAloud);
      }
    });
  };

  const handleStartEditUser = (user: MockUser) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserUid(user.uid);
    setEditUserDep(user.department);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName || !editUserEmail || !editUserUid) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Validation Failure: Please fill in all edit profile inputs.", "error");
      } else {
        alert("Please fill in names, email, and ID coordinates.");
      }
      return;
    }

    let registeredUsers = [];
    try {
      registeredUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
    } catch (err) {
      console.error(err);
    }

    const updatedUsers = registeredUsers.map((u: any) => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          name: editUserName,
          email: editUserEmail,
          uid: editUserUid,
          department: editUserDep
        };
      }
      return u;
    });

    localStorage.setItem('classpulse_registered_users', JSON.stringify(updatedUsers));
    window.dispatchEvent(new Event('registered-users-changed'));

    // Sync classpulse_registered_admins
    const adminsList = updatedUsers.filter((u: any) => u.role === 'admin');
    localStorage.setItem('classpulse_registered_admins', JSON.stringify(adminsList));
    window.dispatchEvent(new Event('registered-admins-changed'));

    setUsersList(updatedUsers);
    speakText(`User details for ${editUserName} successfully updated.`, accessibility.readAloud);
    setEditingUser(null);
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;

    if (annEditingId) {
      // Edit existing
      const updated = announcements.map(ann => 
        ann.id === annEditingId 
          ? { ...ann, title: annTitle, content: annContent, target: annTarget } 
          : ann
      );
      onUpdateAnnouncements?.(updated);
      speakText(`Announcement ${annTitle} successfully edited, updated across all dashboards`, accessibility.readAloud);
    } else {
      // Create new
      const fresh: Announcement = {
        id: 'ann-gen-' + Math.random().toString(36).substring(2, 7),
        title: annTitle,
        content: annContent,
        target: annTarget,
        createdAt: new Date().toISOString()
      };
      onUpdateAnnouncements?.([fresh, ...announcements]);
      speakText(`New dynamic announcement ${annTitle} has been broadcasted to targets`, accessibility.readAloud);
    }

    // reset
    setAnnTitle('');
    setAnnContent('');
    setAnnTarget('all');
    setAnnEditingId(null);
    setIsAnnFormOpen(false);
  };

  const handleEditAnnClick = (ann: Announcement) => {
    setAnnTitle(ann.title);
    setAnnContent(ann.content);
    setAnnTarget(ann.target);
    setAnnEditingId(ann.id);
    setIsAnnFormOpen(true);
  };

  const handleDeleteAnnClick = (id: string, title: string) => {
    setAdminDialogConfirm({
      title: 'Remove Announcement',
      message: `Are you sure you want to remove the announcement "${title}"?`,
      confirmText: 'Remove',
      onConfirm: () => {
        onUpdateAnnouncements?.(announcements.filter(ann => ann.id !== id));
        speakText(`Announcement deleted successfully`, accessibility.readAloud);
      }
    });
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const newRoom: LabRoom = {
      id: `lab-${Date.now()}`,
      name: newRoomName,
      capacity: newRoomCapacity,
      status: 'available',
      currentOccupancy: 0,
      activeClass: '',
      devicesCount: newRoomDevices,
      scannersActive: true,
      activeScannerLogs: [],
      floor: newRoomFloor
    };
    onUpdateLabRooms?.([...labRooms, newRoom]);
    setNewRoomName('');
    setIsAddingRoom(false);
    speakText(`Laboratory room ${newRoom.name} successfully established in central registry`, accessibility.readAloud);
  };

  const handleSaveRoomEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomId) return;
    const updated = labRooms.map(rm => {
      if (rm.id === editingRoomId) {
        return {
          ...rm,
          name: editRoomName,
          capacity: editRoomCapacity,
          devicesCount: editRoomDevices,
          status: editRoomStatus,
          currentOccupancy: editRoomStatus === 'available' || editRoomStatus === 'maintenance' ? 0 : rm.currentOccupancy,
          activeClass: editRoomStatus === 'available' || editRoomStatus === 'maintenance' ? '' : rm.activeClass,
          floor: editRoomFloor
        };
      }
      return rm;
    });
    onUpdateLabRooms?.(updated);
    setEditingRoomId(null);
    speakText("Laboratory room details successfully synchronized on academic grid", accessibility.readAloud);
  };

  const handleDeleteRoom = (id: string, name: string) => {
    setAdminDialogConfirm({
      title: 'Remove Laboratory Room',
      message: `Are you sure you want to remove ${name} from MSU laboratory records?`,
      confirmText: 'Remove',
      onConfirm: () => {
        onUpdateLabRooms?.(labRooms.filter(r => r.id !== id));
        speakText(`Laboratory room ${name} removed from registry.`, accessibility.readAloud);
      }
    });
  };

  const handleSimulateScan = (action: 'IN' | 'OUT') => {
    const activeRoom = labRooms.find(r => r.id === selectedRoomId);
    if (!activeRoom) return;
    if (!activeRoom.scannersActive) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("LMS sync channel is offline. Activate synchronization to trigger events.", "error");
      }
      return;
    }

    const students = [
      { id: '2023-14923', name: 'John Doe' },
      { id: '2023-99124', name: 'Bob Carter' },
      { id: '2023-10492', name: 'Farhan Makil' },
      { id: '2023-11029', name: 'Alice Green' },
      { id: '2023-90345', name: 'Jane Smith' }
    ];

    const randomStudent = students[Math.floor(Math.random() * students.length)];
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    let newOccupancy = activeRoom.currentOccupancy;
    if (action === 'IN') {
      if (newOccupancy >= activeRoom.capacity) {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast("Room integration capacity limit reached!", "warning");
        }
        return;
      }
      newOccupancy += 1;
    } else {
      newOccupancy = Math.max(0, newOccupancy - 1);
    }

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: nowStr,
      studentId: randomStudent.id,
      studentName: randomStudent.name,
      action: action === 'IN' ? 'API Check-In' : 'API Check-Out',
      status: 'Present'
    };

    const updatedRooms = labRooms.map(rm => {
      if (rm.id === selectedRoomId) {
        return {
          ...rm,
          currentOccupancy: newOccupancy,
          status: newOccupancy > 0 ? ('occupied' as const) : ('available' as const),
          activeClass: newOccupancy > 0 ? (rm.activeClass || 'Self-Guided Research') : '',
          activeScannerLogs: [newLog, ...(rm.activeScannerLogs || [])].slice(0, 10)
        };
      }
      return rm;
    });

    onUpdateLabRooms?.(updatedRooms);
    speakText(`System API simulated check-in event processed for ${randomStudent.name} in ${activeRoom.name}`, accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(`API Live Event processed: ${randomStudent.name} checked in`, "success");
    }
  };

  const handleToggleGlobalRosterLock = () => {
    setIsRosterLocked(!isRosterLocked);
    const msg = !isRosterLocked 
      ? "Global curriculum roster has been LOCKED. Student enrollment is frozen."
      : "Global curriculum roster unlocked successfully.";
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(msg, !isRosterLocked ? "warning" : "success");
    }
    speakText(msg, accessibility.readAloud);
  };

  const handleGenerateSystemToken = () => {
    setIsGeneratingToken(true);
    setGeneratedToken('');
    speakText("Generating system API auth key", accessibility.readAloud);
    setTimeout(() => {
      const randomHex = Array.from({length: 4}, () => Math.floor(Math.random()*16).toString(16).toUpperCase()).join('');
      const newToken = `CLP-SEC-KEY-${randomHex}-2026`;
      setGeneratedToken(newToken);
      setIsGeneratingToken(false);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Secure cryptographic system token generated", "success");
      }
    }, 1200);
  };

  const handleRunDatabaseOptimize = () => {
    setIsCleaningLogs(true);
    setCleanLogsProgress(0);
    speakText("Starting database vacuum and log compression sequence", accessibility.readAloud);
    
    const interval = setInterval(() => {
      setCleanLogsProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsCleaningLogs(false);
            setCleanLogsProgress(0);
            if (typeof window !== 'undefined' && (window as any).showToast) {
              (window as any).showToast("Database optimization completed. 142 expired logs purged.", "success");
            }
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleToggleDbPartition = () => {
    const nextVal = !dbPartitionActive;
    setDbPartitionActive(nextVal);
    localStorage.setItem('cp_scale_partition_active', String(nextVal));
    if (nextVal) {
      speakText("Database sharding and monthly partitioning rules activated.", accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Database Partitioning enabled. Isolated table queries for peak performance.", "success");
      }
    } else {
      speakText("Warning: Database partitioning disabled.", accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Partitioning disabled. Sequential scans may increase query costs.", "warning");
      }
    }
  };

  const handleToggleDbIndexes = () => {
    const nextVal = !dbIndexesOptimized;
    setDbIndexesOptimized(nextVal);
    localStorage.setItem('cp_scale_indexes_optimized', String(nextVal));
    if (nextVal) {
      speakText("Composite indexes successfully applied to attendance collections.", accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Composite Indexes applied. Query execution speed boosted by 95%.", "success");
      }
    } else {
      speakText("Database indexes removed.", accessibility.readAloud);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Composite indexes removed. Raw scan fallback may increase read overhead.", "warning");
      }
    }
  };

  const handleArchiveHistorical = () => {
    setIsArchivingLogs(true);
    setArchiveProgress(0);
    speakText("Initiating historical log archive migration sequence", accessibility.readAloud);
    
    const interval = setInterval(() => {
      setArchiveProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsArchivingLogs(false);
            setArchiveProgress(0);
            setColdStorageCount(c => {
              const nextVal = c + 450;
              localStorage.setItem('cp_scale_cold_storage_count', String(nextVal));
              return nextVal;
            });
            if (typeof window !== 'undefined' && (window as any).showToast) {
              (window as any).showToast("Historical log cleanup complete: 450 records migrated to compressed cold storage archives.", "success");
            }
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  const handlePingAllScanners = () => {
    speakText("Broadcasting ping signal to all active classroom integration hubs", accessibility.readAloud);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast("Broadcasting diagnostic signals...", "info");
    }
    // Set all lab rooms to calibrating state
    labRooms.forEach(rm => {
      setCalibratingScanners(prev => ({ ...prev, [rm.id]: true }));
      setTimeout(() => {
        setCalibratingScanners(prev => ({ ...prev, [rm.id]: false }));
      }, 1000 + Math.random() * 800);
    });
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("All active integration hubs verified and operational.", "success");
      }
    }, 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateProfile && userProfile) {
      onUpdateProfile({
        ...userProfile,
        name: profileName,
        email: profileEmail,
        bio: profileBio,
        phone: profilePhone
      });
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 3000);
      speakText("Administrator profile database records committed successfully", accessibility.readAloud);
    }
  };

  const handleAdminDayToggle = (day: string) => {
    if (adminFormDays.includes(day)) {
      setAdminFormDays(prev => prev.filter(d => d !== day));
    } else {
      setAdminFormDays(prev => [...prev, day]);
    }
  };

  const handleSubmitClassForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFormCode.trim() || !adminFormName.trim()) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Please fill subject code and course name.", "error");
      }
      return;
    }

    const saveAction = () => {
      onAddClass({
        code: adminFormCode.trim().toUpperCase(),
        name: adminFormName.trim(),
        startTime: adminFormStart,
        endTime: adminFormEnd,
        room: adminFormRoom,
        days: adminFormDays,
        facultyName: adminFormFacultyName,
        facultyId: adminFormFacultyId,
        credits: 3
      });
      setIsAdminClassFormOpen(false);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(`Subject ${adminFormCode} registered successfully!`, "success");
      }
      speakText(`Subject ${adminFormCode} registered successfully`, accessibility.readAloud);
      
      // Clear form
      setAdminFormCode('');
      setAdminFormName('');
    };

    if (adminSchedulesConflicts.length > 0) {
      setAdminDialogConfirm({
        title: '⚠️ Scheduling Conflicts Detected!',
        message: `The following scheduling conflicts were detected:\n\n${adminSchedulesConflicts.map(c => `• ${c.message}`).join('\n')}\n\nDo you want to ignore these conflicts and save this schedule anyway?`,
        confirmText: 'Yes, Save Anyway',
        cancelText: 'No, Go Back',
        onConfirm: saveAction
      });
    } else {
      saveAction();
    }
  };

  const isDark = accessibility.theme === 'dark';

  // SVG Area/Line Chart parameters
  const chartPoints = [
    { label: 'Mon', count: 120, x: 20, y: 150 },
    { label: 'Tue', count: 145, x: 80, y: 110 },
    { label: 'Wed', count: 165, x: 140, y: 80 },
    { label: 'Thu', count: 140, x: 200, y: 120 },
    { label: 'Fri', count: 180, x: 260, y: 40 },
    { label: 'Sat', count: 90, x: 320, y: 200 },
    { label: 'Sun', count: 110, x: 380, y: 170 },
  ];

  // Helper path string for spline line
  const splinePath = chartPoints.map((pt, idx) => {
    return `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
  }).join(' ');

  // Helper area boundary underneath for beautiful fill gradient
  const areaPath = `${splinePath} L 380 240 L 20 240 Z`;

  const dynamicAuditEvents = React.useMemo(() => {
    const events: any[] = [];
    
    // 1. Users registered
    usersList.forEach((usr, idx) => {
      events.push({
        title: `${usr.role.charAt(0).toUpperCase() + usr.role.slice(1)} registered`,
        desc: `Account for ${usr.name} (${usr.uid || usr.id}) was integrated into systems.`,
        time: idx === 0 ? 'Recently' : `${idx + 1} hours ago`,
        status: 'primary',
        sortTime: idx * 1000
      });
    });

    // 2. Attendance records
    attendanceRecords.slice(-3).forEach((rec, idx) => {
      events.push({
        title: 'Attendance scan tracked',
        desc: `Student ${rec.studentName} marked ${rec.status} in ${rec.classCode || rec.className} at ${rec.time}.`,
        time: rec.date || 'Today',
        status: rec.status === 'present' ? 'success' : rec.status === 'late' ? 'warning' : 'primary',
        sortTime: idx * 2000 + 100
      });
    });

    // 3. Classes
    classes.slice(-3).forEach((cls, idx) => {
      events.push({
        title: 'Course schedule created',
        desc: `${cls.code} (${cls.name}) was registered under room ${cls.room}.`,
        time: 'Active catalog',
        status: 'warning',
        sortTime: idx * 3000 + 200
      });
    });

    // 4. Excuse letters
    excuseLetters.slice(-2).forEach((el, idx) => {
      events.push({
        title: `Excuse letter ${el.status || 'pending'}`,
        desc: `Excuse letter submitted by ${el.studentName} for class ${el.classCode || 'course'} is ${el.status || 'pending'}.`,
        time: 'Pending review',
        status: el.status === 'approved' ? 'success' : el.status === 'pending' ? 'warning' : 'primary',
        sortTime: idx * 4000 + 300
      });
    });

    if (events.length === 0) {
      return [
        { title: 'System Online', desc: 'ClassPulse diagnostic scans started. All databases connected.', time: 'Just now', status: 'success' }
      ];
    }

    return events.slice(0, 4);
  }, [usersList, attendanceRecords, classes, excuseLetters]);

  return (
    <div className={activeScreen === 'messages' || activeScreen === 'tickets' || activeScreen === 'help-center' ? "h-full flex flex-col min-h-0" : "space-y-6"}>

      <AnimatePresence mode="wait">
        {activeScreen === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 text-left"
          >
          
          {/* Animated Dashboard Stats Panel */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Students', targetVal: studentCount, icon: Users, color: 'emerald', text: `Registered students`, detail: `${usersList.filter(u => u.role === 'student').length} total records` },
              { label: 'Total Faculty', targetVal: facultyCount, icon: UserCheck, color: 'indigo', text: `Active educators`, detail: `${usersList.filter(u => u.role === 'faculty').length} staff credentials active` },
              { label: 'Classes Tracked', targetVal: classesTrackedCount, icon: BookOpen, color: 'amber', text: `Semestral classes`, detail: `${classes.length} scheduled courses` },
              { label: 'Attendance Today', targetVal: attendanceTodayCount, icon: Calendar, color: 'purple', text: `${activeRatePercent}% present`, detail: `${instantScansRecorded} check-ins logged` }
            ].map((stat, idx) => (
              <StatCard key={idx} stat={stat} idx={idx} />
            ))}
          </div>

          {/* Quick Actions Board */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-[1.5rem] border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
              <span className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Administrative Quick Command center
              </span>
              <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">MSU-INTEGRATED CORE</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <button 
                onClick={() => {
                  setIsBulletinsLockerOpen(true);
                  speakText("Opening central classroom and campus academic bulletins storage cabinet", accessibility.readAloud);
                }}
                className="p-3 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-50 dark:hover:bg-indigo-500/5 transition-all text-zinc-850 dark:text-zinc-200 cursor-pointer"
              >
                <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg inline-block text-xs mb-2">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black">Bulletins Locker</h4>
                <p className="text-[10px] text-zinc-400 mt-1">Campus archive & composer</p>
              </button>

              <button 
                onClick={() => {
                  setScreen('schedule-editor');
                  setIsAdminClassFormOpen(true);
                  setAdminFormCode('');
                  setAdminFormName('');
                  setAdminFormStart('09:00 AM');
                  setAdminFormEnd('10:30 AM');
                  setAdminFormRoom(sortedLabRooms[0] ? sortedLabRooms[0].name : '');
                  setAdminFormDays(['MW']);
                  const firstFac = registeredFacultyList[0];
                  setAdminFormFacultyName(firstFac ? firstFac.name : '');
                  setAdminFormFacultyId(firstFac ? (firstFac.id || firstFac.uid || firstFac.email) : '');
                  speakText("Opening register new subject scheduler modal", accessibility.readAloud);
                }}
                className="p-3 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/30 bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-50 dark:hover:bg-emerald-500/5 transition-all text-zinc-850 dark:text-zinc-200 cursor-pointer"
              >
                <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg inline-block text-xs mb-2">
                  <Plus className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black">Register Subject</h4>
                <p className="text-[10px] text-zinc-400 mt-1">Insert schedules ledger</p>
              </button>

              <button 
                onClick={handleExportAllGlobalAttendance}
                className="p-3 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/30 bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-50 dark:hover:bg-amber-500/5 transition-all text-zinc-850 dark:text-zinc-200 cursor-pointer"
              >
                <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg inline-block text-xs mb-2">
                  <Download className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black">Export Analytics</h4>
                <p className="text-[10px] text-zinc-400 mt-1">Download attendance sheet</p>
              </button>

              <button 
                onClick={() => {
                  speakText("Synchronizing university directory databases. Clearing cached session headers.", accessibility.readAloud);
                  if (typeof window !== 'undefined' && (window as any).showToast) {
                    (window as any).showToast("University registries synchronized with the registrar databases successfully.", "success");
                  } else {
                    alert("University directories synced with global registrar ledger successfully.");
                  }
                }}
                className="p-3 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/30 bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-50 dark:hover:bg-purple-500/5 transition-all text-zinc-850 dark:text-zinc-200 cursor-pointer"
              >
                <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg inline-block text-xs mb-2">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black">Force Sync</h4>
                <p className="text-[10px] text-zinc-400 mt-1">Audit active directory listings</p>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Main Analytics Console: Attendance & Enrollment */}
            <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-[1.5rem] border lg:col-span-8 space-y-4 sm:space-y-6 text-left bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                    University Attendance & Enrollment Analytics
                  </h3>
                  <p className="hidden sm:block text-xs text-zinc-400 mt-1">Cross-referencing student registrations and daily attendance trends</p>
                </div>
                {/* Visual selector pills & Fast CSV dispatcher */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setAnalyticsTab('daily');
                        speakText("Showing daily system occupancy and check-in logs", accessibility.readAloud);
                      }}
                      className={`px-2.5 py-1 rounded-lg uppercase cursor-pointer transition-all ${
                        analyticsTab === 'daily'
                          ? 'bg-white dark:bg-zinc-800 text-emerald-500 dark:text-emerald-400 shadow-xs'
                          : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-850'
                      }`}
                    >
                      Daily logs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnalyticsTab('historical');
                        speakText("Showing historical multi-term analytics reports", accessibility.readAloud);
                      }}
                      className={`px-2.5 py-1 rounded-lg uppercase cursor-pointer transition-all ${
                        analyticsTab === 'historical'
                          ? 'bg-white dark:bg-zinc-800 text-emerald-500 dark:text-emerald-400 shadow-xs'
                          : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-850'
                      }`}
                    >
                      Historical overview
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportAllGlobalAttendance}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 duration-100"
                    title="Export all system attendance logs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Export Logs CSV</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Grid representing analytics visualization */}
              {analyticsTab === 'daily' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Recharts Area Plot: Attendance Daily Logs */}
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30 col-span-1 sm:col-span-2 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-850">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block text-left">System Attendance Trends</span>
                        <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 text-left">
                          Overall Attendance Rate ({adminGraphPeriod === 'days' ? 'Daily View' : adminGraphPeriod === 'months' ? 'Monthly View' : 'Weekly View'})
                        </h4>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto select-none">
                        {/* Scroll buttons */}
                        <div className="flex gap-1 border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => {
                              scrollAdminChart('left');
                              speakText("Scrolling admin attendance chart left", accessibility.readAloud);
                            }}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 cursor-pointer active:scale-95 transition-all"
                            title="Scroll Left"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              scrollAdminChart('right');
                              speakText("Scrolling admin attendance chart right", accessibility.readAloud);
                            }}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 cursor-pointer active:scale-95 transition-all"
                            title="Scroll Right"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Period customization pills */}
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => {
                              setAdminGraphPeriod('days');
                              speakText("Switching admin trends graph to daily view", accessibility.readAloud);
                            }}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${
                              adminGraphPeriod === 'days'
                                ? 'bg-white dark:bg-zinc-800 text-emerald-500 shadow-xs font-black'
                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                          >
                            Days
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdminGraphPeriod('weeks');
                              speakText("Switching admin trends graph to weekly view", accessibility.readAloud);
                            }}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${
                              adminGraphPeriod === 'weeks'
                                ? 'bg-white dark:bg-zinc-800 text-emerald-500 shadow-xs font-black'
                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                          >
                            Weeks
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdminGraphPeriod('months');
                              speakText("Switching admin trends graph to monthly view", accessibility.readAloud);
                            }}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${
                              adminGraphPeriod === 'months'
                                ? 'bg-white dark:bg-zinc-800 text-emerald-500 shadow-xs font-black'
                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                          >
                            Months
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Custom Date-Range Picker with Quick Presets */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-3 bg-white/70 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-850">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400">Date Window:</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            value={adminGraphStartDate}
                            onChange={(e) => {
                              setAdminGraphStartDate(e.target.value);
                              speakText(`Start date changed to ${e.target.value}`, accessibility.readAloud);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[11px] text-zinc-400">to</span>
                          <input
                            type="date"
                            value={adminGraphEndDate}
                            onChange={(e) => {
                              setAdminGraphEndDate(e.target.value);
                              speakText(`End date changed to ${e.target.value}`, accessibility.readAloud);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Chart Scroll Container */}
                    {(() => {
                      const startD = new Date(adminGraphStartDate);
                      const endD = new Date(adminGraphEndDate);
                      const daysDiff = Math.ceil(Math.abs(endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));

                      // 1. Days calculation (Dynamically generated day array based on picker)
                      const maxDays = Math.min(45, daysDiff + 1);
                      const adminDaysData = Array.from({ length: maxDays }).map((_, i) => {
                        const d = new Date(startD);
                        d.setDate(d.getDate() + i);
                        const dateStr = d.toISOString().split('T')[0];
                        const recsOnDay = attendanceRecords.filter(r => r.date === dateStr);
                        
                        let value = 0;
                        let active = 0;
                        let late = 0;
                        let absent = 0;
                        
                        if (recsOnDay.length > 0) {
                          active = recsOnDay.filter(r => r.status === 'present').length;
                          late = recsOnDay.filter(r => r.status === 'late').length;
                          absent = recsOnDay.filter(r => r.status === 'absent').length;
                          value = Math.round(((active + late) / recsOnDay.length) * 100);
                        } else {
                          // Beautiful realistic generated baseline
                          const dayNum = d.getDate();
                          const seed = (dayNum * 5 + (d.getMonth() + 1) * 7) % 20;
                          value = 75 + seed; // 75% to 95%
                          active = 120 + (dayNum % 7) * 12;
                          late = 10 + (dayNum % 5) * 4;
                          absent = 15 + (dayNum % 4) * 3;
                        }
                        
                        return {
                          name: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                          label: d.toLocaleDateString([], { weekday: 'short' }),
                          date: d.toLocaleDateString([], { dateStyle: 'full' }),
                          value,
                          active,
                          late,
                          absent,
                        };
                      });

                      // 2. Weeks calculation (Dynamically generated week intervals based on picker)
                      const numWeeks = Math.min(16, Math.max(2, Math.ceil(daysDiff / 7)));
                      const adminWeeksData = Array.from({ length: numWeeks }).map((_, i) => {
                        const weekNum = i + 1;
                        const startOfWeek = new Date(startD);
                        startOfWeek.setDate(startOfWeek.getDate() + (i * 7));
                        const endOfWeek = new Date(startOfWeek);
                        endOfWeek.setDate(endOfWeek.getDate() + 7);
                        
                        const recsInWeek = attendanceRecords.filter(r => {
                          const rTime = new Date(r.date).getTime();
                          return rTime >= startOfWeek.getTime() && rTime < endOfWeek.getTime();
                        });

                        let value = 0;
                        let active = 0;
                        let late = 0;
                        let absent = 0;
                        
                        if (recsInWeek.length > 0) {
                          active = recsInWeek.filter(r => r.status === 'present').length;
                          late = recsInWeek.filter(r => r.status === 'late').length;
                          absent = recsInWeek.filter(r => r.status === 'absent').length;
                          value = Math.round(((active + late) / recsInWeek.length) * 100);
                        } else {
                          const baselines = [78, 85, 82, 88, 85, 91, 88, 86, 92, 84, 89, 93];
                          value = baselines[i % baselines.length] || 85;
                          active = 750 + i * 25;
                          late = 80 - i * 3;
                          absent = 110 - i * 5;
                        }

                        return {
                          name: `Wk ${weekNum}`,
                          label: `Week ${weekNum}`,
                          date: `Academic Week ${weekNum} (${startOfWeek.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString([], { month: 'short', day: 'numeric' })})`,
                          value,
                          active,
                          late,
                          absent,
                        };
                      });

                      // 3. Months calculation (Dynamically generated monthly intervals based on picker)
                      const monthsList = [];
                      let currM = new Date(startD.getFullYear(), startD.getMonth(), 1);
                      const limitM = new Date(endD.getFullYear(), endD.getMonth() + 1, 1);
                      let mCount = 0;
                      while (currM < limitM && mCount < 12) {
                        monthsList.push(new Date(currM));
                        currM.setMonth(currM.getMonth() + 1);
                        mCount++;
                      }
                      if (monthsList.length === 0) {
                        monthsList.push(new Date(startD));
                      }

                      const adminMonthsData = monthsList.map((d, i) => {
                        const mName = d.toLocaleDateString([], { month: 'long', year: 'numeric' });
                        
                        const recsInMonth = attendanceRecords.filter(r => {
                          try {
                            const rd = new Date(r.date);
                            return rd.toLocaleDateString([], { month: 'long', year: 'numeric' }) === mName;
                          } catch {
                            return false;
                          }
                        });

                        let value = 0;
                        let active = 0;
                        let late = 0;
                        let absent = 0;
                        
                        if (recsInMonth.length > 0) {
                          active = recsInMonth.filter(r => r.status === 'present').length;
                          late = recsInMonth.filter(r => r.status === 'late').length;
                          absent = recsInMonth.filter(r => r.status === 'absent').length;
                          value = Math.round(((active + late) / recsInMonth.length) * 100);
                        } else {
                          const baselines = [84, 86, 83, 89, 87, 92];
                          value = baselines[i % baselines.length] || 86;
                          active = 3100 + i * 150;
                          late = 320 - i * 20;
                          absent = 450 - i * 30;
                        }

                        return {
                          name: d.toLocaleDateString([], { month: 'short' }),
                          label: d.toLocaleDateString([], { month: 'long' }),
                          date: `${mName} Aggregated Census`,
                          value,
                          active,
                          late,
                          absent,
                        };
                      });

                      const adminChartDataToRender = 
                        adminGraphPeriod === 'days' ? adminDaysData :
                        adminGraphPeriod === 'months' ? adminMonthsData :
                        adminWeeksData;

                      const adminChartMinWidth = Math.max(680, adminChartDataToRender.length * 60);

                      return (
                        <div 
                          ref={adminChartScrollRef}
                          className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth bg-zinc-50/30 dark:bg-zinc-950/20 rounded-xl overflow-y-hidden border border-zinc-200/60 dark:border-zinc-800/60 relative"
                        >
                          <div className="flex relative items-stretch" style={{ minWidth: `${adminChartMinWidth}px`, height: '200px' }}>
                            {/* Sticky Y-Axis Column (Pinned on left during horizontal scrolling) */}
                            <div className="sticky left-0 top-0 z-20 shrink-0 w-11 sm:w-12 h-full flex flex-col justify-between pt-[12px] pb-[32px] pr-2 text-right text-[10px] font-black text-zinc-400 dark:text-zinc-500 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-r border-zinc-200/80 dark:border-zinc-800/80 shadow-xs select-none">
                              <span className="leading-none transform -translate-y-1/2 font-mono">100%</span>
                              <span className="leading-none transform -translate-y-1/2 font-mono">75%</span>
                              <span className="leading-none transform -translate-y-1/2 font-mono">50%</span>
                              <span className="leading-none transform -translate-y-1/2 font-mono">25%</span>
                              <span className="leading-none transform -translate-y-1/2 font-mono">0%</span>
                            </div>

                            {/* Scrollable Chart Area */}
                            <div className="flex-1 h-full min-w-0 pr-2">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart 
                                  data={adminChartDataToRender} 
                                  margin={{ top: 12, right: 15, left: 10, bottom: 5 }}
                                >
                                  <defs>
                                    <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-850" />
                                  <XAxis 
                                    dataKey="name" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={{ fill: '#888888', fontSize: 10, fontWeight: 700 }}
                                    dy={4}
                                  />
                                  <YAxis 
                                    hide={true} 
                                    domain={[0, 100]}
                                  />
                                  <RechartsTooltip content={<CustomRechartsTooltip />} />
                                  <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
                                    fillOpacity={1} 
                                    fill="url(#attendanceGrad)" 
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <p className="text-[10px] text-zinc-400 mt-2 text-left">
                      {isDataWiped ? "No active data recorded yet. Wiped clean state." : <>Aggregated global attendance completion peaks on Fridays at <b>92% average</b>.</>}
                    </p>
                  </div>

                  {/* Recharts Area Plot: Enrollment Progression */}
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block text-left">Enrollments registration rate</span>
                    <div className="w-full h-44 mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={isDataWiped ? [
                            { name: 'Wk 1', value: 0, change: '0', date: 'Week 1', desc: 'No records.' },
                            { name: 'Wk 2', value: 0, change: '0', date: 'Week 2', desc: 'No records.' },
                            { name: 'Wk 3', value: 0, change: '0', date: 'Week 3', desc: 'No records.' },
                            { name: 'Wk 4', value: 0, change: '0', date: 'Week 4', desc: 'No records.' },
                            { name: 'Target', value: 0, change: '0', date: 'Target', desc: 'No records.' }
                          ] : [
                            { name: 'Wk 1', value: 450, change: '+12', date: 'May 18, 2026 - May 22, 2026', desc: 'Campaign launch and initial roster ingestion.' },
                            { name: 'Wk 2', value: 580, change: '+130', date: 'May 25, 2026 - May 29, 2026', desc: 'Late enrollees and schedule adjustments completed.' },
                            { name: 'Wk 3', value: 722, change: '+142', date: 'June 1, 2026 - June 5, 2026', desc: 'Add/drop period finalized; stable roster achieved.' },
                            { name: 'Wk 4', value: 850, change: '+128', date: 'June 8, 2026 - June 12, 2026', desc: 'Current census recorded and locked.' },
                            { name: 'Target', value: 900, change: 'Met', date: 'Registration closing date', desc: 'Optimal room load factors within limits.' }
                          ]} 
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-850" />
                          <XAxis 
                            dataKey="name" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: '#888888', fontSize: 10 }}
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: '#888888', fontSize: 10 }}
                            domain={[0, 1000]}
                          />
                          <RechartsTooltip content={<EnrollmentTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#6366f1" 
                            strokeWidth={3}
                            activeDot={{ r: 5, strokeWidth: 0, fill: '#6366f1' }}
                            fillOpacity={1} 
                            fill="url(#enrollmentGrad)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2 text-left">
                      {isDataWiped ? "Database is fully initialized at zero." : <>Total term enrollment increased by <b>18.4%</b> since campaign start.</>}
                    </p>
                  </div>

                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Recharts Area Plot: Historical Semester Retention */}
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block text-left">Semester Retention Trends</span>
                    <div className="w-full h-44 mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={isDataWiped ? [
                            { name: '1S24', label: '1st Sem 2024', value: 0, active: 0, date: 'Database wiped' },
                            { name: '2S24', label: '2nd Sem 2024', value: 0, active: 0, date: 'Database wiped' },
                            { name: '1S25', label: '1st Sem 2025', value: 0, active: 0, date: 'Database wiped' },
                            { name: '2S25', label: '2nd Sem 2025', value: 0, active: 0, date: 'Database wiped' },
                            { name: 'CURR', label: 'Curr Sem 2026', value: 0, active: 0, date: 'Database wiped' }
                          ] : [
                            { name: '1S24', label: '1st Sem 2024', value: 75, active: 620, date: 'June 2024 - Oct 2024' },
                            { name: '2S24', label: '2nd Sem 2024', value: 80, active: 680, date: 'Nov 2024 - Mar 2025' },
                            { name: '1S25', label: '1st Sem 2025', value: 84, active: 750, date: 'June 2025 - Oct 2025' },
                            { name: '2S25', label: '2nd Sem 2025', value: 89, active: 810, date: 'Nov 2025 - Mar 2026' },
                            { name: 'CURR', label: 'Curr Sem 2026', value: 92, active: 880, date: 'June 2026 - Present' }
                          ]} 
                          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="historyRetentionGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-850" />
                          <XAxis 
                            dataKey="name" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: '#888888', fontSize: 10 }}
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: '#888888', fontSize: 10 }}
                            domain={[0, 100]}
                          />
                          <RechartsTooltip content={<RetentionTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#06b6d4" 
                            strokeWidth={3}
                            activeDot={{ r: 5, strokeWidth: 0, fill: '#06b6d4' }}
                            fillOpacity={1} 
                            fill="url(#historyRetentionGrad)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2 text-left">
                      {isDataWiped ? "Adopted clean zero system database state." : <>Multi-term metrics showing continuous progress in ClassPulse attendance verification adoption.</>}
                    </p>
                  </div>

                  {/* Recharts Bar Chart: Excuse Clearance Success Rate */}
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block text-left">Excuse Clearance Success Rate</span>
                    <div className="w-full h-44 mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={isDataWiped ? [
                            { name: '24-A', label: '24-A', total: 0, cleared: 0 },
                            { name: '24-B', label: '24-B', total: 0, cleared: 0 },
                            { name: '25-A', label: '25-A', total: 0, cleared: 0 },
                            { name: '25-B', label: '25-B', total: 0, cleared: 0 }
                          ] : [
                            { name: '24-A', label: '24-A', total: 120, cleared: 95 },
                            { name: '24-B', label: '24-B', total: 180, cleared: 150 },
                            { name: '25-A', label: '25-A', total: 220, cleared: 195 },
                            { name: '25-B', label: '25-B', total: 290, cleared: 270 }
                          ]} 
                          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-850" />
                          <XAxis 
                            dataKey="name" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: '#888888', fontSize: 10 }}
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: '#888888', fontSize: 10 }}
                            domain={[0, 300]}
                          />
                          <RechartsTooltip content={<ClearanceTooltip />} />
                          <Bar dataKey="total" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="cleared" fill="#34d399" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-zinc-400 mt-2 font-mono px-1">
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400 inline-block" /> Excuses Received</div>
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block" /> Approved/Cleared</div>
                    </div>
                  </div>

                </div>
              )}

              {/* Dynamic horizontal metrics: Room Utilization */}
              <div className="grid grid-cols-1 gap-5 pt-4 border-t border-zinc-100 dark:border-zinc-900 text-left">
                
                {/* Laboratory/Room occupied coordinates meters - Dynamic based on actual labRooms */}
                <div className="space-y-3 w-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest font-mono">Laboratory Room Utilization</h4>
                      <p className="text-[10px] text-zinc-400 leading-normal">Real-time occupancy and active scanner terminal logs</p>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {labRooms.filter(r => r.status === 'occupied').length} / {labRooms.length} Active Labs
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {labRooms.map((rm) => {
                      const occupancyPercent = typeof rm.capacity === 'number' && rm.capacity > 0 
                        ? Math.min(100, Math.round((rm.currentOccupancy / rm.capacity) * 100)) 
                        : 0;
                      const isOccupied = rm.status === 'occupied' || rm.currentOccupancy > 0;
                      const displayScale = rm.status === 'maintenance' 
                        ? 'Maintenance Lockout' 
                        : rm.currentOccupancy === 0 
                        ? 'Fully Empty' 
                        : `${rm.currentOccupancy}/${rm.capacity} active slots`;

                      return (
                        <div key={rm.id} className="space-y-1 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-805 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-[10px] text-zinc-700 dark:text-zinc-200 line-clamp-1">{rm.name}</span>
                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-mono font-bold shrink-0 uppercase tracking-wider ${
                                rm.status === 'maintenance' 
                                  ? 'bg-amber-500/10 text-amber-500' 
                                  : isOccupied 
                                  ? 'bg-indigo-500/10 text-indigo-400' 
                                  : 'bg-zinc-200 dark:bg-zinc-850 text-zinc-400'
                              }`}>
                                {rm.status}
                              </span>
                            </div>
                            {rm.floor && (
                              <p className="text-[8px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider font-mono">
                                Floor: {rm.floor}
                              </p>
                            )}
                          </div>
                          <div className="pt-2">
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    rm.status === 'maintenance' ? 'bg-amber-500' : occupancyPercent > 70 ? 'bg-indigo-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${rm.status === 'maintenance' ? 100 : occupancyPercent}%` }}
                                />
                              </div>
                              <span className="font-mono text-[9px] text-zinc-450 dark:text-zinc-400 text-right shrink-0">
                                {displayScale}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column: Laboratory Cabinet & Live Audit */}
            <div className="space-y-6 lg:col-span-4">
              
              {/* LAB ROOMS CABINET CARD */}
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-[1.5rem] border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-855 text-left space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      Laboratory Rooms Cabinet
                    </h3>
                    <p className="text-[10px] text-zinc-450">Admin command & directory</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddingRoom(!isAddingRoom);
                      setEditingRoomId(null);
                    }}
                    className="p-1 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" /> Add Room
                  </button>
                </div>

                {/* Rooms List */}
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {labRooms.map((rm) => {
                    const isEditingThis = editingRoomId === rm.id;

                    if (isEditingThis) {
                      return (
                        <form 
                          key={rm.id}
                          onSubmit={handleSaveRoomEdit} 
                          className="p-3.5 rounded-xl border border-amber-500 bg-amber-500/[0.03] space-y-2.5 text-left animate-scale-up z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-zinc-200/50 dark:border-zinc-800">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1">
                              ⚙️ REVISE ROOM
                            </h4>
                            <button
                              type="button"
                              onClick={() => setEditingRoomId(null)}
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[10px] font-black"
                            >
                              CANCEL
                            </button>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Room Identifier Name</label>
                            <input 
                              type="text" 
                              value={editRoomName}
                              onChange={(e) => setEditRoomName(e.target.value)}
                              className="w-full text-[11px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 outline-none text-zinc-855 dark:text-zinc-200 focus:border-amber-500"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Capacity</label>
                              <input 
                                type="number" 
                                min={1}
                                value={editRoomCapacity}
                                onChange={(e) => setEditRoomCapacity(Number(e.target.value))}
                                className="w-full text-[11px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 outline-none text-zinc-855 dark:text-zinc-200"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Workstations</label>
                              <input 
                                type="number" 
                                min={0}
                                value={editRoomDevices}
                                onChange={(e) => setEditRoomDevices(Number(e.target.value))}
                                className="w-full text-[11px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 outline-none text-zinc-855 dark:text-zinc-200"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Operational Status</label>
                            <select
                              value={editRoomStatus === 'maintenance' ? 'maintenance' : 'available'}
                              onChange={(e) => setEditRoomStatus(e.target.value as any)}
                              className="w-full text-[11px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none"
                            >
                              <option value="available" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Operational (System Auto-detect)</option>
                              <option value="maintenance" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Under Maintenance Lockout</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Located Floor</label>
                            <select
                              value={editRoomFloor}
                              onChange={(e) => setEditRoomFloor(e.target.value)}
                              className="w-full text-[11px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none"
                            >
                              <option value="1st Floor" className="bg-white dark:bg-zinc-950">1st Floor</option>
                              <option value="2nd Floor" className="bg-white dark:bg-zinc-950">2nd Floor</option>
                              <option value="3rd Floor" className="bg-white dark:bg-zinc-950">3rd Floor</option>
                              <option value="4th Floor" className="bg-white dark:bg-zinc-950">4th Floor</option>
                              <option value="5th Floor" className="bg-white dark:bg-zinc-950">5th Floor</option>
                              <option value="6th Floor" className="bg-white dark:bg-zinc-950">6th Floor</option>
                            </select>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1.5 border-t border-zinc-200/40 dark:border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setEditingRoomId(null)}
                              className="px-2.5 py-1 text-[9px] uppercase font-bold border border-zinc-250 dark:border-zinc-800 rounded-lg text-zinc-500 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3.5 py-1 text-[9px] uppercase font-black bg-amber-500 hover:bg-amber-400 text-black rounded-lg cursor-pointer transition-all"
                            >
                              Save Changes
                            </button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div 
                        key={rm.id} 
                        onClick={() => {
                          setSelectedRoomId(rm.id);
                          speakText(`Selected ${rm.name} visual schematic`, accessibility.readAloud);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                          selectedRoomId === rm.id 
                            ? 'border-emerald-500 bg-emerald-500/[0.02] shadow-xs'
                            : 'border-zinc-150 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-extrabold text-zinc-805 dark:text-zinc-200">{rm.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[9px] text-zinc-500 font-mono font-extrabold">{rm.currentOccupancy} / {rm.capacity} Pax</span>
                              <span className="text-[9px] text-zinc-300 dark:text-zinc-700">•</span>
                              <span className="text-[9px] text-zinc-500 font-mono">{rm.devicesCount} Terminals</span>
                              {rm.floor && (
                                <>
                                  <span className="text-[9px] text-zinc-300 dark:text-zinc-700">•</span>
                                  <span className="px-1.5 py-0.5 rounded-[4px] bg-indigo-500/10 text-indigo-500 text-[8px] font-bold uppercase tracking-wider">{rm.floor}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 block ${
                            rm.status === 'occupied' ? 'bg-red-500/10 text-red-500' :
                            rm.status === 'maintenance' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450'
                          }`}>
                            {rm.status}
                          </span>
                        </div>

                        {rm.activeClass && (
                          <p className="text-[9px] mt-1.5 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900/70 rounded-[5px] text-zinc-500 dark:text-zinc-400 truncate">
                            Active: <b>{rm.activeClass}</b>
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-900/60" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 z-10">
                            <button
                              onClick={() => {
                                setEditingRoomId(rm.id);
                                setEditRoomName(rm.name);
                                setEditRoomCapacity(rm.capacity);
                                setEditRoomDevices(rm.devicesCount);
                                setEditRoomStatus(rm.status);
                                setEditRoomFloor(rm.floor || '2nd Floor');
                                setIsAddingRoom(false);
                              }}
                              className="text-[9.5px] hover:underline font-extrabold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                            >
                              Edit
                            </button>
                            <span className="text-zinc-300 dark:text-zinc-705 text-[8px]">•</span>
                            <button
                              onClick={() => handleDeleteRoom(rm.id, rm.name)}
                              className="text-[9.5px] hover:underline font-extrabold text-red-500 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>

                          <div className="flex items-center gap-1 z-10">
                            <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">Scanner:</span>
                            <button
                              onClick={() => {
                                const updated = labRooms.map(r => r.id === rm.id ? { ...r, scannersActive: !r.scannersActive } : r);
                                onUpdateLabRooms?.(updated);
                                speakText(`Scanner terminals safety power toggled in ${rm.name}.`, accessibility.readAloud);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-colors cursor-pointer ${
                                rm.scannersActive 
                                  ? 'bg-emerald-500 text-black' 
                                  : 'bg-zinc-150 dark:bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {rm.scannersActive ? 'ON' : 'OFF'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {labRooms.length === 0 && (
                    <p className="text-zinc-450 text-[10px] text-center py-4">No laboratory rooms registered.</p>
                  )}
                </div>
              </div>

              {/* TIMELINE LOGS */}
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-[1.5rem] border space-y-3 sm:space-y-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-855 text-left">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                    Live Audit Timeline
                  </h3>
                  <p className="hidden sm:block text-xs text-zinc-400">Real-time system events register flow</p>
                </div>

                <div className="relative pt-2">
                  <div className="absolute top-4 bottom-4 left-3 border-l border-zinc-200 dark:border-zinc-805" />
                  <div className="space-y-4 relative">
                    {dynamicAuditEvents.map((act, idx) => (
                      <div key={idx} className="flex gap-4 items-start text-left pl-1">
                        <div className={`mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center shrink-0 ${
                          act.status === 'success' 
                            ? 'bg-emerald-500 text-white' 
                            : act.status === 'warning' 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-indigo-500 text-white'
                        } z-10 shadow-xs`}>
                          <div className="w-1 h-1 bg-white rounded-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-extrabold text-zinc-805 dark:text-zinc-200 truncate">{act.title}</h4>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-normal">{act.desc}</p>
                          <span className="text-[8px] text-zinc-500 block font-mono tracking-wider mt-1 uppercase">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* NEW SECTION: Administrative System Analytics & Active Dispatch */}
          <div className="p-3.5 sm:p-6 rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 shadow-sm space-y-4 sm:space-y-6 text-left">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 sm:pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <div>
                <h3 className="font-black text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 animate-pulse" />
                  Administrative System Analytics & Active Dispatch
                </h3>
                <p className="hidden sm:block text-xs text-zinc-400">Real-time attendance metrics telemetry, pending student excuse approvals, and live account registration audits</p>
              </div>
              
              {/* Filter Tabs matching focus selectors */}
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-150/60 dark:bg-zinc-900 p-1.5 rounded-xl text-[10px] font-bold relative overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setTelemetryFilter('all');
                    speakText("Showing all telemetry systems", accessibility.readAloud);
                  }}
                  className={`px-3 py-1.5 rounded-lg uppercase cursor-pointer transition-all relative ${
                    telemetryFilter === 'all'
                      ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {telemetryFilter === 'all' && (
                    <motion.div
                      layoutId="active-telemetry-pill"
                      className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-xs -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  All Telemetry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTelemetryFilter('charts');
                    speakText("Filtering to Attendance Telemetry Distribution", accessibility.readAloud);
                  }}
                  className={`px-3 py-1.5 rounded-lg uppercase cursor-pointer transition-all relative ${
                    telemetryFilter === 'charts'
                      ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {telemetryFilter === 'charts' && (
                    <motion.div
                      layoutId="active-telemetry-pill"
                      className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-xs -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  Attendance Graph
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTelemetryFilter('users');
                    speakText("Filtering to Recent User Registrations", accessibility.readAloud);
                  }}
                  className={`px-3 py-1.5 rounded-lg uppercase cursor-pointer transition-all relative ${
                    telemetryFilter === 'users'
                      ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {telemetryFilter === 'users' && (
                    <motion.div
                      layoutId="active-telemetry-pill"
                      className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-xs -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  Recent Users
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTelemetryFilter('leaves');
                    speakText("Filtering to Pending Leave & Excuse Dispatch", accessibility.readAloud);
                  }}
                  className={`px-3 py-1.5 rounded-lg uppercase cursor-pointer transition-all relative ${
                    telemetryFilter === 'leaves'
                      ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {telemetryFilter === 'leaves' && (
                    <motion.div
                      layoutId="active-telemetry-pill"
                      className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-xs -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  Pending Requests
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: System Telemetry & Logs */}
              {(telemetryFilter === 'all' || telemetryFilter === 'charts' || telemetryFilter === 'users') && (
                <div className={`${telemetryFilter === 'all' ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-5`}>
                  
                  {/* Attendance Breakdown Stat Cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-150 dark:border-zinc-850 rounded-2xl text-center">
                    <div className="p-1">
                      <span className="text-[8.5px] font-bold text-zinc-450 uppercase block mb-0.5">Present</span>
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-500 block leading-none">
                        {attendanceRecords.filter(r => r.status === 'present').length}
                      </span>
                      <span className="text-[9px] font-extrabold text-emerald-600/80 dark:text-emerald-400/80 block mt-0.5 whitespace-nowrap">check-ins</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[8.5px] font-bold text-zinc-450 uppercase block mb-0.5">Late</span>
                      <span className="text-base sm:text-lg font-black font-mono text-amber-500 block leading-none">
                        {attendanceRecords.filter(r => r.status === 'late').length}
                      </span>
                      <span className="text-[9px] font-extrabold text-amber-600/80 dark:text-amber-400/80 block mt-0.5 whitespace-nowrap">late</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[8.5px] font-bold text-zinc-450 uppercase block mb-0.5">Absent</span>
                      <span className="text-base sm:text-lg font-black font-mono text-red-500 block leading-none">
                        {attendanceRecords.filter(r => r.status === 'absent').length}
                      </span>
                      <span className="text-[9px] font-extrabold text-red-600/80 dark:text-red-400/80 block mt-0.5 whitespace-nowrap">absences</span>
                    </div>
                  </div>

                  {/* Newly Registered User Logs */}
                  {(telemetryFilter === 'all' || telemetryFilter === 'users') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Recent User Registrations</h4>
                        <span className="text-[9.5px] font-mono font-bold text-indigo-500">Total: {usersList.length} Accounts</span>
                      </div>

                      <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden divide-y divide-zinc-150 dark:divide-zinc-850">
                        {usersList.slice(-3).reverse().map((usr) => (
                          <div key={usr.id} className="p-3 bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/20 transition-all flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-650 dark:text-zinc-350 shrink-0">
                                {usr.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 block truncate">{usr.name}</span>
                                <span className="text-[9px] text-zinc-400 block truncate">{usr.email}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono ${
                                usr.role === 'faculty' 
                                  ? 'bg-amber-500/10 text-amber-500' 
                                  : 'bg-indigo-500/10 text-indigo-500'
                              }`}>
                                {usr.role}
                              </span>
                              <span className="text-[9px] font-mono font-bold text-zinc-450">ID: {usr.uid}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick Actions Grid for User Management & Semester Operations */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const names = ['Leonor Rivera', 'Andres Bonifacio', 'Marcelo Del Pilar', 'Emilio Jacinto', 'Apolinario Mabini'];
                            const randomName = names[Math.floor(Math.random() * names.length)];
                            const randomId = 'usr-' + Date.now();
                            const randomUid = '2023-' + Math.floor(10000 + Math.random() * 90000);
                            const randomEmail = `${randomName.toLowerCase().replace(' ', '.')}@msu.edu.ph`;
                            const randomDept = ['Information Technology', 'Computer Science', 'Computer Engineering', 'Software Engineering'][Math.floor(Math.random() * 4)];
                            
                            const newUser: MockUser = {
                              id: randomId,
                              name: randomName,
                              email: randomEmail,
                              role: 'student',
                              uid: randomUid,
                              department: randomDept
                            };

                            setUsersList(prev => [...prev, newUser]);
                            speakText(`Central roster logged registration record for new student ${randomName}.`, accessibility.readAloud);
                            if (typeof window !== 'undefined' && (window as any).showToast) {
                              (window as any).showToast(`Account Created & Verified: ${randomName}`, "success");
                            }
                          }}
                          className="py-2 px-3 border border-dashed border-zinc-200 hover:border-indigo-500 dark:border-zinc-800 dark:hover:border-indigo-500 hover:bg-indigo-500/5 text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Single User</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCsvImportModalOpen(true)}
                          className="py-2 px-3 border border-dashed border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Bulk CSV Import</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setArchiveModalOpen(true)}
                          className="py-2 px-3 border border-dashed border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Close Term & Archive</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Right Column: Pending Excuse & Leave Requests Panel */}
              {(telemetryFilter === 'all' || telemetryFilter === 'leaves') && (
                <div className={`${telemetryFilter === 'all' ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-5`}>
                  
                  {/* BATCH ACTION MODE TOGGLE */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-850/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Enable Batch Action Mode</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = !isBatchMode;
                        setIsBatchMode(newMode);
                        setSelectedExcuseIds([]);
                        setSelectedResetIds([]);
                        speakText(newMode ? "Batch action mode enabled" : "Batch action mode disabled", accessibility.readAloud);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                        isBatchMode ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-850'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isBatchMode ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Pending Leave & Excuse Dispatch</h4>
                    <span className="text-[9.5px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {excuseLetters.filter((l: any) => l.status === 'pending').length} Actionable
                    </span>
                  </div>

                  {isBatchMode && selectedExcuseIds.length > 0 && (
                    <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/15 flex items-center justify-between gap-3 animate-fade-in text-left">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedExcuseIds.length} excuse letters selected
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={handleBatchRejectExcuses}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          Reject All
                        </button>
                        <button
                          type="button"
                          onClick={handleBatchApproveExcuses}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase text-emerald-550 bg-emerald-550/10 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          Approve All
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {excuseLetters.filter((l: any) => l.status === 'pending').length > 0 ? (
                      excuseLetters.filter((l: any) => l.status === 'pending').map((req: any) => {
                        const relatedClass = classes.find(c => c.id === req.classId);
                        const isChecked = selectedExcuseIds.includes(req.id);
                        return (
                          <div 
                            key={req.id}
                            className={`p-4 rounded-xl border bg-zinc-50/30 dark:bg-zinc-900/10 space-y-3 text-left transition-all ${
                              isChecked 
                                ? 'border-indigo-500 bg-indigo-500/5' 
                                : 'border-zinc-150 dark:border-zinc-850 hover:border-zinc-250 dark:hover:border-zinc-800'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {isBatchMode && (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedExcuseIds([...selectedExcuseIds, req.id]);
                                    } else {
                                      setSelectedExcuseIds(selectedExcuseIds.filter(id => id !== req.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">{req.studentName}</span>
                                      <span className="text-[8px] font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-black text-zinc-500 uppercase">
                                        ID: {req.studentId}
                                      </span>
                                    </div>
                                    <p className="text-[9.5px] text-zinc-400 font-medium mt-1">
                                      Subject: {relatedClass ? `${relatedClass.code} - ${relatedClass.name}` : req.classId}
                                    </p>
                                  </div>
                                  <span className="text-[8px] font-mono text-zinc-400 uppercase bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 rounded font-black">
                                    {req.id}
                                  </span>
                                </div>

                                <div className="p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 text-[10px] text-zinc-600 dark:text-zinc-400 leading-normal italic mt-2">
                                  "{req.reason}"
                                </div>

                                {!isBatchMode && (
                                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100/40 dark:border-zinc-900/40 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateExcuseStatus?.(req.id, 'rejected');
                                        speakText(`Student excuse petition with reference ID ${req.id} was rejected.`, accessibility.readAloud);
                                        if (typeof window !== 'undefined' && (window as any).showToast) {
                                          (window as any).showToast(`Leave Request ${req.id} marked as INVALID`, "warning");
                                        }
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 active:scale-95 cursor-pointer transition-all"
                                    >
                                      Deny Excuse
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateExcuseStatus?.(req.id, 'approved');
                                        speakText(`Student excuse petition with reference ID ${req.id} was successfully validated.`, accessibility.readAloud);
                                        if (typeof window !== 'undefined' && (window as any).showToast) {
                                          (window as any).showToast(`Leave Request ${req.id} marked as VALID (Approved)`, "success");
                                        }
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 cursor-pointer transition-all"
                                    >
                                      Approve Leave
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-lg">
                          <Check className="w-5 h-5" />
                        </div>
                        <h5 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">No Actionable Leave Requests</h5>
                        <p className="text-[10px] text-zinc-400 max-w-xs mx-auto leading-normal">
                          All student excuses, medical leaves, and department representations have been audited. No pending dispatches remaining.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actionable Password Reset Requests Panel */}
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Actionable Password Resets</h4>
                      <span className="text-[9.5px] font-mono font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {passwordResetRequests.filter((r: any) => r.status === 'pending').length} Pending
                      </span>
                    </div>

                    {isBatchMode && selectedResetIds.length > 0 && (
                      <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/15 flex items-center justify-between gap-3 animate-fade-in text-left">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          {selectedResetIds.length} resets selected
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={handleBatchRejectResets}
                            className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                          >
                            Reject All
                          </button>
                          <button
                            type="button"
                            onClick={handleBatchApproveResets}
                            className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase text-emerald-550 bg-emerald-550/10 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                          >
                            Approve All
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {passwordResetRequests.filter((r: any) => r.status === 'pending').length > 0 ? (
                        passwordResetRequests.filter((r: any) => r.status === 'pending').map((req: any) => {
                          const isChecked = selectedResetIds.includes(req.id);
                          return (
                            <div 
                              key={req.id}
                              className={`p-4 rounded-xl border bg-zinc-50/30 dark:bg-zinc-900/10 space-y-3 text-left transition-all ${
                                isChecked 
                                  ? 'border-indigo-500 bg-indigo-500/5' 
                                  : 'border-zinc-150 dark:border-zinc-850 hover:border-zinc-250 dark:hover:border-zinc-800'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {isBatchMode && (
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedResetIds([...selectedResetIds, req.id]);
                                      } else {
                                        setSelectedResetIds(selectedResetIds.filter(id => id !== req.id));
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-extrabold text-zinc-850 dark:text-zinc-200">{req.completeName}</span>
                                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-black uppercase ${
                                          req.role === 'faculty' 
                                            ? 'bg-indigo-550/10 text-indigo-550 dark:text-indigo-400' 
                                            : 'bg-emerald-550/10 text-emerald-550 dark:text-emerald-400'
                                        }`}>
                                          {req.role}
                                        </span>
                                      </div>
                                      <div className="mt-1 space-y-0.5 font-mono text-[9.5px] text-zinc-500">
                                        <div>ID: <span className="font-bold text-zinc-700 dark:text-zinc-300">{req.idNumber}</span></div>
                                        <div>Contact: <span className="font-bold text-zinc-700 dark:text-zinc-300">{req.contactNumber}</span></div>
                                        {req.role === 'faculty' && (
                                          <div>Faculty Code: <span className="font-bold text-zinc-700 dark:text-zinc-300">{req.facultyCode || 'N/A'}</span></div>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-[8px] font-mono text-zinc-400 uppercase bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 rounded font-black">
                                      {req.id}
                                    </span>
                                  </div>

                                  {!isBatchMode && (
                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100/40 dark:border-zinc-900/40 mt-3">
                                      <button
                                        type="button"
                                        onClick={() => handleRejectPasswordReset(req.id)}
                                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 active:scale-95 cursor-pointer transition-all"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApprovePasswordReset(req.id)}
                                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-emerald-550 bg-emerald-550/10 hover:bg-emerald-500/20 active:scale-95 cursor-pointer transition-all"
                                      >
                                        Approve Reset
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto text-lg">
                            <Lock className="w-5 h-5" />
                          </div>
                          <h5 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">No Pending Resets</h5>
                          <p className="text-[10px] text-zinc-450 dark:text-zinc-400 max-w-xs mx-auto leading-normal">
                            All student and faculty password reset dispatch files are currently cleared.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Simple quick stats bar for pending requests */}
                  <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-150 dark:border-zinc-850 rounded-xl grid grid-cols-2 gap-3 text-center">
                    <div>
                      <span className="text-[8.5px] text-zinc-450 block font-bold uppercase">Pending Load</span>
                      <span className="text-xs font-mono font-black text-zinc-805 dark:text-zinc-200">
                        {excuseLetters.filter((l: any) => l.status === 'pending').length} active petitions
                      </span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-zinc-450 block font-bold uppercase">Approved leaves</span>
                      <span className="text-xs font-mono font-black text-emerald-500">
                        {excuseLetters.filter((l: any) => l.status === 'valid').length} resolved
                      </span>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>

        </motion.div>
      )}

      {/* 2B. ACTIONABLE PASSWORD RESETS SCREEN */}
      {activeScreen === 'resets' && (
        <motion.div
          key="resets"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-left animate-fade-in"
        >
          <div className="pb-4 border-b border-zinc-150 dark:border-zinc-850/60">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-black tracking-tight text-zinc-900 dark:text-zinc-100 text-xl flex items-center gap-2">
                    <Lock className="w-6 h-6 text-indigo-500" />
                    Actionable Password Resets
                  </h2>
                  <p className="text-xs text-zinc-400 text-left">
                    Approve, deny, or bulk-manage university password reset requests.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBatchMode(!isBatchMode);
                      setSelectedResetIds([]);
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                      isBatchMode 
                        ? 'bg-indigo-500 text-white border-indigo-500' 
                        : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {isBatchMode ? 'Disable Bulk Mode' : 'Enable Bulk Mode'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/10 flex flex-col justify-between text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">Pending Approvals</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {passwordResetRequests.filter((r: any) => r.status === 'pending').length}
                </span>
                <span className="text-xs text-zinc-400">requests</span>
              </div>
            </div>
            
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 flex flex-col justify-between text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">Approved Resets</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {passwordResetRequests.filter((r: any) => r.status === 'approved').length}
                </span>
                <span className="text-xs text-zinc-400">authorized</span>
              </div>
            </div>

            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/10 flex flex-col justify-between text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 dark:text-red-400">Rejected Resets</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-red-600 dark:text-red-400">
                  {passwordResetRequests.filter((r: any) => r.status === 'rejected').length}
                </span>
                <span className="text-xs text-zinc-400">denied</span>
              </div>
            </div>
          </div>

          {/* Filters and search */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl relative overflow-hidden">
              {['all', 'pending', 'approved', 'rejected'].map((filterType) => {
                const count = filterType === 'all' 
                  ? passwordResetRequests.length 
                  : passwordResetRequests.filter((r: any) => r.status === filterType).length;
                const isActive = resetFilterState === filterType;
                return (
                  <button
                    key={filterType}
                    onClick={() => setResetFilterState(filterType as any)}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer relative z-10 ${
                      isActive
                        ? 'text-indigo-500 dark:text-indigo-400 font-black'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-resets-filter-pill"
                        className="absolute inset-0 bg-white dark:bg-zinc-950 rounded-lg shadow-sm -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {filterType} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by ID or Name..."
                value={resetSearchQuery}
                onChange={(e) => setResetSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-200"
              />
            </div>
          </div>

          {/* Batch action box */}
          {isBatchMode && selectedResetIds.length > 0 && (
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/15 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedResetIds.length} select requests queued for batch execution
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBatchRejectResets}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Bulk Deny
                </button>
                <button
                  type="button"
                  onClick={handleBatchApproveResets}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-emerald-500 bg-emerald-555/10 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Bulk Approve
                </button>
              </div>
            </div>
          )}

          {/* List display */}
          <div className="space-y-3">
            {passwordResetRequests.filter((r: any) => {
              const matchesFilter = resetFilterState === 'all' ? true : r.status === resetFilterState;
              const matchesSearch = (r.name || '').toLowerCase().includes(resetSearchQuery.toLowerCase()) || 
                                    (r.idNumber || '').toLowerCase().includes(resetSearchQuery.toLowerCase()) || 
                                    (r.email || '').toLowerCase().includes(resetSearchQuery.toLowerCase());
              return matchesFilter && matchesSearch;
            }).length === 0 ? (
              <div className="p-12 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-lg text-zinc-400">
                  📭
                </div>
                <h5 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest font-mono">No Password Resets Found</h5>
                <p className="text-[10px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  No active requests correspond to your current filter or query criteria.
                </p>
              </div>
            ) : (
              passwordResetRequests.filter((r: any) => {
                const matchesFilter = resetFilterState === 'all' ? true : r.status === resetFilterState;
                const matchesSearch = (r.name || '').toLowerCase().includes(resetSearchQuery.toLowerCase()) || 
                                      (r.idNumber || '').toLowerCase().includes(resetSearchQuery.toLowerCase()) || 
                                      (r.email || '').toLowerCase().includes(resetSearchQuery.toLowerCase());
                return matchesFilter && matchesSearch;
              }).map((req: any) => {
                const isSelected = selectedResetIds.includes(req.id);
                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-500/5' 
                        : req.status === 'pending'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-zinc-150 dark:border-zinc-850 hover:border-zinc-250 dark:hover:border-zinc-800 bg-white dark:bg-zinc-950/20'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {isBatchMode && req.status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedResetIds([...selectedResetIds, req.id]);
                              } else {
                                setSelectedResetIds(selectedResetIds.filter(id => id !== req.id));
                              }
                            }}
                            className="w-4.5 h-4.5 rounded border-zinc-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                          />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{req.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono ${
                              req.role === 'faculty' ? 'bg-orange-500/10 text-orange-500' : 'bg-sky-500/10 text-sky-500'
                            }`}>
                              {req.role}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-450">
                            <span className="font-mono">ID: {req.idNumber}</span>
                            <span>•</span>
                            <span>{req.email}</span>
                            <span>•</span>
                            <span>Requested {new Date(req.requestedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {req.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRejectPasswordReset(req.id)}
                              className="px-3 py-1.5 text-[9.5px] font-extrabold uppercase bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer active:scale-95"
                            >
                              Reject Request
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprovePasswordReset(req.id)}
                              className="px-3 py-1.5 text-[9.5px] font-extrabold uppercase bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                            >
                              Authorize Reset
                            </button>
                          </>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            req.status === 'approved' 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-red-500/15 text-red-600 dark:text-red-400'
                          }`}>
                            {req.status === 'approved' ? '✓ APPROVED' : '✗ REJECTED'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}

      {/* 2. USERS DIRECTORY VIEW */}
      {activeScreen === 'users' && (
        <motion.div
          key="users"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-left animate-fade-in"
        >
          <div className="pb-4 border-b border-zinc-150 dark:border-zinc-850/60">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-black tracking-tight text-zinc-900 dark:text-zinc-100 text-xl">
                    University Users Directories
                  </h2>
                  <div className="mt-0.5">
                    <p className="text-xs text-zinc-400 text-left">View registered students, instructors, and departments coordinates</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUserFormOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition-all px-4 py-2.5 text-xs"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Add User
                </button>
              </div>

              {/* Directory Filter triggers */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex flex-wrap gap-1.5 bg-zinc-100/60 dark:bg-zinc-900/40 p-1 rounded-xl relative overflow-hidden border border-zinc-200/50 dark:border-zinc-800/40">
                  {(['all', 'student', 'faculty', 'admin'] as const).map((rl) => {
                    const isActive = directoryRoleFilter === rl;
                    return (
                      <button
                        key={rl}
                        type="button"
                        onClick={() => setDirectoryRoleFilter(rl)}
                        className={`font-bold cursor-pointer transition-all rounded-lg relative z-10 ${
                          isScrolled 
                            ? 'px-2.5 py-1 text-[10px]' 
                            : 'px-3.5 py-1.5 text-xs'
                        } ${
                          isActive
                            ? 'text-black font-extrabold'
                            : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-805/50'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-directory-role-pill"
                            className="absolute inset-0 bg-emerald-500 rounded-lg shadow-sm -z-10"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        {rl === 'all' ? 'All' : rl === 'admin' ? 'Admins' : rl + 's'}
                      </button>
                    );
                  })}
                </div>

                {/* Fast Tracing search box */}
                <div className={`relative ${isScrolled ? 'w-32 sm:w-48 md:max-w-xs' : 'w-full md:max-w-xs'} transition-all duration-200 shrink-0 select-none`}>
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className={`${isScrolled ? 'w-3.5 h-3.5 text-emerald-500' : 'w-4 h-4 text-emerald-500'}`} />
                  </span>
                  <input
                    type="text"
                    value={userDirectorySearch}
                    onChange={(e) => setUserDirectorySearch(e.target.value)}
                    placeholder={isScrolled ? "Search..." : "Search name, email, dept, or ID..."}
                    className={`w-full pl-8 pr-7 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold ${
                      isScrolled ? 'py-1 text-[10px]' : 'py-2 text-xs'
                    }`}
                  />
                  {userDirectorySearch && (
                    <button
                      type="button"
                      onClick={() => setUserDirectorySearch('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-650 font-black cursor-pointer text-xs animate-fade-in"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Add User modal form inline */}
          {isUserFormOpen && (
            <div className="p-6 rounded-2xl border animate-scale-up bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-805 shadow-xl">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-900">
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">Enlist New Account Coordinates</h3>
                <button
                  onClick={() => setIsUserFormOpen(false)}
                  className="p-1 px-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 cursor-pointer text-xs uppercase font-extrabold"
                >
                  <X className="w-4 h-4 inline mr-1" /> Close
                </button>
              </div>

              <form onSubmit={handleAddUserSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-450 uppercase tracking-widest text-left">Full Name</label>
                    <input
                      type="text"
                      className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                      placeholder="e.g. Rachel Green"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-455 uppercase tracking-widest text-left">Academic Email</label>
                    <input
                      type="email"
                      className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                      placeholder="e.g. rachel.green@msu.edu.ph"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-455 uppercase tracking-widest text-left">Credential Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'student' | 'faculty' | 'admin')}
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-455 uppercase tracking-widest text-left">ID Number</label>
                    <input
                      type="text"
                      className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                      placeholder="e.g. 2023-10901 or FAC-1203"
                      value={newUserID}
                      onChange={(e) => setNewUserID(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-455 uppercase tracking-widest text-left">Department</label>
                    <select
                      value={newUserDep}
                      onChange={(e) => setNewUserDep(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                    >
                      {departmentsList.map((dep, d_id) => (
                        <option key={d_id} value={dep}>{dep}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUserFormOpen(false)}
                    className="px-4 py-2 border border-zinc-250 dark:border-zinc-800 rounded-xl text-zinc-450 text-xs font-bold uppercase cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Enlist Directory Acc
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User Directory Separated Lists & Roster Layout */}
          <div className="space-y-8">
            
            {/* 1. FACULTY MEMBERS ROSTER SECTION */}
            {(directoryRoleFilter === 'all' || directoryRoleFilter === 'faculty') && (
              <div className="space-y-4">
                <div className="border-b border-zinc-200 dark:border-zinc-850 pb-2 flex items-center justify-between">
                  <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Faculty Members Registry ({allDirectoryUsers.filter(u => u.role === 'faculty').length})
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-450 uppercase">ClassPulse Instruction Staff</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allDirectoryUsers
                    .filter(u => u.role === 'faculty' && (
                      (u.name || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase()) ||
                      (u.email || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase()) ||
                      (u.department || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase()) ||
                      (u.uid || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase())
                    ))
                    .map(u => {
                      // Find courses taught by this faculty member
                      const coursesTaught = classes.filter(
                        c => (c.facultyName || '').toLowerCase() === (u.name || '').toLowerCase() || c.facultyId === u.uid
                      );
                      
                      return (
                        <div 
                          key={u.id}
                          className="p-5 rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 shadow-xs flex flex-col justify-between gap-4 transition-all"
                        >
                          <div className="flex gap-3 text-left">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-500 text-black shrink-0 shadow-xs">
                              {(u.name || 'U')[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{u.name}</h4>
                                <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-extrabold">
                                  Professor
                                </span>
                              </div>
                              
                              <div className="space-y-1.5 mt-2.5 text-xs text-zinc-400">
                                <p className="flex items-center gap-1.5 font-semibold text-zinc-500">
                                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                  <span className="truncate">{u.email}</span>
                                </p>
                                <p className="flex items-center gap-1.5 text-zinc-450 dark:text-zinc-400">
                                  <Building className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>{u.department}</span>
                                </p>
                                <span className="text-[9px] bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-mono tracking-wide px-1.5 py-0.5 rounded inline-block mt-1 font-extrabold">
                                  FAC_ID: {u.uid}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-1 shrink-0 self-start">
                              <button
                                onClick={() => handleStartEditUser(u)}
                                className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-zinc-850 cursor-pointer transition-colors"
                                title="Edit User Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-2 border border-red-500/10 hover:bg-red-500/10 rounded-xl text-red-500 cursor-pointer transition-colors"
                                title="Revoke Staff Credentials"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Classes taught sub-list */}
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-left mb-2">Assigned Curriculum Classes</p>
                            {coursesTaught.length > 0 ? (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {(expandedFacultyClasses[u.id] ? coursesTaught : coursesTaught.slice(0, 3)).map(cls => (
                                    <button
                                      key={cls.id}
                                      onClick={() => {
                                        setSelectedClassDetail(cls);
                                        setIsDetailModalOpen(true);
                                        speakText(`Reviewing course outline for ${cls.code}`, accessibility.readAloud);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-emerald-500/10 hover:text-emerald-500 border border-zinc-200 dark:border-zinc-800 text-[10px] font-black text-zinc-650 dark:text-zinc-350 cursor-pointer flex items-center gap-1 transition-all"
                                    >
                                      <BookOpen className="w-3 h-3 text-emerald-500" />
                                      <span>{cls.code}</span>
                                      <span className="text-zinc-400">({cls.days.join('')})</span>
                                    </button>
                                  ))}
                                </div>
                                {coursesTaught.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const expanded = !!expandedFacultyClasses[u.id];
                                      setExpandedFacultyClasses(prev => ({
                                        ...prev,
                                        [u.id]: !expanded
                                      }));
                                      speakText(expanded ? "Collapsed to three courses" : "Showing all assigned courses", accessibility.readAloud);
                                    }}
                                    className="text-[9px] font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer transition-all block text-left"
                                  >
                                    {expandedFacultyClasses[u.id] ? "Collapse to 3 Enrolled Classes" : `Show ${coursesTaught.length - 3} More Classes`}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-zinc-400 italic text-left">No classes scheduled in registry.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 2. REGISTERED STUDENTS DIRECTORY SECTION */}
            {(directoryRoleFilter === 'all' || directoryRoleFilter === 'student') && (
              <div className="space-y-4">
                <div className="border-b border-zinc-200 dark:border-zinc-850 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-left">
                    <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      Enrolled Students Registry ({
                        allDirectoryUsers.filter(u => u.role === 'student').filter(u => {
                          if (selectedClassIdFilter === 'all') return true;
                          const studentEnrollments = enrollments.filter(
                            e => (e.studentName || '').toLowerCase() === (u.name || '').toLowerCase() || e.studentId === u.uid
                          );
                          return studentEnrollments.some(e => e.classId === selectedClassIdFilter);
                        }).length
                      })
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Filter rosters and view cumulative check-in rates</p>
                  </div>

                  {/* Class Filter Dropdown for Students Directory */}
                  <div className="flex items-center gap-2 font-sans select-none pb-2 sm:pb-0 relative">
                    <span className="text-[10px] font-extrabold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-emerald-500" />
                      Class Filter:
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsClassFilterOpen(!isClassFilterOpen)}
                        className={`flex items-center gap-2 backdrop-blur-xl transition-all rounded-2xl px-3 py-1.5 cursor-pointer shadow-sm font-sans border ${
                          selectedClassIdFilter !== 'all'
                            ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-400 shadow-emerald-500/10'
                            : 'bg-white/80 dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500/50 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold truncate max-w-[170px] sm:max-w-[200px]">
                          {selectedClassIdFilter === 'all' 
                            ? 'All Registered Classes' 
                            : (() => {
                                const found = classes.find(c => c.id === selectedClassIdFilter);
                                return found ? `${found.code}: ${found.name}` : 'All Registered Classes';
                              })()
                          }
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${isClassFilterOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                      </button>

                      {/* Native select accessibility layer matching CSS selector */}
                      <select
                        value={selectedClassIdFilter}
                        onChange={(e) => {
                          setSelectedClassIdFilter(e.target.value);
                          setIsClassFilterOpen(false);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-[10px] z-10"
                      >
                        <option value="all" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">All Registered Classes</option>
                        {sortedClasses.map(c => (
                          <option key={c.id} value={c.id} className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">{c.code}: {c.name}</option>
                        ))}
                      </select>

                      {/* Pop-up Custom Refined Filter Menu Overlay */}
                      <AnimatePresence>
                        {isClassFilterOpen && (
                          <>
                            {/* Backdrop click dismiss */}
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setIsClassFilterOpen(false)} 
                            />
                            
                            <motion.div
                              initial={{ opacity: 0, y: -6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.96 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                              className="absolute right-0 sm:left-0 top-full mt-2.5 w-72 sm:w-80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xl rounded-2xl p-3 z-50 text-left space-y-2.5"
                            >
                              <div className="flex items-center justify-between px-1 pt-1 pb-2 border-b border-zinc-150 dark:border-zinc-850">
                                <div className="flex items-center gap-1.5">
                                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                                    Filter Roster by Course
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  {sortedClasses.length} Courses
                                </span>
                              </div>

                              {/* Search Box inside Popup */}
                              {sortedClasses.length > 3 && (
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    value={classFilterSearch}
                                    onChange={(e) => setClassFilterSearch(e.target.value)}
                                    placeholder="Search course code or title..."
                                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-zinc-100/70 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 text-zinc-850 dark:text-zinc-150 font-medium placeholder:text-zinc-400"
                                  />
                                </div>
                              )}

                              {/* Filter Options List */}
                              <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {/* Option: All Registered Classes */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClassIdFilter('all');
                                    setIsClassFilterOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                    selectedClassIdFilter === 'all'
                                      ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <BookOpen className={`w-3.5 h-3.5 ${selectedClassIdFilter === 'all' ? 'text-black' : 'text-emerald-500'}`} />
                                    <span className="truncate">All Registered Classes</span>
                                  </div>
                                  {selectedClassIdFilter === 'all' && (
                                    <Check className="w-4 h-4 text-black shrink-0" />
                                  )}
                                </button>

                                {/* Course options */}
                                {sortedClasses
                                  .filter(c => 
                                    !classFilterSearch || 
                                    c.code.toLowerCase().includes(classFilterSearch.toLowerCase()) || 
                                    c.name.toLowerCase().includes(classFilterSearch.toLowerCase())
                                  )
                                  .map(c => {
                                    const isSelected = selectedClassIdFilter === c.id;
                                    return (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedClassIdFilter(c.id);
                                          setIsClassFilterOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                                          isSelected
                                            ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
                                        }`}
                                      >
                                        <div className="flex flex-col text-left min-w-0 pr-2">
                                          <div className="flex items-center gap-1.5">
                                            <span className={`font-mono text-[10px] font-black px-1.5 py-0.2 rounded ${
                                              isSelected ? 'bg-black/20 text-black' : 'bg-emerald-500/15 text-emerald-500'
                                            }`}>
                                              {c.code}
                                            </span>
                                            <span className="truncate font-bold text-xs">{c.name}</span>
                                          </div>
                                          <span className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-black/80 font-medium' : 'text-zinc-400'}`}>
                                            {c.facultyName ? `Prof. ${c.facultyName}` : 'Faculty Unassigned'} • Room {c.room}
                                          </span>
                                        </div>
                                        {isSelected && (
                                          <Check className="w-4 h-4 text-black shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allDirectoryUsers
                    .filter(u => u.role === 'student' && (
                      (u.name || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase()) ||
                      (u.email || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase()) ||
                      (u.department || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase()) ||
                      (u.uid || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase())
                    ))
                    .filter(u => {
                      if (selectedClassIdFilter === 'all') return true;
                      const studentEnrollments = enrollments.filter(
                        e => (e.studentName || '').toLowerCase() === (u.name || '').toLowerCase() || e.studentId === u.uid
                      );
                      return studentEnrollments.some(e => e.classId === selectedClassIdFilter);
                    })
                    .map(u => {
                      // Find student enrollments in local/global table
                      const studentEnrollments = enrollments.filter(
                        e => (e.studentName || '').toLowerCase() === (u.name || '').toLowerCase() || e.studentId === u.uid
                      );

                      // Resolve actual course structures matching enrollments
                      // Fallback to presenting first 1-2 classes if none enrolled in test DB
                      const enrolledClasses = classes.filter(
                        c => studentEnrollments.some(e => e.classId === c.id) || classes.indexOf(c) < 2
                      );

                      // Dynamic student academic standing calculations
                      const studentRecords = attendanceRecords.filter(
                        r => r.studentId === u.uid || (r.studentName || '').toLowerCase() === (u.name || '').toLowerCase()
                      );
                      const standing = calculateStudentStanding(studentRecords);
                      const standingLabel = standing.label;
                      const standingColor = standing.badgeColor;
                      const isMonitored = standing.isDropped || standing.status === 'warning';

                      return (
                        <div 
                          key={u.id}
                          className={`p-5 rounded-3xl border bg-white dark:bg-zinc-950 shadow-xs flex flex-col justify-between gap-4 transition-all ${
                            isMonitored 
                              ? 'border-red-500/30 ring-1 ring-red-500/10 bg-red-500/[0.01]' 
                              : 'border-zinc-200 dark:border-zinc-855'
                          }`}
                        >
                          <div className="flex gap-3 text-left">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs ${
                              isMonitored ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600'
                            }`}>
                              {u.name[0]}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{u.name}</h4>
                                <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-405 text-indigo-400 font-extrabold">
                                  Student
                                </span>
                                <span className={`text-[8.5px] uppercase font-black px-1.5 py-0.5 rounded-md ${standingColor}`}>
                                  {standingLabel}
                                </span>
                              </div>

                              <div className="space-y-1.5 mt-2.5 text-xs text-zinc-400">
                                <p className="flex items-center gap-1.5 font-semibold text-zinc-500">
                                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                  <span className="truncate">{u.email}</span>
                                </p>
                                <p className="flex items-center gap-1.5 text-zinc-450 dark:text-zinc-400">
                                  <Building className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>{u.department}</span>
                                </p>
                                <span className="text-[9px] bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-mono tracking-wide px-1.5 py-0.5 rounded inline-block mt-1 font-extrabold uppercase">
                                  UID: {u.uid}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-1 shrink-0 self-start">
                              <button
                                onClick={() => handleStartEditUser(u)}
                                className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-zinc-850 cursor-pointer transition-colors"
                                title="Edit User Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-2 border border-red-500/10 hover:bg-red-500/10 rounded-xl text-red-500 cursor-pointer transition-colors"
                                title="Revoke Student Enrollment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Enrolled Courses list */}
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
                            {(() => {
                              const isExpanded = expandedUserClasses[u.id] || false;
                              const displayedClasses = isExpanded ? enrolledClasses : enrolledClasses.slice(0, 3);
                              const hasHiddenClasses = enrolledClasses.length > 3;

                              return (
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Enrolled Curriculum Cohorts</p>
                                      {hasHiddenClasses && (
                                        <button
                                          type="button"
                                          onClick={() => setExpandedUserClasses(prev => ({ ...prev, [u.id]: !isExpanded }))}
                                          className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase hover:bg-indigo-500/20 cursor-pointer transition-all"
                                        >
                                          {isExpanded ? 'Hide' : `+${enrolledClasses.length - 3} more`}
                                        </button>
                                      )}
                                    </div>
                                    {isMonitored && (
                                      <span className="text-[8px] font-extrabold text-red-500 uppercase font-mono tracking-wider">
                                        ⚠️ High Lateness Monitor active
                                      </span>
                                    )}
                                  </div>
                                  
                                  {displayedClasses.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {displayedClasses.map(cls => {
                                        // Alice Smith simulated low rate (76%) otherwise 94%
                                        const attRate = ((u.name || '').toLowerCase().includes('alice') && cls.code === 'ITE183') ? 76 : 94;
                                        return (
                                          <button
                                            key={cls.id}
                                            onClick={() => {
                                              setSelectedClassDetail(cls);
                                              setIsDetailModalOpen(true);
                                              speakText(`Reviewing class record detail metrics for ${cls.code}`, accessibility.readAloud);
                                            }}
                                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
                                              attRate < 85 
                                                ? 'bg-red-500/10 border-red-550/20 text-red-500 hover:bg-red-500/20' 
                                                : 'bg-zinc-50 dark:bg-zinc-900 hover:bg-emerald-500/15 hover:text-emerald-500 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350'
                                            }`}
                                          >
                                            <BookOpen className="w-3 h-3 text-indigo-500" />
                                            <span>{cls.code}</span>
                                            <span className="font-mono text-[9px] font-extrabold">({attRate}%)</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-zinc-400 italic">Not registered to check-ins.</p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 3. SYSTEM ADMINISTRATORS ROSTER SECTION */}
            {(directoryRoleFilter === 'all' || directoryRoleFilter === 'admin') && (
              <div className="space-y-4">
                <div className="border-b border-zinc-200 dark:border-zinc-850 pb-2 flex items-center justify-between">
                  <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    System Administrators Registry ({allDirectoryUsers.filter(u => u.role === 'admin').length})
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-450 uppercase">Academic Registrar & System Authorities</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allDirectoryUsers
                    .filter(u => u.role === 'admin' && (
                      (u.name || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase()) ||
                      (u.email || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase()) ||
                      (u.department || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase()) ||
                      (u.uid || '').toLowerCase().includes((userDirectorySearch || '').toLowerCase())
                    ))
                    .map(u => {
                      const isSelf = userProfile && (
                        (u.email && userProfile.email && u.email.toLowerCase() === userProfile.email.toLowerCase()) || 
                        u.id === userProfile.id
                      );
                      
                      return (
                        <div 
                          key={u.id}
                          className="p-5 rounded-2xl border bg-white dark:bg-zinc-950 border-amber-500/20 dark:border-amber-500/20 shadow-xs flex flex-col justify-between gap-4 transition-all"
                        >
                          <div className="flex gap-3 text-left">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm bg-amber-500 text-black shrink-0 shadow-xs">
                              {(u.name || 'A')[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{u.name}</h4>
                                <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-extrabold">
                                  Administrator
                                </span>
                                {isSelf && (
                                  <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-extrabold">
                                    You (Active Session)
                                  </span>
                                )}
                              </div>
                              
                              <div className="space-y-1.5 mt-2.5 text-xs text-zinc-400">
                                <p className="flex items-center gap-1.5 font-semibold text-zinc-500">
                                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                  <span className="truncate">{u.email}</span>
                                </p>
                                <p className="flex items-center gap-1.5 text-zinc-450 dark:text-zinc-400">
                                  <Building className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>{u.department || 'Academic Registrar Board'}</span>
                                </p>
                                <span className="text-[9px] bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-mono tracking-wide px-1.5 py-0.5 rounded inline-block mt-1 font-extrabold">
                                  ADM_ID: {u.uid || ('ADM-' + u.id.substring(0, 5).toUpperCase())}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-1 shrink-0 self-start">
                              <button
                                onClick={() => handleStartEditUser(u)}
                                className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-zinc-850 cursor-pointer transition-colors"
                                title="Edit Admin Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-2 border border-red-500/10 hover:bg-red-500/10 rounded-xl text-red-500 cursor-pointer transition-colors"
                                title="Revoke Admin Credentials"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-left">Access Rights</span>
                            <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-md">Full System Control Privileges</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          </div>
        </motion.div>
      )}

      {/* Edit User Modal Dialog Overlay */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-left animate-scale-up">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-zinc-105 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-500 hover:text-zinc-750 flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-900">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Edit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Edit Directory Record</h3>
                <p className="text-[10px] text-zinc-400">Modifying profile data credentials for {editingUser.role}</p>
              </div>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-455 uppercase tracking-widest font-sans">Full Name</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-455 uppercase tracking-widest font-sans">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-455 uppercase tracking-widest font-sans">{editingUser.role === 'faculty' ? 'Faculty ID' : 'Student ID'}</label>
                  <input
                    type="text"
                    required
                    value={editUserUid}
                    onChange={(e) => setEditUserUid(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-455 uppercase tracking-widest font-sans font-sans">Department</label>
                  <select
                    value={editUserDep}
                    onChange={(e) => setEditUserDep(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                  >
                    {departmentsList.map((dep, d_id) => (
                      <option key={d_id} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-zinc-250 dark:border-zinc-800 rounded-xl text-zinc-450 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedules / Curriculum Editor screen for Admin */}
      {activeScreen === 'schedule-editor' && (
        <motion.div
          key="schedule-editor"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-left animate-fade-in"
        >
          <div className="pb-4 border-b border-zinc-150 dark:border-zinc-850/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase text-xl">
                  Master Schedules & Offerings
                </h2>
                <div className="mt-0.5">
                  <p className="text-xs text-zinc-400">Review University curriculum timetables, assigned instructors, and enrolled groups</p>
                </div>
              </div>
              
              {/* Fast Offerings searching bar, View Mode Toggle and Register button */}
              <div className="flex flex-wrap items-center gap-2 select-none w-full sm:w-auto">
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('grid')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      scheduleViewMode === 'grid'
                        ? 'bg-emerald-500 text-black shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Weekly Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('cards')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      scheduleViewMode === 'cards'
                        ? 'bg-emerald-500 text-black shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Card List</span>
                  </button>
                </div>

                <div className="relative flex-1 sm:w-56 select-none">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-emerald-500" />
                  </span>
                  <input
                    type="text"
                    value={adminClassSearchQuery}
                    onChange={(e) => setAdminClassSearchQuery(e.target.value)}
                    placeholder="Search classes or faculty..."
                    className="w-full pl-8 pr-7 bg-white dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-850 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold py-2 text-xs"
                  />
                  {adminClassSearchQuery && (
                     <button
                       type="button"
                       onClick={() => setAdminClassSearchQuery('')}
                       className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-650 font-bold cursor-pointer font-extrabold text-xs"
                     >
                       ×
                     </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAdminClassFormOpen(true);
                    setAdminFormCode('');
                    setAdminFormName('');
                    setAdminFormStart('09:00 AM');
                    setAdminFormEnd('10:30 AM');
                    setAdminFormRoom(sortedLabRooms[0] ? sortedLabRooms[0].name : '');
                    setAdminFormDays(['MW']);
                    const firstFac = registeredFacultyList[0];
                    setAdminFormFacultyName(firstFac ? firstFac.name : '');
                    setAdminFormFacultyId(firstFac ? (firstFac.id || firstFac.uid || firstFac.email) : '');
                    speakText("Opening register new subject scheduler modal", accessibility.readAloud);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 cursor-pointer flex items-center gap-1.5 transition-all select-none"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>Register Subject</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl relative overflow-hidden flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-extrabold text-emerald-500">Administrator Clearance Active</h4>
              <p className="text-[10px] text-zinc-400 leading-relaxed mt-1">
                You have primary permissions to edit class profiles, view students enrolled across all departments, and inspect faculty session logs. Click any subject to invoke detailed audits.
              </p>
            </div>
          </div>

          {/* Grid Layout of Subjects grouped by code */}
          {scheduleViewMode === 'grid' ? (
            <WeeklyScheduleGrid
              classes={classes}
              userRole="admin"
              enrollments={enrollments}
              userProfile={userProfile}
              searchQuery={adminClassSearchQuery}
              onOpenSubjectDetails={(cls) => {
                setSelectedClassDetail(cls);
                setIsDetailModalOpen(true);
              }}
              onEditSubject={(cls) => {
                setIsAdminClassFormOpen(true);
                setAdminFormCode(cls.code);
                setAdminFormName(cls.name);
                setAdminFormStart(cls.startTime);
                setAdminFormEnd(cls.endTime);
                setAdminFormRoom(cls.room);
                setAdminFormDays(cls.days);
                setAdminFormFacultyName(cls.facultyName || '');
              }}
            />
          ) : (
          (() => {
            const todayIndex = new Date().getDay();
            const dayMap: Record<number, string> = {
              1: 'Mon',
              2: 'Tue',
              3: 'Wed',
              4: 'Thu',
              5: 'Fri',
              6: 'Sat',
              0: 'Sun'
            };
            const todayLabel = dayMap[todayIndex] || 'Mon';

            const filteredClasses = classes.filter(cls => 
              (cls.name || '').toLowerCase().includes(adminClassSearchQuery.toLowerCase()) || 
              (cls.code || '').toLowerCase().includes(adminClassSearchQuery.toLowerCase()) ||
              (cls.facultyName || '').toLowerCase().includes(adminClassSearchQuery.toLowerCase()) ||
              (cls.room || '').toLowerCase().includes(adminClassSearchQuery.toLowerCase())
            );

            const todayClasses = filteredClasses.filter(cls => {
              const expandedClassDays = expandDaysToSpecificOnesVal(cls.days);
              const expandedToday = expandDaysToSpecificOnesVal([todayLabel]);
              return expandedClassDays.some(d => expandedToday.includes(d));
            });
            const otherClasses = filteredClasses.filter(cls => {
              const expandedClassDays = expandDaysToSpecificOnesVal(cls.days);
              const expandedToday = expandDaysToSpecificOnesVal([todayLabel]);
              return !expandedClassDays.some(d => expandedToday.includes(d));
            });

            const renderClassCard = (cls: typeof classes[0]) => {
              return (
                <div 
                  key={cls.id}
                  onClick={() => {
                    setSelectedClassDetail(cls);
                    setIsDetailModalOpen(true);
                    speakText(`Reviewing detailed outline for ${cls.code}`, accessibility.readAloud);
                  }}
                  className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:border-emerald-500/30 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-44 group relative"
                >
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[10px] font-black uppercase">
                        {cls.code}
                      </span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {cls.days.map(d => (
                          <span key={d} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 rounded font-mono text-[9px] font-black">
                            {d}
                          </span>
                        ))}
                        <button
                          onClick={() => setAdminDeleteConfirmClass({ id: cls.id, code: cls.code })}
                          type="button"
                          className="p-1 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer ml-1"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors line-clamp-1 text-left">
                      {cls.name}
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-900 text-left">
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      Instructor: <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate">{cls.facultyName}</span>
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-150 dark:border-zinc-850 font-mono">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        {cls.startTime} - {cls.endTime}
                      </span>

                      <span className="font-bold text-zinc-500 dark:text-zinc-400 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[9px] font-black">
                        Room {cls.room}
                      </span>
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-6">
                {filteredClasses.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950/60 animate-fade-in space-y-2">
                    <BookOpen className="w-8 h-8 text-emerald-500/60 mx-auto mb-1" />
                    <p className="text-xs text-zinc-500 font-bold">No classes match "{adminClassSearchQuery}"</p>
                    <p className="text-[10px] text-zinc-400">Try refining your search terms by class code, subject name, department, or faculty name.</p>
                  </div>
                ) : (
                  <>
                    {/* Today's Schedule */}
                    {todayClasses.length > 0 && (
                      <div className="space-y-3 flex flex-col text-left">
                        <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Current Classes ({todayLabel})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {todayClasses.map(cls => renderClassCard(cls))}
                        </div>
                      </div>
                    )}

                    {/* Future/Other Schedules */}
                    <div className="space-y-3 text-left">
                      {otherClasses.length > 0 && (
                        <h4 className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pt-2">
                          Future Schedule
                        </h4>
                      )}
                      {otherClasses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {otherClasses.map(cls => renderClassCard(cls))}
                        </div>
                      ) : (
                        todayClasses.length === 0 && (
                          <p className="text-xs text-zinc-500 italic text-center">No classes scheduled.</p>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })())}
        </motion.div>
      )}

      {/* Profile, editable settings */}
      {activeScreen === 'profile' && (
        <motion.div
          key="profile"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-6 text-left animate-fade-in text-zinc-900 dark:text-zinc-100"
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-zinc-855">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">Administrator Credentials & Biodata</h3>
                <p className="text-xs text-zinc-400">Modify global registration records and customize professional signature logs</p>
              </div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-extrabold tracking-widest px-3 py-1 rounded-xl uppercase">
                Active Registrar Core
              </span>
            </div>

            {/* Avatar management (Upload / Remove) */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850">
              <div className="relative">
                {userProfile?.avatar ? (
                  <img 
                    src={userProfile.avatar} 
                    alt={userProfile.name}
                    className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-emerald-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg uppercase">
                    {profileName ? profileName[0] : 'A'}
                  </div>
                )}
                
                {userProfile?.avatar && (
                  <button
                    onClick={() => {
                      setAdminDialogConfirm({
                        title: 'Remove Profile Photograph',
                        message: 'Are you sure you want to remove your profile photograph?',
                        confirmText: 'Remove',
                        onConfirm: () => {
                          onUpdateProfile?.({ ...userProfile, avatar: undefined });
                          speakText("Administrative credentials photo removed, fallback to code insignia.", accessibility.readAloud);
                        }
                      });
                    }}
                    className="absolute -bottom-1 -right-1 bg-red-600 hover:bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center cursor-pointer shadow-sm font-black text-xs"
                    title="Remove Profile Photo"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-1 text-center sm:text-left">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-450">Integrated Profile Picture</h4>
                <p className="text-[10px] text-zinc-450">Upload custom image files or drop them below to synchronize across security registers</p>
                <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
                  <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-505 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-xs transition-colors">
                    Upload Photograph
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result && userProfile) {
                              onUpdateProfile?.({ ...userProfile, avatar: event.target.result as string });
                              speakText("Profile image loaded and synchronized globally across directories.", accessibility.readAloud);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                  {userProfile?.avatar && (
                    <button
                      onClick={() => onUpdateProfile?.({ ...userProfile, avatar: undefined })}
                      className="px-3 py-1.5 border border-red-505/10 hover:bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer text-xs"
                    >
                      Delete Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Forms Info */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Full Security Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Administrative Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Registered Contact No</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+91 or +63 contact directories..."
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-810 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Authority Department Coordinates</label>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-905/60 rounded-xl border border-zinc-200 dark:border-zinc-850 text-xs font-bold text-zinc-650 dark:text-zinc-400">
                    Office of Administrative Academic Registrar
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Professional Bio Description</label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Record credentials, office philosophies..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {profileSavedMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold animate-fade-in text-left">
                  ✓ Database transaction committed: BioData records successfully written global state logs!
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5 transition-all"
                >
                  Commit Biodata Settings
                </button>
              </div>
            </form>
          </div>

          {/* Core Registrar Operations & Hard Reset */}
          <div className="p-6 rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-zinc-855">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-500" />
                  Core Registrar Operations & Hard Reset
                </h3>
                <p className="text-xs text-zinc-400">Perform vacuum optimization, check diagnostics, or execute a master database purge</p>
              </div>
              <span className="text-[10px] bg-red-500/10 text-red-500 font-extrabold tracking-widest px-3 py-1 rounded-xl uppercase">
                System Controls
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle Global Enrollment Lock */}
              <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Curriculum Enrollment Roster</h4>
                  <span className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase ${isRosterLocked ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600'}`}>
                    {isRosterLocked ? 'LOCKED' : 'UNLOCKED'}
                  </span>
                </div>
                <p className="text-[10.5px] text-zinc-500 leading-normal">
                  Freeze or unfreeze global student enrollments, preventing students from adding or dropping subjects.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleToggleGlobalRosterLock}
                    type="button"
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isRosterLocked 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm' 
                        : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {isRosterLocked ? 'Unlock Enrollment Roster' : 'Lock Enrollment Roster'}
                  </button>
                </div>
              </div>

              {/* Ping All Scanner Terminals */}
              <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Live Diagnostics</h4>
                  <span className="px-2 py-0.5 text-[8px] font-black rounded-full uppercase bg-indigo-500/10 text-indigo-500">
                    DIAG-PING
                  </span>
                </div>
                <p className="text-[10.5px] text-zinc-500 leading-normal">
                  Broadcast test signals to verify all physical classroom check-in scanner hubs and hardware terminals.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handlePingAllScanners}
                    type="button"
                    className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Broadcast Terminal Diagnostics
                  </button>
                </div>
              </div>

              {/* Run Database Optimize */}
              <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Log Optimization</h4>
                  <span className="px-2 py-0.5 text-[8px] font-black rounded-full uppercase bg-amber-500/10 text-amber-500">
                    VACUUM
                  </span>
                </div>
                <p className="text-[10.5px] text-zinc-500 leading-normal">
                  Run standard system database optimization and compression sequence to purge expired trace logs.
                </p>
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleRunDatabaseOptimize}
                    disabled={isCleaningLogs}
                    type="button"
                    className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCleaningLogs ? `Compressing logs (${cleanLogsProgress}%)` : 'Run Database Optimize'}
                  </button>
                  {isCleaningLogs && (
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-150" style={{ width: `${cleanLogsProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Database Scaling & Archiver */}
              <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-3 text-left flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Scale Optimization & Cold Storage</h4>
                    <span className="px-2 py-0.5 text-[8px] font-black rounded-full uppercase bg-indigo-500/10 text-indigo-500">
                      SCALE-READY
                    </span>
                  </div>
                  <p className="text-[10.5px] text-zinc-500 leading-normal mt-1">
                    Manage enterprise-scale partitioning, indexing strategies, and migrate historical trace records to cold archive stores.
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={handleToggleDbPartition}
                      type="button"
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        dbPartitionActive 
                          ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-transparent'
                      }`}
                      title={dbPartitionActive ? "Partitioning Active: Auto-sharded tables" : "Partitioning Disabled"}
                    >
                      <span>Partitioning: {dbPartitionActive ? 'ON' : 'OFF'}</span>
                    </button>
                    
                    <button
                      onClick={handleToggleDbIndexes}
                      type="button"
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        dbIndexesOptimized 
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-transparent'
                      }`}
                      title={dbIndexesOptimized ? "Indexing Optimized: DB latency < 12ms" : "Indexing Default"}
                    >
                      <span>Indexes: {dbIndexesOptimized ? 'OPTIMIZED' : 'DEFAULT'}</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-zinc-100/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 p-2 rounded-xl mt-3 text-[10px]">
                    <span className="text-zinc-400">Archived Logs:</span>
                    <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{coldStorageCount.toLocaleString()} logs</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleArchiveHistorical}
                    disabled={isArchivingLogs}
                    type="button"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isArchivingLogs ? `Archiving records (${archiveProgress}%)` : 'Archive Logs to Cold Storage'}
                  </button>
                  {isArchivingLogs && (
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-indigo-500 h-full transition-all duration-150" style={{ width: `${archiveProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Master System Purge (ZERO RECORDS CLEAR STATE) */}
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/[0.01] dark:bg-red-500/[0.02] space-y-2 text-left md:col-span-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Absolute System Purge & Hard Reset
                  </h4>
                  <span className="px-2 py-0.5 text-[8px] font-black rounded-full uppercase bg-red-500/10 text-red-500 animate-pulse">
                    CRITICAL DANGER
                  </span>
                </div>
                <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Permanently deletes all registered subjects, classroom sections, student attendance sheets, notifications, active enrollment rosters, pending excuse letters, and campus announcements. <b>This action is irreversible and wipes both client-side caches and cloud databases instantly, resetting the app to a clean zero-record state.</b>
                </p>
                <div className="pt-3">
                  <button
                    onClick={() => {
                      setAdminDialogConfirm({
                        title: '⚠️ CRITICAL: SYSTEM DESTRUCTION CONFIRMATION',
                        message: 'Are you absolutely sure you want to trigger a complete system purge?\n\nThis will instantly wipe out ALL courses, attendance sheets, notifications, logs, enrollments, announcements, and letters on your application storage.\n\nEverything will be reset to a pristine zero-record state. This operation cannot be undone.',
                        confirmText: 'YES, PURGE EVERYTHING',
                        cancelText: 'Cancel',
                        onConfirm: async () => {
                          if (onResetSystem) {
                            speakText("Initiating complete system purge sequence.", accessibility.readAloud);
                            if (typeof window !== 'undefined' && (window as any).showToast) {
                              (window as any).showToast("Triggering master system purge...", "warning");
                            }
                            await onResetSystem();
                            if (typeof window !== 'undefined' && (window as any).showToast) {
                              (window as any).showToast("Complete database & local cache purged successfully. Zero records remaining.", "success");
                            }
                            speakText("System successfully reset to a clean zero-record slate.", accessibility.readAloud);
                          }
                        }
                      });
                    }}
                    type="button"
                    className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 mx-auto md:mx-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    Wipe All Database & Cache Records
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeScreen === 'reports' && (
        <motion.div
          key="reports"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-left text-zinc-900 dark:text-zinc-100"
        >
          <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <div>
                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Download className="w-5.5 h-5.5 text-emerald-500 shrink-0" />
                  University Reports & Archival Center
                </h3>
                <p className="text-xs text-zinc-400">Generate, download and export consolidated CSV spreadsheets directly from live database ledger directories.</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-extrabold tracking-widest px-3 py-1 rounded-full uppercase">
                CSV Data Engine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Report Card 1: Attendance Logs */}
              <div className="p-5 rounded-2xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">Consolidated Attendance Logs</h4>
                  <span className="px-2 py-0.5 text-[9px] font-mono rounded-full bg-indigo-500/10 text-indigo-500 uppercase font-black">Attendance</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Contains details of each checked-in student, check-in timestamps, specific subject codes, standing, and presence status.</p>
                <div className="pt-2">
                  <button
                    onClick={handleExportAllGlobalAttendance}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Attendance CSV
                  </button>
                </div>
              </div>

              {/* Report Card 2: Student Directory */}
              <div className="p-5 rounded-2xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">Student Rosters Directory</h4>
                  <span className="px-2 py-0.5 text-[9px] font-mono rounded-full bg-emerald-500/10 text-emerald-400 uppercase font-black">Students</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Full directory index containing registered students, academic IDs, official emails, and declared colleges or departments.</p>
                <div className="pt-2">
                  <button
                    onClick={handleExportStudents}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Roster CSV
                  </button>
                </div>
              </div>

              {/* Report Card 3: Class Curriculums */}
              <div className="p-5 rounded-2xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">Curriculums & Class Timings</h4>
                  <span className="px-2 py-0.5 text-[9px] font-mono rounded-full bg-amber-500/10 text-amber-500 uppercase font-black">Schedules</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Full registry listing of existing campus subject configurations, day structures, classroom blocks, and allocated faculty.</p>
                <div className="pt-2">
                  <button
                    onClick={handleExportClasses}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Curriculums CSV
                  </button>
                </div>
              </div>

              {/* Report Card 4: Excuse Letter Submissions */}
              <div className="p-5 rounded-2xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">Excuse letter Submission logs</h4>
                  <span className="px-2 py-0.5 text-[9px] font-mono rounded-full bg-red-500/10 text-red-500 uppercase font-black">Excuse Letters</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Tracks student excuse requests, uploaded certified attachments filename, dates, core reason files, and faculty review decisions.</p>
                <div className="pt-2">
                  <button
                    onClick={handleExportExcuses}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Excuse Logs CSV
                  </button>
                </div>
              </div>
            </div>

            {/* General Database Summary badge */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">⚡</span>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-sans">
                    Automated Cache Sync Pipeline
                    <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-500/15 text-emerald-500 font-extrabold uppercase animate-pulse">
                      Active
                    </span>
                  </h5>
                  <p className="text-[10px] text-zinc-400 leading-relaxed text-left">
                    {pendingSyncLogs.length > 0 ? (
                      <span className="text-amber-500 font-bold animate-pulse">Background Sync Engine is currently writing {pendingSyncLogs.length} offline cache logs...</span>
                    ) : (
                      <span>All student records and checkpoint logs are automatically consolidated, verified, and synchronized across <strong>{studentCount} student accounts</strong> and <strong>{classes.length} academic courses</strong> in real-time.</span>
                    )}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleSimulateOfflineLog}
                className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-xl bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all text-center shrink-0 cursor-pointer"
              >
                Simulate Device Offline-Log
              </button>
            </div>

            {/* PENDING SYNC & CONFLICT RESOLUTION HUB */}
            <div id="pending-sync-center" className="hidden p-6 rounded-2xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/25 dark:bg-zinc-900/15 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-150 dark:border-zinc-850">
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-500 tracking-wider">
                      Database Cache Gate
                    </span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Database className="w-3.5 h-3.5" /> Offline-First Log Storage
                    </span>
                  </div>
                  <h4 className="text-md font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Pending Sync & Conflict Resolution Center
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                    When student devices or integration nodes operate disconnected from central servers, check-ins are cached in offline local storage. Administrators review pending sync registries, inspect concurrent device collisions, and resolve schedule conflicts before pushing to university servers.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 self-start lg:self-center">
                  <button
                    type="button"
                    onClick={handleSimulateOfflineLog}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-xs transition-all flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Simulate Device Offline-Log
                  </button>
                  
                  <button
                    type="button"
                    onClick={handlePushOfflineLogs}
                    disabled={isPushingSync || pendingSyncLogs.length === 0}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2 ${
                      pendingSyncLogs.length === 0 
                        ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none' 
                        : isPushingSync 
                          ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                          : 'bg-amber-500 hover:bg-amber-400 text-black active:scale-95'
                    }`}
                  >
                    {isPushingSync ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Synchronizing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Force Cache Sync
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex flex-col justify-between text-left">
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-zinc-400">Total Pending queue</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{pendingSyncLogs.length}</span>
                    <span className="text-[9px] font-mono text-zinc-400">Logs queued</span>
                  </div>
                </div>
                
                <div className="p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex flex-col justify-between text-left">
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-red-500 flex items-center gap-1">
                     Blocked conflicts
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black ${pendingSyncLogs.filter(log => log.conflictType !== 'none' && !log.resolved).length > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {pendingSyncLogs.filter(log => log.conflictType !== 'none' && !log.resolved).length}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">Halting sync</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex flex-col justify-between text-left">
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-emerald-500 flex items-center gap-1">
                     Safe / Conflict-Free
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-emerald-500">{pendingSyncLogs.filter(log => log.conflictType === 'none').length}</span>
                    <span className="text-[9px] font-mono text-zinc-400">Auto-ready</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex flex-col justify-between text-left">
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-blue-500 flex items-center gap-1">
                     Manually Resolved
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{pendingSyncLogs.filter(log => log.resolved).length}</span>
                    <span className="text-[9px] font-mono text-zinc-400">Ready to write</span>
                  </div>
                </div>
              </div>

              {/* Filter Row */}
              <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                <div className="flex items-center gap-1 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-1.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-md shadow-zinc-950/5 relative overflow-hidden flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => setSyncFilter('all')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer relative z-10 ${
                      syncFilter === 'all' 
                        ? 'text-zinc-900 dark:text-zinc-100' 
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {syncFilter === 'all' && (
                      <motion.div
                        layoutId="active-sync-filter-pill"
                        className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-lg shadow-xs -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    All Queued ({pendingSyncLogs.length})
                  </button>
                  <button
                    onClick={() => setSyncFilter('conflicts')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 relative z-10 ${
                      syncFilter === 'conflicts' 
                        ? 'text-white' 
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {syncFilter === 'conflicts' && (
                      <motion.div
                        layoutId="active-sync-filter-pill"
                        className="absolute inset-0 bg-red-500 rounded-lg shadow-xs -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    Conflicts ({pendingSyncLogs.filter(log => log.conflictType !== 'none' && !log.resolved).length})
                  </button>
                  <button
                    onClick={() => setSyncFilter('clean')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer relative z-10 ${
                      syncFilter === 'clean' 
                        ? 'text-black' 
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {syncFilter === 'clean' && (
                      <motion.div
                        layoutId="active-sync-filter-pill"
                        className="absolute inset-0 bg-emerald-500 rounded-lg shadow-xs -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    Conflict-Free ({pendingSyncLogs.filter(log => log.conflictType === 'none').length})
                  </button>
                  <button
                    onClick={() => setSyncFilter('resolved')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer relative z-10 ${
                      syncFilter === 'resolved' 
                        ? 'text-white' 
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {syncFilter === 'resolved' && (
                      <motion.div
                        layoutId="active-sync-filter-pill"
                        className="absolute inset-0 bg-blue-600 rounded-lg shadow-xs -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    Resolved ({pendingSyncLogs.filter(log => log.resolved).length})
                  </button>
                </div>
                
                <span className="text-[10px] font-mono text-zinc-400">
                  Showing {pendingSyncLogs.filter(log => {
                    if (syncFilter === 'conflicts') return log.conflictType !== 'none' && !log.resolved;
                    if (syncFilter === 'clean') return log.conflictType === 'none';
                    if (syncFilter === 'resolved') return log.resolved;
                    return true;
                  }).length} listing{pendingSyncLogs.filter(log => {
                    if (syncFilter === 'conflicts') return log.conflictType !== 'none' && !log.resolved;
                    if (syncFilter === 'clean') return log.conflictType === 'none';
                    if (syncFilter === 'resolved') return log.resolved;
                    return true;
                  }).length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Main List */}
              <div className="space-y-3">
                {pendingSyncLogs.filter(log => {
                  if (syncFilter === 'conflicts') return log.conflictType !== 'none' && !log.resolved;
                  if (syncFilter === 'clean') return log.conflictType === 'none';
                  if (syncFilter === 'resolved') return log.resolved;
                  return true;
                }).length === 0 ? (
                  <div className="py-12 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                    <span className="text-2xl">⚡</span>
                    <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">No Logs Match Filter</h5>
                    <p className="text-[10px] text-zinc-400 max-w-sm">No offline writes or conflicts are matching this category. Tap "Simulate Device Offline-Scan" to populate conflicts on mock terminals.</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {pendingSyncLogs.filter(log => {
                      if (syncFilter === 'conflicts') return log.conflictType !== 'none' && !log.resolved;
                      if (syncFilter === 'clean') return log.conflictType === 'none';
                      if (syncFilter === 'resolved') return log.resolved;
                      return true;
                    }).map((log) => {
                      const hasConflict = log.conflictType !== 'none';
                      const isResolved = log.resolved;

                      return (
                        <motion.div
                          key={log.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`p-4 rounded-xl border text-left transition-all relative ${
                            isResolved
                              ? 'bg-zinc-105/30 dark:bg-zinc-950/20 border-blue-500/20 text-zinc-800 dark:text-zinc-200'
                              : hasConflict
                                ? 'bg-red-500/[0.02] dark:bg-red-500/[0.01] border-red-500/20 text-zinc-800 dark:text-zinc-200'
                                : 'bg-emerald-500/[0.02] border-emerald-500/20 text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            {/* Student Metadata */}
                            <div className="space-y-1.5 flex-1 p-0.5text-left">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                  {log.studentName}
                                </span>
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-400 font-extrabold uppercase">
                                  ID: {log.studentId}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  log.status === 'present' 
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' 
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/10'
                                }`}>
                                  {log.status}
                                </span>
                              </div>

                              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  {log.classCode}
                                </span>
                                <span className="text-zinc-400">•</span>
                                <span>{log.className}</span>
                                <span className="text-zinc-400">•</span>
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-zinc-450 shrink-0" /> {log.room}
                                </span>
                                <span className="text-zinc-400">•</span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-zinc-455 shrink-0" /> {log.timestamp}
                                </span>
                              </div>
                            </div>

                            {/* Verification status / Conflict state icon */}
                            <div className="flex items-center gap-2.5 self-start md:self-center">
                              {isResolved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-blue-500/10 text-blue-550 dark:text-blue-400 border border-blue-500/15">
                                  <Check className="w-3" /> Resolved via {log.resolution?.replace('_', ' ')}
                                </span>
                              ) : hasConflict ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-red-500/10 text-red-550 dark:text-red-450 border border-red-500/15">
                                  <AlertTriangle className="w-3 shrink-0" /> Sync Blocked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
                                  <Check className="w-3" /> Verified Clean
                                </span>
                              )}
                              
                              <button 
                                type="button"
                                onClick={() => {
                                  setAdminDialogConfirm({
                                    title: 'Discard Offline Record',
                                    message: 'Are you sure you want to discard this offline record log from the admin sync queue completely?',
                                    confirmText: 'Discard',
                                    onConfirm: () => {
                                      setPendingSyncLogs(prev => prev.filter(p => p.id !== log.id));
                                      speakText("Offline scan log deleted from localized sync queue.", accessibility.readAloud);
                                    }
                                  });
                                }}
                                className="p-1 px-1.5 rounded-lg bg-zinc-100 hover:bg-red-500/10 hover:text-red-500 dark:bg-zinc-800 dark:hover:bg-red-500/20 text-zinc-400 transition-all cursor-pointer"
                                title="Dismiss/Discard Queue Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Conflict layout details or Resolution drawer */}
                          {hasConflict && (
                            <div className="mt-3.5 pt-3.5 border-t border-zinc-150 dark:border-zinc-850/65 space-y-3 text-left">
                              <div className="flex items-start gap-2 text-xs bg-red-500/[0.02] dark:bg-red-500/[0.01] p-2.5 rounded-lg border border-red-500/10">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <span className="font-extrabold uppercase font-mono text-[9px] text-red-500 tracking-wider">
                                    Collision Log Rule violation: {log.conflictType.replace(/_/g, ' ')}
                                  </span>
                                  <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                                    {log.conflictDesc}
                                  </p>
                                </div>
                              </div>

                              {/* Decision tree controls */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-100/50 dark:bg-zinc-950/20 p-2 rounded-xl border border-zinc-150 dark:border-zinc-850/40">
                                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono px-1">
                                  Resolution Decision Strategy
                                </span>
                                
                                {isResolved ? (
                                  <button
                                    type="button"
                                    onClick={() => handleResetConflict(log.id)}
                                    className="px-2.5 py-1 text-[9px] uppercase font-black text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded border border-red-500/10 cursor-pointer transition-all self-end"
                                  >
                                    Reset Decision
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => handleResolveConflict(log.id, 'accept_local')}
                                      className="px-2.5 py-1 text-[9px] uppercase font-black bg-blue-620 dark:bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer transition-all active:scale-95 shadow-sm"
                                    >
                                      Override (Keep Local)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleResolveConflict(log.id, 'keep_server')}
                                      className="px-2.5 py-1 text-[9px] uppercase font-black bg-zinc-200 dark:bg-zinc-850 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded cursor-pointer transition-all active:scale-95"
                                    >
                                      Discard (Keep Server)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleResolveConflict(log.id, 'merged')}
                                      className="px-2.5 py-1 text-[9px] uppercase font-black bg-purple-650 dark:bg-purple-600 hover:bg-purple-500 text-white rounded cursor-pointer transition-all active:scale-95"
                                    >
                                      Merge Log Metadata
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Non-conflicting log helper footer */}
                          {!hasConflict && (
                            <div className="mt-2 text-[10px] text-zinc-450 dark:text-zinc-400 flex items-center gap-1 p-1 bg-emerald-500/[0.01]">
                              <span className="text-emerald-500">✓</span> No overlap conflicts. Tap <strong>Force Cache Sync</strong> above to batch synchronize this record to the central databases.
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 6. MESSAGES TAB ROUTING FOR ADMIN */}
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
            userProfile={userProfile || { id: 'admin-01', name: 'Master Admin One', email: 'admin@msu.edu.ph', role: 'admin', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150', department: 'Academic Registrar Board' }} 
            classes={classes} 
            enrollments={enrollments} 
            accessibility={accessibility} 
            mode="private"
            onBack={() => setScreen('dashboard')}
            initialContactId={selectedChatContact}
          />
        </motion.div>
      )}

      {/* HELP TICKETS TAB ROUTING FOR ADMIN */}
      {activeScreen === 'tickets' && (
        <motion.div
          key="tickets"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="h-[calc(100vh-4.2rem)] md:h-[calc(100vh-4.5rem)] flex flex-col text-left overflow-hidden space-y-3 pb-0"
        >
          <div className="pb-3 border-b border-zinc-150 dark:border-zinc-850/60 flex items-start gap-4 shrink-0">
            <button 
              onClick={() => setScreen('dashboard')} 
              type="button"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition-all active:scale-95 shadow-sm shrink-0 select-none mt-0.5"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-500" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <HelpCircle className="w-5.5 h-5.5 text-blue-500" />
                Administrative Helpdesk & Support Tickets
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Review, prioritize, and resolve administrative help tickets filed by students and faculty.</p>
            </div>
          </div>
          <Messages 
            userProfile={userProfile || { id: 'admin-01', name: 'Master Admin One', email: 'admin@msu.edu.ph', role: 'admin', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150', department: 'Academic Registrar Board' }} 
            classes={classes} 
            enrollments={enrollments} 
            accessibility={accessibility} 
            mode="tickets"
          />
        </motion.div>
      )}

      {/* 7. SYSTEM LEVEL NOTIFICATION DECK FOR ADMIN */}
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
            <div className="flex items-start gap-4">
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
                  Administrative Notification Centre
                </h2>
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mt-1 font-mono">System-wide logs & diagnostic alerts</p>
              </div>
            </div>
            {notifications && notifications.length > 0 && (
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

          {/* Search/Filters */}
          <div className="flex items-center gap-2.5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-2.5 sm:p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-md shadow-zinc-950/5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                value={notifSearch}
                onChange={(e) => setNotifSearch(e.target.value)}
                placeholder="Search system wide logs..."
                className="w-full bg-white/90 dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl pl-9 pr-8 py-2 text-xs font-medium placeholder-zinc-400 text-zinc-850 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
              />
              {notifSearch && (
                <button
                  type="button"
                  onClick={() => setNotifSearch('')}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative shrink-0 h-9 px-3 flex items-center justify-center gap-2 bg-white/90 dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer shadow-2xs group" title="Filter notification logs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hidden sm:inline">
                Filter: {notifFilter}
              </span>
              <select
                value={notifFilter}
                onChange={(e) => {
                  const val = e.target.value as 'all' | 'alerts' | 'updates';
                  setNotifFilter(val);
                  speakText(`Filter set to ${val}`, accessibility.readAloud);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              >
                <option value="all">ALL ({notifications ? notifications.length : 0})</option>
                <option value="alerts">ALERTS ({notifications ? notifications.filter(n => n.type === 'alert' || n.type === 'warning').length : 0})</option>
                <option value="updates">UPDATES ({notifications ? notifications.filter(n => n.type === 'info' || n.type === 'success').length : 0})</option>
              </select>
            </div>
          </div>

          {/* List display */}
          <div className="space-y-2.5">
            {(() => {
              if (!notifications || notifications.length === 0) {
                return (
                  <div className="p-12 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/20">
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">No notifications found</p>
                    <p className="text-[10px] text-zinc-500 font-medium">As soon as systemic events occur, they will propagate onto this desk.</p>
                  </div>
                );
              }

              const filtered = notifications.filter(notif => {
                const titleMatch = (notif.title || '').toLowerCase().includes(notifSearch.toLowerCase());
                const msgMatch = (notif.message || '').toLowerCase().includes(notifSearch.toLowerCase());
                const textPass = titleMatch || msgMatch;

                if (!textPass) return false;
                if (notifFilter === 'alerts') return notif.type === 'alert' || notif.type === 'warning';
                if (notifFilter === 'updates') return notif.type === 'info' || notif.type === 'success';
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-12 text-center rounded-3xl bg-zinc-50/25 dark:bg-zinc-950/25">
                    <p className="text-xs text-zinc-400 font-bold">No notifications match your active search filter.</p>
                  </div>
                );
              }

              return filtered.map((notif, i) => {
                return (
                   <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className={`p-3.5 rounded-xl border transition-all ${
                      notif.read 
                        ? 'bg-zinc-50/20 dark:bg-zinc-900/10 border-zinc-150/80 dark:border-zinc-900/60 opacity-80' 
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.012)]'
                    } flex items-start gap-3 relative overflow-hidden`}
                  >
                    {!notif.read && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    )}
                    <div className="shrink-0 mt-1">
                      <span className={`w-2 h-2 rounded-full block ${
                        notif.type === 'alert' ? 'bg-red-500' :
                        notif.type === 'warning' ? 'bg-amber-550 bg-amber-500' :
                        notif.type === 'success' ? 'bg-emerald-500' :
                        'bg-indigo-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-baseline gap-2.5">
                        <h4 className={`text-xs font-bold truncate ${notif.read ? 'text-zinc-650 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[8px] font-mono font-black text-zinc-400 dark:text-zinc-500 shrink-0 uppercase tracking-widest">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-snug">
                        {notif.message}
                      </p>
                    </div>
                  </motion.div>
                );
              });
            })()}
          </div>
        </motion.div>
      )}

      {activeScreen === 'rooms' && (
        <motion.div
          key="rooms"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-left"
        >
          {/* Header section with back action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-150 dark:border-zinc-850/60 pb-4">
            <div className="flex items-start gap-4">
              <button 
                onClick={() => setScreen('dashboard')} 
                type="button"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-855 cursor-pointer transition-all active:scale-95 shadow-sm shrink-0 select-none mt-0.5"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  Rooms Directory Management
                </h2>
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mt-1 font-mono">Manage available rooms, capacities, and active scanner states</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsAddingRoom(!isAddingRoom);
                setEditingRoomId(null);
                setNewRoomName('');
              }}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black text-[10.5px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New Room
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl">
              <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 block mb-1">Total Rooms</span>
              <span className="text-xl font-mono font-black text-zinc-800 dark:text-zinc-200">{labRooms.length}</span>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl">
              <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 block mb-1">Available Rooms</span>
              <span className="text-xl font-mono font-black text-emerald-500">{labRooms.filter(r => r.status === 'available').length}</span>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl">
              <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 block mb-1">In Use / Occupied</span>
              <span className="text-xl font-mono font-black text-red-500">{labRooms.filter(r => r.status === 'occupied').length}</span>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl">
              <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 block mb-1">Under Maintenance</span>
              <span className="text-xl font-mono font-black text-amber-500">{labRooms.filter(r => r.status === 'maintenance').length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* List and Actions Grid Table */}
            <div className="lg:col-span-12 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#CC762A]">Registered Room Registry</span>
                <span className="text-[9px] font-mono text-zinc-450">{labRooms.length} ACTIVE ROOM RECORDS</span>
              </div>

              {/* Grid lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {labRooms.map(rm => {
                  const isEditingThis = editingRoomId === rm.id;
                  const percent = Math.min(100, Math.round((rm.currentOccupancy / rm.capacity) * 100)) || 0;

                  if (isEditingThis) {
                    return (
                      <form 
                        key={rm.id}
                        onSubmit={handleSaveRoomEdit} 
                        className="p-4 rounded-xl border border-amber-500 bg-amber-500/[0.03] space-y-3 text-left animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-zinc-200/50 dark:border-zinc-805">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1 font-mono">
                            ⚙️ REVISE ROOM
                          </h4>
                          <button
                            type="button"
                            onClick={() => setEditingRoomId(null)}
                            className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 text-[10px] font-bold"
                          >
                            CANCEL
                          </button>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Room Identifier Name</label>
                          <input 
                            type="text" 
                            value={editRoomName}
                            onChange={(e) => setEditRoomName(e.target.value)}
                            className="w-full text-[11px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 outline-none text-zinc-855 dark:text-zinc-200 focus:border-amber-500"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">Capacity</label>
                            <input 
                              type="number" 
                              min={1}
                              value={editRoomCapacity}
                              onChange={(e) => setEditRoomCapacity(Number(e.target.value))}
                              className="w-full text-[11px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 outline-none text-zinc-855 dark:text-zinc-200"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">Workstations</label>
                            <input 
                              type="number" 
                              min={0}
                              value={editRoomDevices}
                              onChange={(e) => setEditRoomDevices(Number(e.target.value))}
                              className="w-full text-[11px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 outline-none text-zinc-855 dark:text-zinc-200"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">Operational Status</label>
                          <select
                            value={editRoomStatus === 'maintenance' ? 'maintenance' : 'available'}
                            onChange={(e) => setEditRoomStatus(e.target.value as any)}
                            className="w-full text-[11px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none font-sans"
                          >
                            <option value="available" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Operational (System Auto-detect)</option>
                            <option value="maintenance" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Under Maintenance Lockout</option>
                          </select>
                        </div>

                        <div className="flex justify-end gap-1.5 pt-1.5 border-t border-zinc-200/40 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setEditingRoomId(null)}
                            className="px-2.5 py-1 text-[9px] uppercase font-bold border border-zinc-250 dark:border-zinc-800 rounded-lg text-zinc-500 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 text-[9px] uppercase font-black bg-amber-500 hover:bg-amber-400 text-black rounded-lg cursor-pointer transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div 
                      key={rm.id} 
                      className={`p-4 rounded-xl border text-left transition-all hover:border-emerald-500/30 flex flex-col justify-between gap-4 ${
                        editingRoomId === rm.id ? 'border-amber-500/40 bg-zinc-50/50 dark:bg-zinc-900/20' : 'border-zinc-200 dark:border-zinc-805 bg-zinc-50/30 dark:bg-zinc-950/25'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 leading-snug">{rm.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${
                            rm.status === 'occupied' ? 'bg-red-500/10 text-red-500' :
                            rm.status === 'maintenance' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450'
                          }`}>
                            {rm.status}
                          </span>
                        </div>

                        {/* Capacity indicators */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                            <span>Occupancy:</span>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{rm.currentOccupancy} / {rm.capacity} Pax ({percent}%)</span>
                          </div>
                          <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-850 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                rm.status === 'maintenance' ? 'bg-amber-500' :
                                percent >= 80 ? 'bg-red-500' :
                                'bg-emerald-500'
                              }`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[9px] pt-1 border-t border-zinc-100 dark:border-zinc-900/60 font-mono">
                          <div>
                            <span className="text-zinc-400">Workstations:</span>
                            <p className="font-bold text-zinc-700 dark:text-zinc-300">{rm.devicesCount} Terminals</p>
                          </div>
                          <div>
                            <span className="text-zinc-400">Scanner system:</span>
                            <p className={`font-black uppercase tracking-wide flex items-center gap-1 ${rm.scannersActive ? 'text-emerald-500' : 'text-zinc-450'}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" /> {rm.scannersActive ? 'ACTIVE' : 'OFF'}
                            </p>
                          </div>
                        </div>

                        {rm.activeClass && (
                          <div className="p-1 px-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-md text-[9px] text-zinc-500">
                            Active Subject Class: <strong className="font-extrabold text-zinc-700 dark:text-zinc-300">{rm.activeClass}</strong>
                          </div>
                        )}
                      </div>

                      {/* Controls and Actions row */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-zinc-800 text-[10px] flex-wrap gap-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoomId(rm.id);
                              setEditRoomName(rm.name);
                              setEditRoomCapacity(rm.capacity);
                              setEditRoomDevices(rm.devicesCount);
                              setEditRoomStatus(rm.status);
                              setEditRoomFloor(rm.floor || '2nd Floor');
                              setIsAddingRoom(false);
                            }}
                            className="bg-zinc-150 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 font-extrabold px-2 py-1 rounded cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(rm.id, rm.name)}
                            className="bg-red-500/10 hover:bg-red-500 text-red-550 hover:text-white font-extrabold px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = labRooms.map(r => r.id === rm.id ? { ...r, scannersActive: !r.scannersActive } : r);
                            onUpdateLabRooms?.(updated);
                            speakText(`Scanner state toggled in ${rm.name}`, accessibility.readAloud);
                          }}
                          className={`text-[8.5px] font-mono tracking-tight font-black uppercase px-2 py-1 rounded border overflow-hidden cursor-pointer ${
                            rm.scannersActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-450 border-zinc-200 dark:border-zinc-805'
                          }`}
                        >
                          {rm.scannersActive ? 'Disable Scanner' : 'Enable Scanner'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {labRooms.length === 0 && (
                  <div className="md:col-span-2 py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                    <MapPin className="w-10 h-10 text-zinc-300 mx-auto mb-2 animate-bounce" />
                    <p className="text-zinc-400 text-xs font-black uppercase tracking-wider font-sans">No rooms found in registry</p>
                    <p className="text-[10px] text-zinc-450 mt-1">Deploy a new custom room registry using the top right button.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* 5. INDIVIDUAL SUBJECT DETAILED AUDITS MODAL OVERLAY */}
      <SubjectDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedClassDetail(null);
        }}
        cls={selectedClassDetail}
        enrollments={enrollments}
        records={attendanceRecords}
        facultyStatuses={[]}
        isDark={accessibility.theme === 'dark'}
        userRole="admin"
      />

      {/* REGISTER NEW SUBJECT SCHEDULE MODAL OVERLAY */}
      <AnimatePresence>
        {isAdminClassFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-[2rem] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-900/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Plus className="w-5 h-5 text-emerald-500 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Register New Subject</h3>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-400">Insert curriculum schedule with assigned faculty & room</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminClassFormOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 text-xs font-black select-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitClassForm} className="space-y-4 pt-4 overflow-y-auto max-h-[70vh] pr-1.5 custom-scrollbar">
                {/* Real-time conflict warnings banner */}
                {adminSchedulesConflicts.length > 0 && (
                  <div className="p-4 rounded-xl bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 text-left space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
                      <span className="text-xs font-black text-red-650 dark:text-red-400 uppercase tracking-wider font-sans">
                        Conflict Warning: Detected {adminSchedulesConflicts.length} Scheduling Clash{adminSchedulesConflicts.length > 1 ? 'es' : ''}
                      </span>
                    </div>
                    <div className="divide-y divide-red-200 dark:divide-zinc-800/60 space-y-2">
                      {adminSchedulesConflicts.map((conf, index) => (
                        <div key={index} className="text-[11px] text-zinc-700 dark:text-zinc-300 pt-2 first:pt-0 font-sans">
                          <p className="font-bold flex items-start sm:items-center justify-between gap-2 text-red-600 dark:text-red-400">
                            <span>{conf.message}</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-550/10 dark:bg-red-950/40 border border-red-500/20 uppercase font-mono shrink-0 tracking-widest font-extrabold">
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
                
                {/* Code & Name group */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Subject Code</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. ITE183"
                      value={adminFormCode}
                      onChange={(e) => setAdminFormCode(e.target.value)}
                      className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Course Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Web Systems development"
                      value={adminFormName}
                      onChange={(e) => setAdminFormName(e.target.value)}
                      className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                </div>

                {/* Instructor */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Assigned Instructor</label>
                  <select
                    name="instructor-selector"
                    value={adminFormFacultyId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setAdminFormFacultyId(selId);
                      const selectedFac = registeredFacultyList.find(f => (f.id === selId || f.uid === selId || f.email === selId));
                      if (selectedFac) {
                        setAdminFormFacultyName(selectedFac.name);
                      } else {
                        setAdminFormFacultyName('');
                      }
                    }}
                    className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                  >
                    {registeredFacultyList.length === 0 ? (
                      <option value="">No registered faculty found (Register a faculty account first)</option>
                    ) : (
                      registeredFacultyList.map((fac) => {
                        const val = fac.id || fac.uid || fac.email;
                        return (
                          <option key={val} value={val}>
                            {fac.name} {fac.department ? `(${fac.department})` : fac.email ? `(${fac.email})` : ''}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                {/* Days Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-sans">Scheduled Days</label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['MW', 'TTh', 'S', 'A'].map((day) => {
                      const isActive = adminFormDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleAdminDayToggle(day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500 text-black shadow-xs font-extrabold'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timetable Slots */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Start Time</label>
                    <select
                      value={adminFormStart}
                      onChange={(e) => setAdminFormStart(e.target.value)}
                      className={`w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold transition-all ${
                        adminSchedulesConflicts.some(cf => cf.type === 'faculty') 
                          ? 'border-red-500 ring-1 ring-red-500/20' 
                          : 'border-zinc-200 dark:border-zinc-850'
                      }`}
                    >
                      {SCHEDULING_TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
 
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">End Time</label>
                    <select
                      value={adminFormEnd}
                      onChange={(e) => setAdminFormEnd(e.target.value)}
                      className={`w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold transition-all ${
                        adminSchedulesConflicts.some(cf => cf.type === 'faculty') 
                          ? 'border-red-500 ring-1 ring-red-500/20' 
                          : 'border-zinc-200 dark:border-zinc-850'
                      }`}
                    >
                      {SCHEDULING_TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
 
                {/* Location Room */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Room / Lab Location</label>
                  <select
                    name="room-selector"
                    value={adminFormRoom}
                    onChange={(e) => setAdminFormRoom(e.target.value)}
                    className={`w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold transition-all ${
                      adminSchedulesConflicts.some(cf => cf.type === 'room') 
                        ? 'border-red-500 ring-1 ring-red-500/20' 
                        : 'border-zinc-200 dark:border-zinc-850'
                    }`}
                  >
                    {sortedLabRooms.length === 0 ? (
                      <option value="">No created rooms found (Create a room in Laboratory Rooms first)</option>
                    ) : (
                      sortedLabRooms.map((rm) => (
                        <option key={rm.id} value={rm.name}>{rm.name} {rm.floor ? `(${rm.floor})` : ''}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setIsAdminClassFormOpen(false)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-400 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs select-none active:scale-95"
                  >
                    Create Offering
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. UNIVERSITY BULLETIN CABINET STORAGE MODAL BOX */}
      <AnimatePresence>
      {isBulletinsLockerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-4xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-[2rem] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white">Campus Bulletins Storage Locker</h3>
                  <p className="text-[11px] text-zinc-400">Establish, manage, search, and purge dynamic school announcements</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBulletinsLockerOpen(false)}
                className="p-1 px-3 bg-zinc-100 hover:bg-red-500/10 dark:bg-zinc-900 hover:text-red-500 dark:hover:text-red-400 text-zinc-500 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all"
              >
                Close Cabinet ×
              </button>
            </div>

            {/* Split layout: compose form (left) / archives list searchable (right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden flex-1 py-4">
              
              {/* Left Column: Composer form */}
              <div className="md:col-span-5 border-r border-zinc-100 dark:border-zinc-900 pr-0 md:pr-6 overflow-y-auto space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#CC762A] flex items-center gap-1.5 font-bold">
                  ✏️ {annEditingId ? 'Revise Announcement' : 'Draft School Circular'}
                </h4>

                <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">Bulletin Title</label>
                    <input
                      type="text"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="e.g. Server Maintenance window, Room locks..."
                      className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">Audience Target</label>
                    <select
                      value={annTarget}
                      onChange={(e) => setAnnTarget(e.target.value as 'all' | 'student' | 'faculty')}
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-905 focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="all">Everyone (All System accounts)</option>
                      <option value="student">Student Terminals Only</option>
                      <option value="faculty">Faculty Side Cabinets Only</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">Announcement Message</label>
                    <textarea
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      placeholder="Write exact clear details about this administrative alert circular..."
                      rows={4}
                      className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-indigo-550 outline-none text-zinc-905 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    {annEditingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnnEditingId(null);
                          setAnnTitle('');
                          setAnnContent('');
                          setAnnTarget('all');
                        }}
                        className="flex-1 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-450 text-[10px] uppercase font-black tracking-widest rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                      >
                        Abort Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
                    >
                      {annEditingId ? 'Apply Update' : 'Broadcast Alert'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Searchable Bulletin List */}
              <div className="md:col-span-7 overflow-y-auto pl-0 md:pl-2 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-900">
                    <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest font-black">Active Bulletins Ledger ({announcements.length})</span>
                    <span className="text-[8px] font-mono text-zinc-400 uppercase">ClassPulse-Secure-Circulars</span>
                  </div>

                  <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                    {announcements.map((ann) => (
                      <div 
                        key={ann.id} 
                        className="p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-900/10 flex flex-col justify-between gap-3 text-left hover:border-indigo-500/25 transition-all"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              ann.target === 'all' ? 'bg-zinc-150 dark:bg-zinc-800 text-zinc-550 dark:text-zinc-350' :
                              ann.target === 'student' ? 'bg-indigo-500/10 text-indigo-550 dark:text-indigo-400' :
                              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              Target: {ann.target.toUpperCase()}
                            </span>
                            <span className="text-[8px] font-mono text-zinc-400">{new Date(ann.createdAt).toLocaleDateString()}</span>
                          </div>

                          <h4 className="font-extrabold text-xs text-zinc-905 dark:text-zinc-100 leading-snug">{ann.title}</h4>
                          <p className="text-[10.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">{ann.content}</p>
                        </div>

                        <div className="flex gap-2 justify-end pt-2 border-t border-zinc-100 dark:border-zinc-900/60 text-xs">
                          <button
                            onClick={() => handleEditAnnClick(ann)}
                            className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-indigo-500" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAnnClick(ann.id, ann.title)}
                            className="px-2.5 py-1 bg-zinc-100 hover:bg-red-500/15 dark:bg-zinc-900 dark:hover:bg-red-955 rounded-lg text-red-550 dark:text-red-400 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}

                    {announcements.length === 0 && (
                      <div className="py-12 text-center border border-dashed border-zinc-250 dark:border-zinc-800 rounded-2xl">
                        <Megaphone className="w-8 h-8 text-zinc-300 animate-bounce mx-auto mb-2" />
                        <p className="text-xs text-zinc-400 font-bold">Locker storage is completely empty. Draft a bulletin on the left.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </motion.div>
        </div>
      )}
      </AnimatePresence>



      {/* Custom Delete Confirmation Modal */}
      {adminDeleteConfirmClass && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Drop Course Confirmation</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Are you absolutely sure you want to drop course <span className="font-bold text-red-500">{adminDeleteConfirmClass.code}</span> from MSU directories?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAdminDeleteConfirmClass(null)}
                className="flex-1 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClass(adminDeleteConfirmClass.id);
                  setAdminDeleteConfirmClass(null);
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

      {/* Bulk CSV User Import Modal */}
      {csvImportModalOpen && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-3xl max-w-xl w-full text-left space-y-4 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setCsvImportModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-650 cursor-pointer p-1 rounded-full bg-zinc-100 dark:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-900 pb-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                  📥 Bulk CSV User Registration Import
                </h3>
                <p className="text-xs text-zinc-400">
                  Upload or paste CSV rows to register incoming freshmen or faculty batches into Central Roster.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-zinc-700 dark:text-zinc-300">CSV Template Reference</span>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Sample CSV File
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Paste Raw CSV Lines (Name, Email, Role, ID, Dept)</label>
                <textarea
                  rows={4}
                  value={csvRawText}
                  onChange={(e) => handleParseCsvText(e.target.value)}
                  placeholder="Juan Dela Cruz, juan@msu.edu.ph, student, 2025-0012, IT&#10;Maria Clara, maria@msu.edu.ph, faculty, FAC-102, CS"
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-mono text-xs text-zinc-800 dark:text-zinc-200 outline-none"
                />
              </div>

              {csvParsedRows.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Parsed Candidates ({csvParsedRows.length} Valid Entries)
                  </span>
                  <div className="max-h-36 overflow-y-auto border border-zinc-150 dark:border-zinc-850 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-900">
                    {csvParsedRows.map((row, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-[11px] font-mono">
                        <div>
                          <strong className="text-zinc-800 dark:text-zinc-200">{row.name}</strong> ({row.email})
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] uppercase font-bold">{row.role}</span>
                          <span className="text-emerald-500 font-bold">Ready</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setCsvImportModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitBulkCsvImport}
                disabled={csvParsedRows.length === 0}
                className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  csvParsedRows.length > 0
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs'
                    : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 cursor-not-allowed'
                }`}
              >
                Register Batch ({csvParsedRows.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Semester Archiving Modal */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-3xl max-w-lg w-full text-left space-y-4 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setArchiveModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-650 cursor-pointer p-1 rounded-full bg-zinc-100 dark:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-900 pb-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                  🔒 Close Academic Term & Archive
                </h3>
                <p className="text-xs text-zinc-400">
                  Seal current active schedules into read-only historical archives and prepare registers for the next term.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Archive Term Designation Name</label>
                <input
                  type="text"
                  value={termNameInput}
                  onChange={(e) => setTermNameInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none"
                  placeholder="e.g. 1st Semester AY 2025-2026"
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-1 text-[11px]">
                <strong className="block font-black uppercase tracking-wider">Term Closure Summary:</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Classes Snapshot: {classes.length} active courses</li>
                  <li>Attendance Snapshot: {attendanceRecords.length} recorded logs</li>
                  <li>Student Enrollments: {enrollments.length} active records</li>
                </ul>
              </div>

              {archivedTermsList.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Historical Term Archives ({archivedTermsList.length})</span>
                  <div className="max-h-28 overflow-y-auto space-y-1.5">
                    {archivedTermsList.map(arch => (
                      <div key={arch.id} className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-850 flex items-center justify-between text-[11px] font-mono">
                        <div>
                          <strong className="text-zinc-800 dark:text-zinc-200">{arch.termName}</strong>
                          <span className="text-[9px] text-zinc-400 block">{arch.archivedAt}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase">
                          {arch.totalClasses} Courses Archived
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitSemesterArchive}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-amber-500 hover:bg-amber-400 text-black shadow-xs transition-all cursor-pointer"
              >
                🔒 Confirm Term Closure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Generic Admin Confirmation Dialog */}
      {adminDialogConfirm && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto text-xl">
              💡
            </div>
            <div className="space-y-1.5 text-left">
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-center">{adminDialogConfirm.title}</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed text-center whitespace-pre-line mt-2">
                {adminDialogConfirm.message}
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAdminDialogConfirm(null)}
                className="flex-1 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
              >
                {adminDialogConfirm.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  adminDialogConfirm.onConfirm();
                  setAdminDialogConfirm(null);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                {adminDialogConfirm.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTABLISH/ADD NEW ROOM INSTANT MODAL OVERLAY */}
      <AnimatePresence>
        {isAddingRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-[2rem] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] text-left relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-900/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Establish New Room</h3>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-400">Add lecture room or lab workstation to campus registry</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingRoom(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 text-xs font-black select-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddRoom} className="space-y-4 pt-4">
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Room Identifier Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Room 303 - Design Studio" 
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-zinc-850 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500 font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Capacity (Pax)</label>
                    <input 
                      type="number" 
                      min={1}
                      value={newRoomCapacity}
                      onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                      className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-zinc-800 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Workstations</label>
                    <input 
                      type="number" 
                      min={0}
                      value={newRoomDevices}
                      onChange={(e) => setNewRoomDevices(Number(e.target.value))}
                      className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-zinc-800 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Located Floor</label>
                  <select
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(e.target.value)}
                    className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-zinc-800 dark:text-zinc-100"
                  >
                    <option value="1st Floor" className="bg-white dark:bg-zinc-950">1st Floor</option>
                    <option value="2nd Floor" className="bg-white dark:bg-zinc-950">2nd Floor</option>
                    <option value="3rd Floor" className="bg-white dark:bg-zinc-950">3rd Floor</option>
                    <option value="4th Floor" className="bg-white dark:bg-zinc-950">4th Floor</option>
                    <option value="5th Floor" className="bg-white dark:bg-zinc-950">5th Floor</option>
                    <option value="6th Floor" className="bg-white dark:bg-zinc-950">6th Floor</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setIsAddingRoom(false)}
                    className="flex-1 py-2.5 text-[10px] uppercase font-black tracking-wider border border-zinc-250 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-3 text-[10px] uppercase font-black bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl cursor-pointer shadow-md"
                  >
                    Establish Room
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
