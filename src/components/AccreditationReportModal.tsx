import React, { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Printer, 
  Download, 
  Building2, 
  X, 
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { ClassSession, AttendanceRecord, UserProfile, Enrollment } from '../types';

interface AccreditationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes?: ClassSession[];
  attendanceRecords?: AttendanceRecord[];
  users?: UserProfile[] | any[];
  enrollments?: Enrollment[];
  academicYear?: string;
  semester?: string;
}

export const AccreditationReportModal: React.FC<AccreditationReportModalProps> = ({
  isOpen,
  onClose,
  classes = [],
  attendanceRecords = [],
  users = [],
  enrollments = [],
  academicYear = 'A.Y. 2026-2027',
  semester = '1st Semester',
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const safeClasses = useMemo(() => Array.isArray(classes) ? classes : [], [classes]);
  const safeRecords = useMemo(() => Array.isArray(attendanceRecords) ? attendanceRecords : [], [attendanceRecords]);
  const safeUsers = useMemo(() => Array.isArray(users) ? users : [], [users]);
  const safeEnrollments = useMemo(() => Array.isArray(enrollments) ? enrollments : [], [enrollments]);

  // Aggregate metrics
  const totalClasses = safeClasses.length;
  const userStudents = safeUsers.filter(u => u?.role === 'student').length;
  const enrolledStudentIds = new Set(safeEnrollments.map(e => e.studentId || e.studentName).filter(Boolean));
  const recordStudentIds = new Set(safeRecords.filter(r => r.role === 'student').map(r => r.studentId || r.studentName).filter(Boolean));
  const totalStudents = userStudents || enrolledStudentIds.size || recordStudentIds.size || 0;

  const userFaculty = safeUsers.filter(u => u?.role === 'faculty').length;
  const classFaculty = new Set(safeClasses.map(c => c.facultyName || (c as any).instructorName || (c as any).instructor).filter(Boolean)).size;
  const totalFaculty = userFaculty || classFaculty || 1;

  const totalAttendanceLogs = safeRecords.length;

  const presentCount = safeRecords.filter(r => r.status === 'present').length;
  const lateCount = safeRecords.filter(r => r.status === 'late').length;
  const excusedCount = safeRecords.filter(r => r.status === 'excused').length;
  const absentCount = safeRecords.filter(r => r.status === 'absent').length;

  const overallAttendanceRate = totalAttendanceLogs > 0
    ? Math.round(((presentCount + lateCount + excusedCount) / totalAttendanceLogs) * 100)
    : 100;

  // Student Absence Metrics
  const studentAbsenceMap = new Map<string, number>();
  safeRecords.forEach(r => {
    if (r.status === 'absent' && (r.studentId || r.studentName)) {
      const key = r.studentId || r.studentName;
      studentAbsenceMap.set(key, (studentAbsenceMap.get(key) || 0) + 1);
    }
  });

  let atRiskStudentsCount = 0;
  let droppedStudentsCount = 0;
  studentAbsenceMap.forEach(absences => {
    if (absences >= 5) droppedStudentsCount++;
    else if (absences >= 3) atRiskStudentsCount++;
  });

  // Print / Save to PDF
  const handlePrint = () => {
    window.print();
  };

  // Direct CSV Export (Excel friendly)
  const handleDownloadCSV = () => {
    const headers = [
      'Course Code',
      'Course Title',
      'Instructor',
      'Room',
      'Schedule',
      'Enrolled Students',
      'Attendance Logs',
      'Present Count',
      'Absent Count',
      'Compliance Status'
    ];

    const rows = safeClasses.map(c => {
      const classRecs = safeRecords.filter(r => r.classId === c.id);
      const pres = classRecs.filter(r => r.status === 'present' || r.status === 'excused' || r.status === 'late').length;
      const abs = classRecs.filter(r => r.status === 'absent').length;
      const enrolled = safeEnrollments.filter(e => e.classId === c.id && !e.deletedByStudent).length || (c as any).enrolledStudents?.length || 0;
      const daysStr = Array.isArray(c.days) ? c.days.join('/') : (c.days || 'MWF');
      const rate = classRecs.length > 0 ? Math.round((pres / classRecs.length) * 100) : 100;

      return [
        `"${c.code || ''}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.facultyName || (c as any).instructorName || 'Assigned Faculty').replace(/"/g, '""')}"`,
        `"${c.room || ''}"`,
        `"${daysStr} ${c.startTime || ''}"`,
        enrolled,
        classRecs.length,
        pres,
        abs,
        `"${rate}% Compliance"`
      ].join(',');
    });

    // Summary Header
    const summaryLines = [
      `"MINDANAO STATE UNIVERSITY - ACCREDITATION ATTENDANCE REPORT"`,
      `"Academic Period: ${academicYear} - ${semester}"`,
      `"Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}"`,
      `"Total Classes: ${totalClasses} | Total Students: ${totalStudents} | Overall Rate: ${overallAttendanceRate}%"`,
      `""`,
      headers.join(',')
    ];

    const csvContent = '\uFEFF' + [...summaryLines, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Accreditation_Report_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Direct JSON Export
  const handleDownloadJSON = () => {
    const reportData = {
      institution: 'Mindanao State University',
      reportTitle: 'Accreditation Attendance Compliance Report',
      academicPeriod: `${academicYear} - ${semester}`,
      dateGenerated: new Date().toISOString(),
      summary: {
        totalClasses,
        totalStudents,
        totalFaculty,
        totalAttendanceLogs,
        attendanceRate: `${overallAttendanceRate}%`,
        atRiskStudents: atRiskStudentsCount,
        exceededAbsencesStudents: droppedStudentsCount,
      },
      classes: safeClasses.map(c => {
        const classRecs = safeRecords.filter(r => r.classId === c.id);
        const pres = classRecs.filter(r => r.status === 'present' || r.status === 'excused' || r.status === 'late').length;
        const abs = classRecs.filter(r => r.status === 'absent').length;
        return {
          code: c.code,
          title: c.name,
          instructor: c.facultyName || (c as any).instructorName || 'Assigned Faculty',
          room: c.room,
          schedule: `${Array.isArray(c.days) ? c.days.join('/') : (c.days || 'MWF')} ${c.startTime || ''}`,
          enrolledCount: safeEnrollments.filter(e => e.classId === c.id && !e.deletedByStudent).length || (c as any).enrolledStudents?.length || 0,
          totalLogs: classRecs.length,
          presentLogs: pres,
          absentLogs: abs,
        };
      })
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Accreditation_Report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity print:hidden"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden z-10 text-left space-y-4 my-auto max-h-[94vh] flex flex-col print:p-0 print:border-none print:shadow-none print:max-h-none print:w-full print:bg-white print:text-black"
        >
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-850 shrink-0 print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Accreditation Attendance Report
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {academicYear} • {semester}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleDownloadCSV}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                title="Download spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>

              <button
                onClick={handlePrint}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>

              <button
                onClick={handleDownloadJSON}
                type="button"
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="Download JSON data"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>

              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Report Body */}
          <div ref={printRef} className="overflow-y-auto space-y-5 pr-1 flex-1 print:overflow-visible print:space-y-4">
            
            {/* Institution Header */}
            <div className="text-center pb-3 border-b-2 border-zinc-800 dark:border-zinc-200 print:border-black print:text-black">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Building2 className="w-6 h-6 text-emerald-600 print:text-black" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 print:text-gray-600">
                  Mindanao State University
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 print:text-black">
                ACCREDITATION ATTENDANCE COMPLIANCE REPORT
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 print:text-gray-700 font-medium">
                {academicYear} • {semester}
              </p>
            </div>

            {/* Quick Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 print:bg-transparent print:border-black print:text-black">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 print:text-gray-500 block">Report Code</span>
                <span className="font-mono font-bold">QA-{new Date().getFullYear()}-{totalClasses}C</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 print:text-gray-500 block">Date</span>
                <span className="font-medium">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 print:text-gray-500 block">Attendance Rate</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 print:text-black">{overallAttendanceRate}%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 print:text-gray-500 block">Verification</span>
                <span className="font-medium">QR & Activity Logs</span>
              </div>
            </div>

            {/* Key Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 print:grid-cols-4">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:border-black print:bg-transparent">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Active Classes</span>
                <span className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 print:text-black font-mono">{totalClasses}</span>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:border-black print:bg-transparent">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Students</span>
                <span className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 print:text-black font-mono">{totalStudents}</span>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:border-black print:bg-transparent">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">At-Risk (3-4 Absences)</span>
                <span className="text-lg sm:text-xl font-black text-amber-500 print:text-black font-mono">{atRiskStudentsCount}</span>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:border-black print:bg-transparent">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Exceeded (5+ Absences)</span>
                <span className="text-lg sm:text-xl font-black text-red-500 print:text-black font-mono">{droppedStudentsCount}</span>
              </div>
            </div>

            {/* Course Section Table (Responsive on mobile) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 print:text-black">
                <span>Classes & Attendance Overview</span>
                <span className="text-[11px] font-normal text-zinc-400 print:text-gray-600 font-mono">{safeClasses.length} courses</span>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden print:border-black">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[520px] sm:min-w-full">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800 print:bg-gray-100 print:text-black print:border-black text-[11px]">
                      <tr>
                        <th className="p-2 pl-3">Code</th>
                        <th className="p-2">Subject Name</th>
                        <th className="p-2">Instructor</th>
                        <th className="p-2">Room</th>
                        <th className="p-2">Schedule</th>
                        <th className="p-2 text-center pr-3">Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 print:divide-black">
                      {safeClasses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-zinc-400">No classes found</td>
                        </tr>
                      ) : (
                        safeClasses.map((cls, idx) => (
                          <tr key={cls.id || idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 print:hover:bg-transparent">
                            <td className="p-2 pl-3 font-mono font-bold">{cls.code}</td>
                            <td className="p-2 font-medium">{cls.name}</td>
                            <td className="p-2 text-zinc-600 dark:text-zinc-400 print:text-black">{cls.facultyName || (cls as any).instructorName || (cls as any).instructor || 'Faculty'}</td>
                            <td className="p-2 font-mono">{cls.room}</td>
                            <td className="p-2 font-mono text-[11px]">{Array.isArray(cls.days) ? cls.days.join('/') : (cls.days || 'MWF')} {cls.startTime}</td>
                            <td className="p-2 text-center font-mono font-bold pr-3">{safeEnrollments.filter(e => e.classId === cls.id && !e.deletedByStudent).length || (cls as any).enrolledStudents?.length || 0}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Certification Note & Signatures */}
            <div className="pt-5 border-t border-zinc-200 dark:border-zinc-800 print:border-black">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 print:text-gray-700 italic text-center mb-6">
                This report certifies that the attendance records and session metrics above are extracted from verified ClassPulse check-in logs for academic accreditation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-center text-xs print:grid-cols-3">
                <div className="space-y-1">
                  <div className="border-b border-zinc-800 dark:border-zinc-200 print:border-black w-3/4 mx-auto pb-4" />
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">Dean</div>
                  <div className="text-[10px] text-zinc-400 print:text-gray-600">College Office</div>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-zinc-800 dark:border-zinc-200 print:border-black w-3/4 mx-auto pb-4" />
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">Quality Assurance</div>
                  <div className="text-[10px] text-zinc-400 print:text-gray-600">Accreditation Committee</div>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-zinc-800 dark:border-zinc-200 print:border-black w-3/4 mx-auto pb-4" />
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">Registrar</div>
                  <div className="text-[10px] text-zinc-400 print:text-gray-600">Academic Records</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="pt-3 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between shrink-0 print:hidden text-xs">
            <span className="text-zinc-400 text-[11px]">
              Ready for Accreditation Review
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

