import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Smartphone, 
  Clock, 
  Volume2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  X, 
  RefreshCw, 
  Trash2, 
  Play, 
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  nativeAlarmBridge, 
  NativeAlarmSettings, 
  ScheduledNativeAlarm, 
  DEFAULT_ALARM_SETTINGS 
} from '../lib/nativeAlarmBridge';
import { ClassSession, Enrollment, UserProfile } from '../types';
import { speakText } from './AccessibilitySettings';

interface NativeAlarmManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassSession[];
  enrollments: Enrollment[];
  userProfile: UserProfile | null;
  readAloudEnabled: boolean;
}

export default function NativeAlarmManagerModal({
  isOpen,
  onClose,
  classes,
  enrollments,
  userProfile,
  readAloudEnabled
}: NativeAlarmManagerModalProps) {
  const [settings, setSettings] = useState<NativeAlarmSettings>(DEFAULT_ALARM_SETTINGS);
  const [scheduledList, setScheduledList] = useState<ScheduledNativeAlarm[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'alarms' | 'config' | 'permissions'>('alarms');
  const [permissionState, setPermissionState] = useState<string>('default');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const s = nativeAlarmBridge.loadSettings();
    setSettings(s);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
    const list = await nativeAlarmBridge.getScheduledAlarms();
    setScheduledList(list);
  };

  const handleToggleMaster = async (val: boolean) => {
    const updated = nativeAlarmBridge.saveSettings({ enabled: val });
    setSettings(updated);
    if (val) {
      handleSyncAlarms();
      speakText("Native device alarms enabled.", readAloudEnabled);
    } else {
      await nativeAlarmBridge.cancelAllScheduledAlarms();
      setScheduledList([]);
      speakText("Native device alarms disabled and cleared.", readAloudEnabled);
    }
  };

  const handleUpdateLeadTime = (key: keyof NativeAlarmSettings['leadTimes'], val: boolean) => {
    const updatedLeadTimes = { ...settings.leadTimes, [key]: val };
    const updated = nativeAlarmBridge.saveSettings({ leadTimes: updatedLeadTimes });
    setSettings(updated);
    handleSyncAlarms();
  };

  const handleSyncAlarms = async () => {
    setIsSyncing(true);
    try {
      const list = await nativeAlarmBridge.syncClassSchedulesToNativeAlarms(classes, enrollments, userProfile);
      setScheduledList(list);
      setBannerNotice(`⚡ Synchronized ${list.length} upcoming alarms with phone native alarm subsystem!`);
      setTimeout(() => setBannerNotice(null), 5000);
      speakText(`Synchronized ${list.length} schedule alarms.`, readAloudEnabled);
    } catch (e) {
      console.warn('Sync alarms error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRequestPermissions = async () => {
    const res = await nativeAlarmBridge.requestPermissions();
    setPermissionState(res.notifications);
    if (res.notifications === 'granted') {
      setBannerNotice("System alert permissions granted! Background alarms are now fully active.");
      handleSyncAlarms();
    } else if (res.notifications === 'denied') {
      alert("Notifications are blocked by your browser/device settings. Please allow notifications in your smartphone Settings or browser site settings.");
    }
  };

  const handleFireTestAlarm = async () => {
    const testAlarm: ScheduledNativeAlarm = {
      id: `test-alarm-${Date.now()}`,
      classId: 'test-cls',
      classCode: 'TEST-101',
      className: 'Campus Native Alarm Diagnostic',
      room: 'Main Lab 201',
      triggerTime: Date.now(),
      alarmType: 'custom',
      title: '🚨 ClassPulse 2.0 Native Phone Alarm Alert',
      body: 'TEST ALERT: Class session is starting now in Room 201! Tap to verify attendance.',
      highPriority: true,
      status: 'fired',
      createdAt: Date.now()
    };
    await nativeAlarmBridge.fireNativeAlarm(testAlarm);
    setBannerNotice("Test alarm dispatched to device system tray & audio chimer!");
    setTimeout(() => setBannerNotice(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-xs">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Native Mobile Alarm & Notification System
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    ANDROID & iOS
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Device-level background alarms for scheduled classes, deadlines, and room changes
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner Notice */}
          {bannerNotice && (
            <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{bannerNotice}</span>
              </div>
              <button onClick={() => setBannerNotice(null)} className="text-emerald-600/70 hover:text-emerald-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-6 bg-zinc-50/20 dark:bg-zinc-950/20">
            <button
              onClick={() => setActiveTab('alarms')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'alarms'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              Active Scheduled Alarms ({scheduledList.length})
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'config'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              Alarm Triggers & Preferences
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'permissions'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Device Permissions
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* TAB 1: ACTIVE SCHEDULED ALARMS */}
            {activeTab === 'alarms' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                      Master Native Alarm Subsystem
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Background scheduling for enrolled classes over the next 7 days
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleMaster(!settings.enabled)}
                    className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer inline-flex shrink-0 ${
                      settings.enabled ? 'bg-emerald-500 flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 block shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Next 7 Days Schedule Alarms ({scheduledList.length})
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFireTestAlarm}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 text-emerald-500" />
                      Test Alert Now
                    </button>
                    <button
                      onClick={handleSyncAlarms}
                      disabled={isSyncing}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      Re-Sync Alarms
                    </button>
                  </div>
                </div>

                {scheduledList.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                    <Clock className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
                    <p className="text-xs text-zinc-500 font-medium">
                      No native alarms currently scheduled. Click "Re-Sync Alarms" to index your classes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {scheduledList.map(alarm => {
                      const triggerDate = new Date(alarm.triggerTime);
                      const timeStr = triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dateStr = triggerDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

                      return (
                        <div
                          key={alarm.id}
                          className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between hover:border-emerald-500/30 transition-all shadow-xs"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                              alarm.highPriority ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                            }`}>
                              <Bell className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 font-mono">
                                  {alarm.classCode}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                  Room {alarm.room}
                                </span>
                                {alarm.highPriority && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    HIGH PRIORITY
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                                {alarm.title}
                              </p>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5 font-mono">
                                <Calendar className="w-3 h-3" />
                                {dateStr} at {timeStr}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                              {timeStr}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CONFIGURATION */}
            {activeTab === 'config' && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <h4 className="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300 tracking-wider">
                    Alarm Trigger Intervals
                  </h4>

                  {/* 15m prior */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">15-Minute Heads-Up Alarm</span>
                      <p className="text-[10px] text-zinc-500">Heads up to prepare attendance terminal and materials</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.leadTimes.fifteenMin}
                      onChange={e => handleUpdateLeadTime('fifteenMin', e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* 5m prior */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">5-Minute Critical Urgent Alarm</span>
                      <p className="text-[10px] text-zinc-500">High-priority warning when class is starting imminently</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.leadTimes.fiveMin}
                      onChange={e => handleUpdateLeadTime('fiveMin', e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* At start */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Class Start & QR Scan Open</span>
                      <p className="text-[10px] text-zinc-500">Fires at the exact start minute with direct camera shortcut</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.leadTimes.atStart}
                      onChange={e => handleUpdateLeadTime('atStart', e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* Grace warning */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Grace Period Expiration Warning</span>
                      <p className="text-[10px] text-zinc-500">2 minutes before check-ins are marked late</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.leadTimes.graceWarning}
                      onChange={e => handleUpdateLeadTime('graceWarning', e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h4 className="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300 tracking-wider">
                    Sound & Vibration
                  </h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Vibration Pattern</span>
                      <p className="text-[10px] text-zinc-500">Haptic vibration bursts on alarm trigger</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.vibrationEnabled}
                      onChange={e => {
                        const updated = nativeAlarmBridge.saveSettings({ vibrationEnabled: e.target.checked });
                        setSettings(updated);
                      }}
                      className="w-4 h-4 text-emerald-500 rounded cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Alarm Sound Tone</span>
                      <p className="text-[10px] text-zinc-500">Synthesized audio chime tone</p>
                    </div>
                    <select
                      value={settings.alarmSound}
                      onChange={e => {
                        const updated = nativeAlarmBridge.saveSettings({ alarmSound: e.target.value as any });
                        setSettings(updated);
                      }}
                      className="text-xs font-bold p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 outline-none"
                    >
                      <option value="chime">Campus Electronic Chime</option>
                      <option value="default">System Default Bell</option>
                      <option value="urgent">Urgent Double Pulse</option>
                      <option value="silent">Silent / Vibration Only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PERMISSIONS & SYSTEM INTEGRATION */}
            {activeTab === 'permissions' && (
              <div className="space-y-4 text-left">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                      Operating System Permission Status
                    </span>
                    <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-full ${
                      permissionState === 'granted'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {permissionState.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Native notification and alarm permissions allow ClassPulse to wake your screen, ring the campus chime, and vibrate your phone when a class is starting or a room is updated even when the app is closed.
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={handleRequestPermissions}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Request / Renew System Permissions
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/15 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
                    <Info className="w-4 h-4" />
                    <span>Android & iOS Operating System Policies</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11px]">
                    <li><strong>Android:</strong> Alarms are registered via Service Worker and Background Sync, bypassing aggressive battery management.</li>
                    <li><strong>iOS (Safari/PWA):</strong> Add the app to your Home Screen to enable Web Push & Native Notification Triggers.</li>
                    <li><strong>Device Reboots:</strong> Scheduled alarms automatically re-index from local IndexedDB upon app open.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-50/50 dark:bg-zinc-950/40">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
