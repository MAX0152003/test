import React from 'react';
import { ClassSession, Enrollment, UserProfile } from '../types';
import { Clock, MapPin, User, Calendar, LayoutGrid, Columns, ListFilter } from 'lucide-react';
import { motion } from 'motion/react';
import { isFridayPrayerWindow } from '../lib/msuUtils';

interface WeeklyScheduleGridProps {
  classes: ClassSession[];
  userRole?: 'student' | 'faculty' | 'admin';
  enrollments?: Enrollment[];
  userProfile?: UserProfile;
  attendanceRecords?: any[];
  searchQuery?: string;
  onOpenSubjectDetails?: (cls: ClassSession) => void;
  onEditSubject?: (cls: ClassSession) => void;
  onEnrollSubject?: (classId: string) => void;
  onDropSubject?: (classId: string) => void;
}

export const expandDaysToSpecificOnesVal = (days: string[]): string[] => {
  const expanded: string[] = [];
  (days || []).forEach(d => {
    const trimmed = String(d || '').trim().toLowerCase();
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

// Helper to parse time string like "08:00 AM" or "1:30 PM" to minutes from midnight
const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  try {
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const parts = clean.replace(/(AM|PM)/g, '').trim().split(':');
    let hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } catch {
    return 0;
  }
};

const getColorThemeForCode = (code: string) => {
  const themes = [
    { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', border: 'border-emerald-500/30 hover:border-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-500 text-white' },
    { bg: 'bg-indigo-500/10 dark:bg-indigo-500/15', border: 'border-indigo-500/30 hover:border-indigo-500', text: 'text-indigo-700 dark:text-indigo-300', badge: 'bg-indigo-500 text-white' },
    { bg: 'bg-amber-500/10 dark:bg-amber-500/15', border: 'border-amber-500/30 hover:border-amber-500', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-500 text-black' },
    { bg: 'bg-rose-500/10 dark:bg-rose-500/15', border: 'border-rose-500/30 hover:border-rose-500', text: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-500 text-white' },
    { bg: 'bg-sky-500/10 dark:bg-sky-500/15', border: 'border-sky-500/30 hover:border-sky-500', text: 'text-sky-700 dark:text-sky-300', badge: 'bg-sky-500 text-white' },
    { bg: 'bg-purple-500/10 dark:bg-purple-500/15', border: 'border-purple-500/30 hover:border-purple-500', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-500 text-white' },
    { bg: 'bg-teal-500/10 dark:bg-teal-500/15', border: 'border-teal-500/30 hover:border-teal-500', text: 'text-teal-700 dark:text-teal-300', badge: 'bg-teal-500 text-white' },
  ];
  let hash = 0;
  for (let i = 0; i < (code || '').length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  return themes[Math.abs(hash) % themes.length];
};

export default function WeeklyScheduleGrid({
  classes,
  userRole = 'student',
  enrollments = [],
  userProfile,
  searchQuery = '',
  onOpenSubjectDetails,
}: WeeklyScheduleGridProps) {
  const [viewMode, setViewMode] = React.useState<'matrix' | 'columns' | 'cards'>('matrix');

  const daysOfWeek = [
    { key: 'mon', label: 'Monday', short: 'Mon' },
    { key: 'tue', label: 'Tuesday', short: 'Tue' },
    { key: 'wed', label: 'Wednesday', short: 'Wed' },
    { key: 'thu', label: 'Thursday', short: 'Thu' },
    { key: 'fri', label: 'Friday', short: 'Fri' },
    { key: 'sat', label: 'Saturday', short: 'Sat' },
  ];

  // Check if Sunday has any classes
  const hasSundayClass = classes.some(cls => {
    const expanded = expandDaysToSpecificOnesVal(cls.days);
    return expanded.includes('sun');
  });

  const activeDays = hasSundayClass 
    ? [...daysOfWeek, { key: 'sun', label: 'Sunday', short: 'Sun' }]
    : daysOfWeek;

  // Determine current day key
  const todayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
  const dayKeyMap: Record<number, string> = {
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
    0: 'sun'
  };
  const currentDayKey = dayKeyMap[todayIndex] || 'mon';

  // Standard hourly time slots
  const timeSlots = [
    { label: '07:00 AM', startMin: 420, endMin: 480 },
    { label: '08:00 AM', startMin: 480, endMin: 540 },
    { label: '09:00 AM', startMin: 540, endMin: 600 },
    { label: '10:00 AM', startMin: 600, endMin: 660 },
    { label: '11:00 AM', startMin: 660, endMin: 720 },
    { label: '12:00 PM', startMin: 720, endMin: 780 },
    { label: '01:00 PM', startMin: 780, endMin: 840 },
    { label: '02:00 PM', startMin: 840, endMin: 900 },
    { label: '03:00 PM', startMin: 900, endMin: 960 },
    { label: '04:00 PM', startMin: 960, endMin: 1020 },
    { label: '05:00 PM', startMin: 1020, endMin: 1080 },
    { label: '06:00 PM', startMin: 1080, endMin: 1140 },
    { label: '07:00 PM', startMin: 1140, endMin: 1200 },
  ];

  // Filter classes by search query
  const filteredClasses = classes.filter(cls =>
    (cls.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cls.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cls.room || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cls.facultyName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isStudentMatch = React.useCallback((e: Enrollment) => {
    if (!userProfile) return true;
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

  // Filter time slots to ONLY those that have scheduled classes, eliminating empty redundant rows
  const activeTimeSlots = React.useMemo(() => {
    const slotsWithClasses = timeSlots.filter(slot => {
      return activeDays.some(day => {
        return filteredClasses.some(cls => {
          const expanded = expandDaysToSpecificOnesVal(cls.days);
          if (!expanded.includes(day.key)) return false;
          const startMins = parseTimeToMinutes(cls.startTime);
          if (startMins >= slot.startMin && startMins < slot.endMin) return true;
          if (slot.startMin === 420 && startMins < 420) return true;
          return false;
        });
      });
    });

    // If no specific slot matches or no classes exist, fallback to non-empty list or all time slots
    return slotsWithClasses.length > 0 ? slotsWithClasses : timeSlots;
  }, [filteredClasses, activeDays]);

  return (
    <div className="w-full text-left space-y-4 animate-fade-in">
      {/* Schedule Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-zinc-100 dark:border-zinc-850">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 font-mono">
            <Calendar className="w-4 h-4 text-emerald-500" />
            Timetable Schedule View
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800">
            {filteredClasses.length} Sections Active
          </span>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-emerald-500 text-black shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Timetable Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('columns')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              viewMode === 'columns'
                ? 'bg-emerald-500 text-black shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Day Columns</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-emerald-500 text-black shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* Jum'ah Friday Banner Alert */}
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-300">
        <div className="flex items-center gap-2.5">
          <span className="text-base shrink-0">🕌</span>
          <div>
            <strong className="font-extrabold uppercase tracking-wide text-[11px] block">
              MSU Marawi Friday Jum’ah Prayer Schedule Awareness (11:30 AM – 1:30 PM)
            </strong>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              Classes scheduled during Friday midday include automatic transit grace and prayer accommodation markers across student & faculty timetables.
            </p>
          </div>
        </div>
        <span className="hidden md:inline-flex text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          Campus Policy
        </span>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* WEEKLY CALENDAR TIMETABLE MATRIX GRID MODE */}
      {/* -------------------------------------------------------------------------- */}
      {viewMode === 'matrix' && (
        <div className="w-full overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 shadow-sm">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-850">
                <th className="p-3 w-28 text-center text-[10px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500 border-r border-zinc-200/60 dark:border-zinc-850">
                  Time Slot
                </th>
                {activeDays.map(day => {
                  const isToday = day.key === currentDayKey;
                  const isFriday = day.key === 'fri';
                  return (
                    <th
                      key={day.key}
                      className={`p-3 text-center border-r last:border-r-0 border-zinc-200/60 dark:border-zinc-850 ${
                        isToday
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : isFriday
                          ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.06] text-zinc-800 dark:text-zinc-200'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1">
                          {day.label}
                          {isFriday && <span title="MSU Marawi Friday Jum'ah Prayer Window" className="text-[10px]">🕌</span>}
                        </span>
                        {isToday ? (
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500 text-black">
                            Today
                          </span>
                        ) : isFriday ? (
                          <span className="text-[7.5px] font-bold text-amber-600 dark:text-amber-400 font-mono tracking-tight flex items-center gap-0.5">
                            <span>Jum'ah 11:30–1:30</span>
                          </span>
                        ) : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-850/80">
              {activeTimeSlots.map(slot => {
                const isJumahSlot = slot.startMin >= 660 && slot.startMin <= 780; // 11:00 AM - 1:00 PM

                return (
                  <tr key={slot.label} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    {/* Time Header Cell */}
                    <td className="p-2.5 text-center text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 border-r border-zinc-200/60 dark:border-zinc-850 bg-zinc-50/60 dark:bg-zinc-900/40 align-top">
                      {slot.label}
                    </td>

                    {/* Day Cells */}
                    {activeDays.map(day => {
                      const isToday = day.key === currentDayKey;
                      const isFriday = day.key === 'fri';
                      const isFridayPrayerCell = isFriday && isJumahSlot;

                      // Match classes that start during this slot or span into it
                      const matchingClasses = filteredClasses.filter(cls => {
                        const expanded = expandDaysToSpecificOnesVal(cls.days);
                        if (!expanded.includes(day.key)) return false;

                        const startMins = parseTimeToMinutes(cls.startTime);
                        // Match class if it starts within this hour slot
                        if (startMins >= slot.startMin && startMins < slot.endMin) {
                          return true;
                        }
                        // Fallback if class started earlier and no slot caught it
                        if (slot.startMin === 420 && startMins < 420) {
                          return true;
                        }
                        return false;
                      });

                      return (
                        <td
                          key={`${day.key}-${slot.label}`}
                          className={`p-1.5 border-r last:border-r-0 border-zinc-200/60 dark:border-zinc-850 align-top h-24 relative ${
                            isToday ? 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.03]' : ''
                          } ${
                            isFridayPrayerCell ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.05]' : ''
                          }`}
                        >
                          {isFridayPrayerCell && matchingClasses.length === 0 && (
                            <div className="absolute inset-1 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/[0.02] flex flex-col items-center justify-center p-1 pointer-events-none opacity-60">
                              <span className="text-[10px]">🕌</span>
                              <span className="text-[7.5px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">
                                Jum'ah Window
                              </span>
                            </div>
                          )}

                          <div className="space-y-1.5 h-full relative z-1">
                            {matchingClasses.map(cls => {
                              const isEnrolled = enrollments.some(
                                e => e.classId === cls.id && isStudentMatch(e) && !e.deletedByStudent
                              );
                              const theme = getColorThemeForCode(cls.code);
                              const hasJumah = isFriday && isFridayPrayerWindow(cls.days, cls.startTime, cls.endTime);

                              return (
                                <motion.div
                                  key={cls.id}
                                  whileHover={{ scale: 1.02 }}
                                  transition={{ duration: 0.15 }}
                                  onClick={() => onOpenSubjectDetails?.(cls)}
                                  className={`p-2 rounded-xl border ${theme.bg} ${theme.border} transition-all cursor-pointer shadow-2xs hover:shadow-md text-left space-y-1.5`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md font-mono ${theme.badge}`}>
                                      {cls.code}
                                    </span>
                                    {hasJumah && (
                                      <span title="MSU Friday Prayer Window (11:30 AM - 1:30 PM)" className="text-[7.5px] font-black px-1 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                        🕌 Jum’ah
                                      </span>
                                    )}
                                    {userRole === 'student' && (
                                      <span className={`text-[7.5px] font-black px-1 py-0.5 rounded-full ${
                                        isEnrolled ? 'bg-blue-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                                      }`}>
                                        {isEnrolled ? 'Joined' : 'Open'}
                                      </span>
                                    )}
                                  </div>

                                  <p className={`text-[10.5px] font-black leading-snug line-clamp-2 ${theme.text}`}>
                                    {cls.name}
                                  </p>

                                  <div className="space-y-0.5 text-[9px] font-bold text-zinc-600 dark:text-zinc-400 border-t border-zinc-200/40 dark:border-zinc-800/60 pt-1">
                                    <div className="flex items-center gap-1 font-mono">
                                      <Clock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                      <span>{cls.startTime} - {cls.endTime}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                      <span className="truncate">{cls.room || 'TBA'}</span>
                                    </div>
                                    {cls.buildingCluster && (
                                      <div className="text-[8px] text-zinc-500 truncate font-sans">
                                        🏢 {cls.buildingCluster.split('(')[0].trim()}
                                      </div>
                                    )}
                                    {cls.facultyName && (
                                      <div className="flex items-center gap-1 opacity-80">
                                        <User className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                                        <span className="truncate">{cls.facultyName}</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODE 2: DAY COLUMNS VIEW */}
      {/* -------------------------------------------------------------------------- */}
      {viewMode === 'columns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 w-full">
          {activeDays.map(day => {
            const isToday = day.key === currentDayKey;
            const isFriday = day.key === 'fri';

            const dayClasses = filteredClasses
              .filter(cls => {
                const expanded = expandDaysToSpecificOnesVal(cls.days);
                return expanded.includes(day.key);
              })
              .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

            return (
              <div
                key={day.key}
                className={`flex flex-col rounded-2xl border transition-all overflow-hidden ${
                  isToday
                    ? 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] border-emerald-500/40 shadow-sm'
                    : isFriday
                    ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.04] border-amber-500/30'
                    : 'bg-white dark:bg-zinc-950 border-zinc-200/90 dark:border-zinc-855'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-3 border-b flex items-center justify-between ${
                    isToday
                      ? 'bg-emerald-500 text-black font-black'
                      : isFriday
                      ? 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/30 text-amber-900 dark:text-amber-200 font-extrabold'
                      : 'bg-zinc-100/80 dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 font-extrabold'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase tracking-wider font-mono">{day.label}</span>
                    {day.key === 'fri' && <span title="MSU Marawi Jum'ah Prayer Period" className="text-xs">🕌</span>}
                  </div>
                  {isToday ? (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-black text-emerald-400 px-2 py-0.5 rounded-md shadow-xs">
                      Today
                    </span>
                  ) : day.key === 'fri' ? (
                    <span className="text-[8px] font-mono font-black text-amber-700 dark:text-amber-300">
                      Jum'ah 11:30–1:30
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500">
                      {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                    </span>
                  )}
                </div>

                {/* Day Content */}
                <div className="p-2.5 flex-1 space-y-2.5 min-h-[160px] flex flex-col justify-start">
                  {dayClasses.length > 0 ? (
                    dayClasses.map(cls => {
                      const isEnrolled = enrollments.some(
                        e => e.classId === cls.id && isStudentMatch(e) && !e.deletedByStudent
                      );
                      const hasJumah = isFriday && isFridayPrayerWindow(cls.days, cls.startTime, cls.endTime);

                      return (
                        <motion.div
                          key={cls.id}
                          whileHover={{ scale: 1.01, y: -1 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => onOpenSubjectDetails?.(cls)}
                          className={`group p-3 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md space-y-2 text-left ${
                            hasJumah 
                              ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.07] border-amber-500/40 hover:border-amber-500' 
                              : 'bg-zinc-50 dark:bg-zinc-900/90 border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-500/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/10 uppercase tracking-wide font-mono shrink-0">
                              {cls.code}
                            </span>
                            <div className="flex items-center gap-1">
                              {hasJumah && (
                                <span title="MSU Friday Prayer Window (11:30 AM - 1:30 PM)" className="text-[7.5px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  🕌 Jum’ah
                                </span>
                              )}
                              {userRole === 'student' && (
                                <span
                                  className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                    isEnrolled
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                  }`}
                                >
                                  {isEnrolled ? 'Enrolled' : 'Open'}
                                </span>
                              )}
                            </div>
                          </div>

                          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {cls.name}
                          </h4>

                          <div className="space-y-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/80 text-[10px]">
                            <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-bold font-mono">
                              <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate">{cls.startTime} - {cls.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-semibold">
                              <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">{cls.room || 'TBA'}</span>
                            </div>
                            {cls.buildingCluster && (
                              <div className="text-[8.5px] text-zinc-500 truncate font-medium">
                                🏢 {cls.buildingCluster.split('(')[0].trim()}
                              </div>
                            )}
                            {cls.facultyName && (
                              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-450 text-[9.5px]">
                                <User className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span className="truncate">{cls.facultyName}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center rounded-xl border border-dashed border-zinc-200/70 dark:border-zinc-850/70 bg-zinc-50/50 dark:bg-zinc-900/20">
                      <span className="text-xs opacity-40">☕</span>
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 mt-1 uppercase font-mono">
                        No Classes
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODE 3: LIST CARDS VIEW */}
      {/* -------------------------------------------------------------------------- */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full">
          {filteredClasses.length > 0 ? (
            filteredClasses.map(cls => {
              const isEnrolled = enrollments.some(
                e => e.classId === cls.id && isStudentMatch(e) && !e.deletedByStudent
              );
              const theme = getColorThemeForCode(cls.code);
              const hasJumah = isFridayPrayerWindow(cls.days, cls.startTime, cls.endTime);

              return (
                <div
                  key={cls.id}
                  onClick={() => onOpenSubjectDetails?.(cls)}
                  className={`p-4 rounded-2xl border hover:border-emerald-500/50 transition-all shadow-xs hover:shadow-md cursor-pointer space-y-3 text-left ${
                    hasJumah
                      ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.04] border-amber-500/30'
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg font-mono ${theme.badge}`}>
                      {cls.code}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {userRole === 'student' && isEnrolled && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Enrolled
                        </span>
                      )}
                      {hasJumah && (
                        <span title="MSU Friday Prayer Window (11:30 AM - 1:30 PM)" className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          🕌 Jum’ah Aware
                        </span>
                      )}
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                        {(cls.days || []).join(', ')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 leading-snug">
                      {cls.name}
                    </h3>
                    {cls.facultyName && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1 font-medium">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        {cls.facultyName}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-mono">
                      <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{cls.startTime} - {cls.endTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{cls.room || 'TBA'}</span>
                    </div>
                  </div>

                  {cls.buildingCluster && (
                    <div className="text-[9px] text-zinc-400 font-semibold truncate pt-1 border-t border-zinc-100 dark:border-zinc-900">
                      🏢 Cluster: {cls.buildingCluster}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30">
              <Calendar className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-black uppercase text-zinc-500 tracking-wider">No matching classes found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
