import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { Accessibility, ChevronDown, ChevronRight, Check, Cross, Database, FileText, Info, LogOut, Moon, Pencil, Play, Shield, SlidersHorizontal, Sparkles, Square, Sun, Trash2, Volume2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { StorageService } from '../services/storageService';
import { FATHERLY_VOICE_PRESETS, getPreferredVoiceId, setPreferredVoiceId, playTextToSpeech, stopAudio, type FatherlyVoiceId } from '../services/ttsService';

const AVATARS = ['✝️', '👤', '🕊️', '📖', '🕯️', '⛪', '🌟', '😇', '🦁', '🐑', '🍞', '🍷', '🔥', '💧'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const SectionHeading = ({ icon: Icon, title, caption }: { icon: React.ElementType; title: string; caption: string }) => {
  const { theme } = useTheme();

  return (
    <div className="flex items-center gap-3 px-1">
      <Icon size={20} className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.9} />
      <span className={`text-xs font-bold uppercase tracking-[0.24em] ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
        {title}
      </span>
      <span className={`h-px flex-1 ${theme === 'dark' ? 'bg-blue-300/30' : 'bg-blue-600/20'}`} />
      <span className={`hidden min-[390px]:block text-xs ${theme === 'dark' ? 'text-blue-100/60' : 'text-slate-500'}`}>
        {caption}
      </span>
    </div>
  );
};

// Reusable row with a strong touch target and a compact glass treatment.
const SettingItem = ({ icon: Icon, iconColor, title, subtitle, onClick, rightElement, destructive = false }: any) => {
  const { theme } = useTheme();
  const rowClassName = `group w-full flex items-center justify-between gap-3 px-4 py-3.5 transition-all duration-200
    ${onClick ? (theme === 'dark' ? 'hover:bg-white/[0.06] active:bg-white/[0.1]' : 'hover:bg-slate-50 active:bg-slate-100') : ''}
    border-b last:border-0 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200/80'}`;
  const content = (
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[17px] ${iconColor}`}>
          <Icon size={22} className="stroke-[2]" />
        </div>
        <div className="text-left">
          <p className={`text-[15px] font-semibold ${destructive ? 'text-rose-400' : ''}`}>{title}</p>
          {subtitle && <p className={`mt-0.5 text-xs ${theme === 'dark' ? 'text-blue-100/65' : 'text-slate-500'}`}>{subtitle}</p>}
        </div>
      </div>
  );
  const trailing = rightElement ?? (onClick && <ChevronRight size={22} className="text-blue-100/60 transition-transform group-hover:translate-x-0.5" />);

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClassName}>
        {content}
        {trailing}
      </button>
    );
  }

  return (
    <div className={rowClassName}>
      {content}
      {trailing}
    </div>
  );
};

// Smooth Toggle Switch
const CustomToggle = ({ checked, onChange, activeColor = 'bg-blue-500' }: any) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    aria-pressed={checked}
    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${checked ? activeColor : 'bg-slate-600'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_7px_rgba(0,0,0,0.25)] transition duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export default function SettingsScreen() {
  const { theme, toggleTheme, highContrastNav, toggleHighContrastNav } = useTheme();
  const { profile, updateProfile, resetProfile } = useProfile();
  const { logout } = useAuth();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editAvatar, setEditAvatar] = useState(profile?.avatar || '👤');
  const [isPersonalizationEnabled, setIsPersonalizationEnabled] = useState(profile?.preferences?.isPersonalizationEnabled ?? true);
  const [editLifeStage, setEditLifeStage] = useState(profile?.preferences?.lifeStage || '');
  const [editSpiritualFocus, setEditSpiritualFocus] = useState(profile?.preferences?.spiritualFocus || '');
  const [editTone, setEditTone] = useState<any>(profile?.preferences?.tone || 'pastoral');
  const [confirmAction, setConfirmAction] = useState<{ type: 'clear' | 'restart', title: string, message: string, buttonText: string, buttonStyle: string } | null>(null);

  const [selectedVoiceId, setSelectedVoiceId] = useState<FatherlyVoiceId>(FATHERLY_VOICE_PRESETS[0].id);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<FatherlyVoiceId | null>(null);
  const [isVoiceExpanded, setIsVoiceExpanded] = useState(false);

  React.useEffect(() => {
    async function loadVoices() {
      const pref = await getPreferredVoiceId();
      setSelectedVoiceId(pref);
    }
    loadVoices();
    return () => { stopAudio(); };
  }, []);

  const handleVoiceChange = async (id: FatherlyVoiceId) => {
    setSelectedVoiceId(id);
    await setPreferredVoiceId(id);
  };

  const previewVoice = async (id: FatherlyVoiceId) => {
    if (previewingVoiceId === id) {
      await stopAudio();
      setPreviewingVoiceId(null);
      return;
    }

    await stopAudio();
    await handleVoiceChange(id);
    setPreviewingVoiceId(id);

    try {
      await playTextToSpeech("I am your spiritual guide. Peace be with you.", () => {
        setPreviewingVoiceId(null);
      });
    } catch (error) {
      console.error("Voice preview failed", error);
      setPreviewingVoiceId(null);
    }
  };

  const clearData = () => {
    setConfirmAction({
      type: 'clear',
      title: 'Clear All Data',
      message: 'Are you sure you want to clear all bookmarks, journal entries, and settings? This cannot be undone.',
      buttonText: 'Clear Data',
      buttonStyle: 'bg-red-500 hover:bg-red-600 text-white'
    });
  };

  const executeConfirmAction = async () => {
    if (confirmAction?.type === 'clear') {
      // Clear local data only — does NOT delete the account
      await StorageService.clear();
      window.location.reload();
    } else if (confirmAction?.type === 'restart') {
      // Restart journey: wipe local storage and return to onboarding
      await resetProfile();
    }
    setConfirmAction(null);
  };

  const handleLogout = async () => {
    setConfirmAction({
      type: 'restart',
      title: 'Restart Journey',
      message: 'This will reset your local profile and take you back to onboarding. You will lose unsaved local progress.',
      buttonText: 'Restart',
      buttonStyle: 'bg-orange-500 hover:bg-orange-600 text-white'
    });
  };

  const handleAccountLogout = async () => {
    await logout();
  };

  const openEditProfile = () => {
    setEditName(profile?.name || '');
    setEditAvatar(profile?.avatar || '👤');
    setIsEditProfileOpen(true);
  };

  const saveProfile = () => {
    if (editName.trim()) {
      updateProfile(editName, editAvatar, {
        isPersonalizationEnabled,
        lifeStage: editLifeStage,
        spiritualFocus: editSpiritualFocus,
        tone: editTone
      });
      setIsEditProfileOpen(false);
    }
  };

  const selectedVoice = FATHERLY_VOICE_PRESETS.find((voice) => voice.id === selectedVoiceId) ?? FATHERLY_VOICE_PRESETS[0];

  return (
    <div className={`relative h-full overflow-hidden safe-area-top transition-colors duration-300 ${theme === 'dark' ? 'bg-[#020b20] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {theme === 'dark' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-top bg-no-repeat opacity-90"
          style={{ backgroundImage: "url('/settings-background.png')" }}
        />
      )}

      <div className="relative z-10 h-full min-h-0">
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Reference-style header */}
      <header className="flex-shrink-0 px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={`font-serif text-[2.65rem] font-semibold leading-none tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Settings</h1>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-blue-100/70' : 'text-slate-500'}`}>A deeper journey, together.</p>
          </div>
          <p className={`max-w-[9.5rem] pt-1 text-right font-serif text-xs italic leading-snug ${theme === 'dark' ? 'text-blue-300' : 'text-slate-500'}`}>
            &ldquo;Your word is a lamp<br />for my feet.&rdquo;<br />
            <span className="not-italic opacity-80">&mdash; Psalm 119:105</span>
          </p>
          <p aria-hidden="true" className="hidden">
            “Your word is a lamp<br />for my feet.”<br />
            <span className="not-italic opacity-80">— Psalm 119:105</span>
          </p>
        </div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-2xl space-y-5 px-4 pb-6 pt-1"
      >
        
        {/* Profile Header Card */}
        <motion.div variants={itemVariants} className="relative">
          <div className="absolute -inset-3 rounded-[30px] bg-blue-500/20 blur-2xl" />
          <div className={`relative flex items-center gap-4 overflow-hidden rounded-[24px] border p-4 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl ${theme === 'dark' ? 'border-blue-300/30 bg-[#0a2457]/65' : 'border-white bg-white/90 shadow-blue-900/10'}`}>
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className={`relative flex h-[84px] w-[84px] flex-shrink-0 items-center justify-center rounded-full border-2 text-transparent shadow-[0_0_18px_rgba(96,165,250,0.75)] ${theme === 'dark' ? 'border-blue-300 bg-indigo-950/70' : 'border-white bg-indigo-100'}`}>
                {profile?.avatar?.startsWith('http') ? (
                  <img src={profile.avatar} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  profile?.avatar || '👤'
                )}
                {!profile?.avatar?.startsWith('http') && (
                  <span className="absolute flex h-12 w-12 items-center justify-center rounded-[13px] bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-[0_0_16px_rgba(124,58,237,0.7)]" aria-label="Cross avatar">
                    <Cross size={34} strokeWidth={2.8} className="translate-y-0.5 scale-y-[1.45]" />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[1.55rem] font-bold leading-tight">{profile?.name || 'Beloved'}</h2>
                <p className={`mt-1 truncate text-sm ${theme === 'dark' ? 'text-blue-100/70' : 'text-slate-500'}`}>Faithful Voyager</p>
                <div className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${theme === 'dark' ? 'border-blue-300/50 bg-blue-900/30 text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                  <Sparkles size={12} />
                  <span className="truncate">{profile?.preferences?.spiritualFocus || 'Walking with purpose'}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={openEditProfile}
              aria-label="Edit profile"
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${theme === 'dark' ? 'border-blue-300/30 bg-blue-500/25 text-blue-200 hover:bg-blue-500/40' : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
            >
              <Pencil size={21} />
            </button>
          </div>
        </motion.div>

        <motion.section variants={itemVariants}>
          <SectionHeading icon={SlidersHorizontal} title="Experience" caption="Customize your journey" />
          <div className={`mt-3 overflow-hidden rounded-[22px] border shadow-[0_14px_35px_rgba(0,0,0,0.12)] backdrop-blur-xl ${theme === 'dark' ? 'border-blue-300/25 bg-[#0a2457]/60' : 'border-slate-200 bg-white/90'}`}>
            <SettingItem
              icon={theme === 'dark' ? Moon : Sun}
              iconColor={theme === 'dark' ? 'bg-indigo-600/80 text-white' : 'bg-amber-100 text-amber-600'}
              title="Appearance"
              subtitle="Toggle light and dark mode"
              rightElement={<CustomToggle checked={theme === 'dark'} onChange={toggleTheme} activeColor="bg-violet-600" />}
            />

            <SettingItem
              icon={Accessibility}
              iconColor={theme === 'dark' ? 'bg-cyan-500/45 text-cyan-200' : 'bg-teal-100 text-teal-600'}
              title="High Contrast Navigation"
              subtitle="Solid indicators for accessibility"
              rightElement={<CustomToggle checked={highContrastNav} onChange={toggleHighContrastNav} activeColor="bg-teal-500" />}
            />

            <SettingItem
              icon={Sparkles}
              iconColor={theme === 'dark' ? 'bg-purple-600/70 text-white' : 'bg-purple-100 text-purple-600'}
              title="AI Personalization"
              subtitle="Tailored spiritual guidance"
              rightElement={
                <CustomToggle
                  checked={profile?.preferences?.isPersonalizationEnabled ?? true}
                  onChange={() => {
                    const currentPrefs = profile?.preferences || { isPersonalizationEnabled: true };
                    const newVal = !(currentPrefs.isPersonalizationEnabled ?? true);
                    setIsPersonalizationEnabled(newVal);
                    updateProfile(profile?.name || 'Beloved', profile?.avatar, {
                      ...currentPrefs,
                      isPersonalizationEnabled: newVal
                    });
                  }}
                  activeColor="bg-violet-600"
                />
              }
            />
          </div>
        </motion.section>

        <motion.section variants={itemVariants}>
          <div className={`overflow-hidden rounded-[22px] border shadow-[0_14px_35px_rgba(0,0,0,0.12)] backdrop-blur-xl ${theme === 'dark' ? 'border-blue-300/25 bg-[#0a2457]/60' : 'border-slate-200 bg-white/90'}`}>
            <button
              type="button"
              onClick={() => setIsVoiceExpanded((expanded) => !expanded)}
              aria-expanded={isVoiceExpanded}
              className={`flex w-full items-center gap-4 px-4 py-4 text-left transition-colors ${theme === 'dark' ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'}`}
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[17px] bg-blue-600/80 text-blue-100">
                <Volume2 size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">Voice</p>
                <p className={`mt-0.5 text-xs ${theme === 'dark' ? 'text-blue-100/65' : 'text-slate-500'}`}>Choose a fatherly male voice</p>
                <p className={`mt-2 truncate text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                  {selectedVoice.label} <span className="px-1">•</span> {selectedVoice.description}
                </p>
              </div>
              <ChevronDown size={22} className={`flex-shrink-0 text-blue-100/65 transition-transform duration-200 ${isVoiceExpanded ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
              {isVoiceExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`space-y-2 overflow-hidden border-t px-4 pb-4 pt-3 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}
                >
                  {FATHERLY_VOICE_PRESETS.map((voice) => {
                    const selected = selectedVoiceId === voice.id;
                    const previewing = previewingVoiceId === voice.id;

                    return (
                      <div key={voice.id} className={`flex items-center gap-3 rounded-2xl border p-2 transition-all ${selected ? (theme === 'dark' ? 'border-blue-400/70 bg-blue-500/15' : 'border-blue-500 bg-blue-50') : (theme === 'dark' ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-slate-50')}`}>
                        <button type="button" onClick={() => handleVoiceChange(voice.id)} className="flex min-w-0 flex-1 items-center gap-3 p-2 text-left">
                          <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${selected ? 'border-blue-500 bg-blue-500' : 'border-slate-400'}`}>
                            {selected && <Check size={12} className="text-white" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{voice.label}</span>
                            <span className={`block truncate text-xs ${theme === 'dark' ? 'text-blue-100/60' : 'text-slate-500'}`}>{voice.description}</span>
                          </span>
                        </button>
                        <button type="button" onClick={() => previewVoice(voice.id)} className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-all active:scale-95 ${previewing ? 'bg-amber-500 shadow-amber-500/20' : 'bg-blue-600 shadow-blue-600/20'}`} title={`Preview ${voice.label}`}>
                          {previewing ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        <motion.section variants={itemVariants}>
          <SectionHeading icon={Database} title="Account & Data" caption="Manage your app and data" />
          <div className={`mt-3 overflow-hidden rounded-[22px] border shadow-[0_14px_35px_rgba(0,0,0,0.12)] backdrop-blur-xl ${theme === 'dark' ? 'border-blue-300/25 bg-[#0a2457]/60' : 'border-slate-200 bg-white/90'}`}>
            <SettingItem icon={LogOut} iconColor={theme === 'dark' ? 'bg-rose-500/35 text-rose-300' : 'bg-red-100 text-red-600'} title="Log out" subtitle="Return to the sign-in screen" onClick={handleAccountLogout} destructive />
            <SettingItem icon={Trash2} iconColor={theme === 'dark' ? 'bg-amber-500/35 text-amber-200' : 'bg-orange-100 text-orange-600'} title="Restart Journey" subtitle="Reset your local profile" onClick={handleLogout} />
            <SettingItem icon={Trash2} iconColor={theme === 'dark' ? 'bg-rose-500/35 text-rose-300' : 'bg-red-100 text-red-600'} title="Clear Local Data" subtitle="Remove saved bookmarks and settings" onClick={clearData} destructive />
          </div>
        </motion.section>

        <motion.section variants={itemVariants}>
          <SectionHeading icon={Info} title="About" caption="Rooted in His Word" />
          <div className={`mt-3 overflow-hidden rounded-[22px] border shadow-[0_14px_35px_rgba(0,0,0,0.12)] backdrop-blur-xl ${theme === 'dark' ? 'border-blue-300/25 bg-[#0a2457]/60' : 'border-slate-200 bg-white/90'}`}>
            <div className={`flex items-center gap-4 border-b p-4 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_22px_rgba(59,130,246,0.45)]">
                <img src="/logo.png" alt="Bible Nova logo" className="h-[78px] w-[78px] object-contain drop-shadow-[0_4px_8px_rgba(15,23,42,0.35)]" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-bold">Bible Nova</h4>
                <p className={`mt-1 text-sm leading-snug ${theme === 'dark' ? 'text-blue-100/70' : 'text-slate-500'}`}>Your spiritual companion for comfort and guidance.</p>
                <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${theme === 'dark' ? 'bg-blue-400/20 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>Version 1.2.3</span>
              </div>
              <span className={`hidden text-right font-serif text-sm italic leading-tight min-[390px]:block ${theme === 'dark' ? 'text-blue-200/55' : 'text-slate-400'}`}>Faith<br />Guides<br />Forward</span>
            </div>

            <Link to="/privacy" className={`flex w-full items-center justify-between border-b px-4 py-3.5 transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/[0.06]' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-4"><div className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${theme === 'dark' ? 'bg-blue-400/20 text-blue-100' : 'bg-slate-100 text-slate-600'}`}><Shield size={20} /></div><span className="text-[15px] font-semibold">Privacy Policy</span></div>
              <ChevronRight size={22} className="text-blue-100/60" />
            </Link>

            <Link to="/terms" className={`flex w-full items-center justify-between px-4 py-3.5 transition-colors ${theme === 'dark' ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-4"><div className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${theme === 'dark' ? 'bg-blue-400/20 text-blue-100' : 'bg-slate-100 text-slate-600'}`}><FileText size={20} /></div><span className="text-[15px] font-semibold">Terms of Service</span></div>
              <ChevronRight size={22} className="text-blue-100/60" />
            </Link>
          </div>
        </motion.section>

        <div className="h-8" />
      </motion.div>

      </div>{/* end scrollable wrapper */}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsEditProfileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`relative w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}
            >
              <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800/90' : 'border-slate-100 bg-white/90'} sticky top-0 z-10 backdrop-blur-md flex justify-between items-center`}>
                <h3 className="text-xl font-bold">Edit Profile</h3>
                <button onClick={() => setIsEditProfileOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-3 opacity-70 uppercase tracking-wider">Choose Avatar</label>
                  <div className="flex flex-wrap gap-3">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setEditAvatar(avatar)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200 transform hover:scale-110 ${editAvatar === avatar
                          ? 'bg-blue-100 ring-4 ring-blue-500 scale-110 shadow-lg shadow-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 opacity-70 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full p-4 rounded-2xl border font-medium text-lg ${theme === 'dark'
                      ? 'bg-slate-900/50 border-slate-600 focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                      } focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all`}
                    placeholder="Enter your name"
                  />
                </div>

                <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="block font-bold">AI Personalization</label>
                      <p className="text-xs opacity-60 mt-0.5">Tailor guidance to your current season</p>
                    </div>
                    <CustomToggle checked={isPersonalizationEnabled} onChange={() => setIsPersonalizationEnabled(!isPersonalizationEnabled)} />
                  </div>

                  <AnimatePresence>
                    {isPersonalizationEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-xs font-bold mb-1.5 opacity-70 uppercase">Spiritual Focus</label>
                          <input
                            type="text"
                            value={editSpiritualFocus}
                            onChange={(e) => setEditSpiritualFocus(e.target.value)}
                            className={`w-full p-3 rounded-xl border text-sm ${theme === 'dark'
                              ? 'bg-slate-800 border-slate-600 focus:border-blue-500'
                              : 'bg-white border-slate-200 focus:border-blue-500'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                            placeholder="e.g. Peace, Growth, Healing"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5 opacity-70 uppercase">Guidance Tone</label>
                          <div className="flex gap-2">
                            {['pastoral', 'gentle', 'direct'].map((t) => (
                              <button
                                key={t}
                                onClick={() => setEditTone(t)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all duration-200 ${editTone === t
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                  : (theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')
                                  }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className={`p-4 border-t mt-auto ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white'}`}>
                <button
                  onClick={saveProfile}
                  disabled={!editName.trim()}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <Check size={24} />
                  <span>Save Profile</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setConfirmAction(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-sm p-6 rounded-3xl shadow-2xl text-center ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}
            >
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                confirmAction.type === 'clear'
                  ? 'bg-red-100 text-red-400 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-orange-100 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400'
              }`}>
                {confirmAction.type === 'restart' ? <LogOut size={32} /> : <Trash2 size={32} />}
              </div>
              <h3 className="text-xl font-bold mb-2">{confirmAction.title}</h3>
              <p className={`mb-8 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{confirmAction.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className={`flex-1 py-3.5 rounded-xl font-bold transition-all active:scale-95 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={executeConfirmAction}
                  className={`flex-1 py-3.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${confirmAction.buttonStyle}`}
                >
                  {confirmAction.buttonText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
