import React from 'react';
import { Role, AccessibilityConfig } from '../types';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Scan, 
  Bell, 
  UserCircle, 
  LogOut, 
  Users, 
  X,
  Menu,
  Activity,
  ChevronLeft,
  MessageSquare,
  Inbox,
  Settings,
  Download,
  HelpCircle,
  MapPin,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { speakText } from './AccessibilitySettings';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  role: Role;
  activeScreen: string;
  setScreen: (screen: string) => void;
  onLogout: () => void;
  userName: string;
  userAvatar: string;
  unreadNotifications: number;
  unreadMessages?: number;
  pendingExcuseCount?: number;
  accessibility: AccessibilityConfig;
}

export default function Sidebar({
  role,
  activeScreen,
  setScreen,
  onLogout,
  userName,
  userAvatar,
  unreadNotifications,
  unreadMessages = 0,
  pendingExcuseCount = 0,
  accessibility
}: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem('cp_sidebar_collapsed') === 'true';
  });
  const [isHovered, setIsHovered] = React.useState(false);
  const [facultyCode, setFacultyCode] = React.useState('Faculty123');
  const [isCabinetOpen, setIsCabinetOpen] = React.useState(false);
  const [isKeyVisible, setIsKeyVisible] = React.useState(false);
  const [pendingResetsCount, setPendingResetsCount] = React.useState(0);
  const [pendingTicketsCount, setPendingTicketsCount] = React.useState(0);

  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Minimize/collapse state only applies on desktop (md screens and up). On mobile, sidebar drawer is always expanded.
  const isEffectiveCollapsed = isCollapsed && !isMobile;

  React.useEffect(() => {
    const updateResetsCount = () => {
      try {
        const reqsRaw = localStorage.getItem('classpulse_password_reset_requests') || '[]';
        const reqs = JSON.parse(reqsRaw);
        const pending = reqs.filter((r: any) => r.status === 'pending').length;
        setPendingResetsCount(pending);
      } catch (e) {
        setPendingResetsCount(0);
      }
    };

    const updateTicketsCount = () => {
      try {
        let openCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cp_support_tickets_')) {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            openCount += list.filter((t: any) => t.status === 'Open' || t.status === 'In Progress').length;
          }
        }
        setPendingTicketsCount(openCount);
      } catch (e) {
        setPendingTicketsCount(0);
      }
    };

    updateResetsCount();
    updateTicketsCount();
    window.addEventListener('password-reset-requests-changed', updateResetsCount);
    window.addEventListener('cp-support-tickets-changed', updateTicketsCount);
    window.addEventListener('storage', () => {
      updateResetsCount();
      updateTicketsCount();
    });

    const code = localStorage.getItem('classpulse_faculty_reg_code') || 'Faculty123';
    setFacultyCode(code);

    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClose = () => setIsOpen(false);
    const handleCodeChange = (e: any) => {
      if (e.detail) setFacultyCode(e.detail);
    };

    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    window.addEventListener('close-mobile-sidebar', handleClose);
    window.addEventListener('faculty-code-changed', handleCodeChange);

    return () => {
      window.removeEventListener('password-reset-requests-changed', updateResetsCount);
      window.removeEventListener('cp-support-tickets-changed', updateTicketsCount);
      window.removeEventListener('toggle-mobile-sidebar', handleToggle);
      window.removeEventListener('close-mobile-sidebar', handleClose);
      window.removeEventListener('faculty-code-changed', handleCodeChange);
    };
  }, []);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('mobile-sidebar-state-changed', { detail: { isOpen } }));
  }, [isOpen]);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('cp_sidebar_collapsed', String(nextVal));
    speakText(nextVal ? "Sidebar minimized" : "Sidebar expanded", accessibility.readAloud);
  };

  const getNavSections = (): { title: string; items: { id: string; label: string; icon: any; badge?: number }[] }[] => {
    switch (role) {
      case 'student':
        return [
          {
            title: 'Main Menu',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'schedule', label: 'My Schedule', icon: CalendarDays },
              { id: 'attendance', label: 'Attendance Scan', icon: Scan },
              { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
              { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
            ]
          },
          {
            title: 'System',
            items: [
              { id: 'profile', label: 'Profile', icon: UserCircle },
              { id: 'help-center', label: 'Help Center', icon: HelpCircle },
              { id: 'settings', label: 'Settings', icon: Settings },
            ]
          }
        ];
      case 'faculty':
        return [
          {
            title: 'Main Menu',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'schedule-editor', label: 'My Classes', icon: CalendarDays },
              { id: 'qr-generator', label: 'Attendance QR', icon: Scan },
              { id: 'students-monitoring', label: 'Students Directory', icon: Users },
              { id: 'excuse-inbox', label: 'Excuse Inbox', icon: Inbox, badge: pendingExcuseCount },
              { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
              { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
            ]
          },
          {
            title: 'System',
            items: [
              { id: 'profile', label: 'Profile', icon: UserCircle },
              { id: 'help-center', label: 'Help Center', icon: HelpCircle },
              { id: 'settings', label: 'Settings', icon: Settings },
            ]
          }
        ];
      case 'admin':
        return [
          {
            title: 'Main Menu',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'resets', label: 'Password Resets', icon: Lock, badge: pendingResetsCount },
              { id: 'users', label: 'Users Directory', icon: Users },
              { id: 'schedule-editor', label: 'Schedules', icon: CalendarDays },
              { id: 'rooms', label: 'Rooms Directory', icon: MapPin },
              { id: 'reports', label: 'Reports Export', icon: Download },
              { id: 'tickets', label: 'Help Tickets', icon: HelpCircle, badge: pendingTicketsCount },
              { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
              { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
            ]
          },
          {
            title: 'System',
            items: [
              { id: 'profile', label: 'Profile', icon: UserCircle },
              { id: 'settings', label: 'Settings', icon: Settings },
            ]
          }
        ];
    }
  };

  const getRoleNavColors = () => {
    switch (role) {
      case 'student':
        return {
          activeClass: 'text-[#03213D] dark:text-sky-400 font-extrabold shadow-xs',
          bgClass: 'bg-[#03213D]/8 dark:bg-sky-500/10 border-l-4 border-[#03213D] dark:border-sky-400',
          badgeClass: 'bg-[#03213D] text-white',
          roleLabel: 'text-[#03213D] dark:text-[#38bdf8]'
        };
      case 'faculty':
        return {
          activeClass: 'text-emerald-800 dark:text-emerald-400 font-extrabold shadow-xs',
          bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/10 border-l-4 border-emerald-500 dark:border-emerald-555',
          badgeClass: 'bg-emerald-600 text-white',
          roleLabel: 'text-emerald-700 dark:text-emerald-400'
        };
      case 'admin':
        return {
          activeClass: 'text-[#CC762A] dark:text-amber-400 font-extrabold shadow-xs',
          bgClass: 'bg-[#CC762A]/10 dark:bg-amber-550/10 border-l-4 border-[#CC762A] dark:border-amber-400',
          badgeClass: 'bg-[#CC762A] text-white',
          roleLabel: 'text-[#CC762A] dark:text-amber-400'
        };
    }
  };

  const themeColors = getRoleNavColors();
  const navSections = getNavSections();

  // Primary mobile bottom navigation items
  const getMobileNavItems = () => {
    switch (role) {
      case 'student':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'schedule', label: 'Schedule', icon: CalendarDays },
          { id: 'attendance', label: 'Scan', icon: Scan },
          { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];
      case 'faculty':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'schedule-editor', label: 'Classes', icon: CalendarDays },
          { id: 'qr-generator', label: 'QR Scan', icon: Scan },
          { id: 'excuse-inbox', label: 'Inbox', icon: Inbox, badge: pendingExcuseCount },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'schedule-editor', label: 'Schedules', icon: CalendarDays },
          { id: 'resets', label: 'Resets', icon: Lock, badge: pendingResetsCount },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];
    }
  };

  const mobileNavItems = getMobileNavItems();

  const handleNavClick = (screenId: string, label: string) => {
    setScreen(screenId);
    setIsOpen(false);
    speakText(`Navigation: switched to ${label}`, accessibility.readAloud);
  };

  return (
    <>
      {/* Mobile Dimmed Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`max-md:fixed max-md:inset-y-0 max-md:left-0 z-50 h-screen flex flex-col justify-between transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          isOpen ? 'translate-x-0 shadow-2xl' : 'max-md:-translate-x-full'
        } ${
          isEffectiveCollapsed ? 'w-64 md:w-20' : 'w-64 md:w-60'
        } bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 md:relative md:translate-x-0 md:shadow-lg`}
      >
        {/* Top Area - Brand Logo & Integrated Header Collapse Button */}
        <div className="relative shrink-0 border-b border-zinc-100 dark:border-zinc-900/60 p-3.5">
          <div className="flex items-center justify-between">
            <div 
              onClick={isEffectiveCollapsed ? toggleCollapse : undefined}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isEffectiveCollapsed ? 'justify-center w-full cursor-pointer' : ''
              }`}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-9 h-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black shrink-0 cursor-pointer shadow-sm"
              >
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </motion.div>

              {!isEffectiveCollapsed && (
                <div className="text-left flex flex-col justify-center min-w-0">
                  <h1 className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase truncate">
                    Class<span className="text-emerald-500">Pulse</span>
                  </h1>
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase truncate">{role} Portal</span>
                </div>
              )}
            </div>

            {/* Clean Integrated Collapse Toggle */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden md:flex p-1.5 rounded-xl text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              title={isEffectiveCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isEffectiveCollapsed ? 'rotate-180 text-emerald-500' : ''}`} />
            </button>

            {/* Mobile Drawer Close */}
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              className="md:hidden p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-650 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Middle Cabinet Area */}
        <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-3">
          <nav className="px-3 space-y-4 text-left">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                {!isEffectiveCollapsed ? (
                  <div className="px-3 pt-1 pb-1 text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {section.title}
                  </div>
                ) : (
                  idx > 0 && <div className="my-2 border-t border-zinc-100 dark:border-zinc-900" />
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id, item.label)}
                      type="button"
                      title={isEffectiveCollapsed ? item.label : undefined}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-xs font-bold cursor-pointer active:scale-95 group relative isolate ${
                        isActive 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold' 
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100'
                      } ${isEffectiveCollapsed ? 'justify-center px-1' : ''}`}
                    >
                      <div className="flex items-center gap-3 relative z-10 min-w-0">
                        <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-emerald-500' : ''
                        }`} />
                        {!isEffectiveCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!isEffectiveCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-black shrink-0 font-mono">
                          {item.badge}
                        </span>
                      )}
                      {isEffectiveCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-emerald-500 z-10" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Area - Sleek User Card & Logout Button */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-900 shrink-0 bg-white dark:bg-zinc-950 space-y-2">
          {!isEffectiveCollapsed && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
              <img 
                src={userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'} 
                alt={userName}
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-emerald-500/30"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[11px] font-extrabold text-zinc-900 dark:text-zinc-100 truncate">{userName}</p>
                <p className="text-[9px] font-semibold text-zinc-400 truncate capitalize">{role}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              onLogout();
              speakText("Logged out successfully.", accessibility.readAloud);
            }}
            type="button"
            title={isEffectiveCollapsed ? "Log Out" : undefined}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 active:scale-95 ${
              isEffectiveCollapsed ? 'justify-center px-1' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0 opacity-80" />
            {!isEffectiveCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </div>

      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}
    </>
  );
}
