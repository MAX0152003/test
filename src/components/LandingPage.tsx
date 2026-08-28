import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Calendar,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Wifi,
  FileText,
  Sun,
  Moon,
  Building,
  GraduationCap,
  Lock,
  BarChart3,
  Layers,
  Check,
  Compass,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Download,
  CheckSquare,
  Activity,
  Award,
  Users,
  Bell,
  Cpu
} from 'lucide-react';
import { AccessibilityConfig } from '../types';

interface LandingPageProps {
  onEnterPortal: (mode?: 'login' | 'register') => void;
  accessibility: AccessibilityConfig;
  onToggleTheme: () => void;
  onOpenDownloadApp?: () => void;
}

export default function LandingPage({ onEnterPortal, accessibility, onToggleTheme, onOpenDownloadApp }: LandingPageProps) {
  const [activeRoleTab, setActiveRoleTab] = useState<'student' | 'faculty' | 'admin'>('student');
  const [activeMatrixDay, setActiveMatrixDay] = useState<'mon' | 'wed' | 'fri'>('mon');
  const [mobileFeatureTab, setMobileFeatureTab] = useState<'qr' | 'matrix' | 'offline'>('qr');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const isDark = accessibility.theme === 'dark';

  const previewClasses = {
    mon: [
      { code: 'CS 101', name: 'Intro to Computer Science', time: '07:30 AM - 09:00 AM', room: 'CCS Lab 1', cluster: 'CCS Complex', status: 'Enrolled' },
      { code: 'IT 212', name: 'Data Structures & Algorithms', time: '09:00 AM - 10:30 AM', room: 'Room 204', cluster: 'Science Complex', status: 'Enrolled' },
      { code: 'MATH 51', name: 'Differential Calculus', time: '01:00 PM - 02:30 PM', room: 'CAS-301', cluster: 'Liberal Arts', status: 'Enrolled' },
    ],
    wed: [
      { code: 'CS 101', name: 'Intro to Computer Science', time: '07:30 AM - 09:00 AM', room: 'CCS Lab 1', cluster: 'CCS Complex', status: 'Enrolled' },
      { code: 'IT 212', name: 'Data Structures & Algorithms', time: '09:00 AM - 10:30 AM', room: 'Room 204', cluster: 'Science Complex', status: 'Enrolled' },
      { code: 'ENG 11', name: 'Academic Writing & Research', time: '03:00 PM - 04:30 PM', room: 'CAS-102', cluster: 'Liberal Arts', status: 'Enrolled' },
    ],
    fri: [
      { code: 'CS 101', name: 'Intro to Computer Science', time: '08:00 AM - 09:30 AM', room: 'CCS Lab 1', cluster: 'CCS Complex', status: 'Enrolled' },
      { code: '🕌 JUM\'AH', name: 'MSU Friday Prayer & Cultural Window', time: '11:30 AM - 01:30 PM', room: 'Campus Mosque / Dimaporo', cluster: 'Campus Wide', status: 'Protected Window', isJumah: true },
      { code: 'PE 102', name: 'Physical Fitness & Wellness', time: '02:00 PM - 03:30 PM', room: 'Gymnasium', cluster: 'Sports Complex', status: 'Enrolled' },
    ]
  };

  const faqs = [
    {
      q: "How does single-use QR rotation prevent proxy attendance?",
      a: "Faculty generate only one single dynamic session code per course per day. Codes rotate periodically and expire after 30 minutes, preventing screenshots or unauthorized remote sharing."
    },
    {
      q: "What happens during campus network outages?",
      a: "ClassPulse features an autonomous offline engine. Attendance scans and schedule lookups continue functioning normally offline, and all transactions automatically synchronize to the university cloud upon reconnection."
    },
    {
      q: "How does Friday Jum’ah prayer window protection work?",
      a: "In compliance with Mindanao State University cultural and religious observances, the system flags and protects Friday 11:30 AM to 1:30 PM across all timetable matrixes, ensuring students and faculty attend prayers without academic conflict."
    },
    {
      q: "How do I register or reset my password?",
      a: "You can sign in with your MSU Google Workspace account or register with your Student/Employee ID. If you forget your password, submit a quick reset request in the login screen for rapid Administrator authorization."
    }
  ];

  return (
    <div id="landing-page-root" className="min-h-screen w-full bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 selection:bg-emerald-500 selection:text-white transition-colors duration-300 font-sans">
      
      {/* ========================================================================== */}
      {/* 📱 MOBILE-DEDICATED LANDING LAYOUT (Designed exclusively for phones < 1024px) */}
      {/* ========================================================================== */}
      <div className="block lg:hidden w-full pb-12 text-left">
        
        {/* Mobile App Header */}
        <header id="mobile-landing-header" className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/90 dark:bg-zinc-950/90 border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black font-black font-mono text-sm shadow-xs shadow-emerald-500/20">
              CP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-zinc-900 dark:text-zinc-100 font-mono">ClassPulse</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">MSU</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Mindanao State University</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenDownloadApp && (
              <button
                id="mobile-header-download-apk-btn"
                onClick={onOpenDownloadApp}
                type="button"
                className="px-2.5 py-1.5 rounded-xl border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 active:scale-95 transition-transform flex items-center gap-1 cursor-pointer"
                title="Download Android APK"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>APK</span>
              </button>
            )}
            <button
              id="mobile-toggle-theme-btn"
              onClick={onToggleTheme}
              type="button"
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-transform cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              id="mobile-header-signin-btn"
              onClick={() => onEnterPortal('login')}
              type="button"
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 active:scale-95 transition-transform cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </header>

        <div className="px-4 pt-5 space-y-6">
          
          {/* Mobile Hero Banner */}
          <div id="mobile-hero-section" className="p-5 rounded-3xl bg-gradient-to-br from-white via-zinc-50 to-emerald-500/5 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-500/10 border border-zinc-200/80 dark:border-zinc-800/80 shadow-md space-y-4">
            
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold font-mono">
              <Sparkles className="w-3 h-3" />
              <span>MSU Academic Operations Platform</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              Smart Attendance & <br />
              <span className="text-emerald-500">Timetable Matrix</span>
            </h1>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Experience dynamic QR attendance, conflict-free scheduling, Friday Jum’ah prayer window protection, and zero-loss offline sync.
            </p>

            {/* Direct Action Buttons for Mobile */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                id="mobile-hero-launch-btn"
                onClick={() => onEnterPortal('register')}
                type="button"
                className="w-full py-3 px-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 stroke-[2.5]" />
                <span>Get Started</span>
              </button>

              <button
                id="mobile-hero-login-btn"
                onClick={() => onEnterPortal('login')}
                type="button"
                className="w-full py-3 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Portal Login</span>
              </button>
            </div>

          </div>

          {/* Mobile Interactive Feature Showcase */}
          <div id="mobile-interactive-showcase" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black uppercase tracking-wider text-zinc-400">
                Interactive Preview
              </h3>
              <span className="text-[10px] text-emerald-500 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Demo
              </span>
            </div>

            {/* Mobile Feature Pill Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800">
              <button
                id="mobile-pill-qr"
                type="button"
                onClick={() => setMobileFeatureTab('qr')}
                className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  mobileFeatureTab === 'qr'
                    ? 'bg-emerald-500 text-black shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                QR Check-In
              </button>
              <button
                id="mobile-pill-matrix"
                type="button"
                onClick={() => setMobileFeatureTab('matrix')}
                className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  mobileFeatureTab === 'matrix'
                    ? 'bg-emerald-500 text-black shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                MSU Matrix
              </button>
              <button
                id="mobile-pill-offline"
                type="button"
                onClick={() => setMobileFeatureTab('offline')}
                className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  mobileFeatureTab === 'offline'
                    ? 'bg-emerald-500 text-black shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                Offline Sync
              </button>
            </div>

            {/* Dynamic Mobile Feature Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs">
              <AnimatePresence mode="wait">
                {mobileFeatureTab === 'qr' ? (
                  <motion.div
                    key="mob-qr"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-500 text-black">
                          <QrCode className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Rolling Dynamic QR</h4>
                          <p className="text-[10px] text-zinc-400">Anti-proxy single use session</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        10m Grace
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-[11px] space-y-1.5">
                      <div className="flex justify-between font-bold">
                        <span className="text-zinc-400">CS 101 Roll Call</span>
                        <span className="text-emerald-500">Present (On Time)</span>
                      </div>
                      <div className="flex justify-between text-zinc-500">
                        <span>Room 204 • CCS Complex</span>
                        <span>08:14 AM</span>
                      </div>
                    </div>
                  </motion.div>
                ) : mobileFeatureTab === 'matrix' ? (
                  <motion.div
                    key="mob-matrix"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-500 text-black">
                          <Compass className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Friday Jum’ah Protection</h4>
                          <p className="text-[10px] text-zinc-400">Automatic cultural observance</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        11:30 - 1:30 PM
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] space-y-1 text-amber-900 dark:text-amber-300">
                      <p className="font-bold">🕌 Campus Mosque / Dimaporo</p>
                      <p className="text-[10px] opacity-80">Protected university window with zero class scheduling.</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="mob-offline"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-indigo-500 text-white">
                          <Wifi className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Autonomous Offline Engine</h4>
                          <p className="text-[10px] text-zinc-400">Auto-syncs upon reconnect</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        Zero Data Loss
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-[11px] flex justify-between items-center">
                      <span className="font-bold text-zinc-600 dark:text-zinc-300">Academic Standing</span>
                      <span className="font-mono font-black text-emerald-500">96.4% Good Standing</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Feature Highlights List */}
          <div id="mobile-highlights-list" className="space-y-2">
            <h3 className="text-xs font-mono font-black uppercase tracking-wider text-zinc-400">
              Campus Highlights
            </h3>

            <div className="space-y-2">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Single-Use Rolling QR</h5>
                  <p className="text-[10px] text-zinc-400">Faculty broadcast anti-proxy session tokens daily.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Digital Medical Excuse Slips</h5>
                  <p className="text-[10px] text-zinc-400">File infirmary slips with one-click instructor review.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">85% Standing Warning Alerts</h5>
                  <p className="text-[10px] text-zinc-400">Real-time alerts prevent dropped course standings.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Accordion FAQs */}
          <div id="mobile-faqs-section" className="space-y-2 pt-2">
            <h3 className="text-xs font-mono font-black uppercase tracking-wider text-zinc-400">
              Campus FAQs
            </h3>

            <div className="space-y-2">
              {faqs.map((faq, index) => {
                const isOpen = expandedFaq === index;
                return (
                  <div
                    key={index}
                    className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : index)}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-900 pt-2">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="pt-6 text-center text-[10px] text-zinc-400 space-y-1">
            <p className="font-mono font-bold text-zinc-600 dark:text-zinc-300">Mindanao State University • Main Campus</p>
            <p>© {new Date().getFullYear()} College of Computer Studies</p>
          </div>

        </div>

      </div>

      {/* ========================================================================== */}
      {/* 💻 DESKTOP & LAPTOP / PC EXPANSIVE WIDESCREEN LAYOUT (lg:block) */}
      {/* ========================================================================== */}
      <div className="hidden lg:block w-full">
        
        {/* 1. TOP NAVIGATION BAR */}
        <header id="desktop-landing-header" className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/80 dark:border-zinc-800/80 transition-all">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 text-black font-black font-mono text-lg shrink-0">
                CP
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-black text-base tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
                    ClassPulse
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                    MSU v2.0
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                  Mindanao State University • Main Campus
                </p>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <nav className="flex items-center gap-6 text-xs font-bold text-zinc-600 dark:text-zinc-300">
              <a href="#features" className="hover:text-emerald-500 transition-colors">Core Capabilities</a>
              <a href="#system-features" className="hover:text-emerald-500 transition-colors">System Features</a>
              <a href="#matrix" className="hover:text-emerald-500 transition-colors">Timetable Matrix</a>
              <a href="#roles" className="hover:text-emerald-500 transition-colors">Role Portals</a>
              <a href="#faq" className="hover:text-emerald-500 transition-colors">Campus FAQs</a>
            </nav>

            {/* Action CTAs */}
            <div className="flex items-center gap-3">
              {onOpenDownloadApp && (
                <button
                  id="desktop-header-download-apk-btn"
                  onClick={onOpenDownloadApp}
                  type="button"
                  className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Download Android APK / Install App"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Download APK</span>
                </button>
              )}

              <button
                id="desktop-toggle-theme-btn"
                onClick={onToggleTheme}
                type="button"
                className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500/40 transition-all cursor-pointer"
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                id="desktop-header-signin-btn"
                onClick={() => onEnterPortal('login')}
                type="button"
                className="px-4 py-2.5 text-xs font-black rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:text-emerald-500 transition-all cursor-pointer shadow-2xs"
              >
                Sign In
              </button>

              <button
                id="desktop-header-launch-btn"
                onClick={() => onEnterPortal('register')}
                type="button"
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>Launch Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </header>

        {/* 2. HERO SECTION */}
        <section className="relative overflow-hidden pt-16 pb-24 border-b border-zinc-200/80 dark:border-zinc-800/80">
          
          {/* Subtle Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[140px] rounded-full pointer-events-none -z-10" />
          <div className="absolute top-1/3 right-10 w-[450px] h-[350px] bg-indigo-500/10 dark:bg-indigo-500/5 blur-[140px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-12 gap-8 items-center">
              
              {/* Left Column */}
              <div className="col-span-7 text-left space-y-6">
                
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Next-Generation Academic Operations Platform</span>
                </div>

                <h1 className="text-4xl xl:text-5xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-[1.15]">
                  Smart Timetable Matrix & <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500">
                    Instant Attendance Check-In
                  </span>
                </h1>

                <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                  ClassPulse unifies the entire MSU academic ecosystem. Experience single-use rolling QR attendance verification, conflict-free timetable matrix scheduling, automated Friday Jum’ah prayer window protection, digital excuse letters, and zero-data-loss offline sync.
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-3.5 pt-2">
                  <button
                    id="desktop-hero-launch-btn"
                    onClick={() => onEnterPortal('register')}
                    type="button"
                    className="px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2.5"
                  >
                    <GraduationCap className="w-4 h-4 stroke-[2.5]" />
                    <span>Enter Student / Faculty Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href="#matrix"
                    className="px-6 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 hover:text-emerald-500 shadow-2xs"
                  >
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span>Preview Live Timetable</span>
                  </a>
                </div>

                {/* Verified Institutional Badges */}
                <div className="pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 grid grid-cols-3 gap-4 text-left">
                  <div>
                    <div className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">0s</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Latency Check-in</div>
                  </div>
                  <div>
                    <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">100%</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cloud Synchronized</div>
                  </div>
                  <div>
                    <div className="text-xl font-black font-mono text-indigo-500">MSU CCST</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Main Campus Ready</div>
                  </div>
                </div>

              </div>

              {/* Right Column: Live Interactive Simulation Card */}
              <div className="col-span-5">
                <div className="relative p-1 rounded-3xl bg-gradient-to-b from-zinc-200/80 via-emerald-500/20 to-zinc-200/80 dark:from-zinc-800 dark:via-emerald-500/20 dark:to-zinc-800 shadow-2xl">
                  
                  <div className="rounded-[22px] bg-white dark:bg-zinc-950 p-6 text-left space-y-4 border border-zinc-100 dark:border-zinc-900">
                    
                    {/* Top Bar */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-850">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-mono font-bold text-zinc-400 ml-2">MSU-Portal-Live</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    </div>

                    {/* Active Simulated Schedule Item */}
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500 text-black font-mono">
                          Active Now
                        </span>
                        <span className="text-[10px] font-mono font-bold text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          09:00 AM - 10:30 AM
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                          CS 101: Introduction to Computer Science
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          Room 204 • Science Complex
                        </p>
                      </div>

                      <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-400">Instructor:</span>
                          <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200">Dr. Ahmad Khan</span>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                          Present • On Time
                        </span>
                      </div>
                    </div>

                    {/* QR Scan Action Card Simulation */}
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500 text-black shrink-0">
                          <QrCode className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                            Single-Use QR Scanner
                          </div>
                          <div className="text-[10px] text-zinc-500 font-medium">
                            Anti-proxy rolling cryptographic token
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onEnterPortal('login')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-black transition-colors cursor-pointer"
                      >
                        Scan
                      </button>
                    </div>

                    {/* Standing / Safety Indicator */}
                    <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Academic Safety Status</span>
                      </div>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                        96.4% Good Standing
                      </span>
                    </div>

                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3. CORE CAPABILITIES */}
        <section id="features" className="py-20 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-500">
                Engineered for Institutional Precision
              </span>
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                Everything Needed for Modern Campus Operations
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Designed specifically around Mindanao State University academic policies, building layouts, and student needs.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-3 gap-5 text-left">
              
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs hover:border-emerald-500/50 transition-all space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <QrCode className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">
                  Single-Use Rolling QR Code
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Faculty generate one single dynamic session code per subject daily. Scans within 10 minutes are marked Present, 10–30 minutes Late, with automatic expiration preventing proxy attendance.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs hover:border-emerald-500/50 transition-all space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Compass className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                  MSU Friday Jum’ah Awareness
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Automatic cultural & religious window protection across all timetables (Friday 11:30 AM - 1:30 PM), ensuring zero lecture conflicts during university congregational prayers.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs hover:border-emerald-500/50 transition-all space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
                  <Wifi className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-500 transition-colors">
                  Zero-Data-Loss Offline Engine
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Scan attendance and check your schedules during campus network outages. The system queues transactions in resilient local storage and auto-syncs with Firestore once online.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs hover:border-emerald-500/50 transition-all space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 group-hover:text-teal-500 transition-colors">
                  Conflict-Free Timetable Matrix
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Switch seamlessly between Hourly Matrix, Day Columns, and Course Cards. Dynamic room clash and faculty schedule conflict detection prevent double bookings.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs hover:border-emerald-500/50 transition-all space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 group-hover:text-rose-500 transition-colors">
                  Medical Excuse Verification
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Students file digital excuse slips with medical infirmary attachments. Faculty approve or reject with a single click, instantly updating safety calculations.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs hover:border-emerald-500/50 transition-all space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors">
                  Automated Standing & CSV Export
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Real-time safety calculations with 85% warning alerts and &lt;75% dropped status. Export official institutional attendance CSV ledgers filtered by date range.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* 4. INTERACTIVE TIMETABLE MATRIX PREVIEW */}
        <section id="matrix" className="py-20 bg-zinc-100/50 dark:bg-zinc-900/30 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-8 text-left">
            
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-500">
                  Interactive Schedule Visualizer
                </span>
                <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
                  MSU Weekly Timetable Matrix
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Toggle between days to preview responsive course slots and prayer windows.
                </p>
              </div>

              {/* Day Selector Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800">
                {(['mon', 'wed', 'fri'] as const).map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setActiveMatrixDay(day)}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeMatrixDay === day
                        ? 'bg-emerald-500 text-black shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {day === 'mon' ? 'Monday' : day === 'wed' ? 'Wednesday' : 'Friday (Jum\'ah)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Slots Grid */}
            <div className="grid grid-cols-3 gap-4">
              {previewClasses[activeMatrixDay].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className={`p-5 rounded-2xl border transition-all text-left space-y-3 ${
                    (item as any).isJumah
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-md font-mono ${
                      (item as any).isJumah ? 'bg-amber-500 text-black' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {item.code}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-400">
                      {item.time}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{item.room} ({item.cluster})</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-zinc-400 font-medium">Status</span>
                    <span className={(item as any).isJumah ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-500 font-bold'}>
                      {item.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                  Integrated with all MSU Main Campus building clusters: College of Computer Studies, Science Complex, Engineering, and Liberal Arts.
                </p>
              </div>
              <button
                onClick={() => onEnterPortal('login')}
                type="button"
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-black text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0"
              >
                Sign In to View Full Matrix
              </button>
            </div>

          </div>
        </section>

        {/* 5. MULTI-ROLE ECOSYSTEM PORTALS PREVIEW */}
        <section id="roles" className="py-20 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12 text-left">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-500">
                Role-Based Access Control
              </span>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Tailored Portals for Every Campus Stakeholder
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Switch roles seamlessly with dedicated command dashboards and instant permissions.
              </p>
            </div>

            {/* Role Navigation Buttons */}
            <div className="flex justify-center">
              <div className="inline-flex p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveRoleTab('student')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeRoleTab === 'student'
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Student Portal
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoleTab('faculty')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeRoleTab === 'faculty'
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Faculty Command
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoleTab('admin')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeRoleTab === 'admin'
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Registrar & Admin
                </button>
              </div>
            </div>

            {/* Role Features Showcase */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-md">
              <AnimatePresence mode="wait">
                {activeRoleTab === 'student' ? (
                  <motion.div
                    key="tab-student"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-2 gap-8 items-center"
                  >
                    <div className="space-y-4">
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        STUDENT EXPERIENCE
                      </span>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                        Stay Ahead of Every Lecture & Standing
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Instant scanner captures rotating class tokens in milliseconds. View attendance safety percentages, inspect your weekly matrix, file medical leaves, and chat with professors and classmates.
                      </p>
                      <ul className="space-y-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                          <span>Real-time QR Camera scanner & code manual fallback</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                          <span>85% Attendance warning alerts & standing tracker</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                          <span>Direct excuse slip submission with medical receipts</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => onEnterPortal('register')}
                        className="mt-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-sm"
                      >
                        Register Student Account
                      </button>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-zinc-400 font-mono">STUDENT DASHBOARD METRICS</span>
                        <span className="text-emerald-500 font-mono">LIVE PREVIEW</span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Total Enrolled Subjects</span>
                          <span className="font-mono font-black text-emerald-500">6 Courses</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Cumulative Attendance Safety</span>
                          <span className="font-mono font-black text-emerald-500">96.8% (Safe)</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Unexcused Absences</span>
                          <span className="font-mono font-black text-zinc-400">0 Classes</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : activeRoleTab === 'faculty' ? (
                  <motion.div
                    key="tab-faculty"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-2 gap-8 items-center"
                  >
                    <div className="space-y-4">
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        FACULTY COMMAND CENTER
                      </span>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                        Total Class Control & 1-Click Roll Calls
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Broadcast dynamic session keys on classroom projectors, review active rosters in real-time, approve medical excuse applications, and export consolidated institutional attendance spreadsheets in seconds.
                      </p>
                      <ul className="space-y-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                          <span>Single-session rotating QR generator with projector full-screen</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                          <span>Batch review & approve excuse letters</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                          <span>Export CSV ledgers with date-range filters</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => onEnterPortal('login')}
                        className="mt-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-sm"
                      >
                        Sign In to Faculty Command
                      </button>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-zinc-400 font-mono">FACULTY ACTIVE SESSION</span>
                        <span className="text-indigo-500 font-mono">QR ACTIVE</span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Assigned Sections</span>
                          <span className="font-mono font-black text-indigo-500">4 Active Courses</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Pending Excuse Requests</span>
                          <span className="font-mono font-black text-amber-500">2 In Review</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Quick Roll Call Status</span>
                          <span className="font-mono font-black text-emerald-500">38 Present / 2 Late</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="tab-admin"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-2 gap-8 items-center"
                  >
                    <div className="space-y-4">
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        REGISTRAR & SYSTEM ADMINISTRATION
                      </span>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                        University Registry, Conflict Audits & Policy Enforcement
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Orchestrate university-wide course catalogues, review room clashes across campus buildings, approve credential password resets, and broadcast official campus announcements.
                      </p>
                      <ul className="space-y-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                          <span>University curriculum, room cluster, and lab manager</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                          <span>One-click credential reset approvals & account verification</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                          <span>Comprehensive audit logs & university attendance trends</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => onEnterPortal('login')}
                        className="mt-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-sm"
                      >
                        Sign In as Registrar / Admin
                      </button>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-zinc-400 font-mono">ADMINISTRATIVE OVERVIEW</span>
                        <span className="text-amber-500 font-mono">REGISTRY LIVE</span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Total Registered Catalog</span>
                          <span className="font-mono font-black text-zinc-900 dark:text-zinc-100">All Semesters Active</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Room Clash Validator</span>
                          <span className="font-mono font-black text-emerald-500">0 Conflicts Detected</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Security Audit Trail</span>
                          <span className="font-mono font-black text-indigo-400">100% Encrypted</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </section>

        {/* 6. SYSTEM CAPABILITIES & COMPREHENSIVE FEATURES MATRIX */}
        <section id="system-features" className="py-20 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12 text-left">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-500">
                End-To-End Academic Platform
              </span>
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                Complete System Architecture & Feature Suite
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Explore the full breadth of integrated modules engineered specifically for Mindanao State University students, faculty members, and academic administrators.
              </p>
            </div>

            {/* Comprehensive Features Showcase Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Feature 1 */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <QrCode className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Single-Use Rolling QR Code</h3>
                    <span className="text-[10px] font-mono font-bold text-emerald-500">Anti-Proxy Protection</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Cryptographically secure attendance tokens refreshed dynamically per session. Scans within 10 minutes count as Present, 10–30 minutes Late, and expired beyond 30 minutes.
                </p>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap gap-1.5 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">10-min Window</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Camera Scanner</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Projector View</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Compass className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">MSU Friday Jum’ah Window</h3>
                    <span className="text-[10px] font-mono font-bold text-amber-500">Cultural & Religious Respect</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Automated institutional scheduling blackout from 11:30 AM to 1:30 PM every Friday across all colleges, guaranteeing zero conflicts with university congregational prayers.
                </p>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap gap-1.5 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Protected Slots</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Visual Indicator</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Zero Conflict</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Wifi className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Zero-Data-Loss Offline Sync</h3>
                    <span className="text-[10px] font-mono font-bold text-indigo-500">Resilient Persistence</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Seamlessly take roll call and review course schedules even in campus dead zones. Queued attendance events automatically sync to the cloud once network connectivity is restored.
                </p>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap gap-1.5 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Queue Manager</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Auto Retries</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Status Badge</span>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Layers className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Conflict-Free Timetable Matrix</h3>
                    <span className="text-[10px] font-mono font-bold text-teal-500">Multi-View Scheduling</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Switch dynamically between Hourly Matrix, Day Columns, and Course Cards. Integrated room collision and instructor double-booking prevention engine.
                </p>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap gap-1.5 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Hourly Grid</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Room Mapping</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Clash Prevention</span>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <FileText className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Digital Medical Excuse System</h3>
                    <span className="text-[10px] font-mono font-bold text-rose-500">Infirmary Verification</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Students upload medical certificates and hospital documents. Faculty inspect attachments and approve or reject excuses, recalculating standing scores in real-time.
                </p>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap gap-1.5 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Attachment Viewer</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">1-Click Approve</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Audit History</span>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Award className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Official Accreditation & CSV Export</h3>
                    <span className="text-[10px] font-mono font-bold text-blue-500">CHED & Institutional Ready</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Clean, streamlined export of official university ledgers, date-range attendance sheets, faculty consultation summaries, and CHED compliance audits.
                </p>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap gap-1.5 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">CSV Reports</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">CHED Compliant</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold">Custom Range</span>
                </div>
              </div>

            </div>

            {/* Mobile & Standalone APK Download Banner */}
            {onOpenDownloadApp && (
              <div className="p-8 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950 border border-emerald-500/30 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-left max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android & Mobile Companion App</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    Download ClassPulse APK for Android
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Install ClassPulse directly on your smartphone for faster QR scanning, offline caching, instant class notifications, and full home screen access without browser bars.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={onOpenDownloadApp}
                    type="button"
                    className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2.5"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Mobile APK</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* 7. CAMPUS FAQ SECTION */}
        <section id="faq" className="py-20 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/30">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 space-y-10 text-left">
            
            <div className="text-center space-y-3">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-500">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Got Questions About ClassPulse at MSU?
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-2">
                  <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    {faq.q}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pl-6">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* 7. BOTTOM CALL TO ACTION BANNER */}
        <section className="py-20 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="p-12 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-black text-center space-y-6 shadow-2xl relative">
              
              <span className="text-xs font-mono font-black uppercase tracking-widest text-black/80 px-3 py-1 rounded-full bg-black/10">
                Mindanao State University Academic Portal
              </span>

              <h2 className="text-4xl font-black tracking-tight text-black max-w-2xl mx-auto leading-tight">
                Ready to Experience Conflict-Free Timetables & Instant Check-Ins?
              </h2>

              <p className="text-sm text-black/80 max-w-xl mx-auto font-medium">
                Join thousands of MSU students, faculty instructors, and registrars managing academic schedules seamlessly.
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  id="desktop-cta-launch-btn"
                  onClick={() => onEnterPortal('register')}
                  type="button"
                  className="px-8 py-3.5 rounded-xl bg-black text-white hover:bg-zinc-900 text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>Launch Portal Now</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                <button
                  id="desktop-cta-signin-btn"
                  onClick={() => onEnterPortal('login')}
                  type="button"
                  className="px-6 py-3.5 rounded-xl bg-white/20 hover:bg-white/30 text-black text-xs font-black uppercase tracking-wider cursor-pointer transition-all border border-black/10"
                >
                  Sign In to Existing Account
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* 8. FOOTER */}
        <footer className="py-12 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono">
              <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-black text-xs">
                CP
              </div>
              <span className="font-black text-zinc-800 dark:text-zinc-200">ClassPulse MSU</span>
              <span>•</span>
              <span>College of Computer Studies</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-bold">
              <a href="#features" className="hover:text-emerald-500 transition-colors">Features</a>
              <a href="#matrix" className="hover:text-emerald-500 transition-colors">Timetable</a>
              <a href="#roles" className="hover:text-emerald-500 transition-colors">Portals</a>
              <button onClick={() => onEnterPortal('login')} className="hover:text-emerald-500 transition-colors cursor-pointer">Portal Login</button>
            </div>

            <p className="text-[11px] text-zinc-400">
              © {new Date().getFullYear()} Mindanao State University. All rights reserved.
            </p>
          </div>
        </footer>

      </div>

    </div>
  );
}
