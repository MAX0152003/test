import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  X, 
  Clock, 
  Calendar, 
  CheckCircle, 
  FileText, 
  MessageSquare, 
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  Info
} from 'lucide-react';
import { ClassSession, AttendanceRecord } from '../types';
import { calculateEarlyWarningRisk, calculateStudentStanding } from '../lib/attendanceRules';

interface AttendanceRiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: ClassSession | null;
  enrolledClasses?: ClassSession[];
  attendanceRecords?: AttendanceRecord[];
  studentId?: string;
  studentName?: string;
  onOpenExcuseModal?: (classId: string) => void;
  onBookConsultation?: (instructorId?: string, instructorName?: string) => void;
}

export const AttendanceRiskCalculatorModal: React.FC<AttendanceRiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  cls,
  enrolledClasses = [],
  attendanceRecords = [],
  studentId = '',
  studentName = '',
  onOpenExcuseModal,
  onBookConsultation,
}) => {
  const safeEnrolledClasses = Array.isArray(enrolledClasses) ? enrolledClasses : [];
  const safeRecords = Array.isArray(attendanceRecords) ? attendanceRecords : [];

  const [selectedClassId, setSelectedClassId] = useState<string>(cls?.id || safeEnrolledClasses[0]?.id || '');
  const [simulatedFutureAbsences, setSimulatedFutureAbsences] = useState<number>(0);
  const [simulatedFutureSessions, setSimulatedFutureSessions] = useState<number>(5);

  const activeClass = safeEnrolledClasses.find(c => c.id === selectedClassId) || cls || safeEnrolledClasses[0];

  if (!isOpen || !activeClass) return null;

  const studentClassRecords = safeRecords.filter(
    r => r.classId === activeClass.id && (r.studentId === studentId || r.studentName === studentName)
  );

  const currentStanding = calculateStudentStanding(studentClassRecords);
  const riskMetrics = calculateEarlyWarningRisk(studentClassRecords);

  // Simulated calculations
  const simTotalAbsences = currentStanding.absentCount + simulatedFutureAbsences;
  const simTotalSessions = currentStanding.totalRecords + simulatedFutureSessions;
  const simPositive = (currentStanding.presentCount + currentStanding.lateCount + currentStanding.excusedCount) + 
                      Math.max(0, simulatedFutureSessions - simulatedFutureAbsences);
  const simProjectedRate = simTotalSessions > 0 ? Math.round((simPositive / simTotalSessions) * 100) : 100;
  const simRemainingAllowable = Math.max(0, 5 - simTotalAbsences);
  const simIsDropped = simTotalAbsences >= 5 || (currentStanding.maxConsecutiveAbsents + simulatedFutureAbsences) >= 3;

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
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden z-10 text-left space-y-5 my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-850 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <span>Early Warning & Retention Risk Meter</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    CHED 20% Policy
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Allowable absences calculator and proactive academic retention analysis.
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

          <div className="overflow-y-auto space-y-5 pr-1 flex-1">
            {/* Subject Selector Tabs */}
            {enrolledClasses.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {enrolledClasses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedClassId(c.id);
                      setSimulatedFutureAbsences(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeClass.id === c.id
                        ? 'bg-emerald-500 text-black shadow-xs font-black'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-mono text-[10px] mr-1">{c.code}</span>
                    <span className="truncate max-w-[120px]">{c.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Active Class Header Card */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {activeClass.code}
                  </span>
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                    {activeClass.name}
                  </h4>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                  <span>Instructor: <strong>{activeClass.instructorName}</strong></span>
                  <span>•</span>
                  <span>Room: <strong>{activeClass.room}</strong></span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-3 py-1 rounded-xl text-xs font-black ${riskMetrics.riskBadgeColor}`}>
                  {riskMetrics.riskLabel}
                </span>
              </div>
            </div>

            {/* Primary Meter: Allowable Absences Left */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100/60 dark:from-zinc-900/60 dark:to-zinc-900/30 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-black text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Institutional Drop Threshold Meter
                  </h5>
                  <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {riskMetrics.allowableAbsencesRemaining} allowable absence{riskMetrics.allowableAbsencesRemaining === 1 ? '' : 's'} remaining
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {currentStanding.attendanceRate}%
                  </span>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Attendance Rate
                  </span>
                </div>
              </div>

              {/* Multi-segmented Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                  {/* 5 blocks representing the 5 allowed absences */}
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const isUsed = idx < currentStanding.absentCount;
                    const isNextRisk = idx === currentStanding.absentCount;
                    let blockColor = 'bg-zinc-300 dark:bg-zinc-700'; // available
                    if (isUsed) {
                      blockColor = idx >= 3 ? 'bg-red-500' : 'bg-amber-500';
                    } else if (isNextRisk && idx >= 3) {
                      blockColor = 'bg-red-500/30 animate-pulse';
                    }

                    return (
                      <div 
                        key={idx} 
                        className={`flex-1 h-full rounded-xs transition-all ${blockColor}`}
                        title={`Absence Slot ${idx + 1} of 5 (${isUsed ? 'Used' : 'Safe/Available'})`}
                      />
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold">
                  <span>0 Absences (Optimal)</span>
                  <span className="text-amber-500 font-bold">3 Absences (Warning Level)</span>
                  <span className="text-red-500 font-bold">5 Absences (FDA Drop)</span>
                </div>
              </div>

              {/* Status Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Present</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {currentStanding.presentCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Lates ({riskMetrics.allowableLatesRemaining} left)</span>
                  <span className="text-base font-black text-amber-500 font-mono">
                    {currentStanding.lateCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Excused (Protected)</span>
                  <span className="text-base font-black text-blue-500 font-mono">
                    {currentStanding.excusedCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Unexcused Absences</span>
                  <span className={`text-base font-black font-mono ${currentStanding.absentCount > 0 ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {currentStanding.absentCount} / 5
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive "What-If" Simulation Engine */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>"What-If" Future Attendance Simulator</span>
                </h5>
                <span className="text-[10px] font-bold text-zinc-400">
                  Forecast final standing
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block">
                    Simulate additional missed sessions: <strong className="text-red-500">+{simulatedFutureAbsences}</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={simulatedFutureAbsences}
                    onChange={(e) => setSimulatedFutureAbsences(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                    <span>0 (Perfect)</span>
                    <span>1 Miss</span>
                    <span>2 Misses</span>
                    <span>3 Misses</span>
                    <span>4+ (Drop)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Projected Standing</span>
                    <span className={`text-xs font-black ${simIsDropped ? 'text-red-500' : 'text-emerald-500'}`}>
                      {simIsDropped ? '🚫 Trigger FDA Drop' : `Safe (${simRemainingAllowable} slots left)`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Projected Rate</span>
                    <span className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
                      {simProjectedRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Recommendations Checklist */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Recommended Academic Retention Steps</span>
              </h5>
              <div className="space-y-1.5">
                {riskMetrics.recommendations.map((rec, i) => (
                  <div 
                    key={i} 
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>University Code Art. 248: 20% unexcused absence ceiling enforced.</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onOpenExcuseModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenExcuseModal(activeClass.id);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-700 hover:text-black dark:text-amber-400 dark:hover:text-black border border-amber-500/30 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Submit Excuse</span>
                </button>
              )}

              {onBookConsultation && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBookConsultation(activeClass.instructorId, activeClass.instructorName);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Book Office Hours</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
