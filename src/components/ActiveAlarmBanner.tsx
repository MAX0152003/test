import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Sparkles, Clock, X, ChevronRight, Scan } from 'lucide-react';
import { ClassAlarmPayload } from '../lib/classAlarmScheduler';

interface ActiveAlarmBannerProps {
  activeAlarm: ClassAlarmPayload | null;
  onDismiss: () => void;
  onNavigate: (screen: string) => void;
  onSnooze: (minutes?: number) => void;
}

export const ActiveAlarmBanner: React.FC<ActiveAlarmBannerProps> = ({
  activeAlarm,
  onDismiss,
  onNavigate,
  onSnooze
}) => {
  if (!activeAlarm) return null;

  const isLateWarning = activeAlarm.type === 'late_warning';

  return (
    <AnimatePresence>
      <div className="fixed top-3 sm:top-5 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[120] pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`p-4 rounded-3xl border shadow-2xl backdrop-blur-xl text-left space-y-3 ${
            isLateWarning
              ? 'bg-amber-500/95 dark:bg-amber-950/95 border-amber-400/50 text-white'
              : 'bg-emerald-600/95 dark:bg-zinc-950/95 border-emerald-400/40 text-white'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0 animate-pulse">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold opacity-90 block">
                  {isLateWarning ? '⚠️ ATTENDANCE WARNING ALARM' : '🔔 LIVE CLASS STATUS ALARM'}
                </span>
                <h4 className="text-sm font-black tracking-tight leading-snug">
                  {activeAlarm.title}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              title="Dismiss Alarm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body message */}
          <p className="text-xs text-white/90 leading-relaxed font-sans">
            {activeAlarm.message}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onNavigate(activeAlarm.screen || 'attendance');
                onDismiss();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-white text-zinc-950 hover:bg-white/90 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95"
            >
              <Scan className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{activeAlarm.screen === 'attendance' ? 'Scan Attendance QR' : 'Open Class Schedule'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSnooze(5)}
              className="py-2 px-3 rounded-xl bg-black/25 hover:bg-black/35 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Snooze for 5 minutes"
            >
              Snooze 5m
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
