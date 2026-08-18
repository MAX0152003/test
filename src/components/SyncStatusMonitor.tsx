import React from 'react';
import { RefreshCw, Database, CheckCircle2, Wifi, WifiOff, ShieldCheck, Clock, Layers } from 'lucide-react';
import { forceResyncAllFromFirestore } from '../lib/firestoreSync';
import { playSuccessChime, triggerHapticFeedback } from '../lib/soundUtils';

interface SyncStatusMonitorProps {
  isOffline: boolean;
  onRefreshCompleted?: () => void;
  compact?: boolean;
}

export default function SyncStatusMonitor({
  isOffline,
  onRefreshCompleted,
  compact = false
}: SyncStatusMonitorProps) {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<string>(() => new Date().toLocaleTimeString());
  const [syncStats, setSyncStats] = React.useState<{ users: number; classes: number; records: number } | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const handleForceResync = async () => {
    if (isOffline) {
      setToastMessage("⚠️ Device is currently in Offline Mode. Switch to Cloud mode to re-sync.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsSyncing(true);
    setToastMessage(null);

    const res = await forceResyncAllFromFirestore(false);
    setIsSyncing(false);

    if (res.success) {
      playSuccessChime();
      triggerHapticFeedback([40, 30, 80]);
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncStats(res.stats);
      setToastMessage(`✅ Cloud state re-synchronized! (${res.stats.users} users, ${res.stats.classes} classes, ${res.stats.records} records updated in ${res.durationMs}ms)`);
      if (onRefreshCompleted) {
        onRefreshCompleted();
      }
    } else {
      setToastMessage("⚠️ Failed to reach Firestore. Please check your network connection.");
    }

    setTimeout(() => setToastMessage(null), 4000);
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
          }`} />
          <div className="text-left">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">
              {isOffline ? 'Offline Mode' : 'Cloud Synced'}
            </span>
            <span className="text-[10px] text-zinc-400 block font-mono">
              Last sync: {lastSyncTime}
            </span>
          </div>
        </div>

        <button
          onClick={handleForceResync}
          disabled={isSyncing || isOffline}
          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          Force Re-sync
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-md text-left space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            isOffline 
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">Firestore Cloud Sync Status</h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isOffline
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}>
                {isOffline ? 'Local Storage' : 'Cloud Connected'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Real-time multi-device database synchronization monitor
            </p>
          </div>
        </div>

        <button
          onClick={handleForceResync}
          disabled={isSyncing || isOffline}
          className="px-3 py-2 rounded-2xl bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Force Re-sync'}
        </button>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold">
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
            Connection
          </div>
          <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {isOffline ? 'Offline' : 'Online'}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            Last Sync
          </div>
          <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
            {lastSyncTime}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold">
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            Synced Tables
          </div>
          <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {syncStats ? `${syncStats.users + syncStats.classes + syncStats.records} records` : '5 collections'}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Bridge Status
          </div>
          <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {isOffline ? 'Local Cache' : 'Active Listener'}
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fade-in flex items-center justify-between">
          <span>{toastMessage}</span>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        </div>
      )}
    </div>
  );
}
