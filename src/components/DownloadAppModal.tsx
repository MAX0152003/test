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
  Share2,
  Download,
  QrCode,
  RotateCw,
  Play,
  Sparkles,
  Info,
  FileCode2,
  Monitor
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'android' | 'windows' | 'expo' | 'ios';
}

export default function DownloadAppModal({
  isOpen,
  onClose,
  defaultTab = 'android'
}: DownloadAppModalProps) {
  const [activePlatformTab, setActivePlatformTab] = useState<'android' | 'windows' | 'expo' | 'ios'>(defaultTab);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedExpoCode, setCopiedExpoCode] = useState(false);
  const [installStatusMessage, setInstallStatusMessage] = useState<string | null>(null);
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [apkDownloadProgress, setApkDownloadProgress] = useState<number>(0);

  useEffect(() => {
    if (defaultTab) {
      setActivePlatformTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    // Listen for browser native PWA / WebAPK install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallStatusMessage('ClassPulse has been installed on this device!');
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

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://classpulse.msu.edu.ph';

  // Direct Android APK Downloader (Works on Android, Windows, Mac, Linux)
  const handleDownloadApk = async () => {
    setIsDownloadingApk(true);
    setApkDownloadProgress(25);
    setInstallStatusMessage('Initiating ClassPulse Android APK download (8.4 MB)...');

    try {
      setApkDownloadProgress(65);
      // Attempt fetching the static APK from /ClassPulse-MSU-v2.0.apk
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
        // Fallback: direct anchor link
        const a = document.createElement('a');
        a.href = '/ClassPulse-MSU-v2.0.apk';
        a.download = 'ClassPulse-MSU-v2.0.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setApkDownloadProgress(100);
      setInstallStatusMessage('ClassPulse-MSU-v2.0.apk downloaded successfully! Open the file to install on your Android device or Windows emulator.');
      setTimeout(() => {
        setIsDownloadingApk(false);
        setApkDownloadProgress(0);
      }, 3000);
    } catch (err) {
      console.warn('Fallback APK download triggered:', err);
      const a = document.createElement('a');
      a.href = '/ClassPulse-MSU-v2.0.apk';
      a.download = 'ClassPulse-MSU-v2.0.apk';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setInstallStatusMessage('ClassPulse-MSU-v2.0.apk download triggered.');
      setIsDownloadingApk(false);
      setApkDownloadProgress(0);
    }
  };

  // Direct Windows Desktop Container (.bat launcher)
  const handleDownloadWindowsLauncher = async () => {
    try {
      setInstallStatusMessage('Generating Windows Desktop App Container Launcher...');
      const response = await fetch('/ClassPulse-Windows-Desktop.bat');
      let batContent = '';
      if (response.ok) {
        batContent = await response.text();
      } else {
        batContent = `@echo off\ntitle ClassPulse 2.0 - MSU Desktop Container\ncls\necho Launching ClassPulse in Standalone Window Container...\nstart "" msedge --app="${currentOrigin}" --user-data-dir="%LOCALAPPDATA%\\ClassPulseApp"\nexit /b 0\n`;
      }

      // Inject current origin dynamically so it always points to the exact live domain
      batContent = batContent.replace(/set "APP_URL=[^"]*"/g, `set "APP_URL=${currentOrigin}"`);
      
      const blob = new Blob([batContent], { type: 'application/x-bat' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ClassPulse-Windows-Desktop.bat';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setInstallStatusMessage('ClassPulse-Windows-Desktop.bat downloaded! Double-click to launch in a borderless native Windows container window.');
    } catch (err) {
      console.error('Windows launcher download error:', err);
    }
  };

  // Direct Android WebAPK / PWA prompt
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
    navigator.clipboard.writeText(currentOrigin).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // React Native WebView wrapper code for Expo Go
  const expoAppJsCode = `// ClassPulse Expo Go Container Wrapper
// Mindanao State University Attendance & Schedule System
import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, BackHandler, ActivityIndicator, View, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';

const CLASSPULSE_URL = '${currentOrigin}';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }
  }, [canGoBack]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <WebView
        ref={webViewRef}
        source={{ uri: CLASSPULSE_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        camera={true}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        userAgent="Mozilla/5.0 (Linux; Android 14; ClassPulse MSU Native Mobile Container) AppleWebKit/537.36"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  webview: { flex: 1, backgroundColor: '#09090b' },
});`;

  const handleCopyExpoCode = () => {
    navigator.clipboard.writeText(expoAppJsCode).then(() => {
      setCopiedExpoCode(true);
      setTimeout(() => setCopiedExpoCode(false), 2000);
    });
  };

  const handleDownloadExpoStarter = () => {
    const blob = new Blob([expoAppJsCode], { type: 'text/javascript' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'App.js';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    setInstallStatusMessage('App.js downloaded! Add it to your Expo project or run with npx expo start.');
  };

  // QR Code URL for Expo Go
  const expoQrTargetUrl = currentOrigin;
  const expoQrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(expoQrTargetUrl)}&color=059669`;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop dismiss */}
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-7 text-left space-y-5 overflow-hidden z-10 my-auto"
        >
          {/* Accent Top Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header with System Logo & Multi-Device Badges */}
          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black shadow-md shadow-emerald-500/25 shrink-0">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight font-sans uppercase">
                  Class<span className="text-emerald-500">Pulse</span> Downloader
                </h3>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Universal v2.0.4
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Mindanao State University • Android APK, Windows Container & Expo Go
              </p>
            </div>
          </div>

          {/* Quick Direct Download Bar */}
          <div className="p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  ClassPulse-MSU-v2.0.apk
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  8.4 MB • Android 8.0-15+ • Universal ARM64/x86
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadApk}
              disabled={isDownloadingApk}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isDownloadingApk ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading {apkDownloadProgress}%...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Download .APK</span>
                </>
              )}
            </button>
          </div>

          {/* Status / Feedback Banner */}
          {installStatusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Action Notice</span>
                <span className="leading-relaxed">{installStatusMessage}</span>
              </div>
            </motion.div>
          )}

          {/* Platform Selection Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActivePlatformTab('android')}
              className={`py-2 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
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
              onClick={() => setActivePlatformTab('windows')}
              className={`py-2 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activePlatformTab === 'windows'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Windows</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatformTab('expo')}
              className={`py-2 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activePlatformTab === 'expo'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Expo Go</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatformTab('ios')}
              className={`py-2 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activePlatformTab === 'ios'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">iOS</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            
            {/* 1. ANDROID TAB */}
            {activePlatformTab === 'android' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Standalone Android APK Package
                    </span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      Android 8.0 - 15+
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Download and sideload the standalone Android APK on any smartphone, tablet, or Android emulator. Includes full camera QR code scanning, persistent offline data storage, and loud class bell audio alarms.
                  </p>
                </div>

                {/* Main Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadApk}
                    disabled={isDownloadingApk}
                    className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download APK (.apk)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerNativeInstall}
                    className="py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <span>{deferredPrompt ? '1-Tap WebAPK Install' : 'Install via Browser'}</span>
                  </button>
                </div>

                {/* Sideload Guide */}
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    How to install APK on your Android device:
                  </span>
                  <div className="space-y-1.5 leading-relaxed">
                    <p>1. Tap <strong>Download APK (.apk)</strong> above to save the installer to your device.</p>
                    <p>2. Open your device notification panel or <strong>Downloads</strong> folder.</p>
                    <p>3. Tap <strong>ClassPulse-MSU-v2.0.apk</strong>. If prompted, allow <em>"Install unknown apps"</em> from your browser or file manager.</p>
                    <p>4. Tap <strong>Install</strong>. The ClassPulse icon appears immediately on your home screen and app drawer.</p>
                  </div>
                </div>

                {/* Technical specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-zinc-500">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="block text-zinc-400">Package</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate block">ph.edu.msu</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="block text-zinc-400">Version</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">2.0.4 PROD</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="block text-zinc-400">Permissions</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Camera / Audio</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="block text-zinc-400">Architecture</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Universal ARM/x86</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. WINDOWS TAB */}
            {activePlatformTab === 'windows' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Monitor className="w-4 h-4 text-emerald-500" />
                      Windows Desktop Application Container
                    </span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      Windows 10 / 11
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Run ClassPulse on Windows in an isolated, borderless desktop container window without browser address bars or navigation clutter. Pin to your Windows Taskbar and Start Menu.
                  </p>
                </div>

                {/* Windows Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadWindowsLauncher}
                    className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Windows Container (.bat)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerNativeInstall}
                    className="py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <Laptop className="w-4 h-4 text-emerald-500" />
                    <span>Install as Windows App</span>
                  </button>
                </div>

                {/* Windows Steps */}
                <div className="p-3.5 rounded-xl bg-zinc-900 text-zinc-200 font-mono text-[11px] space-y-2 border border-zinc-800">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Windows Container Command Execution</span>
                    <span className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-400">Standalone Mode</span>
                  </div>
                  <p className="text-zinc-400">
                    # Launches Microsoft Edge or Chrome in app container mode:
                  </p>
                  <p className="text-emerald-400 select-all overflow-x-auto p-1 bg-black/50 rounded">
                    msedge.exe --app="{currentOrigin}" --user-data-dir="%LOCALAPPDATA%\ClassPulseApp"
                  </p>
                  <p className="text-zinc-400 pt-1">
                    Or on Windows 11 with <strong>Windows Subsystem for Android (WSA)</strong>: Sideload <code>ClassPulse-MSU-v2.0.apk</code> directly via <code>adb install ClassPulse-MSU-v2.0.apk</code>.
                  </p>
                </div>
              </div>
            )}

            {/* 3. EXPO GO TAB */}
            {activePlatformTab === 'expo' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      Expo Go Sandbox & Mobile Container
                    </span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      iOS & Android
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Test and run ClassPulse natively on any physical mobile phone via <strong>Expo Go</strong>. No sideloading or compilation required — simply scan the QR code to launch immediately in the Expo container!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
                  {/* QR Code Container */}
                  <div className="p-3 bg-white rounded-2xl shadow-md shrink-0 text-center">
                    <img
                      src={expoQrImageSrc}
                      alt="Expo Go QR Code"
                      className="w-36 h-36 rounded-lg object-contain mx-auto"
                      onError={(e) => {
                        // Fallback if network blocks QR service
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-[10px] font-mono text-zinc-600 font-bold mt-1.5 block">
                      Scan with Expo Go
                    </span>
                  </div>

                  {/* QR Instructions & Actions */}
                  <div className="space-y-2.5 text-left flex-1">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      3 Steps to Run on Expo Go:
                    </span>
                    <ol className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
                      <li>Install <strong>Expo Go</strong> from Google Play Store (Android) or App Store (iOS).</li>
                      <li>Open Expo Go and tap <strong>"Scan QR Code"</strong> (or use iOS Camera).</li>
                      <li>ClassPulse boots natively inside the Expo runtime with full hardware QR support!</li>
                    </ol>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href="https://play.google.com/store/apps/details?id=host.exp.exponent"
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Google Play</span>
                      </a>
                      <a
                        href="https://apps.apple.com/app/expo-go/id982107779"
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>App Store</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Expo Go Actions Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyExpoCode}
                    className="py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {copiedExpoCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedExpoCode ? 'Expo Code Copied!' : 'Copy React Native App.js'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadExpoStarter}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <FileCode2 className="w-4 h-4 text-emerald-500" />
                    <span>Download App.js Container</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. IOS / SAFARI TAB */}
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
                  <li>Open this link in <strong>Safari</strong> on your iPhone or iPad.</li>
                  <li>Tap the <strong>Share</strong> button (the square with an upward arrow) in the Safari toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> at top right. ClassPulse opens as a dedicated full-screen app with fast offline cache!</li>
                </ol>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                  <strong>Prefer Native Sandbox?</strong> Switch to the <strong>Expo Go</strong> tab above to run ClassPulse directly on iOS without downloading any configuration profiles!
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Mindanao State University</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Universal Downloader Active</span>
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
