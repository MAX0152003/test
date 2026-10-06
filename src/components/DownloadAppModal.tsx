import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropMotion, modalCardMotion } from '../lib/animationTransitions';
import {
  Smartphone,
  X,
  Share2,
  Download,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  RotateCw
} from 'lucide-react';
import { autoPermissions } from '../lib/autoPermissions';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'android' | 'ios' | 'qr';
}

export default function DownloadAppModal({
  isOpen,
  onClose,
  defaultTab
}: DownloadAppModalProps) {
  // Detect mobile platform to automatically present the most relevant tab
  const getInitialTab = (): 'android' | 'ios' | 'qr' => {
    if (defaultTab) return defaultTab;
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return 'ios';
      if (/android/.test(ua)) return 'android';
    }
    return 'android';
  };

  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'qr'>(getInitialTab);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(getInitialTab());
      setStatusMessage(null);
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone);
    }

    // Listen for browser native PWA / WebAPK install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setStatusMessage('ClassPulse has been installed successfully!');
      try {
        localStorage.setItem('cp_is_installed', 'true');
      } catch (e) {}
      autoPermissions.requestAllPermissions(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://classpulse.msu.edu.ph';

  // 1-Tap browser install
  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setStatusMessage('ClassPulse is now installed on your home screen!');
          autoPermissions.requestAllPermissions(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else {
      setStatusMessage('Open your browser menu (⋮) and tap "Install app" or "Add to Home Screen".');
    }
  };

  // Direct APK download
  const handleDownloadApk = async () => {
    setIsDownloadingApk(true);
    setStatusMessage('Downloading ClassPulse-MSU-v2.0.apk...');

    try {
      const response = await fetch('/ClassPulse-MSU-v2.0.apk');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ClassPulse-MSU-v2.0.apk';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const a = document.createElement('a');
        a.href = '/ClassPulse-MSU-v2.0.apk';
        a.download = 'ClassPulse-MSU-v2.0.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setStatusMessage('APK downloaded! Tap the downloaded file in your notifications or Downloads folder to install.');
    } catch {
      const a = document.createElement('a');
      a.href = '/ClassPulse-MSU-v2.0.apk';
      a.download = 'ClassPulse-MSU-v2.0.apk';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatusMessage('APK download started.');
    } finally {
      setTimeout(() => setIsDownloadingApk(false), 2000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentOrigin).then(() => {
      setCopiedLink(true);
      setStatusMessage('App link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // High-contrast QR code for instant opening on phone
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentOrigin)}&color=059669`;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <motion.div
          {...modalBackdropMotion}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          {...modalCardMotion}
          className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 text-left space-y-4 overflow-hidden z-10 my-auto"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Clean Header */}
          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Install ClassPulse
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Works wirelessly on iPhone, iPad, Android & Desktop
              </p>
            </div>
          </div>

          {/* Simple Tab Bar */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('android');
                setStatusMessage(null);
              }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('ios');
                setStatusMessage(null);
              }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>iPhone / iOS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('qr');
                setStatusMessage(null);
              }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan QR</span>
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="leading-snug">{statusMessage}</span>
            </motion.div>
          )}

          {/* Tab 1: Android */}
          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="space-y-2">
                {/* Option 1: 1-Tap Web Install */}
                <button
                  type="button"
                  onClick={handleTriggerInstall}
                  className="w-full p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-between shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <Zap className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="font-bold">1-Tap Install (Recommended)</div>
                      <div className="text-[11px] font-normal opacity-90">Instant install without downloading files</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-black/10 px-2 py-0.5 rounded">
                    {isInstalled ? 'Installed' : 'Install'}
                  </span>
                </button>

                {/* Option 2: Standalone APK */}
                <button
                  type="button"
                  onClick={handleDownloadApk}
                  disabled={isDownloadingApk}
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    {isDownloadingApk ? (
                      <RotateCw className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                    ) : (
                      <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold">Download APK (.apk)</div>
                      <div className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                        8.4 MB · Standalone installer for any Android phone
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {isDownloadingApk ? 'Downloading...' : 'Get APK'}
                  </span>
                </button>
              </div>

              {/* Simple 3-step sideload guide */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  How to install on Android:
                </span>
                <p>1. Tap <strong>1-Tap Install</strong> (or Download APK).</p>
                <p>2. If downloading APK, open the file from your notifications.</p>
                <p>3. Tap <strong>Install</strong> when prompted.</p>
              </div>
            </div>
          )}

          {/* Tab 2: iPhone / iOS */}
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                  3 Easy Steps on Safari:
                </span>
                <div className="space-y-2 leading-relaxed text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">1</span>
                    <span>Open this website in <strong>Safari</strong> on your iPhone or iPad.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">2</span>
                    <span>Tap the <strong>Share</strong> button (square with arrow up) in the Safari toolbar.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">3</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong>, then tap <strong>Add</strong>.</span>
                  </div>
                </div>
              </div>

              {/* Copy link button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy App Link to Open in Safari'}</span>
              </button>
            </div>
          )}

          {/* Tab 3: Scan QR Code */}
          {activeTab === 'qr' && (
            <div className="space-y-3 text-center">
              <div className="p-3 bg-white rounded-2xl shadow-xs border border-zinc-200 dark:border-zinc-800 inline-block mx-auto">
                <img
                  src={qrCodeUrl}
                  alt="ClassPulse QR Code"
                  className="w-40 h-40 object-contain mx-auto rounded-lg"
                />
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Scan with your phone's camera to open and install ClassPulse immediately without typing the URL.
              </p>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Mindanao State University</span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Offline Ready</span>
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
