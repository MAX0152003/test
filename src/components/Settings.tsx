import React from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Palette, 
  Bell, 
  ShieldAlert, 
  Settings as SettingsIcon, 
  Trash2, 
  Save, 
  CheckCircle,
  Eye, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  ArrowLeft,
  Smartphone,
  Sparkles,
  RefreshCw,
  Mail,
  Zap,
  Info,
  Camera,
  Lock,
  Key,
  Calendar,
  CloudLightning,
  QrCode,
  Maximize2,
  Minimize2,
  Layers
} from 'lucide-react';
import { UserProfile, AccessibilityConfig, ClassSession, ViewDensity } from '../types';
import { speakText } from './AccessibilitySettings';
import { saveUserCredentialToFirestore, saveUserProfileToFirestore } from '../lib/firestoreSync';

interface SettingsProps {
  userProfile: UserProfile;
  accessibility: AccessibilityConfig;
  onUpdateProfile: (updatedProfile: UserProfile) => void;
  onUpdateAccessibility: (config: AccessibilityConfig) => void;
  onUpdateDensity?: (density: ViewDensity) => void;
  onUpdateCompactMode?: (compact: boolean) => void;
  onUpdateColorAccent?: (accent: string) => void;
  setScreen: (screen: string) => void;
  classes?: ClassSession[];
  onOpenAccountLinkQR?: () => void;
  isOffline?: boolean;
}

export default function Settings({
  userProfile,
  accessibility,
  onUpdateProfile,
  onUpdateAccessibility,
  onUpdateDensity,
  onUpdateCompactMode,
  onUpdateColorAccent,
  setScreen,
  classes = [],
  onOpenAccountLinkQR,
  isOffline = false
}: SettingsProps) {
  // 1. Current category selection
  const [activeCategory, setActiveCategory] = React.useState<'account' | 'appearance' | 'notifications' | 'security'>('account');

  // 2. Account Profile Form states (requires manual save)
  const [name, setName] = React.useState(userProfile.name);
  const [email, setEmail] = React.useState(userProfile.email);
  const [department, setDepartment] = React.useState(userProfile.department || '');
  const [phone, setPhone] = React.useState(userProfile.phone || '');
  const [bio, setBio] = React.useState(userProfile.bio || '');
  const [avatar, setAvatar] = React.useState(userProfile.avatar);

  // States to track save state
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // 2.5 Password Customization states
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [pwdSuccessMsg, setPwdSuccessMsg] = React.useState<string | null>(null);
  const [pwdErrorMsg, setPwdErrorMsg] = React.useState<string | null>(null);
  const [isUpdatingPwd, setIsUpdatingPwd] = React.useState(false);

  // 3. Notification Prefs states (Auto-saved)
  const [emailDigest, setEmailDigest] = React.useState(() => {
    return localStorage.getItem('cp_pref_email_digest') !== 'false';
  });
  const [announcementsAlert, setAnnouncementsAlert] = React.useState(() => {
    return localStorage.getItem('cp_pref_announcements_alert') !== 'false';
  });
  const [scheduleAlarms, setScheduleAlarms] = React.useState(() => {
    return localStorage.getItem('cp_pref_schedule_alarms') !== 'false';
  });
  const [soundFeedback, setSoundFeedback] = React.useState(() => {
    return localStorage.getItem('cp_pref_sound_feedback') === 'true';
  });

  // 4. Appearance Prefs states (Tied with globally accessible AccessibilityConfig & Auto-saved)
  const [viewDensity, setViewDensity] = React.useState<ViewDensity>(() => {
    const cached = localStorage.getItem('cp_pref_view_density');
    if (cached === 'compact' || cached === 'comfortable') return cached;
    return localStorage.getItem('cp_pref_compact_mode') === 'true' ? 'compact' : 'comfortable';
  });
  const [compactMode, setCompactMode] = React.useState(() => {
    return localStorage.getItem('cp_pref_compact_mode') === 'true' || localStorage.getItem('cp_pref_view_density') === 'compact';
  });
  const [colorAccent, setColorAccent] = React.useState(() => {
    return localStorage.getItem('cp_pref_color_accent') || 'emerald';
  });

  // Check if profile fields differ from active database profile (for highlighting unsaved changes)
  const isProfileDirty = 
    name !== userProfile.name ||
    email !== userProfile.email ||
    department !== (userProfile.department || '') ||
    phone !== (userProfile.phone || '') ||
    bio !== (userProfile.bio || '') ||
    avatar !== userProfile.avatar;

  // Auto-save notifications preferences whenever they are clicked
  React.useEffect(() => {
    localStorage.setItem('cp_pref_email_digest', String(emailDigest));
  }, [emailDigest]);

  React.useEffect(() => {
    localStorage.setItem('cp_pref_announcements_alert', String(announcementsAlert));
  }, [announcementsAlert]);

  React.useEffect(() => {
    localStorage.setItem('cp_pref_schedule_alarms', String(scheduleAlarms));
  }, [scheduleAlarms]);

  React.useEffect(() => {
    localStorage.setItem('cp_pref_sound_feedback', String(soundFeedback));
  }, [soundFeedback]);

  // Handle active manual account changes save
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccess(false);

    if (!name.trim()) {
      setErrorMsg("Full Name workspace field cannot be left blank.");
      speakText("Error: Name field cannot be left blank.", accessibility.readAloud);
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrorMsg("Please provide a valid institutional email address.");
      speakText("Error: Invalid email format.", accessibility.readAloud);
      return;
    }

    setIsSaving(true);
    speakText("Recording updated account credentials to directory nodes. Please standby.", accessibility.readAloud);

    // Simulate database network write latency
    await new Promise(resolve => setTimeout(resolve, 1000));

    const updatedProfile = {
      ...userProfile,
      name: name.trim(),
      email: email.trim(),
      department: department.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
      avatar: avatar
    };

    onUpdateProfile(updatedProfile);

    const isOffline = localStorage.getItem('cp_offline') === 'true';
    saveUserProfileToFirestore(isOffline, updatedProfile).catch(err => console.error(err));

    setIsSaving(false);
    setSaveSuccess(true);
    speakText("Account preferences saved successfully.", accessibility.readAloud);

    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccessMsg(null);
    setPwdErrorMsg(null);

    if (!oldPassword.trim()) {
      setPwdErrorMsg("Old password is required for verification.");
      speakText("Error: Old password is required for verification.", accessibility.readAloud);
      return;
    }

    if (!newPassword.trim()) {
      setPwdErrorMsg("New password cannot be empty.");
      speakText("Error: New password cannot be empty.", accessibility.readAloud);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdErrorMsg("New password and confirmation do not match.");
      speakText("Error: Passwords do not match.", accessibility.readAloud);
      return;
    }

    // Retrieve active customized password or default to 123456
    const savedPasswordsRaw = localStorage.getItem('classpulse_custom_passwords') || '{}';
    let savedPasswords: Record<string, string> = {};
    try {
      savedPasswords = JSON.parse(savedPasswordsRaw);
    } catch (err) {
      console.error(err);
    }

    const userEmailKey = (userProfile?.email || '').toLowerCase();
    const currentSavedPassword = savedPasswords[userEmailKey] || '123456';

    if (oldPassword.trim() !== currentSavedPassword) {
      setPwdErrorMsg("Incorrect old password. Please try again. (Note: Default is 123456)");
      speakText("Error: Incorrect old password.", accessibility.readAloud);
      return;
    }

    setIsUpdatingPwd(true);
    speakText("Customizing your security password credential. Please wait.", accessibility.readAloud);
    await new Promise(resolve => setTimeout(resolve, 800));

    savedPasswords[userEmailKey] = newPassword.trim();
    localStorage.setItem('classpulse_custom_passwords', JSON.stringify(savedPasswords));

    const isOffline = localStorage.getItem('cp_offline') === 'true';
    saveUserCredentialToFirestore(isOffline, userEmailKey, newPassword.trim()).catch(err => console.error(err));

    setIsUpdatingPwd(false);
    setPwdSuccessMsg("Your password has been customized successfully! You can use this custom password for subsequent sign-ins.");
    speakText("Security password customized successfully.", accessibility.readAloud);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // User-selectable View Density handler (Comfortable vs Compact)
  const handleDensityChange = (density: ViewDensity) => {
    setViewDensity(density);
    const isCompact = density === 'compact';
    setCompactMode(isCompact);
    localStorage.setItem('cp_pref_view_density', density);
    localStorage.setItem('cp_pref_compact_mode', String(isCompact));
    onUpdateDensity?.(density);
    onUpdateCompactMode?.(isCompact);
    speakText(`View density set to ${density === 'compact' ? 'Compact' : 'Comfortable'}.`, accessibility.readAloud);
  };

  // Legacy toggle support
  const toggleCompactMode = () => {
    handleDensityChange(viewDensity === 'compact' ? 'comfortable' : 'compact');
  };

  // Change color accent (auto-save preference)
  const handleColorAccentChange = (accent: string) => {
    setColorAccent(accent);
    localStorage.setItem('cp_pref_color_accent', accent);
    onUpdateColorAccent?.(accent);
    speakText(`Primary brand color set to ${accent}`, accessibility.readAloud);
  };

  // Global reset utility
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const handleResetToDefaults = () => {
    // A. Reset profile state
    setName(userProfile.role === 'student' ? 'John Doe' : userProfile.role === 'faculty' ? 'Dr. Sarah Jenkins' : 'Systems Administrator');
    setEmail(userProfile.role === 'student' ? 'john.doe@msu.edu.ph' : userProfile.role === 'faculty' ? 'sarah.jenkins@msu.edu.ph' : 'admin@msu.edu.ph');
    setDepartment(userProfile.role === 'faculty' ? 'Department of Computer Science' : 'Academic Affairs Office');
    setPhone('');
    setBio('');
    setAvatar(userProfile.role === 'student' 
      ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150' 
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
    );

    // B. Reset Accessibility elements
    onUpdateAccessibility({
      theme: 'light',
      readAloud: false
    });

    // C. Reset custom viewports & accent toggles
    setViewDensity('comfortable');
    setCompactMode(false);
    setColorAccent('emerald');
    onUpdateDensity?.('comfortable');
    onUpdateCompactMode?.(false);
    onUpdateColorAccent?.('emerald');
    setEmailDigest(true);
    setAnnouncementsAlert(true);
    setScheduleAlarms(true);
    setSoundFeedback(false);

    localStorage.removeItem('cp_pref_view_density');
    localStorage.removeItem('cp_pref_compact_mode');
    localStorage.removeItem('cp_pref_color_accent');
    localStorage.removeItem('cp_pref_email_digest');
    localStorage.removeItem('cp_pref_announcements_alert');
    localStorage.removeItem('cp_pref_schedule_alarms');
    localStorage.removeItem('cp_pref_sound_feedback');

    setShowResetConfirm(false);
    speakText("System settings have been successfully reset to default configurations.", false);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast("All settings configurations restored to default values successfully.", "success");
    } else {
      alert("All settings configurations restored to default values successfully.");
    }
  };

  // Generate preset color accents for styling
  const accentsArr = [
    { id: 'emerald', bg: 'bg-emerald-500', name: 'Emerald Teal' },
    { id: 'blue', bg: 'bg-[#03213D]', name: 'Sapphire Midnight' },
    { id: 'orange', bg: 'bg-[#CC762A]', name: 'Amber Sienna' },
    { id: 'indigo', bg: 'bg-indigo-600', name: 'Charcoal Indigo' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full text-left bg-zinc-50/30 dark:bg-zinc-950/20 rounded-3xl"
    >
      {/* Settings Top banner with Back Navigation link button control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-200/60 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setScreen('dashboard');
              speakText("Navigated back to primary hub dashboard", accessibility.readAloud);
            }}
            type="button"
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-emerald-500 animate-[spin_6s_linear_infinite]" />
              <h1 className="text-xl font-black font-sans tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                System Preferences
              </h1>
            </div>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1">
              Configure personal profile directories, voice assist settings, and automated alert logs.
            </p>
          </div>
        </div>

        {/* Action badge reset & Account Link QR */}
        <div className="flex items-center gap-2">
          {onOpenAccountLinkQR && (
            <button
              onClick={onOpenAccountLinkQR}
              type="button"
              className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-black border border-emerald-500/20 transition-all scale-100 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              Account Link QR
            </button>
          )}
          <button
            onClick={() => setShowResetConfirm(true)}
            type="button"
            className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white border border-red-500/10 hover:border-red-600 transition-all scale-100 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Confirmation Model Popup for defaults reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-905 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-up text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 capitalize">Reset All Settings?</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  This procedure will restore your theme preferences, text-to-speech audio setups, notification layouts, and compact visual structures back to the platform original standards. Sensitive account fields will revert back to seed states.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-900">
              <button
                onClick={() => setShowResetConfirm(false)}
                type="button"
                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-105 rounded-xl cursor-pointer"
              >
                No, Keep Settings
              </button>
              <button
                onClick={handleResetToDefaults}
                type="button"
                className="px-4 py-2 text-xs font-black uppercase bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                Yes, Restore Originals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Panel: Grid layout with Categorized Left Sidebar and Right Section panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        {/* Category internal Sidebar menu selectors */}
        <div className="lg:col-span-3 flex flex-col gap-1 rounded-2xl bg-white dark:bg-zinc-950 p-3 border border-zinc-200/80 dark:border-zinc-850 shadow-xs">
          <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 tracking-widest uppercase px-3.5 pt-1.5 pb-2.5">
            Settings Group
          </p>

          <button
            onClick={() => {
              setActiveCategory('account');
              speakText("Account preferences category opened", accessibility.readAloud);
            }}
            type="button"
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none cursor-pointer transition-all ${
              activeCategory === 'account'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l-4 border-emerald-500 font-black'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-250'
            }`}
          >
            <User className="w-4 h-4 shrink-0 transition-transform" />
            <span className="flex-1 text-left">Academic Profile</span>
            {isProfileDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved manual changes" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveCategory('appearance');
              speakText("Appearance and Layout styling configurations opened", accessibility.readAloud);
            }}
            type="button"
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none cursor-pointer transition-all ${
              activeCategory === 'appearance'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l-4 border-emerald-500 font-black'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-250'
            }`}
          >
            <Palette className="w-4 h-4 shrink-0 transition-transform" />
            <span className="text-left">Appearance & Styles</span>
          </button>

          <button
            onClick={() => {
              setActiveCategory('notifications');
              speakText("Notifications alert routing setups opened", accessibility.readAloud);
            }}
            type="button"
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none cursor-pointer transition-all ${
              activeCategory === 'notifications'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l-4 border-emerald-500 font-black'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-250'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0 transition-transform" />
            <span className="text-left">Notifications Alerts</span>
          </button>

          <button
            onClick={() => {
              setActiveCategory('security');
              speakText("Security configuration opened", accessibility.readAloud);
            }}
            type="button"
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none cursor-pointer transition-all ${
              activeCategory === 'security'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l-4 border-emerald-500 font-black'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-250'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0 transition-transform" />
            <span className="text-left">Security & Credentials</span>
          </button>
        </div>

        {/* Custom preference settings right panels segment container based on tab */}
        <div className="lg:col-span-9 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-850 p-6 shadow-xs relative">
          
          {/* SECTION A: ACCOUNT DETAILS */}
          {activeCategory === 'account' && (
            <div className="animate-fade-in space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <User className="w-5 h-5 text-emerald-500" />
                <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Academic Identification Profile
                </h2>
              </div>
              <p className="text-[11px] text-zinc-450 dark:text-zinc-400 leading-relaxed">
                Management of your school registry identity information. Updating these values modifies your active check-in logs and institutional attendance report credentials. Require manual validation confirmation to push to server nodes.
              </p>

              {isProfileDirty && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2 animate-pulse">
                  <Info className="w-4 h-4 mt-0.5" />
                  <span className="font-bold">Unsaved changes detected. You must click the and commit manual profile changes below to save!</span>
                </div>
              )}

              <form onSubmit={handleSaveAccount} className="space-y-4">
                {/* Profile Portrait Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-1.5">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-zinc-300 dark:border-zinc-800"
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                      Academic Avatar Template
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
                      ].map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatar(imgUrl);
                            speakText("Profile avatar preview updated", accessibility.readAloud);
                          }}
                          className={`w-9 h-9 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                            avatar === imgUrl ? 'border-emerald-500 scale-110 shadow-md' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-[1.05]'
                          }`}
                        >
                          <img src={imgUrl} alt="Avatar select template" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}

                      {/* Custom Photo Upload Input */}
                      <label 
                        className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer transition-all hover:scale-105 shrink-0"
                        title="Upload Custom Photo from Phone/Device"
                      >
                        <Camera className="w-4 h-4 text-zinc-550 dark:text-zinc-400" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setAvatar(reader.result as string);
                                speakText("Custom phone/device photo processed as profile preview.", accessibility.readAloud);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account fields */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                      Institutional Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition-all font-sans"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                      University Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition-all font-mono"
                      placeholder="e.g. name@msu.edu.ph"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                      Assigned Department / Branch Team
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition-all font-sans"
                      placeholder="e.g. School of Digital Computing Engineering"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                      Contact Cellular Link (Phone)
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition-all font-mono"
                      placeholder="e.g. +63 912 345 6789"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                    Institutional Biography / Statement (Bio)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition-all font-sans resize-none"
                    placeholder="Describe your research, status, or academic schedule."
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs font-bold text-red-500 block leading-relaxed">{errorMsg}</p>
                )}

                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2.5 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    Sensitive changes fully persistent online & locally cached!
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    disabled={isSaving || !isProfileDirty}
                    type="submit"
                    className="px-5 py-3 rounded-xl text-xs font-black uppercase bg-emerald-500 hover:bg-emerald-400 text-black shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving to Database...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 font-black text-black" />
                        Commit Profile Changes
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* SECTION D: SECURITY & CREDENTIALS */}
          {activeCategory === 'security' && (
            <div className="animate-fade-in space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <Lock className="w-5 h-5 text-emerald-500" />
                <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Security Settings
                </h2>
              </div>
              <p className="text-[11px] text-zinc-450 dark:text-zinc-400 leading-relaxed">
                Update your account sign-in password credential at any time. Old password verification is required to guarantee authorization of manual security updates.
              </p>

              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                    Old Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition-all font-mono"
                    placeholder="•••••••• (Default is 123456)"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition-all font-mono"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition-all font-mono"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                {pwdErrorMsg && (
                  <p className="text-xs font-bold text-red-500 block leading-relaxed">{pwdErrorMsg}</p>
                )}

                {pwdSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    {pwdSuccessMsg}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingPwd}
                    className="px-5 py-3 rounded-xl text-xs font-black uppercase bg-emerald-500 hover:bg-emerald-400 text-black shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isUpdatingPwd ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5 text-black" />
                        Update Account Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION B: APPEARANCE STYLE OPTIONS */}
          {activeCategory === 'appearance' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <Palette className="w-5 h-5 text-emerald-500" />
                <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Visual Layout Identity Prefs
                </h2>
              </div>
              <p className="text-[11px] text-zinc-450 dark:text-zinc-400 leading-relaxed">
                Tweak theme templates, core colors, density displays, and vocal text-to-speech triggers. All choices in this category are automatically persistent in index databases instantly.
              </p>

              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                  System Theme Base Colorway
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onUpdateAccessibility({ ...accessibility, theme: 'light' });
                      speakText("Theme set to Light mode", accessibility.readAloud);
                    }}
                    type="button"
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all ${
                      accessibility.theme === 'light'
                        ? 'border-emerald-500 bg-zinc-100/40 dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 bg-transparent'
                    }`}
                  >
                    <Sun className="w-5 h-5 shrink-0" />
                    <span className="text-xs">Light Mode</span>
                  </button>
                  <button
                    onClick={() => {
                      onUpdateAccessibility({ ...accessibility, theme: 'dark' });
                      speakText("Theme set to Dark mode", accessibility.readAloud);
                    }}
                    type="button"
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all ${
                      accessibility.theme === 'dark'
                        ? 'border-emerald-500 bg-zinc-900 text-emerald-400 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 bg-transparent'
                    }`}
                  >
                    <Moon className="w-5 h-5 shrink-0" />
                    <span className="text-xs">Dark Mode</span>
                  </button>
                </div>
              </div>

              {/* View Density (Comfortable vs Compact) */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                      View Density & Spacing
                    </label>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Adjust layout padding and spacing throughout the app for better usability on smaller screens and mobile devices.
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    {viewDensity === 'compact' ? 'Compact' : 'Comfortable'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Comfortable Option */}
                  <button
                    onClick={() => handleDensityChange('comfortable')}
                    type="button"
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                      viewDensity === 'comfortable'
                        ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${viewDensity === 'comfortable' ? 'bg-emerald-500 text-black font-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                          <Maximize2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Comfortable</h4>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Spacious & Relaxed</p>
                        </div>
                      </div>
                      {viewDensity === 'comfortable' && (
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Generous padding and open margins. Ideal for desktop viewports and relaxed reading.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold text-zinc-450 dark:text-zinc-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500/40" />
                      Standard 16–24px padding
                    </div>
                  </button>

                  {/* Compact Option */}
                  <button
                    onClick={() => handleDensityChange('compact')}
                    type="button"
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                      viewDensity === 'compact'
                        ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${viewDensity === 'compact' ? 'bg-emerald-500 text-black font-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                          <Minimize2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Compact</h4>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">High Density & Mobile</p>
                        </div>
                      </div>
                      {viewDensity === 'compact' && (
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Snug padding and tighter margins. Perfect for smaller screens, mobile ergonomics, and data-dense dashboards.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold text-zinc-450 dark:text-zinc-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500/40" />
                      Optimized 8–14px padding
                    </div>
                  </button>
                </div>
              </div>



              {/* Text-to-Speech Toggle */}
              <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 flex items-center justify-between gap-4 bg-zinc-50/40 dark:bg-zinc-900/40">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${accessibility.readAloud ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                    {accessibility.readAloud ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 capitalize">Vocalized Narrator Assist</h3>
                    <p className="text-[10px] text-zinc-550 dark:text-zinc-400 leading-normal mt-0.5">
                      Vocal assistance synthesizer read aloud notifications, dashboard screen transitions, and simulation attendance logging metrics.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !accessibility.readAloud;
                    onUpdateAccessibility({ ...accessibility, readAloud: next });
                    if (next) {
                      setTimeout(() => {
                        speakText("Voice synthesizer enabled.", true);
                      }, 100);
                    } else {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${
                    accessibility.readAloud 
                      ? 'bg-emerald-500 flex justify-end shadow-xs' 
                      : 'bg-zinc-350 dark:bg-zinc-700 flex justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 block shadow` shrink-0" />
                </button>
              </div>

            </div>
          )}

          {/* SECTION C: NOTIFICATION TOGGLES */}
          {activeCategory === 'notifications' && (
            <div className="animate-fade-in space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <Bell className="w-5 h-5 text-emerald-500" />
                <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Notification Alert Prefs
                </h2>
              </div>
              <p className="text-[11px] text-zinc-450 dark:text-zinc-400 leading-relaxed">
                Determine which alerts and message notification categories can pop badges onto your header tray. Changes in this section are automatically synced internally.
              </p>

              <div className="space-y-3.5 mt-2">
                
                {/* 1. Email DIGEST */}
                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                  <div className="flex items-start gap-3">
                    <Mail className="w-4.5 h-4.5 text-zinc-450 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-250">Academic Email Digest</h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Receive monthly structural roster compliance briefings and performance summaries directly in your mailbox.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !emailDigest;
                      setEmailDigest(next);
                      speakText(`Email digests alerts set to ${next ? 'enabled' : 'disabled'}`, accessibility.readAloud);
                    }}
                    className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer inline-flex shrink-0 ${
                      emailDigest 
                        ? 'bg-emerald-500 flex justify-end' 
                        : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 block shadow-sm" />
                  </button>
                </div>

                {/* 2. Platform Broadcast Announcements */}
                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-4.5 h-4.5 text-zinc-450 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-250">Broadcast Announcements</h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Notify instantly when administrators broadcast campus emergencies, system maintenance notes, or classroom relocations.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !announcementsAlert;
                      setAnnouncementsAlert(next);
                      speakText(`Broadcast announcement notifications set to ${next ? 'enabled' : 'disabled'}`, accessibility.readAloud);
                    }}
                    className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer inline-flex shrink-0 ${
                      announcementsAlert 
                        ? 'bg-emerald-500 flex justify-end' 
                        : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 block shadow-sm" />
                  </button>
                </div>

                {/* 3. Leave request notifications */}
                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-4.5 h-4.5 text-zinc-450 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-250">Schedule Shift Alarms</h4>
                      <p className="text-[10px] text-zinc-550 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Sound an alarm 5 minutes prior to the generation of a local attendance QR token rotation matrix.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !scheduleAlarms;
                      setScheduleAlarms(next);
                      speakText(`Schedule shift alerts set to ${next ? 'enabled' : 'disabled'}`, accessibility.readAloud);
                    }}
                    className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer inline-flex shrink-0 ${
                      scheduleAlarms 
                        ? 'bg-emerald-500 flex justify-end' 
                        : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 block shadow-sm" />
                  </button>
                </div>

                {/* 4. Sounds elements feedback */}
                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                  <div className="flex items-start gap-3">
                    <Zap className="w-4.5 h-4.5 text-zinc-450 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-250">Sound Design Audio Feedback</h4>
                      <p className="text-[10px] text-zinc-550 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Play auditory ding-dong melodies on successful QR scanning matrices reads or when messages land.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundFeedback;
                      setSoundFeedback(next);
                      speakText(`System sound feedback set to ${next ? 'enabled' : 'disabled'}`, accessibility.readAloud);
                    }}
                    className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer inline-flex shrink-0 ${
                      soundFeedback 
                        ? 'bg-emerald-500 flex justify-end' 
                        : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 block shadow-sm" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
