import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Smartphone,
  CheckCircle,
  X,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Laptop,
  Check
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadAppModal({ isOpen, onClose }: DownloadAppModalProps) {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<'android' | 'ios' | 'pwa'>('android');

  if (!isOpen) return null;

  const handleTriggerApkDownload = () => {
    setDownloadStarted(true);

    // Create a mock APK download blob / trigger
    const manifestBlob = new Blob([
      JSON.stringify({
        name: "ClassPulse MSU",
        short_name: "ClassPulse",
        package: "ph.edu.msu.classpulse",
        version: "2.4.0",
        build: "Production Release 2026.1",
        description: "Official Mindanao State University Smart Attendance & Consultation Engine",
        compiledAt: new Date().toISOString()
      }, null, 2)
    ], { type: 'application/octet-stream' });

    const url = URL.createObjectURL(manifestBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ClassPulse-MSU-v2.4.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setDownloadStarted(false);
    }, 4000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 text-left space-y-6 overflow-hidden"
        >
          {/* Top Decorative accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-sky-500" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black font-mono text-xl shadow-lg shadow-emerald-500/20 shrink-0">
              <Smartphone className="w-7 h-7" />
            </div>
            <div className="min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Download ClassPulse App
                </h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  v2.4 APK
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Experience ultra-fast QR camera scanning, background offline sync, and instant class notifications.
              </p>
            </div>
          </div>

          {/* Platform Switcher */}
          <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActivePlatformTab('android')}
              className={`py-2 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activePlatformTab === 'android'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android APK</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformTab('ios')}
              className={`py-2 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activePlatformTab === 'ios'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iOS Install</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformTab('pwa')}
              className={`py-2 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activePlatformTab === 'pwa'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Desktop PWA</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activePlatformTab === 'android' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Official MSU Campus Release (.apk)
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400">14.2 MB</span>
                  </div>
                  <ul className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5 list-disc pl-4">
                    <li>Bypasses landing screen directly into student/faculty dashboard</li>
                    <li>Full camera hardware scanner integration with auto exposure</li>
                    <li>Offline scan buffering with automatic cloud sync</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerApkDownload}
                  disabled={downloadStarted}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer disabled:opacity-75"
                >
                  {downloadStarted ? (
                    <>
                      <Check className="w-4 h-4 text-black stroke-[3]" />
                      <span>Downloading ClassPulse APK...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Download Android APK Package</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {activePlatformTab === 'ios' && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3 text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  How to Install on iPhone / iPad (Safari)
                </h4>
                <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal pl-4 leading-relaxed font-medium">
                  <li>Open this webpage in <strong>Safari</strong> on your iPhone.</li>
                  <li>Tap the <strong>Share</strong> button (box with an upward arrow) at the bottom toolbar.</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                  <li>Tap <strong>Add</strong> at top right. ClassPulse will launch natively as a standalone app without browser bars!</li>
                </ol>
              </div>
            )}

            {activePlatformTab === 'pwa' && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3 text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Instant Web App (Windows / Mac / Linux)
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Click the install icon in your browser's address bar (Chrome, Edge, or Brave) or select <strong>Menu &gt; Install ClassPulse</strong> to install it directly to your desktop.
                </p>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[10px] text-zinc-400">
            <span>Mindanao State University • Academic IT</span>
            <span>Free & Open to all MSU Constituents</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
