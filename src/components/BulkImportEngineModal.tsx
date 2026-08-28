import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  X, 
  Download, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Check, 
  ArrowRight,
  Database,
  Users,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { UserProfile, ClassSession } from '../types';

interface BulkImportEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingUsers?: UserProfile[] | any[];
  existingClasses?: ClassSession[];
  onCommitImport?: (data: {
    entityType: 'students' | 'faculty' | 'classes' | 'enrollments';
    items: any[];
  }) => Promise<void> | void;
  onImport?: (target: string, validRows: any[]) => Promise<void> | void;
}

interface ValidationRow {
  rowNumber: number;
  data: Record<string, string>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const BulkImportEngineModal: React.FC<BulkImportEngineModalProps> = ({
  isOpen,
  onClose,
  existingUsers = [],
  existingClasses = [],
  onCommitImport,
  onImport,
}) => {
  const safeUsers = Array.isArray(existingUsers) ? existingUsers : [];
  const safeClasses = Array.isArray(existingClasses) ? existingClasses : [];

  const [entityType, setEntityType] = useState<'students' | 'faculty' | 'classes' | 'enrollments'>('students');
  const [csvText, setCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ValidationRow[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const sampleCSVTemplates = {
    students: `studentId,name,email,department,yearLevel,section
2024-0001,Althea Ramirez,althea.ramirez@university.edu,College of Computer Studies,3rd Year,BSCS-3A
2024-0002,Marco Polo,marco.polo@university.edu,College of Computer Studies,3rd Year,BSCS-3A
2024-0003,Elena Rostova,elena.rostova@university.edu,College of Engineering,2nd Year,BSCE-2B`,
    faculty: `facultyId,name,email,department,room,consultationHours
FAC-101,Dr. Alan Turing,alan.turing@university.edu,College of Computer Studies,Room 402,Mon/Wed 1:00 PM - 3:00 PM
FAC-102,Prof. Ada Lovelace,ada.lovelace@university.edu,College of Computer Studies,Room 405,Tue/Thu 10:00 AM - 12:00 PM`,
    classes: `code,name,room,startTime,days,instructorName,instructorId
CS301,Algorithms & Complexity,Lab 3,09:00 AM - 10:30 AM,Mon/Wed/Fri,Dr. Alan Turing,FAC-101
CS302,Database Systems,Room 402,01:00 PM - 02:30 PM,Tue/Thu,Prof. Ada Lovelace,FAC-102`,
    enrollments: `studentId,classCode
2024-0001,CS301
2024-0001,CS302
2024-0002,CS301`
  };

  const handleDownloadSample = () => {
    const content = sampleCSVTemplates[entityType];
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `template_${entityType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseAndValidateCSV = (text: string) => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: ValidationRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowData[h] = values[idx] || '';
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      if (entityType === 'students') {
        const studentId = rowData.studentId;
        const email = rowData.email;
        const name = rowData.name;

        if (!studentId) errors.push('Missing studentId');
        if (!name) errors.push('Missing name');
        if (!email) errors.push('Missing email');
        else if (!email.includes('@')) errors.push('Invalid email syntax');

        // Check if studentId already exists
        const exists = safeUsers.some(u => (u.studentId || u.uid) === studentId);
        if (exists) warnings.push('Student ID already in registry (will update info)');

        // Check if email already registered with other user
        const emailExists = safeUsers.some(u => (u.email || '').toLowerCase() === (email || '').toLowerCase() && (u.studentId || u.uid) !== studentId);
        if (emailExists) warnings.push('Email already belongs to another user profile');
      } else if (entityType === 'faculty') {
        const facultyId = rowData.facultyId;
        const email = rowData.email;
        const name = rowData.name;

        if (!facultyId) errors.push('Missing facultyId');
        if (!name) errors.push('Missing name');
        if (!email) errors.push('Missing email');
        else if (!email.includes('@')) errors.push('Invalid email format');
      } else if (entityType === 'classes') {
        const code = rowData.code;
        const name = rowData.name;
        if (!code) errors.push('Missing course code');
        if (!name) errors.push('Missing course title');
      } else if (entityType === 'enrollments') {
        const studentId = rowData.studentId;
        const classCode = rowData.classCode;
        if (!studentId) errors.push('Missing studentId');
        if (!classCode) errors.push('Missing classCode');
      }

      rows.push({
        rowNumber: i,
        data: rowData,
        isValid: errors.length === 0,
        errors,
        warnings,
      });
    }

    setParsedRows(rows);
    setStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseAndValidateCSV(text);
    };
    reader.readAsText(file);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

  const handleCommit = async () => {
    const validItems = parsedRows.filter(r => r.isValid).map(r => r.data);
    if (validItems.length === 0) return;

    try {
      setIsProcessing(true);
      if (onImport) {
        await onImport(entityType, validItems);
      } else if (onCommitImport) {
        await onCommitImport({
          entityType,
          items: validItems,
        });
      }
      setStep('success');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCsvText('');
    setFileName('');
    setParsedRows([]);
    setStep('upload');
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
          className="relative w-full max-w-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden z-10 text-left space-y-5 my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-850 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <span>SIS & CSV Bulk Ingestion Engine</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Schema Pre-check
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Bulk onboard students, faculty, course schedules, and enrollments with validation.
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

          {step === 'upload' && (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Entity Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Select Ingestion Target Entity
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntityType('students')}
                    className={`p-3 rounded-2xl border text-left transition-all text-xs cursor-pointer flex flex-col justify-between gap-2 ${
                      entityType === 'students'
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-blue-500" />
                    <span>Students Directory</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntityType('faculty')}
                    className={`p-3 rounded-2xl border text-left transition-all text-xs cursor-pointer flex flex-col justify-between gap-2 ${
                      entityType === 'faculty'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span>Faculty Roster</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntityType('classes')}
                    className={`p-3 rounded-2xl border text-left transition-all text-xs cursor-pointer flex flex-col justify-between gap-2 ${
                      entityType === 'classes'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span>Course Sections</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntityType('enrollments')}
                    className={`p-3 rounded-2xl border text-left transition-all text-xs cursor-pointer flex flex-col justify-between gap-2 ${
                      entityType === 'enrollments'
                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 font-bold'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Database className="w-4 h-4 text-purple-500" />
                    <span>Batch Enrollments</span>
                  </button>
                </div>
              </div>

              {/* Sample Download Bar */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Need the standard CSV structure for {entityType}?</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer transition-all bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-emerald-500/5 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                  Click to browse or drop CSV file here
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Supports comma-delimited (.csv) files up to 5,000 records.
                </p>
              </div>

              {/* Manual Paste Text Alternative */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Or Paste Raw CSV Data Directly:
                </label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={sampleCSVTemplates[entityType]}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {csvText.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => parseAndValidateCSV(csvText)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Validate & Preview Data ({entityType})
                </button>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Validation Summary Strip */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Rows</span>
                  <span className="text-lg font-black text-zinc-900 dark:text-zinc-100 font-mono">{parsedRows.length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Ready to Commit</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{validCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-center">
                  <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 block">Validation Errors</span>
                  <span className="text-lg font-black text-red-600 dark:text-red-400 font-mono">{errorCount}</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800 text-[11px]">
                      <tr>
                        <th className="p-2.5 pl-4">#</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Primary Identifier</th>
                        <th className="p-2.5">Name / Title</th>
                        <th className="p-2.5">Details</th>
                        <th className="p-2.5 pr-4">Validation Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                      {parsedRows.map((row) => (
                        <tr 
                          key={row.rowNumber} 
                          className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${
                            !row.isValid ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="p-2.5 pl-4 font-mono text-zinc-400">{row.rowNumber}</td>
                          <td className="p-2.5">
                            {row.isValid ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1 w-fit">
                                <AlertCircle className="w-3 h-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {row.data.studentId || row.data.facultyId || row.data.code || row.data.classCode || '—'}
                          </td>
                          <td className="p-2.5 font-semibold text-zinc-800 dark:text-zinc-200">
                            {row.data.name || row.data.instructorName || '—'}
                          </td>
                          <td className="p-2.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                            {row.data.department || row.data.email || row.data.room || '—'}
                          </td>
                          <td className="p-2.5 pr-4 text-[10px]">
                            {row.errors.length > 0 && (
                              <div className="text-red-500 font-bold">{row.errors.join(', ')}</div>
                            )}
                            {row.warnings.length > 0 && (
                              <div className="text-amber-500 font-medium">{row.warnings.join(', ')}</div>
                            )}
                            {row.errors.length === 0 && row.warnings.length === 0 && (
                              <div className="text-emerald-500 font-medium">Ready for import</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-850">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Choose Different File
                </button>

                <button
                  type="button"
                  disabled={validCount === 0 || isProcessing}
                  onClick={handleCommit}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Commit {validCount} {entityType} to Registry</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl animate-bounce">
                🎉
              </div>
              <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                Bulk Ingestion Completed Successfully
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                {validCount} {entityType} records have been validated and persisted into the live institutional database and security access roles.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Return to Directory
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
