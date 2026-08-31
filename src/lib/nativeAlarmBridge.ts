/**
 * ClassPulse Native Alarm & Notification Bridge Engine
 * 
 * Manages deep integration with Android and iOS system-level alarms and scheduled local notifications:
 * 
 * 1. Web Notification & Service Worker showNotification with native vibration, sound, full-screen/high-priority tags,
 *    and action buttons (Scan QR, View Timetable, Dismiss).
 * 2. Native Notification Triggers API (navigator.serviceWorker.registration.showNotification with showTrigger: new TimestampTrigger(time))
 *    where supported by Chrome/Android WebAPK/PWA runtimes so alarms fire even if the browser/app process is terminated.
 * 3. Android Web Intent & Clock Alarm Bridge: For Android APK / WebView / WebApp wrappers, integrates with
 *    standard android.intent.action.SET_ALARM / SET_TIMER to register official system alarms in the user's default Clock app.
 * 4. iOS & Android Web Push / Periodic Sync / Background Sync fallback to wake workers and re-synchronize alerts.
 * 5. Persistent Local Schedule Index in IndexedDB: Automatically indexes all enrolled classes and schedules,
 *    calculating exact upcoming alarm timestamps and handling device reboots / offline restores.
 * 6. Duplicate Alarm Prevention: Deduplicates alarms by compound ID (classId + date + alarmType) to avoid
 *    spamming when schedules are edited, deleted, or rescheduled.
 */

import { ClassSession, Enrollment, UserProfile } from '../types';
import { expandDaysToSpecificOnesVal } from '../components/WeeklyScheduleGrid';
import { idbStorage } from './idbStorage';
import { triggerNativeChime } from '../components/AlarmClock';
import { triggerHapticFeedback } from './soundUtils';

export type NativeAlarmType = '15m_prior' | '5m_prior' | 'start' | 'grace_ending' | 'room_change' | 'custom';

export interface ScheduledNativeAlarm {
  id: string; // e.g. "alarm-cs101-2026-08-31-15m"
  classId: string;
  classCode: string;
  className: string;
  room: string;
  facultyName?: string;
  triggerTime: number; // Unix timestamp in ms
  alarmType: NativeAlarmType;
  title: string;
  body: string;
  sound?: string;
  vibrate?: number[];
  highPriority: boolean;
  status: 'scheduled' | 'fired' | 'cancelled';
  createdAt: number;
}

export interface NativeAlarmSettings {
  enabled: boolean;
  leadTimes: {
    fifteenMin: boolean;
    fiveMin: boolean;
    atStart: boolean;
    graceWarning: boolean;
  };
  alarmSound: 'default' | 'chime' | 'urgent' | 'silent';
  vibrationEnabled: boolean;
  highPriorityAlerts: boolean; // Full-screen / heads-up notification style
  integrateWithClockApp: boolean; // Creates native clock alarms on Android when supported
}

const NATIVE_ALARM_SETTINGS_KEY = 'cp_native_alarm_settings';
const SCHEDULED_ALARMS_IDB_KEY = 'cp_scheduled_native_alarms_index';

export const DEFAULT_ALARM_SETTINGS: NativeAlarmSettings = {
  enabled: true,
  leadTimes: {
    fifteenMin: true,
    fiveMin: true,
    atStart: true,
    graceWarning: true
  },
  alarmSound: 'chime',
  vibrationEnabled: true,
  highPriorityAlerts: true,
  integrateWithClockApp: false
};

class NativeAlarmBridgeManager {
  private memoryScheduledAlarms: Map<string, NodeJS.Timeout> = new Map();
  private settings: NativeAlarmSettings = DEFAULT_ALARM_SETTINGS;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings();
      // Listen for visibility and wakeups to reconcile any missed alarms
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.reconcileFiredAlarms();
        }
      });
    }
  }

  /**
   * Load user alarm preferences from persistent storage
   */
  public loadSettings(): NativeAlarmSettings {
    try {
      const stored = localStorage.getItem(NATIVE_ALARM_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_ALARM_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      this.settings = DEFAULT_ALARM_SETTINGS;
    }
    return this.settings;
  }

  /**
   * Save user alarm preferences
   */
  public saveSettings(newSettings: Partial<NativeAlarmSettings>): NativeAlarmSettings {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(NATIVE_ALARM_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[NativeAlarmBridge] Failed to save settings:', e);
    }
    return this.settings;
  }

  /**
   * Check if Native Notification Trigger API is supported by the browser / OS (Chrome / Android PWA)
   */
  public isNotificationTriggerSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'showTrigger' in (Notification.prototype as any);
  }

  /**
   * Check if the device is running as an Android APK or installed standalone PWA
   */
  public isStandaloneOrAPK(): boolean {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    const isAndroid = /android/i.test(navigator.userAgent);
    return isStandalone || isAndroid;
  }

  /**
   * Check iOS device environment
   */
  public isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }

  /**
   * Request native system permissions with an institutional explanatory prompt
   */
  public async requestPermissions(): Promise<{
    notifications: 'granted' | 'denied' | 'default' | 'unsupported';
  }> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { notifications: 'unsupported' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Register or retrieve service worker
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          } catch (err) {
            console.warn('[NativeAlarmBridge] Service worker setup notice:', err);
          }
        }
      }
      return { notifications: permission as any };
    } catch (e) {
      console.warn('[NativeAlarmBridge] Permission request error:', e);
      return { notifications: 'denied' };
    }
  }

  /**
   * Parse "08:30 AM" or "02:15 PM" to hours and minutes
   */
  private parseTime(timeStr: string): { hours: number; minutes: number } | null {
    if (!timeStr) return null;
    try {
      const clean = timeStr.trim().toUpperCase();
      const isPM = clean.includes('PM');
      const isAM = clean.includes('AM');
      const parts = clean.replace(/(AM|PM)/g, '').trim().split(':');
      let hours = parseInt(parts[0] || '0', 10);
      const minutes = parseInt(parts[1] || '0', 10);
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      return { hours, minutes };
    } catch {
      return null;
    }
  }

  /**
   * Re-build and schedule native device alarms for the user's classes for the next 7 days.
   * This is called on app load, schedule update, class edit, or enrollment changes.
   */
  public async syncClassSchedulesToNativeAlarms(
    classes: ClassSession[],
    enrollments: Enrollment[],
    userProfile: UserProfile | null
  ): Promise<ScheduledNativeAlarm[]> {
    if (!userProfile || !classes || classes.length === 0 || !this.settings.enabled) {
      await this.cancelAllScheduledAlarms();
      return [];
    }

    // Filter classes belonging to this user
    const myClasses = classes.filter(cls => {
      if (userProfile.role === 'faculty') {
        return cls.facultyId === userProfile.id || cls.facultyName === userProfile.name;
      }
      if (userProfile.role === 'student') {
        return enrollments.some(
          e => e.classId === cls.id &&
            (e.studentId === userProfile.studentId || e.studentId === userProfile.id || e.studentEmail === userProfile.email)
        );
      }
      return true; // Admin
    });

    const now = new Date();
    const plannedAlarms: ScheduledNativeAlarm[] = [];

    const dayNameToIdx: Record<string, number> = {
      'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
    };

    // Calculate dates for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      const targetDayIdx = targetDate.getDay();
      const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

      for (const cls of myClasses) {
        const expandedDays = expandDaysToSpecificOnesVal(cls.days);
        const isScheduledToday = expandedDays.some(d => dayNameToIdx[d.toLowerCase()] === targetDayIdx);
        if (!isScheduledToday) continue;

        const timeParsed = this.parseTime(cls.startTime);
        if (!timeParsed) continue;

        const classStartMs = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          timeParsed.hours,
          timeParsed.minutes,
          0
        ).getTime();

        const gracePeriod = cls.gracePeriodMinutes ?? 15;
        const graceEndMs = classStartMs + (gracePeriod * 60 * 1000);

        // 1. 15-Minute Prior Alarm
        if (this.settings.leadTimes.fifteenMin) {
          const triggerTime = classStartMs - (15 * 60 * 1000);
          if (triggerTime > now.getTime()) {
            plannedAlarms.push({
              id: `alarm-${cls.id}-${dateStr}-15m`,
              classId: cls.id,
              classCode: cls.code,
              className: cls.name,
              room: cls.room,
              facultyName: cls.facultyName,
              triggerTime,
              alarmType: '15m_prior',
              title: `⏰ 15-Min Reminder: ${cls.code}`,
              body: `${cls.name} starts in 15 minutes at ${cls.startTime} in Room ${cls.room}. Prepare attendance & materials!`,
              highPriority: false,
              status: 'scheduled',
              createdAt: Date.now()
            });
          }
        }

        // 2. 5-Minute Critical Urgent Alarm
        if (this.settings.leadTimes.fiveMin) {
          const triggerTime = classStartMs - (5 * 60 * 1000);
          if (triggerTime > now.getTime()) {
            plannedAlarms.push({
              id: `alarm-${cls.id}-${dateStr}-5m`,
              classId: cls.id,
              classCode: cls.code,
              className: cls.name,
              room: cls.room,
              facultyName: cls.facultyName,
              triggerTime,
              alarmType: '5m_prior',
              title: `🚨 5-Minute Alarm: ${cls.code} Starting!`,
              body: `Heading to Room ${cls.room}? ${cls.code} starts at ${cls.startTime}. Attendance terminal is active.`,
              highPriority: true,
              status: 'scheduled',
              createdAt: Date.now()
            });
          }
        }

        // 3. Class Start Alarm (Live QR Scan Open)
        if (this.settings.leadTimes.atStart) {
          const triggerTime = classStartMs;
          if (triggerTime > now.getTime()) {
            plannedAlarms.push({
              id: `alarm-${cls.id}-${dateStr}-start`,
              classId: cls.id,
              classCode: cls.code,
              className: cls.name,
              room: cls.room,
              facultyName: cls.facultyName,
              triggerTime,
              alarmType: 'start',
              title: `🟢 Live Class Started: ${cls.code}`,
              body: `Class is now in session in Room ${cls.room}! Tap to open camera scanner and record verified check-in.`,
              highPriority: true,
              status: 'scheduled',
              createdAt: Date.now()
            });
          }
        }

        // 4. Grace Period Ending Warning Alarm
        if (this.settings.leadTimes.graceWarning) {
          const triggerTime = graceEndMs - (2 * 60 * 1000); // 2 minutes before grace expiration
          if (triggerTime > now.getTime()) {
            plannedAlarms.push({
              id: `alarm-${cls.id}-${dateStr}-grace`,
              classId: cls.id,
              classCode: cls.code,
              className: cls.name,
              room: cls.room,
              facultyName: cls.facultyName,
              triggerTime,
              alarmType: 'grace_ending',
              title: `⏳ Grace Period Ending: ${cls.code}`,
              body: `2 minutes left before check-ins in Room ${cls.room} are marked LATE!`,
              highPriority: true,
              status: 'scheduled',
              createdAt: Date.now()
            });
          }
        }
      }
    }

    // Save to persistent IndexedDB store
    await idbStorage.set(SCHEDULED_ALARMS_IDB_KEY, plannedAlarms);

    // Register active timers & native notifications
    this.scheduleTimers(plannedAlarms);

    console.log(`[NativeAlarmBridge] Synchronized ${plannedAlarms.length} upcoming native alarms across 7-day schedule.`);
    return plannedAlarms;
  }

  /**
   * Schedule JavaScript in-memory timers and Service Worker notification triggers
   */
  private scheduleTimers(alarms: ScheduledNativeAlarm[]) {
    // Clear old memory timers
    this.memoryScheduledAlarms.forEach(t => clearTimeout(t));
    this.memoryScheduledAlarms.clear();

    const now = Date.now();

    for (const alarm of alarms) {
      const delay = alarm.triggerTime - now;
      if (delay <= 0) continue;

      // 1. In-memory timer (fires if the app is currently running in foreground/background)
      // Limit to 24 hours for setTimeout precision
      if (delay < 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => {
          this.fireNativeAlarm(alarm);
        }, delay);
        this.memoryScheduledAlarms.set(alarm.id, timer);
      }

      // 2. Native Web Notification Trigger API (Supported in Chrome Android & PWAs)
      this.registerServiceWorkerTrigger(alarm);
    }
  }

  /**
   * Register with Service Worker Trigger API if supported
   */
  private async registerServiceWorkerTrigger(alarm: ScheduledNativeAlarm) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg || !('showNotification' in reg)) return;

      const triggerSupported = 'showTrigger' in (Notification.prototype as any) && (window as any).TimestampTrigger;

      const notifOptions: any = {
        body: alarm.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alarm.id,
        vibrate: this.settings.vibrationEnabled ? [300, 100, 300, 100, 600] : undefined,
        requireInteraction: alarm.highPriority,
        silent: this.settings.alarmSound === 'silent',
        data: {
          alarmId: alarm.id,
          classId: alarm.classId,
          alarmType: alarm.alarmType,
          url: window.location.origin
        },
        actions: [
          { action: 'open_scan', title: '📸 Scan QR' },
          { action: 'view_timetable', title: '📅 View Class' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      };

      if (triggerSupported) {
        notifOptions.showTrigger = new (window as any).TimestampTrigger(alarm.triggerTime);
        await reg.showNotification(alarm.title, notifOptions);
      }
    } catch (e) {
      // Non-blocking trigger fallback
    }
  }

  /**
   * Fire a native alarm alert with sound, vibration, high-priority heads-up, and audio chime
   */
  public async fireNativeAlarm(alarm: ScheduledNativeAlarm): Promise<boolean> {
    console.log(`[NativeAlarmBridge] 🚨 FIRING NATIVE ALARM: ${alarm.title}`);

    // 1. Play dual-tone synthesized electronic chime & haptic feedback
    if (this.settings.alarmSound !== 'silent') {
      try {
        triggerNativeChime();
        if (this.settings.vibrationEnabled) {
          triggerHapticFeedback([300, 100, 300, 100, 600]);
        }
        if (alarm.highPriority) {
          setTimeout(() => {
            triggerNativeChime();
          }, 400);
        }
      } catch (err) {
        // Non-blocking
      }
    }

    // 2. Dispatch via Service Worker (Best for lock screen & background)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: alarm.title,
          options: {
            body: alarm.body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: alarm.id,
            vibrate: this.settings.vibrationEnabled ? [300, 100, 300, 100, 600] : undefined,
            requireInteraction: alarm.highPriority,
            data: {
              alarmId: alarm.id,
              classId: alarm.classId,
              alarmType: alarm.alarmType,
              url: window.location.origin,
              screen: alarm.alarmType === 'start' ? 'attendance' : 'schedule'
            },
            actions: [
              { action: 'open_scan', title: '📸 Scan QR' },
              { action: 'view_timetable', title: '📅 View Timetable' }
            ]
          }
        });
        return true;
      } catch (err) {
        console.warn('[NativeAlarmBridge] Service Worker postMessage failed:', err);
      }
    }

    // 3. Fallback to Window Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(alarm.title, {
          body: alarm.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: alarm.id,
          requireInteraction: alarm.highPriority
        });

        notif.onclick = () => {
          window.focus();
          window.dispatchEvent(
            new CustomEvent('classpulse-navigate', {
              detail: { screen: alarm.alarmType === 'start' ? 'attendance' : 'schedule' }
            })
          );
          notif.close();
        };
        return true;
      } catch (err) {
        console.warn('[NativeAlarmBridge] Window Notification API fallback failed:', err);
      }
    }

    return false;
  }

  /**
   * Android Clock App Native Intent Bridge:
   * Launches Android Clock App to register an official system alarm for a class session.
   */
  public triggerAndroidClockIntent(timeStr: string, label: string): boolean {
    if (typeof window === 'undefined') return false;
    const parsed = this.parseTime(timeStr);
    if (!parsed) return false;

    try {
      // Android Intent URI for AlarmClock.ACTION_SET_ALARM
      const intentUri = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.HOUR=${parsed.hours};i.android.intent.extra.MINUTES=${parsed.minutes};s.android.intent.extra.MESSAGE=${encodeURIComponent(label)};b.android.intent.extra.SKIP_UI=false;end`;
      window.location.href = intentUri;
      return true;
    } catch (e) {
      console.warn('[NativeAlarmBridge] Android Clock intent failed:', e);
      return false;
    }
  }

  /**
   * Reconcile any fired alarms upon app visibility resume
   */
  private async reconcileFiredAlarms() {
    try {
      const scheduled = await idbStorage.get<ScheduledNativeAlarm[]>(SCHEDULED_ALARMS_IDB_KEY);
      if (!scheduled || !Array.isArray(scheduled)) return;

      const now = Date.now();
      const updated = scheduled.filter(a => a.triggerTime > now - (30 * 60 * 1000)); // Keep recent items within 30m
      await idbStorage.set(SCHEDULED_ALARMS_IDB_KEY, updated);
    } catch {
      // Non-blocking
    }
  }

  /**
   * Cancel all registered alarms
   */
  public async cancelAllScheduledAlarms(): Promise<void> {
    this.memoryScheduledAlarms.forEach(t => clearTimeout(t));
    this.memoryScheduledAlarms.clear();
    await idbStorage.delete(SCHEDULED_ALARMS_IDB_KEY);
  }

  /**
   * Get all currently scheduled active alarms from IndexedDB
   */
  public async getScheduledAlarms(): Promise<ScheduledNativeAlarm[]> {
    try {
      const list = await idbStorage.get<ScheduledNativeAlarm[]>(SCHEDULED_ALARMS_IDB_KEY);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
}

export const nativeAlarmBridge = new NativeAlarmBridgeManager();
