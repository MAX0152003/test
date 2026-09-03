/**
 * Calendar Export Utility (.ics / iCalendar format)
 * Allows students and faculty to import their academic schedules directly into
 * Apple Calendar, Google Calendar, Outlook, and native mobile calendar apps.
 */

import { ClassSession } from '../types';

function parseTimeTo24h(timeStr: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 8, minute: 0 };
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hour: 8, minute: 0 };

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = (match[3] || '').toUpperCase();

  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  return { hour, minute };
}

const DAY_MAP: Record<string, string> = {
  Mon: 'MO',
  Monday: 'MO',
  Tue: 'TU',
  Tuesday: 'TU',
  Wed: 'WE',
  Wednesday: 'WE',
  Thu: 'TH',
  Thursday: 'TH',
  Fri: 'FR',
  Friday: 'FR',
  Sat: 'SA',
  Saturday: 'SA',
  Sun: 'SU',
  Sunday: 'SU',
};

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generates an iCalendar (.ics) string containing the scheduled classes with recurring rules and 15-min notification alarms.
 */
export function generateScheduleICS(classes: ClassSession[], userName: string = 'Student'): string {
  const now = new Date();
  const dtStamp = formatICSDate(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClassPulse//Academic Schedule Exporter//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:ClassPulse 2.0 - ${userName}'s Schedule`,
    'X-WR-TIMEZONE:Asia/Manila',
  ];

  classes.forEach((cls) => {
    const { hour: startHour, minute: startMinute } = parseTimeTo24h(cls.startTime);
    const { hour: endHour, minute: endMinute } = parseTimeTo24h(cls.endTime || cls.startTime);

    // Split days safely
    const daysArray: string[] = Array.isArray(cls.days)
      ? cls.days.flatMap(d => String(d).split(/[,/ ]+/))
      : String(cls.days || 'MW').split(/[,/ ]+/);
    const byDays = daysArray.filter(Boolean).map(d => DAY_MAP[d] || 'MO');

    // Find the next occurrence of the first day to anchor DTSTART
    const eventStart = new Date();
    eventStart.setHours(startHour, startMinute, 0, 0);

    const eventEnd = new Date(eventStart);
    if (endHour > startHour || (endHour === startHour && endMinute > startMinute)) {
      eventEnd.setHours(endHour, endMinute, 0, 0);
    } else {
      // Default 1.5 hour duration if end time is unspecified
      eventEnd.setTime(eventStart.getTime() + 90 * 60 * 1000);
    }

    const dtStartFormatted = formatICSDate(eventStart);
    const dtEndFormatted = formatICSDate(eventEnd);
    const uid = `classpulse-${cls.id}-${Date.now()}@classpulse.app`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStartFormatted}`,
      `DTEND:${dtEndFormatted}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDays.join(',')}`,
      `SUMMARY:${cls.code} - ${cls.name}`,
      `LOCATION:Room ${cls.room || 'TBA'}`,
      `DESCRIPTION:Instructor: ${cls.facultyName || 'Faculty'}\\nRoom: ${cls.room || 'TBA'}\\nSchedule: ${cls.days} ${cls.startTime} - ${cls.endTime || ''}\\nExported from ClassPulse 2.0`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Upcoming Class: ${cls.code} in Room ${cls.room || 'TBA'} in 15 minutes`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Initiates browser download of the generated .ics file
 */
export function downloadScheduleICS(classes: ClassSession[], userName: string = 'Student'): void {
  if (!classes || classes.length === 0) {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast('No registered courses found to export.', 'info');
    }
    return;
  }

  const icsContent = generateScheduleICS(classes, userName);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ClassPulse_Timetable_${userName.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast('Timetable exported! Open the downloaded file to sync with Apple or Google Calendar.', 'success');
  }
}
