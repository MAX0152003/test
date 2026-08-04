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
import { motion } from 'motion/react';

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

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('cp_sidebar_collapsed', String(nextVal));
    speakText(nextVal ? "Sidebar minimized" : "Sidebar expanded", accessibility.readAloud);
  };

  const getNavItems = () => {
    switch (role) {
      case 'student':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'schedule', label: 'My Schedule', icon: CalendarDays },
          { id: 'attendance', label: 'Attendance Scan', icon: Scan },
          { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
          { id: 'profile', label: 'Profile', icon: UserCircle },
          { id: 'help-center', label: 'Help Center', icon: HelpCircle },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];
      case 'faculty':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'schedule-editor', label: 'My Classes', icon: CalendarDays },
          { id: 'qr-generator', label: 'Attendance QR', icon: Scan },
          { id: 'students-monitoring', label: 'Students Directory', icon: Users },
          { id: 'excuse-inbox', label: 'Excuse Inbox', icon: Inbox, badge: pendingExcuseCount },
          { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
          { id: 'profile', label: 'Profile', icon: UserCircle },
          { id: 'help-center', label: 'Help Center', icon: HelpCircle },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'resets', label: 'Password Resets', icon: Lock, badge: pendingResetsCount },
          { id: 'users', label: 'Users Directory', icon: Users },
          { id: 'schedule-editor', label: 'Schedules', icon: CalendarDays },
          { id: 'rooms', label: 'Rooms Directory', icon: MapPin },
          { id: 'reports', label: 'Reports Export', icon: Download },
          { id: 'tickets', label: 'Help Tickets', icon: HelpCircle, badge: pendingTicketsCount },
          { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
          { id: 'profile', label: 'Profile', icon: UserCircle },
          { id: 'settings', label: 'Settings', icon: Settings },
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
  const navItems = getNavItems();

  const handleNavClick = (screenId: string, label: string) => {
    setScreen(screenId);
    setIsOpen(false);
    speakText(`Navigation: switched to ${label}`, accessibility.readAloud);
  };

  const isDark = accessibility.theme === 'dark';

  return (
    <>
      {/* Mobile Top Header Banner */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 border-b bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 shrink-0 select-none">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Burger menu toggle */}
          <button
            onClick={() => {
              setIsOpen(prev => !prev);
              speakText("Toggled mobile navigation menu drawer", accessibility.readAloud);
            }}
            type="button"
            className="p-2.5 -ml-1 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-[42px] min-h-[42px]"
            title="Open Sidebar"
          >
            <Menu className="w-5 h-5 stroke-[2]" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-bold shadow-md shadow-emerald-500/10">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100">ClassPulse</span>
            <span className="text-[9px] uppercase font-mono font-black tracking-widest px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-full">
              {role === 'student' ? 'Student' : role === 'faculty' ? 'Faculty' : 'Admin'}
            </span>
          </div>
        </div>

        {/* Mobile Notification Bell on mobile header */}
        <button
          onClick={() => {
            setScreen('notifications');
            speakText("Navigating to notification center", accessibility.readAloud);
          }}
          type="button"
          className="p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition-all relative border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 scale-100 active:scale-95 min-w-[42px] min-h-[42px]"
          title="Notification Center"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] font-black leading-none font-mono">
              {unreadNotifications}
            </span>
          )}
        </button>
      </div>

      {/* Sidebar Container */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`max-md:fixed max-md:inset-y-0 max-md:left-0 z-50 h-screen flex flex-col justify-between transition-all duration-300 transform ${
          isOpen ? 'translate-x-0' : 'max-md:-translate-x-full'
        } ${
          isCollapsed ? 'md:w-20' : 'w-64 md:w-64'
        } bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 md:relative md:translate-x-0 shadow-lg`}
      >
        {/* Top Area - Brand Logo & Header (Steady) */}
        <div className="relative shrink-0">
          
          {/* Collapsible Trigger (Minimize button) positioned lower to never block the logo - HIDDEN ON MOBILES */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex absolute -right-3 top-20 z-55 p-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-805 transition-all duration-300 transform scale-100 cursor-pointer opacity-100"
            title={isCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
          >
            <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 text-emerald-500 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>

          {/* Brand Logo & Heartbeat Visual Header */}
          <div className={`p-5 border-b border-zinc-200 dark:border-zinc-850 flex items-center transition-all duration-300 ${
            isCollapsed ? 'justify-center px-0 py-6' : 'justify-between'
          }`}>
            <div className={`flex items-center gap-3 transition-all duration-300 ${
              isCollapsed ? 'justify-center w-10 h-10' : 'w-auto'
            }`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ 
                  opacity: [0, 0.2, 0.08, 0.75, 0.25, 0.95, 0.55, 0.98, 0.85, 1], 
                  scale: [0.85, 0.95, 0.9, 1.05, 0.98, 1.02, 0.99, 1]
                }}
                transition={{
                  opacity: { duration: 1.3, times: [0, 0.1, 0.15, 0.3, 0.4, 0.6, 0.75, 0.85, 0.92, 1], ease: 'easeOut' },
                  scale: { duration: 1.3, times: [0, 0.1, 0.15, 0.3, 0.4, 0.6, 0.75, 1], ease: 'easeOut' }
                }}
                whileHover={{ 
                  scale: 1.08, 
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.65), 0 0 8px rgba(16, 185, 129, 0.35), 0 6px 16px rgba(16, 185, 129, 0.3)'
                }}
                whileTap={{ scale: 0.94 }}
                className="relative w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold shrink-0 cursor-pointer"
                style={{
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.15), 0 0 5px rgba(16, 185, 129, 0.1)'
                }}
              >
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </motion.div>
              {!isCollapsed && (
                <div className="text-left animate-fade-in flex flex-col justify-center min-w-[120px]">
                  <h1 className="text-base font-black tracking-tight text-zinc-800 dark:text-zinc-100 uppercase">
                    Class<span className="text-emerald-555 font-extrabold text-emerald-500">Pulse</span>
                  </h1>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold tracking-widest uppercase">{role}</p>
                </div>
              )}
            </div>
            {/* Close btn for mobile drawer */}
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              className="md:hidden p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-650 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Middle Cabinet Area - Scrollable with hidden scrollbar for all users */}
        <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* User Bio Card (Clickable to jump directly to editor/profile) */}
          <div 
            onClick={() => handleNavClick('profile', 'Profile')}
            title="Edit Profile"
            className={`mx-4 my-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 flex items-center gap-3 transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/80 active:scale-98 ${
              isCollapsed ? 'justify-center mx-2 px-2' : ''
            }`}
          >
            <img
              src={userAvatar}
              alt={userName}
              className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
            {!isCollapsed && (
              <div className="overflow-hidden text-left animate-fade-in">
                <h2 className="font-bold text-xs truncate text-zinc-900 dark:text-zinc-100">{userName}</h2>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1">
                  Active Session
                </span>
              </div>
            )}
          </div>

          {/* Primary Navigation Menu */}
          <nav className="px-3 pb-6 space-y-1 text-left">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id, item.label)}
                  type="button"
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer hover:scale-[1.02] active:scale-[0.98] group relative isolate ${
                    isActive 
                      ? themeColors.activeClass 
                      : 'text-zinc-600 dark:text-zinc-350 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 hover:text-zinc-950 dark:hover:text-zinc-100'
                  } ${isCollapsed ? 'justify-center px-1 border-l-0' : ''}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-sidebar-pill"
                      className={`absolute inset-0 rounded-xl -z-10 ${themeColors.bgClass}`}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <Icon className="w-4.5 h-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                    {!isCollapsed && <span className="animate-fade-in">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs relative z-10 ${themeColors.badgeClass}`}>
                      {item.badge}
                    </span>
                  )}
                  {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <div className="absolute right-3.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-zinc-950 z-10" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-850 space-y-1.5 shrink-0 bg-white dark:bg-zinc-950">
          <button
            onClick={() => {
              onLogout();
              speakText("Logged out successfully.", accessibility.readAloud);
            }}
            type="button"
            title={isCollapsed ? "Log Out" : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-zinc-450 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 ${
              isCollapsed ? 'justify-center px-1' : ''
            }`}
          >
            <LogOut className="w-4.5 h-4.5 shrink-0 opacity-80" />
            {!isCollapsed && <span className="animate-fade-in">Log Out</span>}
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
