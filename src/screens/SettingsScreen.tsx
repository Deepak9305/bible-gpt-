import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getStats } from '../services/statsService';
import { Moon, Sun, Trash2, ChevronRight, LogOut, Edit2, X, Check, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { StorageService } from '../services/storageService';
import { getVoices, getPreferredVoiceIndex, setPreferredVoice, playTextToSpeech, stopAudio } from '../services/ttsService';
import { Volume2, Play, Square } from 'lucide-react';

const AVATARS = ['🙏', '👤', '✝️', '🕊️', '📖', '🕯️', '⛪', '🌟', '😇', '🦁', '🐑', '🍞', '🍷', '🔥', '💧'];

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();
  const { logout, user, updateProfile, deleteAccount } = useAuth();
  const stats = getStats();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '👤');
  const [isPersonalizationEnabled, setIsPersonalizationEnabled] = useState(user?.preferences?.isPersonalizationEnabled ?? true);
  const [editLifeStage, setEditLifeStage] = useState(user?.preferences?.lifeStage || '');
  const [editSpiritualFocus, setEditSpiritualFocus] = useState(user?.preferences?.spiritualFocus || '');
  const [editTone, setEditTone] = useState<any>(user?.preferences?.tone || 'pastoral');
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'clear', title: string, message: string } | null>(null);

  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [selectedVoiceIdx, setSelectedVoiceIdx] = useState<number | undefined>(undefined);
  const [isPreviewing, setIsPreviewing] = useState(false);

  React.useEffect(() => {
    async function loadVoices() {
      const voices = await getVoices();
      setAvailableVoices(voices);
      const pref = await getPreferredVoiceIndex();
      setSelectedVoiceIdx(pref);
    }
    loadVoices();
  }, []);

  const handleVoiceChange = async (idx: number | undefined) => {
    setSelectedVoiceIdx(idx);
    await setPreferredVoice(idx);
  };

  const previewVoice = async (voiceIdx: number | undefined) => {
    if (isPreviewing) {
      await stopAudio();
      setIsPreviewing(false);
      return;
    }

    setIsPreviewing(true);
    await playTextToSpeech("I am your spiritual guide. Peace be with you.", () => {
      setIsPreviewing(false);
    });
  };

  const clearData = () => {
    setConfirmAction({
      type: 'clear',
      title: 'Clear All Data',
      message: 'Are you sure you want to clear all bookmarks and settings?'
    });
  };

  const handleDeleteAccount = () => {
    setConfirmAction({
      type: 'delete',
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action cannot be undone and will remove all your data.'
    });
  };

  const executeConfirmAction = async () => {
    if (confirmAction?.type === 'delete') {
      deleteAccount();
    } else if (confirmAction?.type === 'clear') {
      await StorageService.clear();
      window.location.reload();
    }
    setConfirmAction(null);
  };

  const handleLogout = () => {
    logout();
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

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Account */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3 px-2">Account</h2>
          <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {user?.avatar || '👤'}
                </div>
                <div>
                  <p className="font-medium">{user?.name || 'Guest'}</p>
                  <p className="text-xs opacity-60">{user?.email || 'Guest Account'}</p>
                </div>
              </div>
              {stats.isPremium && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold rounded-full uppercase tracking-wide">
                  Premium
                </span>
              )}
            </div>

            <button
              onClick={openEditProfile}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <Edit2 size={20} />
                <span>Edit Profile</span>
              </div>
              <ChevronRight size={16} className="opacity-50" />
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-red-500 border-b border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} />
                <span>Log Out</span>
              </div>
            </button>

            <button
              onClick={handleDeleteAccount}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-600"
            >
              <div className="flex items-center gap-3">
                <UserX size={20} />
                <span>Delete Account</span>
              </div>
            </button>
          </div>
        </section>

        {/* Appearance & Voice */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3 px-2">Preferences</h2>
          <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                <span>Dark Mode</span>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </button>

            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Volume2 size={20} />
                <span className="font-medium">Father AI Voice</span>
              </div>
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedVoiceIdx ?? ''}
                  onChange={(e) => handleVoiceChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                  className={`flex-1 p-2 rounded-lg text-sm border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                >
                  <option value="">Auto-select (Male)</option>
                  {availableVoices.filter(v => v.lang.startsWith('en')).map((voice, idx) => (
                    <option key={idx} value={availableVoices.indexOf(voice)}>
                      {voice.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => previewVoice(selectedVoiceIdx)}
                  className={`p-2 rounded-lg transition-colors ${isPreviewing ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}
                  title="Preview Voice"
                >
                  {isPreviewing ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>
              </div>
              <p className="text-[10px] opacity-50">Select your preferred guide's voice from your system voices.</p>
            </div>
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3 px-2">Data</h2>
          <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={clearData}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-red-500"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={20} />
                <span>Clear All Data</span>
              </div>
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3 px-2">About</h2>
          <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <p className="mb-2 opacity-80">
                Bible Nova is your spiritual companion, designed to provide comfort and guidance through Scripture.
              </p>
              <div className="flex items-center gap-2 opacity-60 text-sm">
                <span>Version 1.0.0</span>
              </div>
            </div>

            <Link
              to="/privacy"
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b border-gray-100 dark:border-gray-700"
            >
              <span>Privacy Policy</span>
              <ChevronRight size={16} className="opacity-50" />
            </Link>

            <Link
              to="/terms"
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <span>Terms of Service</span>
              <ChevronRight size={16} className="opacity-50" />
            </Link>
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <div key="edit-profile-modal" className="fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsEditProfileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-6 rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Edit Profile</h3>
                <button
                  onClick={() => setIsEditProfileOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 opacity-70">Avatar</label>
                  <div className="flex flex-wrap gap-3">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setEditAvatar(avatar)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${editAvatar === avatar
                          ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 opacity-70">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full p-3 rounded-xl border ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 focus:border-blue-500'
                      : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium opacity-70">AI Personalization</label>
                    <p className="text-[10px] opacity-50">Tailor Father AI's guidance to your needs</p>
                  </div>
                  <button
                    onClick={() => setIsPersonalizationEnabled(!isPersonalizationEnabled)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isPersonalizationEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${isPersonalizationEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {isPersonalizationEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-2"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2 opacity-70">AI Persona Focus (e.g. Peace, Growth)</label>
                      <input
                        type="text"
                        value={editSpiritualFocus}
                        onChange={(e) => setEditSpiritualFocus(e.target.value)}
                        className={`w-full p-3 rounded-xl border ${theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                        placeholder="What should Father AI focus on?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 opacity-70">Guidance Tone</label>
                      <div className="flex gap-2">
                        {['pastoral', 'gentle', 'direct'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setEditTone(t)}
                            className={`flex-1 py-2 rounded-lg text-sm capitalize transition-all ${editTone === t
                              ? 'bg-blue-600 text-white shadow-md'
                              : (theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                              }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={saveProfile}
                  disabled={!editName.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={20} />
                  <span>Save Changes</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div key="confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setConfirmAction(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-sm p-6 rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <h3 className="text-lg font-semibold mb-2">{confirmAction.title}</h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{confirmAction.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={executeConfirmAction}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
