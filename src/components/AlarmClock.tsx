import React, { useState, useEffect, useRef } from 'react';
import { Clock as ClockIcon, Bell, BellOff, Volume2, Play, CircleAlert, CheckCircle, Sparkles } from 'lucide-react';
import { speakText } from './AccessibilitySettings';

// Helper to synthesise a dual-tone, professional electronic chime
export const triggerNativeChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    
    // Beat 1: High crisp notification ring
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5 string
    osc1.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.2); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(493.88, audioCtx.currentTime); // B4
    osc2.frequency.exponentialRampToValueAtTime(987.77, audioCtx.currentTime + 0.28); // B5

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.9);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    
    osc1.stop(audioCtx.currentTime + 0.9);
    osc2.stop(audioCtx.currentTime + 0.9);
  } catch (e) {
    console.warn("AudioContext failed or was blocked by block permissions", e);
  }
};

interface AlarmClockProps {
  readAloudEnabled: boolean;
  onAlarmTriggered?: (msg: string) => void;
}

export default function AlarmClock({ readAloudEnabled, onAlarmTriggered }: AlarmClockProps) {
  const [time, setTime] = useState<Date>(new Date());
  const [alarmSeconds, setAlarmSeconds] = useState<number>(15);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [activeAlarms, setActiveAlarms] = useState<string[]>(['09:00 AM', '01:00 PM', '03:00 PM']);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [recentTriggered, setRecentTriggered] = useState<string | null>(null);

  // Update Clock seconds every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);

      // Check default schedule matches
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // If matches exactly on the minute mark (seconds === 0), trigger buzzer!
      if (now.getSeconds() === 0 && activeAlarms.includes(timeStr)) {
        handleTriggerBuzzer(`Attendance warning! Class section sched matches standard window ${timeStr}.`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAlarms]);

  // Handle Countdown Timer ticking
  useEffect(() => {
    let timerId: any = null;
    if (isRunning && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            handleTriggerBuzzer("Timer alert: Quick reminder is buzzin'! Scanning is open.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isRunning, timeLeft]);

  const startCountdown = () => {
    setTimeLeft(alarmSeconds);
    setIsRunning(true);
    setRecentTriggered(null);
    if (readAloudEnabled) {
      speakText(`Timer set for ${alarmSeconds} seconds.`, true);
    }
  };

  const handleTriggerBuzzer = (message: string) => {
    if (soundEnabled) {
      triggerNativeChime();
    }
    setRecentTriggered(message);
    if (readAloudEnabled) {
      speakText(message, true);
    }
    if (onAlarmTriggered) {
      onAlarmTriggered(message);
    }

    // Auto clear alert banner after 6 seconds
    setTimeout(() => {
      setRecentTriggered(null);
    }, 8000);
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/20 transition-all text-left space-y-4 shadow-sm">
      {/* Visual Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
            <ClockIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-300">Live Pulse Clock</h4>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Attendance countdown alerts</p>
          </div>
        </div>

        {/* Audio Mute buttons */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          type="button"
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            soundEnabled 
              ? 'bg-emerald-500/10 text-emerald-605 border-emerald-500/20 hover:bg-emerald-500/20' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
          title={soundEnabled ? "Mute native chime buzzer" : "Enable chime buzzer"}
        >
          {soundEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Digital Time Display paired with JetBrains Mono */}
      <div className="py-2.5 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-center relative overflow-hidden">
        <span className="text-2.5xl font-black font-mono tracking-wider text-emerald-600 dark:text-emerald-400">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <div className="text-[9px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">
          Campus PTC Standard • Precision Attendance Sync
        </div>
      </div>

      {/* Quick Reminder setting */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
        <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          Attendance Check Countdown (Timer)
        </label>
        
        <div className="flex items-center gap-2">
          <select
            value={alarmSeconds}
            onChange={(e) => setAlarmSeconds(Number(e.target.value))}
            disabled={isRunning}
            className="flex-1 text-[11px] font-bold p-2 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-emerald-500 outline-none disabled:opacity-50"
          >
            <option value="5">5 Seconds (Instant chime)</option>
            <option value="15">15 Seconds (Demonstration)</option>
            <option value="30">30 Seconds</option>
            <option value="60">1 Minute (60s check-in)</option>
            <option value="300">5 Minutes (Standard lock)</option>
          </select>

          {isRunning ? (
            <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold rounded-xl animate-pulse">
              {timeLeft}s left
            </div>
          ) : (
            <button
              onClick={startCountdown}
              type="button"
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Play className="w-3 h-3 fill-current" />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Visual Feedback Alerts sync panel */}
      {recentTriggered && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-2 items-start text-emerald-400 animate-bounce">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider">Precision Reminder Fired!</p>
            <p className="text-[10px] opacity-90 leading-tight truncate">{recentTriggered}</p>
          </div>
        </div>
      )}
    </div>
  );
}
