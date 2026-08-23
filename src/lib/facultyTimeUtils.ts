import { ClassSession, FacultyStatus } from '../types';

/**
 * Parses time strings like "10:30 AM", "01:00 PM", "14:30" into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  
  // Format: "10:30 AM" or "1:00 PM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridian = match12[3];
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Format: "14:30" or "09:00"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Returns current day abbreviation matching class format: 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'mw', 'tth', 'fs'
 */
export function getCurrentDayAbbr(): string {
  const dayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon ...
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[dayIndex];
}

export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export interface InClassTimeInfo {
  isInClass: boolean;
  remainingMinutes: number | null;
  endTimeStr: string | null;
  currentClassName: string | null;
  currentClassCode: string | null;
  room: string | null;
  displayLabel: string;
  isEndingSoon: boolean;
}

/**
 * Computes remaining time and active class info for a faculty member.
 */
export function getFacultyInClassDetails(
  faculty: FacultyStatus,
  classes: ClassSession[] = []
): InClassTimeInfo {
  if (faculty.status !== 'in-class') {
    return {
      isInClass: false,
      remainingMinutes: null,
      endTimeStr: null,
      currentClassName: null,
      currentClassCode: null,
      room: faculty.room || null,
      displayLabel: faculty.status === 'available' ? 'Available Now' : 'Unavailable',
      isEndingSoon: false
    };
  }

  const currentMinutes = getCurrentTimeMinutes();
  const currentDay = getCurrentDayAbbr();

  // 1. Check if the faculty explicitly has untilTime or currentClassEndTime
  if (faculty.untilTime || faculty.currentClassEndTime) {
    const explicitEndTimeStr = (faculty.untilTime || faculty.currentClassEndTime) as string;
    const endMinutes = parseTimeToMinutes(explicitEndTimeStr);
    if (endMinutes !== null) {
      let diff = endMinutes - currentMinutes;
      if (diff <= 0) diff = 15; // default fallback if past
      const isEndingSoon = diff <= 10;
      return {
        isInClass: true,
        remainingMinutes: diff,
        endTimeStr: explicitEndTimeStr,
        currentClassName: faculty.currentClassName || 'Class Lecture',
        currentClassCode: faculty.currentClassCode || 'Ongoing Session',
        room: faculty.room || 'Classroom',
        displayLabel: isEndingSoon 
          ? `Free soon (~${diff}m left • Ends ${explicitEndTimeStr})`
          : `Free in ~${diff}m (Ends ${explicitEndTimeStr})`,
        isEndingSoon
      };
    }
  }

  // 2. Find matching currently ongoing class for this faculty
  const facultyNameLower = (faculty.name || '').toLowerCase().trim();
  const facultyId = faculty.id || '';

  const matchedOngoingClass = classes.find(c => {
    const cFacName = (c.facultyName || '').toLowerCase().trim();
    const cFacId = c.facultyId || '';
    const isSameFac = cFacId === facultyId || (cFacName && (cFacName.includes(facultyNameLower) || facultyNameLower.includes(cFacName)));
    if (!isSameFac) return false;

    // Check day match
    const classDays = (c.days || []).map(d => d.toLowerCase());
    const dayMatches = classDays.some(d => {
      if (d === currentDay) return true;
      if (d.includes('m') && currentDay === 'mon') return true;
      if (d.includes('w') && currentDay === 'wed') return true;
      if (d.includes('th') && currentDay === 'thu') return true;
      if (d.includes('t') && !d.includes('th') && currentDay === 'tue') return true;
      if (d.includes('f') && currentDay === 'fri') return true;
      if (d.includes('s') && currentDay === 'sat') return true;
      return false;
    });

    if (!dayMatches && classDays.length > 0) return false;

    // Check time range
    const startM = parseTimeToMinutes(c.startTime);
    const endM = parseTimeToMinutes(c.endTime);
    if (startM !== null && endM !== null) {
      return currentMinutes >= startM - 15 && currentMinutes <= endM;
    }
    return true;
  });

  if (matchedOngoingClass) {
    const endM = parseTimeToMinutes(matchedOngoingClass.endTime);
    let remainingMinutes: number | null = null;
    let endTimeStr = matchedOngoingClass.endTime;

    if (endM !== null) {
      const diff = endM - currentMinutes;
      remainingMinutes = diff > 0 ? diff : 10;
    } else {
      // Default estimate based on current hour
      remainingMinutes = 35;
      endTimeStr = 'Next Hour';
    }

    const isEndingSoon = (remainingMinutes !== null && remainingMinutes <= 10);

    return {
      isInClass: true,
      remainingMinutes,
      endTimeStr,
      currentClassName: matchedOngoingClass.name,
      currentClassCode: matchedOngoingClass.code,
      room: matchedOngoingClass.room || faculty.room || 'Lecture Hall',
      displayLabel: isEndingSoon 
        ? `Free soon (~${remainingMinutes}m • Ends ${endTimeStr})`
        : `Free in ~${remainingMinutes}m (Ends ${endTimeStr})`,
      isEndingSoon
    };
  }

  // 3. General fallback estimate for in-class state (e.g. ends at top or bottom of current hour)
  const remainderToHalfHour = 30 - (currentMinutes % 30);
  const estimatedRemaining = remainderToHalfHour < 5 ? remainderToHalfHour + 30 : remainderToHalfHour;
  const estimatedEndM = currentMinutes + estimatedRemaining;
  const endHours = Math.floor(estimatedEndM / 60) % 24;
  const endMins = estimatedEndM % 60;
  const period = endHours >= 12 ? 'PM' : 'AM';
  const displayHours = endHours % 12 === 0 ? 12 : endHours % 12;
  const formattedEndTime = `${String(displayHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')} ${period}`;

  return {
    isInClass: true,
    remainingMinutes: estimatedRemaining,
    endTimeStr: formattedEndTime,
    currentClassName: faculty.currentClassName || 'Class in Session',
    currentClassCode: faculty.currentClassCode || 'Teaching',
    room: faculty.room || 'Faculty Hall',
    displayLabel: `Free in ~${estimatedRemaining}m (Ends ${formattedEndTime})`,
    isEndingSoon: estimatedRemaining <= 10
  };
}
