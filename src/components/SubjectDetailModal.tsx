import React from 'react';
import { ClassSession, Enrollment, AttendanceRecord, UserProfile, FacultyStatus } from '../types';
import AttendanceGraph from './AttendanceGraph';
import { X, Calendar, Clock, MapPin, User, Users, ShieldAlert, CheckCircle, Activity, Download, Search } from 'lucide-react';

interface SubjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: ClassSession | null;
  enrollments: Enrollment[];
  records: AttendanceRecord[];
  facultyStatuses: FacultyStatus[];
  isDark?: boolean;
  studentId?: string;
  studentName?: string;
}

export default function SubjectDetailModal({
  isOpen,
  onClose,
  cls,
  enrollments,
  records,
  facultyStatuses,
  isDark,
  studentId,
  studentName
}: SubjectDetailModalProps) {
  if (!isOpen || !cls) return null;

  const [rosterSearch, setRosterSearch] = React.useState('');

  // Find enrolled students for this class
  const classEnrollments = enrollments.filter(e => e.classId === cls.id);

  // Filter roster students by fast search query
  const filteredRoster = classEnrollments.filter(student =>
    (student.studentName || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (student.studentId || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (student.studentEmail || '').toLowerCase().includes(rosterSearch.toLowerCase())
  );

  // Calculate stats for the detailed subject information
  const totalClassAttendances = records.filter(r => r.classId === cls.id && r.status === 'present').length;
  const myPresentCount = records.filter(
    r => r.classId === cls.id && 
    (r.studentId === studentId || r.studentName === studentName) && 
    r.status === 'present'
  ).length;
  const myLateCount = records.filter(
    r => r.classId === cls.id && 
    (r.studentId === studentId || r.studentName === studentName) && 
    r.status === 'late'
  ).length;
  const myAbsentCount = records.filter(
    r => r.classId === cls.id && 
    (r.studentId === studentId || r.studentName === studentName) && 
    r.status === 'absent'
  ).length;
  const myTotalSessions = myPresentCount + myLateCount + myAbsentCount;

  // Find faculty status
  const facultyObj = facultyStatuses.find(f => f.id === cls.facultyId || (f.name || '').toLowerCase() === (cls.facultyName || '').toLowerCase());
  const facultyStatus = facultyObj?.status || 'available';

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-500';
      case 'in-class': return 'bg-amber-500';
      default: return 'bg-zinc-400';
    }
  };

  const handleExportCSV = () => {
    const classRecords = records.filter(r => r.classId === cls.id);
    const headers = ["Student ID", "Student Name", "Class Code", "Course Name", "Session Date", "Check-in Time", "Attendance Status"];
    const rows = classRecords.map(rec => [
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
    link.setAttribute("download", `${cls.code}_Roster_Attendance_${cls.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto z-10 text-left">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-200 dark:border-zinc-850 mb-5">
          <div className="space-y-1">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-500 border border-emerald-500/10">
              {cls.code} • Subject Profile
            </span>
            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {cls.name}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic content grid */}
        <div className="space-y-6">
          {/* Class Schedule and Room Metadata Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Meeting Days</p>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {cls.days.join(', ')} ({cls.room})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Attendance window</p>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {cls.startTime} - {cls.endTime}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Subject Information Block */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Detailed Subject Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Instructor Name Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                  INSTRUCTOR NAME
                </p>
                <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
                  {cls.facultyName}
                </p>
                <p className="text-[10px] text-zinc-500">
                  Primary course supervisor
                </p>
              </div>

              {/* Room Location Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  ROOM LOCATION
                </p>
                <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
                  {cls.room || 'TBA'}
                </p>
                <p className="text-[10px] text-zinc-500">
                  Campus facility assignment
                </p>
              </div>

              {/* Total Attendance Count Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  TOTAL ATTENDANCE
                </p>
                <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
                  {myTotalSessions > 0 ? `${myPresentCount + myLateCount} / ${myTotalSessions} Days` : '0 Days Attended'}
                </p>
                <div className="text-[10px] text-zinc-500 space-y-0.5">
                  <p>Overall Class Check-ins: <span className="font-bold text-emerald-500">{totalClassAttendances}</span></p>
                  {myTotalSessions > 0 && (
                    <p>My Rate: <span className="font-bold text-emerald-500">{Math.round(((myPresentCount + myLateCount) / myTotalSessions) * 100)}%</span></p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Faculty details */}
          <div>
            <h4 className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-500" />
              Primary Professor & Status
            </h4>
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 flex items-center gap-4">
              <div className="relative">
                <img 
                  src={facultyObj?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150"} 
                  alt={cls.facultyName} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/20"
                  referrerPolicy="no-referrer"
                />
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 ${getStatusColor(facultyStatus)}`} />
              </div>
              <div>
                <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{cls.facultyName}</h5>
                <p className="text-[11px] text-zinc-500 capitalize">
                  Consultation Status: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{facultyStatus}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Reusable Attendance Graph component */}
          <div>
            <h4 className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Attendance Trends & Statistics
            </h4>
            <AttendanceGraph 
              classId={cls.id} 
              classCode={cls.code} 
              className={cls.name} 
              records={records} 
              isDark={isDark}
            />
          </div>

          {/* Roster of Enrolled Students */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <h4 className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                Enrolled Academic Roster
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 rounded-full py-0.5">
                  {classEnrollments.length} Total
                </span>
                {rosterSearch && (
                  <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 rounded-full py-0.5 animate-fade-in">
                    {filteredRoster.length} Found
                  </span>
                )}
              </div>
            </div>

            {classEnrollments.length > 0 && (
              <div className="relative mb-3.5 select-none">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                  <Search className="w-3.5 h-3.5 text-emerald-500" />
                </span>
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Fast search student registry by name, ID or email..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-800 dark:text-zinc-200 font-bold"
                />
                {rosterSearch && (
                  <button
                    onClick={() => setRosterSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-650 cursor-pointer font-bold text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            
            {classEnrollments.length === 0 ? (
              <div className="p-5 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-850 text-center text-zinc-500 text-xs">
                No students currently registered in this subject roster. Scanning the QR code will automatically join.
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-zinc-250 dark:border-zinc-800 text-center text-zinc-400 dark:text-zinc-500 text-xs font-medium animate-fade-in">
                No students match "{rosterSearch}"
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {filteredRoster.map(student => (
                  <div 
                    key={student.id}
                    className="p-3 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900 flex items-center gap-3"
                  >
                    <img 
                      src={student.studentAvatar} 
                      alt={student.studentName} 
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-950 dark:text-zinc-100 truncate">
                        {student.studentName}
                      </p>
                      <p className="text-[9px] font-mono text-zinc-500 truncate">
                        {student.studentId} • {student.studentEmail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-850 flex items-center justify-between gap-3">
          <button
            onClick={handleExportCSV}
            type="button"
            className="px-4 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Export roster attendance dataset as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>Export Roster CSV</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Close Subject Details
          </button>
        </div>

      </div>
    </div>
  );
}
