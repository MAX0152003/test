import React from 'react';
import { Role, AccessibilityConfig } from '../types';
import { 
  X,
  Activity,
  ChevronLeft,
  Settings,
  HelpCircle,
  MapPin,
  Lock,
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Scan,
  MessageSquare,
  Bell,
  UserCircle,
  Users,
  Inbox,
  FileText,
  Download,
  LogOut
} from 'lucide-react';
import { speakText } from './AccessibilitySettings';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropMotion } from '../lib/animationTransitions';

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
  pendingConsultationCount?: number;
  accessibility: AccessibilityConfig;
  isOffline?: boolean;
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
  pendingConsultationCount = 0,
  accessibility,
  isOffline = false
}: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem('cp_sidebar_collapsed') === 'true';
  });
  const [isHovered, setIsHovered] = React.useState(false);
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

    const handleStorage = () => {
      updateResetsCount();
      updateTicketsCount();
    };

    updateResetsCount();
    updateTicketsCount();
    window.addEventListener('password-reset-requests-changed', updateResetsCount);
    window.addEventListener('cp-support-tickets-changed', updateTicketsCount);
    window.addEventListener('storage', handleStorage);

    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    window.addEventListener('close-mobile-sidebar', handleClose);

    return () => {
      window.removeEventListener('password-reset-requests-changed', updateResetsCount);
      window.removeEventListener('cp-support-tickets-changed', updateTicketsCount);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('toggle-mobile-sidebar', handleToggle);
      window.removeEventListener('close-mobile-sidebar', handleClose);
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
              { id: 'consultations', label: 'Consultations', icon: CalendarClock, badge: pendingConsultationCount },
              { id: 'excuse-letters', label: 'Excuse Letters', icon: FileText, badge: pendingExcuseCount },
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
              { id: 'consultations', label: 'Consultations', icon: CalendarClock, badge: pendingConsultationCount },
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
          activeClass: 'text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs',
          bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500/25',
          badgeClass: 'bg-emerald-500 text-black font-semibold',
          roleLabel: 'text-emerald-600 dark:text-emerald-400'
        };
      case 'faculty':
        return {
          activeClass: 'text-emerald-700 dark:text-emerald-400 font-semibold shadow-2xs',
          bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500/25',
          badgeClass: 'bg-emerald-500 text-black font-semibold',
          roleLabel: 'text-emerald-600 dark:text-emerald-400'
        };
      case 'admin':
        return {
          activeClass: 'text-amber-700 dark:text-amber-400 font-semibold shadow-2xs',
          bgClass: 'bg-amber-500/10 dark:bg-amber-500/15 ring-1 ring-amber-500/25',
          badgeClass: 'bg-amber-500 text-black font-semibold',
          roleLabel: 'text-amber-600 dark:text-amber-400'
        };
    }
  };

  const navSections = getNavSections();
  const roleNav = getRoleNavColors();

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
            {...modalBackdropMotion}
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`max-md:fixed max-md:top-0 max-md:bottom-0 max-md:left-0 z-50 h-[100dvh] max-h-[100dvh] flex flex-col justify-between transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          isOpen ? 'translate-x-0 shadow-2xl' : 'max-md:-translate-x-full'
        } ${
          isEffectiveCollapsed ? 'w-72 md:w-20' : 'w-72 sm:w-80 md:w-60'
        } bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 md:relative md:h-screen md:max-h-screen md:translate-x-0 md:shadow-lg`}
      >
        {/* Top Area - Brand Logo & Integrated Header Collapse Button */}
        <div className="relative shrink-0 border-b border-zinc-200/80 dark:border-zinc-850 p-4 pt-[max(0.875rem,env(safe-area-inset-top,0.875rem))]">
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
                className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black shrink-0 cursor-pointer shadow-sm"
              >
                <Activity className="w-6 h-6 stroke-[2.5]" />
              </motion.div>

              {!isEffectiveCollapsed && (
                <div className="text-left flex flex-col justify-center min-w-0">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase truncate">
                    Class<span className="text-emerald-500">Pulse</span>
                  </h1>
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wide capitalize truncate">{role} Portal</span>
                </div>
              )}
            </div>

            {/* Clean Integrated Collapse Toggle */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden md:flex p-2 rounded-xl text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              title={isEffectiveCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
            >
              <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${isEffectiveCollapsed ? 'rotate-180 text-emerald-500' : ''}`} />
            </button>

            {/* Mobile Drawer Close (Large 48x48px Touch Target) */}
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              aria-label="Close Navigation Menu"
              className="md:hidden min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer touch-manipulation"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Middle Cabinet Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-3">
          <nav className="px-3 sm:px-3.5 space-y-4 text-left">
            {navSections.map((section, idx) => (
              <div key={section.title} className="space-y-1.5">
                {!isEffectiveCollapsed ? (
                  <div className="px-3.5 pt-2 pb-1 text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
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
                      key={`${section.title}-${item.id}`}
                      onClick={() => handleNavClick(item.id, item.label)}
                      type="button"
                      title={isEffectiveCollapsed ? item.label : undefined}
                      className={`w-full min-h-[50px] sm:min-h-[52px] touch-manipulation flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-sm sm:text-base font-bold cursor-pointer active:scale-98 group relative isolate ${
                        isActive 
                          ? `${roleNav.bgClass} ${roleNav.activeClass}` 
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/90 dark:hover:bg-zinc-900/90 hover:text-zinc-950 dark:hover:text-white'
                      } ${isEffectiveCollapsed ? 'justify-center px-1' : ''}`}
                    >
                      <div className="flex items-center gap-3.5 relative z-10 min-w-0">
                        <Icon className={`w-6 h-6 shrink-0 stroke-[2.2] transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-emerald-500' : ''
                        }`} />
                        {!isEffectiveCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!isEffectiveCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 font-mono shadow-2xs ${roleNav.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                      {isEffectiveCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <div className="absolute right-2 top-2 w-2.5 h-2.5 rounded-full bg-emerald-500 z-10" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Area - Completely borderless, always within reach, zero red background, large touch targets */}
        <div className="p-3 sm:p-4 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] shrink-0 bg-white dark:bg-zinc-950 space-y-2.5">
          {!isEffectiveCollapsed && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/70">
              <div className="relative shrink-0">
                <img 
                  src={userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'} 
                  alt={userName}
                  className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-emerald-500/40"
                  referrerPolicy="no-referrer"
                />
                <span 
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-950 ${
                    isOffline ? 'bg-amber-500 shadow-xs' : 'bg-emerald-500 shadow-xs animate-pulse'
                  }`}
                  title={isOffline ? "Offline Mode (Local Storage)" : "Cloud Synced (Firestore)"}
                />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 truncate">{userName}</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate capitalize">{role}</p>
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
            className={`w-full min-h-[50px] touch-manipulation flex items-center gap-3 px-4 py-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer text-zinc-700 dark:text-zinc-200 bg-zinc-100/80 dark:bg-zinc-900/80 hover:bg-zinc-200/90 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white shadow-2xs active:scale-98 group ${
              isEffectiveCollapsed ? 'justify-center px-1' : 'justify-center'
            }`}
          >
            <LogOut className="w-5.5 h-5.5 shrink-0 stroke-[2.2] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
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
