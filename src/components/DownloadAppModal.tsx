import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  X,
  ShieldCheck,
  Laptop,
  Check,
  Zap,
  Activity,
  Copy,
  Terminal,
  ExternalLink,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadAppModal({ isOpen, onClose }: DownloadAppModalProps) {
  const [activePlatformTab, setActivePlatformTab] = useState<'android' | 'ios' | 'pwa' | 'capacitor'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [installStatusMessage, setInstallStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // Listen for the browser's native PWA / WebAPK install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallStatusMessage('ClassPulse is installed on your device!');
      try {
        localStorage.setItem('cp_is_installed', 'true');
      } catch (e) {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  // Direct Android WebAPK native prompt
  const handleTriggerNativeInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setInstallStatusMessage('ClassPulse is now installed on your device!');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else {
      setInstallStatusMessage('To install: Open your browser menu (⋮) and tap "Install app" or "Add to Home Screen".');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop dismiss */}
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-7 text-left space-y-5 overflow-hidden z-10 my-auto"
        >
          {/* Accent Top Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header with System Logo */}
          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black shadow-md shadow-emerald-500/20 shrink-0">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight font-sans uppercase">
                  Class<span className="text-emerald-500">Pulse</span> App
                </h3>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Cross-Platform
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Mindanao State University • Fast QR Check-in & Offline Sync
              </p>
            </div>
          </div>

          {/* Status / Feedback Banner */}
          {installStatusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Installation Notice</span>
                <span>{installStatusMessage}</span>
              </div>
            </motion.div>
          )}

          {/* Platform Selection Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActivePlatformTab('android')}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activePlatformTab === 'android'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformTab('ios')}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activePlatformTab === 'ios'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">iOS</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformTab('pwa')}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activePlatformTab === 'pwa'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Windows</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformTab('capacitor')}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activePlatformTab === 'capacitor'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">APK Build</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activePlatformTab === 'android' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Direct Android Installation (WebAPK)
                    </span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Android 8.0+</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Installs ClassPulse as a standalone app on your Android phone or tablet. Works completely full-screen with offline caching and hardware camera QR scanning.
                  </p>
                </div>

                {/* Main Action Button */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerNativeInstall}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-black stroke-[3]" />
                    <span>{deferredPrompt ? '1-Tap Install on Android' : 'Install ClassPulse App'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-3 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    title="Copy direct portal link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 block">How to install via browser:</span>
                  <div className="space-y-1">
                    <p>1. Open this page in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.</p>
                    <p>2. Tap the three-dot menu icon (<strong>⋮</strong>) in the top-right corner.</p>
                    <p>3. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                    <p>4. Android automatically generates your native WebAPK launcher icon.</p>
                  </div>
                </div>
              </div>
            )}

            {activePlatformTab === 'ios' && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    Install on iPhone / iPad (Safari)
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
                <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal pl-4 leading-relaxed">
                  <li>Open this link in <strong>Safari</strong> on your Apple device.</li>
                  <li>Tap the <strong>Share</strong> button (the square with an upward arrow) in the bottom toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> at top right. ClassPulse opens as a dedicated full-screen app.</li>
                </ol>
              </div>
            )}

            {activePlatformTab === 'pwa' && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-emerald-500" />
                  Install on Windows PC / Mac
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  In Microsoft Edge, Google Chrome, or Brave:
                </p>
                <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal pl-4 leading-relaxed">
                  <li>Look for the <strong>Install</strong> icon in the address bar (right side).</li>
                  <li>Click <strong>Install ClassPulse</strong>.</li>
                  <li>ClassPulse will launch in its own window and can be pinned to your Windows Taskbar or Mac Dock.</li>
                </ol>
                {deferredPrompt && (
                  <button
                    type="button"
                    onClick={handleTriggerNativeInstall}
                    className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <span>Install ClassPulse on Desktop</span>
                  </button>
                )}
              </div>
            )}

            {activePlatformTab === 'capacitor' && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    Build Native Android APK (.apk)
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-400">Capacitor CLI</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  To compile a standalone, signed APK for distribution or sideloading:
                </p>
                <div className="p-3 rounded-xl bg-zinc-900 text-zinc-200 font-mono text-[11px] space-y-1 overflow-x-auto">
                  <p className="text-zinc-500"># 1. Build web bundle & initialize Capacitor</p>
                  <p className="text-emerald-400">npm run build</p>
                  <p className="text-emerald-400">npx cap init ClassPulse ph.edu.msu.classpulse</p>
                  <p className="text-emerald-400">npx cap add android</p>
                  <p className="text-zinc-500 mt-1"># 2. Build signed APK in Android Studio</p>
                  <p className="text-emerald-400">npx cap open android</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Mindanao State University</span>
            <span>Production Version 2.0</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
