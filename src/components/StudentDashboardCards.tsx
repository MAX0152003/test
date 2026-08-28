import React from 'react';
import { 
  ClassSession, 
  AttendanceRecord, 
  UserProfile, 
  FacultyStatus 
} from '../types';
import { calculateStudentStanding } from '../lib/attendanceRules';
import { getFacultyInClassDetails } from '../lib/facultyTimeUtils';
import { 
  Search, 
  Users, 
  CheckCircle, 
  Clock, 
  X, 
  MapPin, 
  BellRing, 
  Bell, 
  CalendarClock, 
  MessageSquare, 
  Trash2 
} from 'lucide-react';

// ==========================================
// 1. Student Faculty Directory Card Component (Memoized)
// ==========================================
interface FacultyCardProps {
  fac: FacultyStatus;
  classes: ClassSession[];
  isEnrolledInstructor: boolean;
  isWatched: boolean;
  onToggleWatch: (facId: string, facName: string, facRoom?: string) => void;
  onBookSlot: (facId: string, facName: string) => void;
  onChat: (facId: string, facName: string) => void;
}

export const StudentFacultyCard: React.FC<FacultyCardProps> = React.memo(({
  fac,
  classes,
  isEnrolledInstructor,
  isWatched,
  onToggleWatch,
  onBookSlot,
  onChat
}) => {
  const timeInfo = fac.status === 'in-class' ? getFacultyInClassDetails(fac, classes) : null;

  return (
    <div 
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
            <span className="text-emerald-500">✨</span>
            <span>Free for walk-in consultation or scheduled appointment</span>
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 flex-wrap">
        {fac.status !== 'available' && (
          <button
            type="button"
            onClick={() => onToggleWatch(fac.id, fac.name, fac.room)}
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

        <button
          type="button"
          onClick={() => onBookSlot(fac.id, fac.name)}
          className="flex-1 min-w-[100px] py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-700 hover:text-black dark:text-emerald-400 dark:hover:text-black border border-emerald-500/30 text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          title={`Book a formal consultation slot with ${fac.name}`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Book Slot</span>
        </button>

        <button
          type="button"
          onClick={() => onChat(fac.id, fac.name)}
          className="py-1.5 px-2.5 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
          title={`Message ${fac.name}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Chat</span>
        </button>
      </div>
    </div>
  );
});
StudentFacultyCard.displayName = 'StudentFacultyCard';


// ==========================================
// 2. Student Registered Course Card Component (Memoized)
// ==========================================
interface CourseCardProps {
  cls: ClassSession;
  isEnrolled: boolean;
  attendanceRecords: AttendanceRecord[];
  userProfile: UserProfile;
  onOpenDetails: (cls: ClassSession) => void;
  onDrop?: (cls: ClassSession) => void;
  onEnroll?: (classId: string) => void;
  onOpenRiskCalculator?: (cls: ClassSession) => void;
}

export const StudentCourseCard: React.FC<CourseCardProps> = React.memo(({
  cls,
  isEnrolled,
  attendanceRecords = [],
  userProfile,
  onOpenDetails,
  onDrop,
  onEnroll,
  onOpenRiskCalculator
}) => {
  const safeRecords = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  // Compute active standing indicators
  const studentRecordsForClass = safeRecords.filter(
    r => r.classId === cls.id && (r.studentId === (userProfile?.studentId || userProfile?.uid) || r.studentName === userProfile?.name)
  );
  const standing = calculateStudentStanding(studentRecordsForClass);
  const standingLabel = standing.label;
  const standingColor = standing.badgeColor;

  const allowableLeft = Math.max(0, 5 - standing.absentCount);

  return (
    <div 
      onClick={() => onOpenDetails(cls)}
      className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.01] cursor-pointer relative group/card ${
        isEnrolled 
          ? 'bg-zinc-50/50 hover:bg-zinc-100/60 dark:bg-zinc-900/30 dark:border-zinc-840 dark:hover:bg-zinc-900/65' 
          : 'bg-zinc-100/20 border-dashed border-zinc-200 dark:border-zinc-900 hover:border-emerald-500/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase inline-block font-mono">
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
          {isEnrolled && onDrop && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDrop(cls);
              }}
              className="p-1 h-6 w-6 mt-1 flex items-center justify-center rounded-md bg-zinc-100 hover:bg-red-500/10 dark:bg-zinc-805 text-zinc-400 hover:text-red-500 cursor-pointer border border-transparent hover:border-red-500/20 transition-all opacity-80 sm:opacity-0 group-hover/card:opacity-100 animate-fade-in"
              title="Delete/drop subject"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Manual Enroll Button for unenrolled subjects found via search */}
          {!isEnrolled && onEnroll && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEnroll(cls.id);
              }}
              className="mt-1.5 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer shadow-sm active:scale-95 transition-all whitespace-nowrap"
              title="Enroll in this subject"
            >
              Enroll Now
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400 mt-3 sm:mt-4 flex-wrap pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap">
          <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            {cls.startTime}
          </span>
          <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
            <MapPin className="w-3.5 h-3.5 text-zinc-500" />
            {cls.room}
          </span>
        </div>

        {isEnrolled && onOpenRiskCalculator && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRiskCalculator(cls);
            }}
            className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
              allowableLeft <= 1 
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 animate-pulse'
                : allowableLeft <= 2
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
            title="Open Allowable Absences Risk Meter"
          >
            <span>🛡️ {allowableLeft} Slot{allowableLeft === 1 ? '' : 's'} Left</span>
          </button>
        )}
      </div>
    </div>
  );
});
StudentCourseCard.displayName = 'StudentCourseCard';

// ==========================================
// 3. Student Excuse Item Card Component (Memoized)
// ==========================================
interface ExcuseCardProps {
  req: any;
  isLatest?: boolean;
  onPreviewImage: (data: { url: string; title: string; subtitle: string; fileName: string }) => void;
}

export const StudentExcuseCard: React.FC<ExcuseCardProps> = React.memo(({
  req,
  isLatest = false,
  onPreviewImage
}) => {
  const statusBadge = req.status === 'approved' || req.status === 'valid'
    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    : req.status === 'rejected' || req.status === 'invalid'
    ? 'bg-red-100 dark:bg-red-500/15 text-red-500'
    : 'bg-zinc-200 dark:bg-zinc-850 text-zinc-550';

  const statusText = req.status === 'approved' || req.status === 'valid' 
    ? 'valid' 
    : req.status === 'rejected' || req.status === 'invalid' 
    ? 'invalid' 
    : req.status;

  return (
    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-xs transition-all">
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 font-bold flex-wrap">
          <span className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200">{req.className}</span>
          <span className="text-[9px] font-mono font-black text-zinc-400">({req.id})</span>
          {isLatest && (
            <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Latest
            </span>
          )}
          {req.excuseType && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50">
              {req.excuseType}
            </span>
          )}
        </div>
        <p className="text-[10px] text-zinc-450 leading-normal mt-0.5">
          Duration: {req.startDate} to {req.endDate} • {req.reason}
        </p>
        {(req.attachmentImg || req.attachmentData || req.attachmentName) && (
          <button
            type="button"
            onClick={() => {
              const img = req.attachmentImg || req.attachmentData || '';
              if (img) {
                onPreviewImage({
                  url: img,
                  title: req.excuseType || 'Excuse Letter Attachment',
                  subtitle: `Class: ${req.className} • ${req.startDate} to ${req.endDate}`,
                  fileName: req.attachmentName || `excuse_${req.id}.png`
                });
              } else if (typeof window !== 'undefined' && (window as any).showToast) {
                (window as any).showToast(`Document: ${req.attachmentName}`, "info");
              }
            }}
            className="text-[9px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded mt-1 inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            📎 {req.attachmentName || 'Supporting Attachment'} (Click to View/Save)
          </button>
        )}
      </div>
      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ml-2 ${statusBadge}`}>
        {statusText}
      </span>
    </div>
  );
});
StudentExcuseCard.displayName = 'StudentExcuseCard';

// ==========================================
// 4. Student Upcoming Lecture Card (Memoized)
// ==========================================
interface LectureCardProps {
  cls: ClassSession;
}

export const StudentLectureCard: React.FC<LectureCardProps> = React.memo(({ cls }) => {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="p-1 px-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 font-mono text-[9px] font-black uppercase shrink-0 mt-0.5">
        {cls.startTime.split(' ')[0]}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <h5 className="text-[10.5px] font-black text-zinc-800 dark:text-zinc-200 truncate leading-tight">{cls.name}</h5>
        <span className="text-[9px] text-zinc-400 block mt-0.5 truncate">{cls.room} • {cls.code}</span>
      </div>
    </div>
  );
});
StudentLectureCard.displayName = 'StudentLectureCard';

