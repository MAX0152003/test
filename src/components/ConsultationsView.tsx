import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  Clock,
  User,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Video,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Check,
  X,
  MessageSquare,
  Calendar as CalendarIcon,
  Sparkles,
  BookOpen,
  Send,
  MoreVertical,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { ConsultationBooking, ClassSession, UserProfile, Role } from '../types';
import { speakText } from './AccessibilitySettings';

interface ConsultationsViewProps {
  role: Role;
  userProfile: UserProfile;
  classes: ClassSession[];
  bookings: ConsultationBooking[];
  onAddBooking: (booking: ConsultationBooking) => void;
  onUpdateBookingStatus: (id: string, status: 'confirmed' | 'declined' | 'completed' | 'cancelled', notes?: string) => void;
  onDeleteBooking: (id: string) => void;
  onOpenChatWithUser?: (contactId: string) => void;
  readAloudEnabled?: boolean;
}

const TIME_SLOTS = [
  '08:00 AM - 08:30 AM',
  '08:30 AM - 09:00 AM',
  '09:00 AM - 09:30 AM',
  '09:30 AM - 10:00 AM',
  '10:00 AM - 10:30 AM',
  '10:30 AM - 11:00 AM',
  '01:00 PM - 01:30 PM',
  '01:30 PM - 02:00 PM',
  '02:00 PM - 02:30 PM',
  '02:30 PM - 03:00 PM',
  '03:00 PM - 03:30 PM',
  '03:30 PM - 04:00 PM',
  '04:00 PM - 04:30 PM',
  '04:30 PM - 05:00 PM',
];

const CONSULTATION_TOPICS = [
  'Academic Performance & Grade Inquiry',
  'Thesis / Capstone Project Mentorship',
  'Coursework & Lab Assignment Guidance',
  'Exam & Quiz Review Consultation',
  'Career & Specialization Advisory',
  'Absence & Excuse Clarification',
  'General Subject Inquiry'
];

export default function ConsultationsView({
  role,
  userProfile,
  classes,
  bookings,
  onAddBooking,
  onUpdateBookingStatus,
  onDeleteBooking,
  onOpenChatWithUser,
  readAloudEnabled = false
}: ConsultationsViewProps) {
  const isFaculty = role === 'faculty';
  const isStudent = role === 'student';

  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<ConsultationBooking | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  // Calendar View State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Booking Form State
  const [formFacultyId, setFormFacultyId] = useState('');
  const [formFacultyName, setFormFacultyName] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formDate, setFormDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [formTimeSlot, setFormTimeSlot] = useState(TIME_SLOTS[4]); // 10:00 AM
  const [formTopic, setFormTopic] = useState(CONSULTATION_TOPICS[0]);
  const [formCustomTopic, setFormCustomTopic] = useState('');
  const [formMode, setFormMode] = useState<'in-person' | 'online'>('in-person');
  const [formLocation, setFormLocation] = useState('Faculty Consultation Room 302, CAS Bldg');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Available Faculty list derived from classes
  const availableFaculty = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; department: string }>();
    classes.forEach(c => {
      const facId = c.facultyId || `fac-${c.facultyName?.toLowerCase().replace(/\s+/g, '-') || 'general'}`;
      const facName = c.facultyName || 'Faculty Member';
      if (!map.has(facId)) {
        map.set(facId, {
          id: facId,
          name: facName,
          email: `${facName.toLowerCase().replace(/[^a-z]/g, '.')}@msu.edu.ph`,
          department: c.buildingCluster || 'College of Computer Studies'
        });
      }
    });
    return Array.from(map.values());
  }, [classes]);

  // Set default faculty for booking
  React.useEffect(() => {
    if (availableFaculty.length > 0 && !formFacultyId) {
      setFormFacultyId(availableFaculty[0].id);
      setFormFacultyName(availableFaculty[0].name);
    }
  }, [availableFaculty, formFacultyId]);

  // Bookings filtered for the current user
  const relevantBookings = useMemo(() => {
    return bookings.filter(b => {
      if (isFaculty) {
        return (
          b.facultyId === userProfile.facultyId ||
          b.facultyId === userProfile.id ||
          b.facultyName.toLowerCase() === userProfile.name.toLowerCase()
        );
      } else {
        return (
          b.studentId === userProfile.studentId ||
          b.studentId === userProfile.id ||
          b.studentEmail === userProfile.email ||
          b.studentName.toLowerCase() === userProfile.name.toLowerCase()
        );
      }
    });
  }, [bookings, isFaculty, userProfile]);

  // Status counts
  const pendingCount = relevantBookings.filter(b => b.status === 'pending').length;
  const confirmedCount = relevantBookings.filter(b => b.status === 'confirmed').length;
  const completedCount = relevantBookings.filter(b => b.status === 'completed').length;

  // Filtered list
  const filteredBookings = useMemo(() => {
    return relevantBookings.filter(b => {
      if (filterStatus === 'pending') return b.status === 'pending';
      if (filterStatus === 'confirmed') return b.status === 'confirmed';
      if (filterStatus === 'completed') return b.status === 'completed';
      return true;
    }).filter(b => {
      if (selectedDateFilter && b.date !== selectedDateFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.studentName.toLowerCase().includes(q) ||
        b.facultyName.toLowerCase().includes(q) ||
        b.topic.toLowerCase().includes(q) ||
        (b.classCode || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q)
      );
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [relevantBookings, filterStatus, selectedDateFilter, searchQuery]);

  // Calendar math
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startOffset = firstDay.getDay(); // 0 for Sunday
    const totalDaysInMonth = lastDay.getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; hasBookings: number; hasClasses: number }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: dayNum, isCurrentMonth: false, hasBookings: 0, hasClasses: 0 });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayBookings = relevantBookings.filter(b => b.date === dateStr && b.status !== 'cancelled' && b.status !== 'declined').length;
      
      // Calculate classes for this day
      const dayOfWeek = new Date(year, month, i).getDay();
      const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayLabel = dayMap[dayOfWeek];
      const classCount = classes.filter(c => (c.days || []).includes(dayLabel)).length;

      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        hasBookings: dayBookings,
        hasClasses: classCount
      });
    }

    // Trailing padding to make 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: i, isCurrentMonth: false, hasBookings: 0, hasClasses: 0 });
    }

    return days;
  }, [currentCalendarDate, relevantBookings, classes]);

  const handleOpenBookingModal = () => {
    setFormError(null);
    setFormNotes('');
    setIsBookModalOpen(true);
    speakText("Opening consultation booking scheduler", readAloudEnabled);
  };

  const handleCreateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedFaculty = availableFaculty.find(f => f.id === formFacultyId);
    const selectedClass = classes.find(c => c.id === formClassId);
    const finalTopic = formTopic === 'Other Custom Topic' ? formCustomTopic.trim() || 'General Consultation' : formTopic;

    if (!formDate) {
      setFormError("Please choose a valid consultation date.");
      return;
    }

    const [startTime, endTime] = formTimeSlot.split(' - ');

    const newBooking: ConsultationBooking = {
      id: 'book-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      studentId: userProfile.studentId || userProfile.id || '2023-10492',
      studentName: userProfile.name,
      studentEmail: userProfile.email,
      facultyId: formFacultyId || selectedFaculty?.id || 'fac-1',
      facultyName: selectedFaculty?.name || formFacultyName || 'Professor',
      classId: selectedClass?.id,
      classCode: selectedClass?.code,
      date: formDate,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      topic: finalTopic,
      notes: formNotes.trim(),
      mode: formMode,
      location: formMode === 'in-person' ? formLocation : 'Google Meet (Link will be provided upon confirmation)',
      status: 'pending',
      createdAt: Date.now()
    };

    onAddBooking(newBooking);
    setIsBookModalOpen(false);
    speakText("Consultation request submitted to faculty calendar.", readAloudEnabled);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast("Consultation appointment request sent!", "success");
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-emerald-500" />
            {isFaculty ? 'Faculty Consultation Calendar & Bookings' : 'Book Faculty Consultations'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isFaculty
              ? 'Review, schedule, and approve 1-on-1 student consultation appointments integrated with your teaching timetable.'
              : 'Schedule dedicated academic mentoring, thesis advisement, and grade inquiry slots with your professors.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View Switcher */}
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              All Appointments ({relevantBookings.length})
            </button>
          </div>

          {isStudent && (
            <button
              type="button"
              onClick={handleOpenBookingModal}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Book Appointment</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => { setFilterStatus('all'); setSelectedDateFilter(null); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'all' && !selectedDateFilter
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-transparent shadow-md'
              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Total Consultations</span>
          <span className="text-2xl font-black font-mono mt-1 block">{relevantBookings.length}</span>
        </button>

        <button
          type="button"
          onClick={() => { setFilterStatus('pending'); setSelectedDateFilter(null); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'pending'
              ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Review</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1 block">{pendingCount}</span>
        </button>

        <button
          type="button"
          onClick={() => { setFilterStatus('confirmed'); setSelectedDateFilter(null); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'confirmed'
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Confirmed Slots</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">{confirmedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => { setFilterStatus('completed'); setSelectedDateFilter(null); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'completed'
              ? 'bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Completed</span>
            <span className="w-2 h-2 rounded-full bg-sky-500" />
          </div>
          <span className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400 mt-1 block">{completedCount}</span>
        </button>
      </div>

      {/* CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Monthly Calendar Grid */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                  {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                  }}
                  className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentCalendarDate(new Date())}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                  }}
                  className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, idx) => {
                const isSelected = selectedDateFilter === day.dateStr;
                const isToday = day.dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (day.isCurrentMonth) {
                        setSelectedDateFilter(isSelected ? null : day.dateStr);
                      }
                    }}
                    className={`min-h-[70px] sm:min-h-[85px] p-2 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      !day.isCurrentMonth
                        ? 'opacity-30 border-transparent bg-zinc-50/50 dark:bg-zinc-900/20'
                        : isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                        : isToday
                        ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10'
                        : 'border-zinc-200/70 dark:border-zinc-850 bg-zinc-50/70 dark:bg-zinc-900/40 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-black ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center'
                            : day.isCurrentMonth
                            ? 'text-zinc-800 dark:text-zinc-200'
                            : 'text-zinc-400'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                    </div>

                    {/* Day Badges */}
                    <div className="space-y-1 mt-1">
                      {day.hasBookings > 0 && (
                        <span className="block text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500 text-black font-mono truncate">
                          {day.hasBookings} {day.hasBookings === 1 ? 'Booking' : 'Bookings'}
                        </span>
                      )}
                      {day.hasClasses > 0 && (
                        <span className="hidden sm:block text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 truncate">
                          {day.hasClasses} classes
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDateFilter && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Filtering appointments for: <strong>{selectedDateFilter}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(null)}
                  className="text-xs font-black text-emerald-600 dark:text-emerald-400 underline cursor-pointer"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>

          {/* Day Agenda & Selected Day Details */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  {selectedDateFilter ? `Agenda for ${selectedDateFilter}` : 'Upcoming Consultations'}
                </h3>
                <span className="text-[10px] font-mono font-bold text-zinc-400">
                  {filteredBookings.length} Scheduled
                </span>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <p className="text-xs font-medium">No consultations scheduled for this window.</p>
                  {isStudent && (
                    <button
                      type="button"
                      onClick={handleOpenBookingModal}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold uppercase inline-block cursor-pointer hover:bg-emerald-400"
                    >
                      Book Slot
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredBookings.map(b => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBookingDetail(b)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 relative overflow-hidden ${
                        b.status === 'confirmed'
                          ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500'
                          : b.status === 'pending'
                          ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                      }`}
                    >
                      {/* Left accent */}
                      <div
                        className={`absolute top-0 left-0 w-1 h-full ${
                          b.status === 'confirmed' ? 'bg-emerald-500' : b.status === 'pending' ? 'bg-amber-500' : 'bg-zinc-400'
                        }`}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                          {isFaculty ? b.studentName : `Prof. ${b.facultyName}`}
                        </span>
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full font-mono ${
                            b.status === 'confirmed'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : b.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium space-y-1">
                        <p className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-bold">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          {b.date} • {b.startTime} - {b.endTime}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          🏷️ {b.topic}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-900">
                        <span className="flex items-center gap-1">
                          {b.mode === 'in-person' ? <MapPin className="w-3 h-3 text-emerald-500" /> : <Video className="w-3 h-3 text-sky-500" />}
                          {b.mode === 'in-person' ? 'Office Consultation' : 'Online Session'}
                        </span>
                        <span className="text-emerald-500 font-bold hover:underline">View details →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appointments by name, topic, or course..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBookings.map(b => (
              <div
                key={b.id}
                className="p-5 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5 text-left relative overflow-hidden"
              >
                <div
                  className={`absolute top-0 left-0 w-1.5 h-full ${
                    b.status === 'confirmed' ? 'bg-emerald-500' : b.status === 'pending' ? 'bg-amber-500' : 'bg-zinc-400'
                  }`}
                />

                <div className="flex items-start justify-between gap-3 pl-1">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                        {isFaculty ? b.studentName : `Prof. ${b.facultyName}`}
                      </span>
                      {b.classCode && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {b.classCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                      {isFaculty ? b.studentEmail : `${b.facultyName} • Academic Department`}
                    </p>
                  </div>

                  <span
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full font-mono ${
                      b.status === 'confirmed'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : b.status === 'pending'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-850 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      {b.date} ({b.startTime} - {b.endTime})
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500">
                      {b.mode === 'in-person' ? '📍 In-Person' : '💻 Online Meet'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Topic: {b.topic}
                  </p>
                  {b.notes && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                      "{b.notes}"
                    </p>
                  )}
                  {b.location && (
                    <p className="text-[10px] text-zinc-400 font-mono">
                      Location: {b.location}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-900">
                  {onOpenChatWithUser && (
                    <button
                      type="button"
                      onClick={() => onOpenChatWithUser(isFaculty ? b.studentId : b.facultyId)}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message {isFaculty ? 'Student' : 'Professor'}
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {isFaculty && b.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateBookingStatus(b.id, 'confirmed');
                            speakText(`Confirmed consultation booking with ${b.studentName}`, readAloudEnabled);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateBookingStatus(b.id, 'declined');
                            speakText(`Declined consultation request from ${b.studentName}`, readAloudEnabled);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white text-xs font-bold uppercase cursor-pointer"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {isFaculty && b.status === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateBookingStatus(b.id, 'completed');
                          speakText("Marked consultation appointment as completed.", readAloudEnabled);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold uppercase cursor-pointer"
                      >
                        Mark Completed
                      </button>
                    )}

                    {isStudent && b.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteBooking(b.id);
                          speakText("Consultation request cancelled.", readAloudEnabled);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white text-xs font-bold uppercase cursor-pointer"
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBookingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                Consultation Appointment Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBookingDetail(null)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Student:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedBookingDetail.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Professor:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedBookingDetail.facultyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Date & Slot:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedBookingDetail.date} ({selectedBookingDetail.startTime} - {selectedBookingDetail.endTime})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Mode:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedBookingDetail.mode === 'in-person' ? 'In-Person Office' : 'Online Session'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Location:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{selectedBookingDetail.location || 'Faculty Room'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Topic:</span>
                <p className="font-bold text-zinc-800 dark:text-zinc-200">{selectedBookingDetail.topic}</p>
              </div>

              {selectedBookingDetail.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Student Notes:</span>
                  <p className="italic text-zinc-600 dark:text-zinc-300">"{selectedBookingDetail.notes}"</p>
                </div>
              )}
            </div>

            {/* Quick Actions in detail modal */}
            {isFaculty && selectedBookingDetail.status === 'pending' && (
              <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateBookingStatus(selectedBookingDetail.id, 'confirmed');
                    setSelectedBookingDetail(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase cursor-pointer"
                >
                  Confirm Appointment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateBookingStatus(selectedBookingDetail.id, 'declined');
                    setSelectedBookingDetail(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white text-xs font-bold uppercase cursor-pointer"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Book Appointment Modal (Student) */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 text-left space-y-5 overflow-hidden my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                    Book Professor Consultation
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Request an academic consultation slot on the faculty shared calendar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBookingSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Select Faculty */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Target Professor / Adviser
                </label>
                <select
                  value={formFacultyId}
                  onChange={(e) => {
                    setFormFacultyId(e.target.value);
                    const matched = availableFaculty.find(f => f.id === e.target.value);
                    if (matched) setFormFacultyName(matched.name);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {availableFaculty.map(fac => (
                    <option key={fac.id} value={fac.id} className="dark:bg-zinc-950">
                      Prof. {fac.name} ({fac.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Associated Course */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Associated Enrolled Course (Optional)
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- General / Thesis / Career Consultation --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id} className="dark:bg-zinc-950">
                      {cls.code} - {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                    Consultation Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                    Available Time Slot
                  </label>
                  <select
                    value={formTimeSlot}
                    onChange={(e) => setFormTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot} className="dark:bg-zinc-950">
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Consultation Topic */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Consultation Topic / Inquiry Purpose
                </label>
                <select
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {CONSULTATION_TOPICS.map(topic => (
                    <option key={topic} value={topic} className="dark:bg-zinc-950">
                      {topic}
                    </option>
                  ))}
                  <option value="Other Custom Topic" className="dark:bg-zinc-950">
                    -- Other Custom Concern --
                  </option>
                </select>

                {formTopic === 'Other Custom Topic' && (
                  <input
                    type="text"
                    value={formCustomTopic}
                    onChange={(e) => setFormCustomTopic(e.target.value)}
                    placeholder="Enter custom consultation subject..."
                    className="w-full mt-2 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                )}
              </div>

              {/* Mode & Location */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Session Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode('in-person');
                      setFormLocation('Faculty Consultation Room 302, CAS Bldg');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      formMode === 'in-person'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    In-Person Office
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode('online');
                      setFormLocation('Online Google Meet');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      formMode === 'online'
                        ? 'bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    Virtual / Online
                  </button>
                </div>
              </div>

              {/* Student Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Specific Questions or Context for Professor (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Outline key discussion points or questions to help the professor prepare..."
                  className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-sans focus:ring-1 focus:ring-emerald-500 outline-none leading-relaxed"
                />
              </div>

              {/* Submit */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
