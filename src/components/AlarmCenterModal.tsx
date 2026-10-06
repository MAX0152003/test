import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellOff, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Sliders, 
  Volume2, 
  Vibrate, 
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { ClassSession, Enrollment, UserProfile } from '../types';
import { 
  triggerClassAlarmNotification, 
  scheduleAlarmOutsideApp,
  getNotificationPermissionStatus,
  requestSystemNotificationPermission,
  ClassAlarmPayload
} from '../lib/classAlarmScheduler';
import { triggerNativeChime } from './AlarmClock';
import { triggerHapticFeedback } from '../lib/soundUtils';
import { speakText } from './AccessibilitySettings';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface AlarmCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  classes: ClassSession[];
  enrollments?: Enrollment[];
  readAloud?: boolean;
}

export const AlarmCenterModal: React.FC<AlarmCenterModalProps> = ({
  isOpen,
  onClose,
  user,
  classes,
  enrollments = [],
  readAloud = false
}) => {
  useBodyScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState<'schedule' | 'timer' | 'settings'>('schedule');
  const [permissionStatus, setPermissionStatus] = useState<string>(() => getNotificationPermissionStatus());
  const [isTestArming, setIsTestArming] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  
  // Quick Timer state
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Alarm Preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cp_pref_alarm_sound') !== 'false';
    } catch {
      return true;
    }
  });

  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cp_pref_alarm_vibration') !== 'false';
    } catch {
      return true;
    }
  });

  const [alarmsArmed, setAlarmsArmed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cp_pref_schedule_alarms') !== 'false';
    } catch {
      return true;
    }
  });

  // Keep clock updated
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Sync permissions
  useEffect(() => {
    if (isOpen) {
      setPermissionStatus(getNotificationPermissionStatus());
    }
  }, [isOpen]);

  // Handle countdown timer ticking
  useEffect(() => {
    let timerId: any = null;
    if (isTimerRunning && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isTimerRunning, timeLeft]);

  // Test countdown handler
  useEffect(() => {
    let interval: any = null;
    if (testCountdown !== null && testCountdown > 0) {
      interval = setInterval(() => {
        setTestCountdown(prev => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [testCountdown]);

  const handleRequestPermission = async () => {
    const granted = await requestSystemNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    if (granted) {
      speakText("System notification permissions enabled. Lock-screen alarms are active.", readAloud);
    }
  };

  const handleTriggerTestOutsideApp = async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestSystemNotificationPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted) {
        alert("Please enable smartphone notification permissions to allow background pop-up alarms outside the app.");
        return;
      }
    }

    setIsTestArming(true);
    setTestCountdown(4);
    speakText("Test alarm armed. Minimize app or lock screen to test background alert in 4 seconds.", readAloud);

    const testPayload: ClassAlarmPayload = {
      title: "🚨 ClassPulse Alarm: CS-101 in 15 mins",
      message: "Room 201 • Prof. Elena Gomez. Doors open for attendance QR check-in!",
      classCode: "CS-101",
      className: "Computer Science",
      room: "Room 201",
      type: "upcoming",
      screen: "attendance"
    };

    await scheduleAlarmOutsideApp(testPayload, 4);

    setTimeout(() => {
      setIsTestArming(false);
      setTestCountdown(null);
    }, 5000);
  };

  const handleTimerComplete = () => {
    if (soundEnabled) {
      triggerNativeChime();
      setTimeout(triggerNativeChime, 300);
    }
    if (vibrationEnabled) {
      triggerHapticFeedback([400, 150, 400, 150, 600]);
    }

    const payload: ClassAlarmPayload = {
      title: "⏱️ ClassPulse Timer Alert!",
      message: "Countdown timer completed! Ready for class session scanning.",
      type: "test",
      screen: "attendance"
    };

    triggerClassAlarmNotification(payload);
    speakText("Timer alert! Class attendance countdown reached zero.", readAloud);
  };

  const startTimer = (seconds: number) => {
    setTimeLeft(seconds);
    setIsTimerRunning(true);
    speakText(`Timer set for ${seconds} seconds.`, readAloud);
  };

  // Filter today's relevant classes
  const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDay = daysOfWeek[currentTime.getDay()];
  
  const enrolledClassIds = new Set(
    enrollments
      .filter(e => e.studentId === user?.studentId || e.studentEmail === user?.email || e.studentName === user?.name)
      .map(e => e.classId)
  );

  const myClasses = classes.filter(cls => {
    if (user?.role === 'faculty') {
      return cls.facultyId === user.id || cls.facultyId === user.facultyId || (cls.facultyName && user.name && cls.facultyName.toLowerCase() === user.name.toLowerCase());
    }
    if (user?.role === 'student') {
      return enrolledClassIds.size === 0 ? true : enrolledClassIds.has(cls.id);
    }
    return true;
  });

  const todayClasses = myClasses.filter(c => {
    const days = (c.days || []).map(d => d.toLowerCase());
    return days.some(d => d.includes(todayDay) || d === 'all' || d === 'daily');
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-left touch-none overscroll-contain">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overscroll-contain"
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-850 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Smartphone Alarms & Notifications
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                True background class reminders & lock-screen popups
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-850 px-4 sm:px-6 pt-2 gap-2 bg-zinc-100/50 dark:bg-zinc-900/20">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'schedule'
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Class Alarms ({todayClasses.length})
            {activeTab === 'schedule' && (
              <motion.div layoutId="alarm-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timer')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'timer'
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Quick Timer
            {activeTab === 'timer' && (
              <motion.div layoutId="alarm-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'settings'
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Engine Preferences
            {activeTab === 'settings' && (
              <motion.div layoutId="alarm-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 modal-scrollable-content overscroll-contain touch-pan-y" data-scrollable="true">
          
          {/* Permission Status Alert Banner */}
          {permissionStatus !== 'granted' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide">
                    Notification Permissions Required
                  </h4>
                  <p className="text-[11px] opacity-90 leading-tight mt-0.5">
                    Allow notifications to receive lock-screen alarms and popups outside the app.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
              >
                Enable Notifications
              </button>
            </div>
          )}

          {/* Test Pop-up Outside App Action Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-zinc-900 dark:text-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Background Alarm Pop-up Tester
                </h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                Trigger a real pop-up alarm that fires outside the app in 4 seconds.
              </p>
            </div>

            <button
              type="button"
              disabled={isTestArming}
              onClick={handleTriggerTestOutsideApp}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                isTestArming 
                  ? 'bg-emerald-600 text-black animate-pulse cursor-wait'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>
                {testCountdown !== null ? `Firing in ${testCountdown}s (Switch Apps Now!)` : 'Test Pop-up Alarm'}
              </span>
            </button>
          </div>

          {/* Tab 1: Scheduled Class Alarms */}
          {activeTab === 'schedule' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    Automated Class Reminders for Today ({todayClasses.length})
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-bold text-zinc-400">Alarms Armed:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !alarmsArmed;
                      setAlarmsArmed(next);
                      try { localStorage.setItem('cp_pref_schedule_alarms', String(next)); } catch {}
                      speakText(next ? "Schedule alarms armed." : "Schedule alarms paused.", readAloud);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                      alarmsArmed 
                        ? 'bg-emerald-500 text-black' 
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {alarmsArmed ? 'Active' : 'Muted'}
                  </button>
                </div>
              </div>

              {todayClasses.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p className="text-xs font-bold">No classes scheduled for today.</p>
                  <p className="text-[11px] opacity-75 mt-0.5">Alarms automatically arm for classes on their assigned days.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayClasses.map(cls => (
                    <div 
                      key={cls.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-zinc-800/90 hover:border-emerald-500/30 transition-all text-left space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">{cls.code}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {cls.startTime} - {cls.endTime}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">{cls.name}</p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold shrink-0">
                          {cls.room}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-wrap gap-1.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                          🔔 15m Lead Notice
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                          ⚡ 5m QR Check-in Open
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                          ⏱️ Late Grace Warning
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Quick Countdown Timer */}
          {activeTab === 'timer' && (
            <div className="space-y-4">
              {/* Digital Time Card */}
              <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-1">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-emerald-600 dark:text-emerald-400">
                  {isTimerRunning || timeLeft > 0
                    ? `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`
                    : currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  }
                </span>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {isTimerRunning ? 'Countdown Active • Alarm Armed' : 'Campus Time Standard • Precision Attendance Sync'}
                </p>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2">
                {[15, 60, 300, 900].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => startTimer(sec)}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-xs font-black uppercase text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer"
                  >
                    {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                  </button>
                ))}
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-2 pt-1">
                {isTimerRunning ? (
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(false)}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Pause className="w-4 h-4" />
                    Pause Timer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (timeLeft === 0) setTimeLeft(timerSeconds);
                      setIsTimerRunning(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Play className="w-4 h-4" />
                    {timeLeft > 0 ? 'Resume Timer' : 'Start Timer'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimeLeft(0);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Preferences */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Electronic Audio Chime</h5>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Play dual-tone resonant chime when alarms fire</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    try { localStorage.setItem('cp_pref_alarm_sound', String(next)); } catch {}
                    if (next) triggerNativeChime();
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    soundEnabled ? 'bg-emerald-500 text-black font-black' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {soundEnabled ? 'Enabled' : 'Muted'}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Vibrate className="w-4 h-4 text-indigo-500" />
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Smartphone Haptic Vibration</h5>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Pulsing physical vibration pattern on mobile devices</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !vibrationEnabled;
                    setVibrationEnabled(next);
                    try { localStorage.setItem('cp_pref_alarm_vibration', String(next)); } catch {}
                    if (next) triggerHapticFeedback([200, 100, 200]);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vibrationEnabled ? 'bg-indigo-500 text-white font-black' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {vibrationEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Android Clock App Integration
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (todayClasses.length > 0) {
                        const target = todayClasses[0];
                        const timeParts = target.startTime.replace(/(AM|PM)/g, '').trim().split(':');
                        const h = timeParts[0] || '8';
                        const m = timeParts[1] || '0';
                        const intent = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.HOUR=${h};i.android.intent.extra.MINUTES=${m};s.android.intent.extra.MESSAGE=${encodeURIComponent(`ClassPulse: ${target.code}`)};b.android.intent.extra.SKIP_UI=false;end`;
                        window.location.href = intent;
                      } else {
                        alert("No classes scheduled today to export to Clock app.");
                      }
                    }}
                    className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Launch Clock App</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Optionally registers hardware alarms into Samsung Clock / Google Clock for alarm rings even when battery-saver mode is active.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Close Button */}
        <div className="px-4 sm:px-6 py-3 border-t border-zinc-200 dark:border-zinc-850 flex justify-end bg-zinc-50/70 dark:bg-zinc-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-extrabold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
