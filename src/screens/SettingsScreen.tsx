import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getStats } from '../services/statsService';
import { Moon, Sun, Trash2, ChevronRight, LogOut, Edit2, X, Check, UserX, Sparkles, Volume2, Play, Square, Shield, FileText } from 'lucide-react';
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

// UI Helper for beautiful settings items
const SettingItem = ({ icon: Icon, iconColor, title, subtitle, onClick, rightElement, destructive = false }: any) => {
  const { theme } = useTheme();
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !rightElement}
      className={`w-full flex items-center justify-between p-4 transition-all duration-200 
        ${onClick ? (theme === 'dark' ? 'hover:bg-gray-750/50' : 'hover:bg-gray-50/80') : ''} 
        border-b border-gray-100/50 dark:border-gray-700/50 last:border-0`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${iconColor}`}>
          <Icon size={20} className="stroke-[2]" />
        </div>
        <div className="text-left">
          <p className={`font-medium ${destructive ? 'text-red-500' : ''}`}>{title}</p>
          {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {rightElement ? rightElement : (onClick && <ChevronRight size={18} className="opacity-40" />)}
    </button>
  );
};

// Smooth Toggle Switch
const CustomToggle = ({ checked, onChange, activeColor = 'bg-blue-500' }: any) => (
  <button
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${checked ? activeColor : 'bg-gray-300 dark:bg-gray-600'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export default function SettingsScreen() {
  const { theme, toggleTheme, highContrastNav, toggleHighContrastNav } = useTheme();
  const { user, updateProfile, deleteAccount } = useAuth();
  const [stats, setStats] = useState(getStats());

  React.useEffect(() => {
    setStats(getStats());
  }, []);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '👤');
  const [isPersonalizationEnabled, setIsPersonalizationEnabled] = useState(user?.preferences?.isPersonalizationEnabled ?? true);
  const [editLifeStage, setEditLifeStage] = useState(user?.preferences?.lifeStage || '');
  const [editSpiritualFocus, setEditSpiritualFocus] = useState(user?.preferences?.spiritualFocus || '');
  const [editTone, setEditTone] = useState<any>(user?.preferences?.tone || 'pastoral');
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'clear' | 'restart', title: string, message: string, buttonText: string, buttonStyle: string } | null>(null);

  const [selectedVoiceId, setSelectedVoiceId] = useState<FatherlyVoiceId>(FATHERLY_VOICE_PRESETS[0].id);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<FatherlyVoiceId | null>(null);

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

  const handleDeleteAccount = () => {
    setConfirmAction({
      type: 'delete',
      title: 'Delete Account',
      message: 'Are you sure you want to completely delete your account? This will permanently remove all your data from our servers.',
      buttonText: 'Delete Account',
      buttonStyle: 'bg-red-600 hover:bg-red-700 text-white'
    });
  };

  const executeConfirmAction = async () => {
    if (confirmAction?.type === 'delete') {
      await deleteAccount();
    } else if (confirmAction?.type === 'clear') {
      // Clear local data only — does NOT delete the account
      await StorageService.clear();
      window.location.reload();
    } else if (confirmAction?.type === 'restart') {
      // Restart journey: wipe local storage and return to onboarding
      await StorageService.clear();
      await deleteAccount();
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

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditAvatar(user?.avatar || '👤');
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

  // Helper components moved outside to prevent unmounting bugs

  return (
    <div className={`h-full flex flex-col safe-area-top transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f172a] text-gray-100' : 'bg-slate-50 text-gray-900'}`}>
      
      {/* Fixed Header */}
      <div className={`flex-shrink-0 px-6 py-4 backdrop-blur-xl border-b transition-colors duration-300 z-10 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="px-4 pt-6 space-y-8 max-w-2xl mx-auto"
      >
        
        {/* Profile Header Card */}
        <motion.div variants={itemVariants} className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl rounded-full" />
          <div className={`relative p-6 rounded-3xl backdrop-blur-sm border shadow-lg flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white/90 border-white shadow-blue-900/5'}`}>
            <div className="flex items-center gap-5">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-inner border-4 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-white'}`}>
                {user?.avatar?.startsWith('http') ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  user?.avatar || '👤'
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user?.name || 'Beloved'}</h2>
                <p className="text-sm opacity-60 mt-1">Faithful Voyager</p>
              </div>
            </div>
            <button
              onClick={openEditProfile}
              className={`p-3 rounded-full transition-all active:scale-95 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-blue-400' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'}`}
            >
              <Edit2 size={20} />
            </button>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-3 px-4">Experience</h3>
          <div className={`rounded-3xl overflow-hidden shadow-sm border ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            
            <SettingItem
              icon={theme === 'dark' ? Moon : Sun}
              iconColor={theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-100 text-amber-600'}
              title="Appearance"
              subtitle="Toggle light and dark mode"
              rightElement={<CustomToggle checked={theme === 'dark'} onChange={toggleTheme} activeColor="bg-indigo-500" />}
            />

            <SettingItem
              icon={Sparkles}
              iconColor={theme === 'dark' ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600'}
              title="High Contrast Navigation"
              subtitle="Solid indicators for accessibility"
              rightElement={<CustomToggle checked={highContrastNav} onChange={toggleHighContrastNav} activeColor="bg-teal-500" />}
            />

            <SettingItem
              icon={Edit2}
              iconColor={theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}
              title="AI Personalization"
              subtitle="Tailored spiritual guidance"
              rightElement={
                <CustomToggle 
                  checked={user?.preferences?.isPersonalizationEnabled ?? true} 
                  onChange={() => {
                    const currentPrefs = user?.preferences || { isPersonalizationEnabled: true };
                    const newVal = !(currentPrefs.isPersonalizationEnabled ?? true);
                    // Keep local modal state in sync with the quick-toggle
                    setIsPersonalizationEnabled(newVal);
                    updateProfile(user?.name || 'Beloved', user?.avatar, {
                      ...currentPrefs,
                      isPersonalizationEnabled: newVal
                    });
                  }} 
                  activeColor="bg-purple-500" 
                />
              }
            />

            <div className="p-4 border-t border-slate-100/50 dark:border-slate-700/50">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Volume2 size={20} className="stroke-[2]" />
                </div>
                <div>
                  <p className="font-medium text-left">Voice</p>
                  <p className="text-xs opacity-60 mt-0.5 text-left">Choose a fatherly male voice</p>
                </div>
              </div>

              <div className="space-y-2">
                {FATHERLY_VOICE_PRESETS.map((voice) => {
                  const selected = selectedVoiceId === voice.id;
                  const previewing = previewingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      className={`flex items-center gap-3 p-2 rounded-2xl border transition-all duration-200 ${
                        selected
                          ? (theme === 'dark' ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50')
                          : (theme === 'dark' ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50')
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleVoiceChange(voice.id)}
                        className="flex flex-1 min-w-0 items-center gap-3 p-2 text-left"
                      >
                        <span className={`h-4 w-4 flex-shrink-0 rounded-full border flex items-center justify-center ${
                          selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-500'
                        }`}>
                          {selected && <Check size={12} className="text-white" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{voice.label}</span>
                          <span className="block truncate text-xs opacity-60">{voice.description}</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => previewVoice(voice.id)}
                        className={`h-10 w-10 flex-shrink-0 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center ${
                          previewing ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-blue-600 text-white shadow-blue-600/20'
                        }`}
                        title={`Preview ${voice.label}`}
                      >
                        {previewing ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </motion.div>

        {/* Account & Data Section */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-3 px-4">Account & Data</h3>
          <div className={`rounded-3xl overflow-hidden shadow-sm border ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            
            <SettingItem
              icon={LogOut}
              iconColor={theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}
              title="Restart Journey"
              subtitle="Log out and return to onboarding"
              onClick={handleLogout}
            />

            <SettingItem
              icon={Trash2}
              iconColor={theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}
              title="Clear Local Data"
              subtitle="Remove saved bookmarks and settings"
              onClick={clearData}
              destructive
            />

            <SettingItem
              icon={UserX}
              iconColor={theme === 'dark' ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}
              title="Delete Account"
              subtitle="Permanently erase your account"
              onClick={handleDeleteAccount}
              destructive
            />

          </div>
        </motion.div>

        {/* About Section */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-3 px-4">About</h3>
          <div className={`rounded-3xl overflow-hidden shadow-sm border ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            
            <div className="p-6 border-b border-slate-100/50 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/30">
                <Sparkles size={32} />
              </div>
              <h4 className="font-bold text-lg">Bible Nova</h4>
              <p className="text-sm opacity-60 mt-1 max-w-[250px]">Your spiritual companion for comfort and guidance.</p>
              <span className="inline-block mt-4 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 opacity-60">Version 1.2.3</span>
            </div>

            <Link to="/privacy" className={`w-full flex items-center justify-between p-4 transition-all duration-200 ${theme === 'dark' ? 'hover:bg-slate-750/50' : 'hover:bg-slate-50/80'} border-b border-slate-100/50 dark:border-slate-700/50`}>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <Shield size={20} className="stroke-[2]" />
                </div>
                <span className="font-medium">Privacy Policy</span>
              </div>
              <ChevronRight size={18} className="opacity-40" />
            </Link>

            <Link to="/terms" className={`w-full flex items-center justify-between p-4 transition-all duration-200 ${theme === 'dark' ? 'hover:bg-slate-750/50' : 'hover:bg-slate-50/80'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <FileText size={20} className="stroke-[2]" />
                </div>
                <span className="font-medium">Terms of Service</span>
              </div>
              <ChevronRight size={18} className="opacity-40" />
            </Link>

          </div>
        </motion.div>

        {/* Footer spacing */}
        <div className="h-8" />
      </motion.div>

      </div>{/* end scrollable wrapper */}

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
                confirmAction.type === 'delete'
                  ? 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                  : confirmAction.type === 'clear'
                  ? 'bg-red-100 text-red-400 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-orange-100 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400'
              }`}>
                {confirmAction.type === 'delete' ? <UserX size={32} /> : confirmAction.type === 'restart' ? <LogOut size={32} /> : <Trash2 size={32} />}
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
