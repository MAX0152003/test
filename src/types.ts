export type Role = 'student' | 'faculty' | 'admin';

export interface ClassSession {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  room: string;
  days: string[]; // e.g. ['MW', 'TTh', 'FS', 'A']
  facultyName: string;
  facultyId: string;
  credits?: number;
  facultyStatusUpdate?: 'none' | 'attend' | 'cancel' | 'late';
  tempRoom?: string;
  lastUpdateTimestamp?: number;
  qrToken?: string;
  qrGeneratedAt?: number;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  status: 'present' | 'late' | 'absent' | 'excused';
  role: Role;
  studentName?: string;
  studentId?: string;
  isSynced?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  studentId?: string;
  facultyId?: string;
  department?: string;
  bio?: string;
  phone?: string;
  joinedAt?: string;
}

export interface AccessibilityConfig {
  theme: 'light' | 'dark';
  readAloud: boolean;
}

export type ViewDensity = 'comfortable' | 'compact';

export interface FacultyStatus {
  id: string;
  name: string;
  avatar: string;
  status: 'available' | 'in-class' | 'unavailable';
  room?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string;
  classId: string;
  enrolledAt: string;
  deletedByStudent?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target: 'all' | 'student' | 'faculty';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  receiverId: string;
  receiverName: string;
  message: string;
  timestamp: string;
  read?: boolean;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'valid' | 'invalid';
  createdAt: string;
  attachmentName?: string;
  attachmentData?: string;
  attachmentImg?: string;
}

export interface ScannerLog {
  id: string;
  timestamp: string;
  studentName: string;
  studentId: string;
  action: string;
  status: string;
}

export interface LabRoom {
  id: string;
  name: string;
  capacity: number;
  status: 'occupied' | 'available' | 'maintenance';
  currentOccupancy: number;
  activeClass: string;
  devicesCount: number;
  scannersActive: boolean;
  activeScannerLogs: ScannerLog[];
  floor?: string;
}

export interface ArchivedTerm {
  id: string;
  termName: string;
  archivedAt: string;
  archivedBy: string;
  classesCount: number;
  totalRecordsCount: number;
  classesSnapshot: ClassSession[];
  attendanceSnapshot: AttendanceRecord[];
}

export interface DispatchedWarningEmail {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classCode: string;
  className: string;
  attendanceRate: number;
  advisorEmail: string;
  dispatchedAt: string;
  status: 'Delivered' | 'Pending' | 'Failed';
  subject: string;
  body: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  operatorRole: Role;
  action: string;
  details: string;
  targetId?: string;
}

