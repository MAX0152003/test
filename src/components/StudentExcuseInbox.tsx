import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Inbox,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UploadCloud,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { LeaveRequest, ClassSession, UserProfile } from '../types';
import { EXCUSE_PRESET_TYPES } from '../lib/msuUtils';
import { speakText } from './AccessibilitySettings';
import { compressImage } from '../lib/imageUtils';

interface StudentExcuseInboxProps {
  excuseLetters: LeaveRequest[];
  classes: ClassSession[];
  userProfile: UserProfile;
  onAddExcuseLetter: (newReq: LeaveRequest) => void;
  onEditExcuseLetter: (updated: LeaveRequest) => void;
  onDeleteExcuseLetter: (id: string) => void;
  onPreviewImage: (data: { url: string; title?: string; subtitle?: string; fileName?: string }) => void;
  readAloudEnabled?: boolean;
}

export default function StudentExcuseInbox({
  excuseLetters,
  classes,
  userProfile,
  onAddExcuseLetter,
  onEditExcuseLetter,
  onDeleteExcuseLetter,
  onPreviewImage,
  readAloudEnabled = false
}: StudentExcuseInboxProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'valid' | 'invalid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<LeaveRequest | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formClassId, setFormClassId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formExcuseType, setFormExcuseType] = useState('Medical Illness');
  const [formReason, setFormReason] = useState('');
  const [formAttachment, setFormAttachment] = useState<string>('');
  const [formAttachmentName, setFormAttachmentName] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filter letters for this student
  const studentLetters = React.useMemo(() => {
    const studentId = userProfile.studentId || userProfile.id;
    return excuseLetters.filter(l => 
      l.studentId === studentId || 
      l.studentName === userProfile.name ||
      l.studentEmail === userProfile.email
    );
  }, [excuseLetters, userProfile]);

  const pendingCount = studentLetters.filter(l => l.status === 'pending').length;
  const validCount = studentLetters.filter(l => l.status === 'valid' || l.status === 'approved').length;
  const invalidCount = studentLetters.filter(l => l.status === 'invalid' || l.status === 'rejected').length;

  const filteredLetters = React.useMemo(() => {
    return studentLetters.filter(l => {
      if (filterTab === 'pending') return l.status === 'pending';
      if (filterTab === 'valid') return l.status === 'valid' || l.status === 'approved';
      if (filterTab === 'invalid') return l.status === 'invalid' || l.status === 'rejected';
      return true;
    }).filter(l => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.className || '').toLowerCase().includes(q) ||
        (l.classCode || '').toLowerCase().includes(q) ||
        (l.reason || '').toLowerCase().includes(q) ||
        (l.excuseType || '').toLowerCase().includes(q)
      );
    });
  }, [studentLetters, filterTab, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingLetter(null);
    setFormClassId(classes[0]?.id || '');
    const todayStr = new Date().toISOString().split('T')[0];
    setFormStartDate(todayStr);
    setFormEndDate(todayStr);
    setFormExcuseType('Medical Illness');
    setFormReason('');
    setFormAttachment('');
    setFormAttachmentName('');
    setFormError(null);
    setIsModalOpen(true);
    speakText("Opening excuse letter application form", readAloudEnabled);
  };

  const handleOpenEditModal = (letter: LeaveRequest) => {
    if (letter.status !== 'pending') {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Cannot edit a letter that has already been reviewed by faculty.", "warning");
      }
      return;
    }
    setEditingLetter(letter);
    setFormClassId(letter.classId || classes[0]?.id || '');
    setFormStartDate(letter.startDate);
    setFormEndDate(letter.endDate);
    setFormExcuseType(letter.excuseType || 'Medical Illness');
    setFormReason(letter.reason);
    setFormAttachment(letter.attachmentImg || letter.attachmentData || '');
    setFormAttachmentName(letter.attachmentName || '');
    setFormError(null);
    setIsModalOpen(true);
    speakText("Editing your pending excuse letter", readAloudEnabled);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { dataUrl, name } = await compressImage(file, 1280, 0.82);
      setFormAttachment(dataUrl);
      setFormAttachmentName(name);
      setFormError(null);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(`Document "${name}" attached successfully (under 500 KB quota).`, "success");
      }
      speakText(`Successfully attached document ${name}`, readAloudEnabled);
    } catch (err: any) {
      console.error("Attachment validation error:", err);
      const errMsg = err?.message || "Invalid attachment file format or size exceeds 500 KB limit.";
      setFormError(errMsg);
      setFormAttachment('');
      setFormAttachmentName('');
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(errMsg, "error");
      }
      speakText(errMsg, readAloudEnabled);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReason.trim()) {
      setFormError("Please provide a detailed reason or medical explanation.");
      return;
    }

    const selectedClass = classes.find(c => c.id === formClassId) || classes[0];

    if (editingLetter) {
      const updated: LeaveRequest = {
        ...editingLetter,
        classId: selectedClass?.id || formClassId,
        className: selectedClass ? `${selectedClass.code} - ${selectedClass.name}` : editingLetter.className,
        classCode: selectedClass?.code || editingLetter.classCode,
        facultyId: selectedClass?.facultyId,
        facultyName: selectedClass?.facultyName,
        startDate: formStartDate,
        endDate: formEndDate,
        excuseType: formExcuseType,
        reason: formReason.trim(),
        attachmentImg: formAttachment,
        attachmentData: formAttachment,
        attachmentName: formAttachmentName
      };
      onEditExcuseLetter(updated);
      speakText("Excuse letter successfully updated.", readAloudEnabled);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Excuse letter updated successfully!", "success");
      }
    } else {
      const newLetter: LeaveRequest = {
        id: 'excuse-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        studentId: userProfile.studentId || userProfile.id || '2023-10492',
        studentName: userProfile.name,
        studentEmail: userProfile.email,
        classId: selectedClass?.id || formClassId,
        className: selectedClass ? `${selectedClass.code} - ${selectedClass.name}` : 'General Class',
        classCode: selectedClass?.code || 'CS-101',
        facultyId: selectedClass?.facultyId,
        facultyName: selectedClass?.facultyName,
        startDate: formStartDate,
        endDate: formEndDate,
        excuseType: formExcuseType,
        reason: formReason.trim(),
        status: 'pending',
        appliedAt: new Date().toISOString(),
        attachmentImg: formAttachment,
        attachmentData: formAttachment,
        attachmentName: formAttachmentName
      };
      onAddExcuseLetter(newLetter);
      speakText("Excuse letter submitted for professor review.", readAloudEnabled);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("Excuse application filed successfully!", "success");
      }
    }

    setIsModalOpen(false);
  };

  const handleDeleteLetter = (id: string) => {
    onDeleteExcuseLetter(id);
    setDeleteConfirmId(null);
    speakText("Excuse letter application deleted.", readAloudEnabled);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast("Excuse letter application removed.", "info");
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-emerald-500" />
            Excuse Letters & Leaves Inbox
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Submit medical slips and official excuses for professor verification. Track real-time decision updates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>File New Excuse</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterTab === 'all'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-transparent shadow-md'
              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Total Filed</span>
          <span className="text-2xl font-black font-mono mt-1 block">{studentLetters.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('pending')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterTab === 'pending'
              ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1 block">{pendingCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('valid')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterTab === 'valid'
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Approved</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">{validCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('invalid')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterTab === 'invalid'
              ? 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400 shadow-sm'
              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Rejected</span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <span className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-1 block">{invalidCount}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search submitted excuses by course, topic, or reason..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* List of Excuse Letters */}
      <div className="space-y-4">
        {filteredLetters.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto text-xl">
              📭
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No excuse letters found</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {searchQuery ? 'No results matched your search keyword.' : 'You have not submitted any excuse letters for this category.'}
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-emerald-400 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              File an Excuse Letter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence initial={false}>
              {filteredLetters.map((letter) => {
                const isPending = letter.status === 'pending';
                const isValid = letter.status === 'valid' || letter.status === 'approved';
                const isInvalid = letter.status === 'invalid' || letter.status === 'rejected';

                return (
                  <motion.div
                    key={letter.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-950 border shadow-xs space-y-4 text-left relative overflow-hidden transition-all ${
                      isPending
                        ? 'border-amber-500/30 ring-1 ring-amber-500/10'
                        : isValid
                        ? 'border-emerald-500/20'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {/* Status Ribbon */}
                    <div
                      className={`absolute top-0 left-0 w-1.5 h-full ${
                        isPending ? 'bg-amber-500' : isValid ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pl-1">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                            {letter.className || letter.classCode || 'Course Leave'}
                          </span>
                          {letter.excuseType && (
                            <span className="text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              🏷️ {letter.excuseType}
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-zinc-400 py-0.5 px-2 bg-zinc-100 dark:bg-zinc-900 rounded-full">
                            Ref: {letter.id.slice(0, 12)}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Leave Window:{' '}
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            {letter.startDate}
                          </span>{' '}
                          to{' '}
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            {letter.endDate}
                          </span>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2 self-start">
                        <span
                          className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                            isValid
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : isInvalid
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isValid ? 'bg-emerald-500' : isInvalid ? 'bg-red-500' : 'bg-amber-500 animate-ping'
                            }`}
                          />
                          {isValid ? 'Approved (Excused)' : isInvalid ? 'Rejected' : 'Pending Review'}
                        </span>
                      </div>
                    </div>

                    {/* Excuse Reason Card */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 pl-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Reason & Justification
                      </p>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 italic font-sans leading-relaxed">
                        "{letter.reason}"
                      </p>

                      {/* Attachment preview button */}
                      {(letter.attachmentImg || letter.attachmentData) && (
                        <div
                          onClick={() => {
                            const imgUrl = letter.attachmentImg || letter.attachmentData || '';
                            onPreviewImage({
                              url: imgUrl,
                              title: letter.excuseType || 'Medical / Excuse Certificate',
                              subtitle: `${letter.className} • Window: ${letter.startDate} - ${letter.endDate}`,
                              fileName: letter.attachmentName || `excuse_slip_${letter.id}.jpg`
                            });
                          }}
                          className="flex items-center gap-2.5 mt-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:border-emerald-500/40 transition-all w-fit max-w-full"
                        >
                          <img
                            src={letter.attachmentImg || letter.attachmentData}
                            alt="Attachment"
                            className="w-9 h-9 object-cover rounded-lg border border-emerald-500/20"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                              📎 {letter.attachmentName || 'Supporting Certificate'}
                            </span>
                            <span className="text-[8px] text-zinc-400">Click to view full image</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Decision info or action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-900 text-xs">
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                        {isPending ? (
                          <span className="text-amber-500 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Awaiting professor evaluation
                          </span>
                        ) : isValid ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Attendance record has been converted to EXCUSED
                          </span>
                        ) : (
                          <span className="text-red-500 font-bold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Marked as unexcused by faculty
                          </span>
                        )}
                      </div>

                      {/* Pending: Student can edit or delete! */}
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(letter)}
                            className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Edit Letter</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(letter.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-center">
                Delete Excuse Letter?
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center leading-relaxed">
                Are you sure you want to withdraw this pending excuse application? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLetter(deleteConfirmId)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-7 text-left space-y-5 overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                    {editingLetter ? 'Edit Excuse Letter' : 'File Official Excuse Application'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Submit verified grounds for missed attendance to faculty.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Target Course Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Target Course / Subject
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id} className="dark:bg-zinc-950">
                      {cls.code} - {cls.name} (Prof. {cls.facultyName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Excuse Preset Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Excuse Classification
                </label>
                <select
                  value={formExcuseType}
                  onChange={(e) => setFormExcuseType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {EXCUSE_PRESET_TYPES.map(preset => (
                    <option key={preset} value={preset} className="dark:bg-zinc-950">
                      {preset}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Window */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Detailed Reason */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Detailed Explanation / Reason
                </label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Explain the circumstance (e.g., severe influenza, medical appointment, official university event representation)..."
                  required
                  className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-sans focus:ring-1 focus:ring-emerald-500 outline-none leading-relaxed"
                />
              </div>

              {/* Attachment File / Image Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Supporting Document / Medical Slip (Optional)
                </label>
                <div className="p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-center space-y-2">
                  {formAttachment ? (
                    <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-500/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={formAttachment}
                          alt="preview"
                          className="w-10 h-10 object-cover rounded-lg border"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 text-left">
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                            {formAttachmentName || 'Supporting Slip Attached'}
                          </span>
                          <span className="text-[9px] text-zinc-400">Compressed & ready to send</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormAttachment('');
                          setFormAttachmentName('');
                        }}
                        className="text-xs font-bold text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <UploadCloud className="w-7 h-7 text-zinc-400 mx-auto mb-1" />
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                        Upload Medical Certificate or Proof
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        PNG, JPG, or WebP up to 5MB (auto-compressed)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  {editingLetter ? 'Save Changes' : 'Submit Excuse Letter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
