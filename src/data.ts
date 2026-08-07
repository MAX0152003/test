import { ClassSession, AppNotification, FacultyStatus, AttendanceRecord, UserProfile } from './types';

export const INITIAL_CLASSES: ClassSession[] = [];

export const INITIAL_FACULTY_STATUSES: FacultyStatus[] = [
  {
    id: 'fac-01',
    name: 'Dr. Ahmad Khan',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    status: 'available',
    room: 'Consultation Office 303'
  },
  {
    id: 'fac-02',
    name: 'Prof. Maria Santos',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    status: 'in-class',
    room: 'Lab Room 201'
  },
  {
    id: 'fac-03',
    name: 'Engr. Carlos Reyes',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    status: 'unavailable',
    room: 'Faculty Lounge'
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [];

export const DEFAULT_STUDENT_PROFILE: UserProfile = {
  id: 'stud-01',
  name: 'John Doe',
  email: 'john.doe@msu.edu.ph',
  role: 'student',
  avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
  studentId: '2023-10492',
  department: 'Information Technology'
};

export const DEFAULT_FACULTY_PROFILE: UserProfile = {
  id: 'fac-01',
  name: 'Dr. Ahmad Khan',
  email: 'ahmad.khan@msu.edu.ph',
  role: 'faculty',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
  facultyId: 'FAC-90234',
  department: 'Computer Science'
};

export const DEFAULT_ADMIN_PROFILE: UserProfile = {
  id: 'admin-01',
  name: 'Master Admin One',
  email: 'admin@msu.edu.ph',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
  department: 'Academic Registrar Board'
};

export const SECOND_ADMIN_PROFILE: UserProfile = {
  id: 'admin-02',
  name: 'Master Admin Two',
  email: 'admin2@msu.edu.ph',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
  department: 'Academic Control Center'
};
