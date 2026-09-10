import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Filter, 
  Building2, 
  GraduationCap, 
  LayoutDashboard, 
  CalendarDays, 
  Scan, 
  MessageSquare, 
  Bell, 
  HelpCircle, 
  Settings, 
  UserCircle, 
  Users, 
  FileText, 
  Clock, 
  Trash2, 
  History, 
  Sparkles, 
  ArrowRight 
} from 'lucide-react';
import { ClassSession, FacultyStatus, UserProfile, AccessibilityConfig } from '../types';
import { speakText } from './AccessibilitySettings';

interface CommandPaletteProps {
  user: UserProfile | null;
  classes: ClassSession[];
  facultyStatuses: FacultyStatus[];
  accessibility: AccessibilityConfig;
  onNavigate: (screenId: string) => void;
  isMobileBarVisible: boolean;
  setIsMobileBarVisible: (visible: boolean) => void;
  isSearchOpen?: boolean;
  setIsSearchOpen?: (open: boolean) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  user,
  classes,
  facultyStatuses,
  accessibility,
  onNavigate,
  setIsMobileBarVisible,
  isSearchOpen: controlledIsSearchOpen,
  setIsSearchOpen: controlledSetIsSearchOpen
}) => {
  const [internalIsSearchOpen, setInternalIsSearchOpen] = React.useState(false);
  const isSearchOpen = controlledIsSearchOpen !== undefined ? controlledIsSearchOpen : internalIsSearchOpen;
  const setIsSearchOpen = controlledSetIsSearchOpen || setInternalIsSearchOpen;
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchDeptOnly, setSearchDeptOnly] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('cp_search_dept_only') === 'true';
    } catch {
      return false;
    }
  });

  const [recentSearches, setRecentSearches] = React.useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('cp_recent_searches');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['CS-101', 'Dr. Ahmad Khan', 'Room 303', 'Schedule'];
  });

  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  const handleAddRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== clean.toLowerCase());
      const next = [clean, ...filtered].slice(0, 6);
      try {
        localStorage.setItem('cp_recent_searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleRemoveRecentSearch = (term: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches(prev => {
      const next = prev.filter(item => item !== term);
      try {
        localStorage.setItem('cp_recent_searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleClearAllRecentSearches = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.setItem('cp_recent_searches', JSON.stringify([]));
    } catch {}
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
        setIsMobileBarVisible(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => {
          const next = !prev;
          setIsMobileBarVisible(!next);
          return next;
        });
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsMobileBarVisible(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setIsMobileBarVisible]);

  const userDeptName = user?.department || (user?.role === 'student' ? 'Information Technology' : user?.role === 'faculty' ? 'Computer Science' : 'Academic Registrar');
  const deptShort = userDeptName.split(' ')[0];
  const deptWords = userDeptName.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Match helper for Department filtering
  const isDeptMatch = (cls: ClassSession) => {
    if (!searchDeptOnly) return true;
    const code = (cls.code || '').toLowerCase();
    const name = (cls.name || '').toLowerCase();
    const faculty = (cls.facultyName || '').toLowerCase();
    const cluster = (cls.buildingCluster || '').toLowerCase();

    if (deptWords.some(w => code.includes(w) || name.includes(w) || faculty.includes(w) || cluster.includes(w))) return true;
    
    // Check standard prefix matching for CS, IT, CICS, CCS, ENG, MATH
    const deptNorm = userDeptName.toLowerCase();
    if (deptNorm.includes('technology') || deptNorm.includes('it')) {
      if (code.startsWith('it') || code.startsWith('ite') || code.startsWith('cs') || code.startsWith('cc')) return true;
    } else if (deptNorm.includes('computer') || deptNorm.includes('cs')) {
      if (code.startsWith('cs') || code.startsWith('cc') || code.startsWith('it')) return true;
    }
    return false;
  };

  const isFacultyDeptMatch = (fac: FacultyStatus) => {
    if (!searchDeptOnly) return true;
    const name = (fac.name || '').toLowerCase();
    const dept = ((fac as any).department || '').toLowerCase();
    const deptNorm = userDeptName.toLowerCase();
    if (dept && (dept.includes(deptNorm) || deptNorm.includes(dept))) return true;
    if (deptWords.some(w => name.includes(w) || dept.includes(w))) return true;
    // Match if faculty teaches any course in the user's department
    return classes.some(c => (c.facultyId === fac.id || (c.facultyName && c.facultyName.toLowerCase() === name)) && isDeptMatch(c));
  };

  const navMatches = [
    { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & status cards' },
    { id: 'schedule', title: 'Class Schedule', icon: CalendarDays, desc: 'Enrolled subjects & timetable' },
    { id: 'attendance', title: 'Attendance Scan', icon: Scan, desc: 'Scan QR check-in & logs' },
    { id: 'inbox', title: user?.role === 'student' ? 'Excuse Letters & Messages' : 'Excuse Inbox & Chat', icon: MessageSquare, desc: 'Official excuse letters' },
    { id: 'notifications', title: 'Notifications', icon: Bell, desc: 'System alerts & announcements' },
    { id: 'help', title: 'Help Center', icon: HelpCircle, desc: 'Guides & student FAQs' },
    { id: 'settings', title: 'Settings', icon: Settings, desc: 'Theme, sound & preferences' },
    { id: 'profile', title: 'My Profile', icon: UserCircle, desc: 'User credentials & department' }
  ].filter(item => !searchQuery.trim() || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.desc.toLowerCase().includes(searchQuery.toLowerCase()));

  const matchedClasses = classes.filter(cls => {
    const matchesDept = isDeptMatch(cls);
    if (!matchesDept) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cls.code.toLowerCase().includes(q) ||
      cls.name.toLowerCase().includes(q) ||
      (cls.facultyName && cls.facultyName.toLowerCase().includes(q)) ||
      (cls.room && cls.room.toLowerCase().includes(q)) ||
      (cls.days && cls.days.some(d => d.toLowerCase().includes(q)))
    );
  });

  const matchedFaculty = facultyStatuses.filter(fac => {
    const matchesDept = isFacultyDeptMatch(fac);
    if (!matchesDept) return false;
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      fac.name.toLowerCase().includes(q) ||
      (fac.room && fac.room.toLowerCase().includes(q)) ||
      ((fac as any).department && ((fac as any).department.toLowerCase().includes(q)))
    );
  });

  const suggestedCategories = [
    {
      id: 'cat-dept',
      label: `My Department (${deptShort})`,
      icon: GraduationCap,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      action: () => {
        setSearchDeptOnly(true);
        try { localStorage.setItem('cp_search_dept_only', 'true'); } catch {}
        setSearchQuery(deptShort);
        handleAddRecentSearch(deptShort);
      }
    },
    {
      id: 'cat-schedule',
      label: 'Class Schedules',
      icon: CalendarDays,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      action: () => {
        onNavigate('schedule');
        setIsSearchOpen(false);
        setIsMobileBarVisible(true);
        handleAddRecentSearch('Class Schedules');
      }
    },
    {
      id: 'cat-faculty',
      label: 'Faculty Directory',
      icon: Users,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      action: () => {
        onNavigate('dashboard');
        setSearchQuery('Dr.');
        handleAddRecentSearch('Faculty Directory');
      }
    },
    {
      id: 'cat-scan',
      label: 'Attendance QR Scan',
      icon: Scan,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      action: () => {
        onNavigate('attendance');
        setIsSearchOpen(false);
        setIsMobileBarVisible(true);
        handleAddRecentSearch('Attendance QR Scan');
      }
    },
    {
      id: 'cat-excuse',
      label: 'Excuse Letters',
      icon: FileText,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      action: () => {
        onNavigate('inbox');
        setIsSearchOpen(false);
        setIsMobileBarVisible(true);
        handleAddRecentSearch('Excuse Letters');
      }
    },
    {
      id: 'cat-rooms',
      label: 'Rooms & Laboratories',
      icon: Building2,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
      action: () => {
        setSearchQuery('Room');
        handleAddRecentSearch('Rooms & Labs');
      }
    }
  ];

  return (
    <div 
      ref={searchContainerRef} 
      className={`transition-all duration-300 mx-1.5 sm:mx-2 relative z-[100] ${
        isSearchOpen 
          ? 'w-full max-w-full sm:max-w-md md:max-w-lg' 
          : 'flex-1 max-w-xs sm:max-w-sm md:max-w-md'
      }`}
    >
      <div className="relative flex items-center z-[100] gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none shrink-0" />
          <input
            type="text"
            placeholder={searchDeptOnly ? `Search in ${user?.department || 'My Department'}...` : "Search courses, faculty, rooms, views... (⌘K)"}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
              setIsMobileBarVisible(false);
            }}
            onFocus={() => {
              setIsSearchOpen(true);
              setIsMobileBarVisible(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                handleAddRecentSearch(searchQuery.trim());
              }
            }}
            className="w-full pl-8 pr-12 sm:pr-14 py-1.5 sm:py-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-zinc-950 transition-all outline-none placeholder:text-zinc-400"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              title="Clear search input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block absolute right-2 px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-2xs pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>
        {isSearchOpen && (
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setIsMobileBarVisible(true);
            }}
            className="sm:hidden px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 shrink-0 cursor-pointer rounded-lg hover:bg-emerald-500/10 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <AnimatePresence>
        {isSearchOpen && (
          <>
            <div 
              className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs" 
              onClick={() => {
                setIsSearchOpen(false);
                setIsMobileBarVisible(true);
              }} 
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="absolute top-full left-0 right-0 mt-2 z-[100] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-left max-h-[75vh]"
            >
              {/* Filter Scope Toggle Bar */}
              <div className="px-3 pt-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="hidden xs:inline">Filter Scope:</span>
                  <span className="xs:hidden">Scope:</span>
                </div>
                <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800/80 p-0.5 rounded-xl text-[10.5px] sm:text-[11px] max-w-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDeptOnly(false);
                      try { localStorage.setItem('cp_search_dept_only', 'false'); } catch {}
                      speakText("Searching all campus courses and faculty", accessibility.readAloud);
                    }}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      !searchDeptOnly
                        ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>All Campus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDeptOnly(true);
                      try { localStorage.setItem('cp_search_dept_only', 'true'); } catch {}
                      speakText(`Filtering search to your department: ${deptShort}`, accessibility.readAloud);
                    }}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap max-w-[140px] sm:max-w-none ${
                      searchDeptOnly
                        ? 'bg-emerald-500 text-black shadow-xs font-black'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                    title={`Only search within ${userDeptName}`}
                  >
                    <GraduationCap className="w-3 h-3 shrink-0" />
                    <span className="truncate">My Dept ({deptShort})</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Results */}
              <div className="max-h-[62vh] overflow-y-auto p-3 space-y-3 custom-scrollbar text-left">
                {!searchQuery.trim() && recentSearches.length > 0 && (
                  <div className="space-y-1.5 pb-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>Recent Searches</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearAllRecentSearches}
                        className="text-[10px] font-bold text-zinc-400 hover:text-red-500 cursor-pointer flex items-center gap-1 transition-colors"
                        title="Clear search history"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {recentSearches.map((term, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-800/70 transition-all cursor-pointer group"
                          onClick={() => {
                            setSearchQuery(term);
                            handleAddRecentSearch(term);
                          }}
                        >
                          <History className="w-3 h-3 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                          <span>{term}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRecentSearch(term, e)}
                            className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 rounded cursor-pointer"
                            title="Remove term"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!searchQuery.trim() && (
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    <div className="flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Suggested Categories</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {suggestedCategories.map(cat => {
                        const CatIcon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={cat.action}
                            className="p-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:border-emerald-500/30 text-left flex items-center gap-2 transition-all cursor-pointer group"
                          >
                            <div className={`p-1.5 rounded-lg border shrink-0 ${cat.color}`}>
                              <CatIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {cat.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {matchedFaculty.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    <p className="px-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Faculty & Instructors ({matchedFaculty.length})
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {matchedFaculty.map(fac => (
                        <button
                          key={fac.id}
                          type="button"
                          onClick={() => {
                            handleAddRecentSearch(fac.name);
                            onNavigate('dashboard');
                            setIsSearchOpen(false);
                            setIsMobileBarVisible(true);
                            setSearchQuery('');
                          }}
                          className="w-full px-2.5 py-2 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 text-left flex items-center justify-between gap-2 transition-colors group cursor-pointer border border-transparent hover:border-emerald-500/20"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={fac.avatar}
                              alt={fac.name}
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                                  {fac.name}
                                </span>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                                  fac.status === 'available'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : fac.status === 'in-class'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                    : 'bg-zinc-500/15 text-zinc-500 border border-zinc-500/30'
                                }`}>
                                  {fac.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 truncate">
                                {fac.room || 'Faculty Office'} • {(fac as any).department || 'Academic Faculty'}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {navMatches.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    <p className="px-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">Navigation Views</p>
                    <div className="grid grid-cols-1 gap-0.5">
                      {navMatches.map(item => {
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              handleAddRecentSearch(item.title);
                              onNavigate(item.id);
                              setIsSearchOpen(false);
                              setIsMobileBarVisible(true);
                              setSearchQuery('');
                            }}
                            className="w-full px-2.5 py-2 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 text-left flex items-center justify-between gap-2.5 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-emerald-500 group-hover:text-black transition-colors shrink-0">
                                <IconComponent className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300 group-hover:text-black" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                  {item.title}
                                </span>
                                <p className="text-[10px] text-zinc-400 truncate">{item.desc}</p>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-0.5 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {matchedClasses.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        Classes & Courses ({matchedClasses.length})
                      </p>
                      {searchDeptOnly && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                          {deptShort} Dept Filter
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-0.5">
                      {matchedClasses.slice(0, 10).map(cls => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => {
                            handleAddRecentSearch(cls.code);
                            onNavigate('schedule');
                            setIsSearchOpen(false);
                            setIsMobileBarVisible(true);
                            setSearchQuery('');
                          }}
                          className="w-full px-2.5 py-2 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 text-left flex items-center justify-between gap-2 transition-colors group cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono shrink-0">{cls.code}</span>
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{cls.name}</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                              {cls.days.join(', ')} • {cls.startTime} • {cls.room} {cls.facultyName ? `• ${cls.facultyName}` : ''}
                            </p>
                          </div>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-500 shrink-0">
                            {cls.studentsCount || 0} students
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {navMatches.length === 0 && matchedClasses.length === 0 && matchedFaculty.length === 0 && (
                  <div className="py-6 text-center space-y-2">
                    <Search className="w-6 h-6 text-zinc-300 dark:text-zinc-700 mx-auto" />
                    <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      No results found for "{searchQuery}"
                    </p>
                    {searchDeptOnly && (
                      <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                        Filtering is set to your department only (<span className="text-emerald-500 font-bold">{userDeptName}</span>).
                      </p>
                    )}
                    {searchDeptOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchDeptOnly(false);
                          try { localStorage.setItem('cp_search_dept_only', 'false'); } catch {}
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                        Search Across All Campus
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommandPalette;
