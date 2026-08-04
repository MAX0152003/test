import React from 'react';
import { AccessibilityConfig } from '../types';
import { Volume2, VolumeX, Eye, Sun, Moon, Activity, Wifi, WifiOff } from 'lucide-react';

interface AccessibilitySettingsProps {
  config: AccessibilityConfig;
  onChange: (config: AccessibilityConfig) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
}

export const speakText = (text: string, enabled: boolean) => {
  if (!enabled || !('speechSynthesis' in window)) return;
  
  // Cancel previous speech to prevent overlapping
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
};

export default function AccessibilitySettings({
  config,
  onChange,
  isOffline,
  onToggleOffline
}: AccessibilitySettingsProps) {
  
  const handleThemeChange = (theme: 'light' | 'dark') => {
    const nextConfig = { ...config, theme };
    onChange(nextConfig);
    
    const description = `Theme set to ${theme} mode`;
    speakText(description, config.readAloud);
  };

  const handleTTSChange = () => {
    const next = !config.readAloud;
    onChange({ ...config, readAloud: next });
    
    if (next) {
      setTimeout(() => {
        speakText("Text to speech voice narrator is now enabled.", true);
      }, 100);
    } else {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div 
      id="accessibility-ctrl-panel"
      className="p-6 rounded-2xl border transition-all duration-300 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 shadow-xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-pulse">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              System Settings & Accessibility Pulse
            </h3>
            <p className="text-xs text-zinc-500">Customize display preferences & simulated telemetry status</p>
          </div>
        </div>
        
        {/* Offline Toggle with high fidelity feedback */}
        <button
          onClick={() => {
            onToggleOffline();
            speakText(`Network status changed. Now operating in ${!isOffline ? 'Offline Mode' : 'Online Mode'}`, config.readAloud);
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
            isOffline 
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}
          title="Toggle online state to test offline persistence capability"
        >
          {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {isOffline ? 'Offline Mode Active' : 'Online Roster Synced'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Theme select */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Appearance Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleThemeChange('light')}
              type="button"
              className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                config.theme === 'light'
                  ? 'bg-zinc-100 dark:bg-zinc-800 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                  : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <Sun className="w-4 h-4" />
              Light Appearance
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              type="button"
              className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                config.theme === 'dark'
                  ? 'bg-zinc-900 border-emerald-500 text-emerald-400 font-extrabold shadow-sm'
                  : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <Moon className="w-4 h-4" />
              Dark Appearance
            </button>
          </div>
        </div>

        {/* Narrator */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Vocally Read Actions
          </label>
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${config.readAloud ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                {config.readAloud ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Read Aloud Assist</p>
                <p className="text-[10px] text-zinc-500">Voice announcements for scan updates</p>
              </div>
            </div>
            <button
              onClick={handleTTSChange}
              type="button"
              className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${
                config.readAloud 
                  ? 'bg-emerald-500 flex justify-end' 
                  : 'bg-zinc-350 dark:bg-zinc-700 flex justify-start'
              }`}
              aria-label="Toggle Read Aloud"
            >
              <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 block shadow-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
