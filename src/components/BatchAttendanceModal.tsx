import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  CheckCheck, 
  AlertTriangle, 
  ShieldCheck, 
  X, 
  CloudSun, 
  Trophy, 
  Building, 
  HelpCircle, 
  Sparkles,
  RefreshCw,
  Check
} from 'lucide-react';
import { ClassSession, AttendanceRecord, Enrollment } from '../types';

interface BatchAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes?: ClassSession[];
  enrollments?: Enrollment[];
  selectedClassId?: string;
  onApplyBatch?: (params: {
    classIds: string[];
    date: string;
    status: 'present' | 'excused';
    reason: string;
    eventType?: 'university_event' | 'weather_suspension' | 'holiday' | 'department_activity' | 'custom';
  }) => Promise<void> | void;
  onApplyBatchAttendance?: (params: {
    classId: string;
    date: string;
    status: 'present' | 'excused';
    reason: string;
    eventType: 'university_event' | 'weather_suspension' | 'holiday' | 'department_activity' | 'custom';
  }) => Promise<void> | void;
}

export const BatchAttendanceModal: React.FC<BatchAttendanceModalProps> = ({
  isOpen,
  onClose,
  classes = [],
  enrollments = [],
  selectedClassId,
  onApplyBatch,
  onApplyBatchAttendance,
}) => {
  const safeClasses = Array.isArray(classes) ? classes : [];
  const [targetClassId, setTargetClassId] = useState<string>(selectedClassId || safeClasses[0]?.id || 'all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState<'university_event' | 'weather_suspension' | 'holiday' | 'department_activity' | 'custom'>('weather_suspension');
  const [targetStatus, setTargetStatus] = useState<'present' | 'excused'>('excused');
  const [customReason, setCustomReason] = useState<string>('Classes Suspended due to Inclement Weather / Executive Order');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleEventTypeChange = (type: typeof eventType) => {
    setEventType(type);
    if (type === 'weather_suspension') {
      setTargetStatus('excused');
      setCustomReason('Classes Suspended due to Inclement Weather / Local Executive Order');
    } else if (type === 'university_event') {
      setTargetStatus('excused');
      setCustomReason('Official University Intramurals / Athletic Meet');
    } else if (type === 'department_activity') {
      setTargetStatus('present');
      setCustomReason('Departmental General Assembly & Technical Conference');
    } else if (type === 'holiday') {
      setTargetStatus('excused');
      setCustomReason('Official National / Regional Non-Working Holiday');
    } else {
      setCustomReason('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassId || !customReason.trim()) return;

    try {
      setIsSubmitting(true);
      const targetClassIds = targetClassId === 'all' ? safeClasses.map(c => c.id) : [targetClassId];

      if (onApplyBatch) {
        await onApplyBatch({
          classIds: targetClassIds,
          date: selectedDate,
          status: targetStatus,
          reason: customReason.trim(),
          eventType,
        });
      } else if (onApplyBatchAttendance) {
        for (const cId of targetClassIds) {
          await onApplyBatchAttendance({
            classId: cId,
            date: selectedDate,
            status: targetStatus,
            reason: customReason.trim(),
            eventType,
          });
        }
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden z-10 text-left space-y-5 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-850">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Batch Attendance Adjustment
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Bulk mark rosters for campus suspensions, athletic meets, or holidays.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Target Class Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-500" />
                <span>Target Subject Section</span>
              </label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">⚡ All My Assigned Classes (Global Action)</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name} ({c.room})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Effective Class Date</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Event Template Quick Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Preset Event Classification</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleEventTypeChange('weather_suspension')}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs cursor-pointer flex items-center gap-2 ${
                    eventType === 'weather_suspension'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">Typhoon / Weather</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEventTypeChange('university_event')}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs cursor-pointer flex items-center gap-2 ${
                    eventType === 'university_event'
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">Athletic / Intramurals</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEventTypeChange('department_activity')}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs cursor-pointer flex items-center gap-2 ${
                    eventType === 'department_activity'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Building className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">Dept Convocations</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEventTypeChange('custom')}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs cursor-pointer flex items-center gap-2 ${
                    eventType === 'custom'
                      ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="truncate">Custom Override</span>
                </button>
              </div>
            </div>

            {/* Target Status Assignment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Mark All Enrolled Students As:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetStatus('excused')}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer transition-all ${
                    targetStatus === 'excused'
                      ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  Excused (Protected)
                </button>

                <button
                  type="button"
                  onClick={() => setTargetStatus('present')}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer transition-all ${
                    targetStatus === 'present'
                      ? 'bg-emerald-500 text-black border-emerald-600 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  Present (Full Credit)
                </button>
              </div>
            </div>

            {/* Reason / Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Official Memorandum / Log Note:
              </label>
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g. Authorized by Dean Memo No. 2026-084"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 resize-none font-medium"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-850">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !customReason.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Batch Update</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
