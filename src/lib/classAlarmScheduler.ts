import { ClassSession, Enrollment, UserProfile } from '../types';
import { expandDaysToSpecificOnesVal } from '../components/WeeklyScheduleGrid';
import { triggerNativeChime } from '../components/AlarmClock';
import { triggerHapticFeedback } from './soundUtils';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

// Register Service Worker for true background notification & alarm dispatch
export async function registerAlarmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[ClassPulse] Background Alarm Service Worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.warn('[ClassPulse] Service worker registration notice:', err);
    return null;
  }
}

// Get current system notification permission state
export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

// Request permission with iOS & Android mobile optimization
export async function requestSystemNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerAlarmServiceWorker();
      localStorage.setItem('cp_system_notifications_enabled', 'true');
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[ClassPulse] Notification permission request error:', e);
    return false;
  }
}

// Helper to play an authoritative, multi-chime alarm sound for class status changes
export function playAlarmChimeSequence() {
  try {
    triggerNativeChime();
    triggerHapticFeedback([200, 100, 200, 100, 400]);

    setTimeout(() => {
      triggerNativeChime();
    }, 450);
  } catch (e) {
    // Non-blocking
  }
}

export interface ClassAlarmPayload {
  title: string;
  message: string;
  classCode?: string;
  className?: string;
  room?: string;
  type?: 'upcoming' | 'started' | 'late_warning' | 'room_change' | 'cancelled' | 'test';
  screen?: string;
  url?: string;
}

// Dispatches a native phone/desktop pop-up system notification
export async function triggerClassAlarmNotification(payload: ClassAlarmPayload): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const { title, message, classCode, screen = 'schedule' } = payload;

  // Play audio chime and haptic feedback
  playAlarmChimeSequence();

  // Try dispatching via Service Worker first (best for background & phone locks)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `classpulse-alarm-${classCode || 'generic'}-${Date.now()}`,
          data: {
            screen,
            url: window.location.origin
          },
          actions: [
            { action: 'open_scan', title: '📸 Scan QR' },
            { action: 'view_sched', title: '📅 View Timetable' }
          ]
        }
      });
      return true;
    } catch (e) {
      console.warn('[ClassPulse] Service Worker postMessage notification failed:', e);
    }
  }

  // Fallback to direct Window Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `classpulse-alarm-${classCode || 'generic'}-${Date.now()}`,
        requireInteraction: true
      });
      notif.onclick = () => {
        window.focus();
        window.dispatchEvent(new CustomEvent('classpulse-navigate', { detail: { screen } }));
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn('[ClassPulse] Window Notification fallback failed:', e);
    }
  }

  return false;
}

// Convert "08:30 AM" or "2:15 PM" to minutes from midnight
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
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
    return -1;
  }
}

// Core class alarm monitor: executes every 10s and compares class timings with current clock
export function checkActiveScheduleAlarms(
  classes: ClassSession[],
  enrollments: Enrollment[],
  userProfile: UserProfile | null,
  onAlarmTriggered?: (alarm: ClassAlarmPayload) => void
) {
  if (!classes || classes.length === 0 || !userProfile) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayKey = now.toISOString().split('T')[0]; // e.g. "2026-08-18"

  const dayMap: Record<number, string> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat'
  };
  const currentDay = dayMap[now.getDay()] || 'mon';

  // Filter classes relevant to this user
  const myClasses = classes.filter(cls => {
    if (userProfile.role === 'faculty') {
      return cls.facultyId === userProfile.id || cls.facultyName === userProfile.name;
    }
    if (userProfile.role === 'student') {
      return enrollments.some(e => e.classId === cls.id && (e.studentId === userProfile.studentId || e.studentId === userProfile.id || e.studentEmail === userProfile.email));
    }
    return true; // admin monitors all
  });

  // Filter classes scheduled today
  const todayClasses = myClasses.filter(cls => {
    const expandedDays = expandDaysToSpecificOnesVal(cls.days);
    return expandedDays.includes(currentDay);
  });

  const firedAlarmsCacheKey = `cp_fired_alarms_${todayKey}`;
  let firedAlarms: Record<string, boolean> = {};
  try {
    firedAlarms = JSON.parse(localStorage.getItem(firedAlarmsCacheKey) || '{}');
  } catch {
    firedAlarms = {};
  }

  let stateChanged = false;

  todayClasses.forEach(cls => {
    const startMin = parseTimeToMinutes(cls.startTime);
    if (startMin < 0) return;

    const diffToStart = startMin - currentMinutes; // minutes until start
    const gracePeriod = cls.gracePeriodMinutes ?? 15;
    const diffToGraceEnd = (startMin + gracePeriod) - currentMinutes;

    // 1. 15-Minute Upcoming Heads-Up Alarm (Trigger window: 14m to 16m before start)
    const key15 = `${cls.id}_15m`;
    if (diffToStart >= 14 && diffToStart <= 16 && !firedAlarms[key15]) {
      firedAlarms[key15] = true;
      stateChanged = true;
      const payload: ClassAlarmPayload = {
        title: `⏰ 15-Min Class Reminder: ${cls.code}`,
        message: `${cls.name} starts in 15 minutes (${cls.startTime}) in Room ${cls.room}. Prepare your materials!`,
        classCode: cls.code,
        className: cls.name,
        room: cls.room,
        type: 'upcoming',
        screen: 'schedule'
      };
      triggerClassAlarmNotification(payload);
      if (onAlarmTriggered) onAlarmTriggered(payload);
    }

    // 2. 5-Minute Critical Warning Alarm (Trigger window: 4m to 6m before start)
    const key5 = `${cls.id}_5m`;
    if (diffToStart >= 4 && diffToStart <= 6 && !firedAlarms[key5]) {
      firedAlarms[key5] = true;
      stateChanged = true;
      const payload: ClassAlarmPayload = {
        title: `🚨 5-Minute Alarm: ${cls.code} Starting Soon!`,
        message: `${cls.code} (${cls.name}) begins at ${cls.startTime} in Room ${cls.room}. Professor attendance terminal is powering up.`,
        classCode: cls.code,
        className: cls.name,
        room: cls.room,
        type: 'upcoming',
        screen: userProfile.role === 'student' ? 'attendance' : 'qr-generator'
      };
      triggerClassAlarmNotification(payload);
      if (onAlarmTriggered) onAlarmTriggered(payload);
    }

    // 3. Class Start & Live QR Scan Open Alarm (Trigger window: 0m to 2m after start)
    const keyStart = `${cls.id}_start`;
    if (diffToStart <= 0 && diffToStart >= -2 && !firedAlarms[keyStart]) {
      firedAlarms[keyStart] = true;
      stateChanged = true;
      const payload: ClassAlarmPayload = {
        title: `🟢 Live Class Started: ${cls.code} is OPEN!`,
        message: `Attendance is now active in Room ${cls.room}! Tap here to launch camera scanner and record your check-in.`,
        classCode: cls.code,
        className: cls.name,
        room: cls.room,
        type: 'started',
        screen: userProfile.role === 'student' ? 'attendance' : 'qr-generator'
      };
      triggerClassAlarmNotification(payload);
      if (onAlarmTriggered) onAlarmTriggered(payload);
    }

    // 4. Grace Period Ending (Late Warning Alarm) (Trigger window: 1m to 2m before grace period ends)
    const keyGrace = `${cls.id}_grace_warning`;
    if (diffToGraceEnd >= 1 && diffToGraceEnd <= 2 && !firedAlarms[keyGrace]) {
      firedAlarms[keyGrace] = true;
      stateChanged = true;
      const payload: ClassAlarmPayload = {
        title: `⏳ Grace Period Expiring: ${cls.code}`,
        message: `Only 2 minutes left in the grace period for ${cls.code} (Room ${cls.room}) before check-ins are marked LATE!`,
        classCode: cls.code,
        className: cls.name,
        room: cls.room,
        type: 'late_warning',
        screen: 'attendance'
      };
      triggerClassAlarmNotification(payload);
      if (onAlarmTriggered) onAlarmTriggered(payload);
    }
  });

  if (stateChanged) {
    try {
      localStorage.setItem(firedAlarmsCacheKey, JSON.stringify(firedAlarms));
    } catch {
      // safe storage fallback
    }
  }
}

// Immediate Test Alarm function for verification
export async function triggerTestDeviceAlarm(userRole = 'student'): Promise<boolean> {
  const perm = getNotificationPermissionStatus();
  if (perm === 'default') {
    const granted = await requestSystemNotificationPermission();
    if (!granted) {
      alert('Notification permissions are required to display system pop-up alarms on your screen.');
      return false;
    }
  } else if (perm === 'denied') {
    alert('System notifications are currently blocked in your browser settings. Please allow notifications in your browser/iOS Settings to receive lock-screen alarms.');
    return false;
  }

  const payload: ClassAlarmPayload = {
    title: '🔔 ClassPulse 2.0 Live Class Status Alarm',
    message: 'TEST ALARM FIRED: This is what your phone & screen notification looks like when class starts or room status updates!',
    classCode: 'CS-101',
    className: 'Computer Science',
    room: 'Room 201',
    type: 'test',
    screen: userRole === 'student' ? 'attendance' : 'schedule'
  };

  return triggerClassAlarmNotification(payload);
}
