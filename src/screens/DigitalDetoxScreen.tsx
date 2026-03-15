import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Clock, Shield, Smartphone, Heart, CloudRain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { AppBlocker } from '../plugins/AppBlocker';
import { StorageService } from '../services/storageService';

const APPS = [
  { id: 'instagram', bundleId: 'com.instagram.android', name: 'Instagram', color: 'bg-pink-500' },
  { id: 'tiktok', bundleId: 'com.zhiliaoapp.musically', name: 'TikTok', color: 'bg-black dark:bg-gray-800' },
  { id: 'twitter', bundleId: 'com.twitter.android', name: 'X (Twitter)', color: 'bg-gray-900 dark:bg-gray-700' },
  { id: 'facebook', bundleId: 'com.facebook.katana', name: 'Facebook', color: 'bg-blue-600' },
  { id: 'youtube', bundleId: 'com.google.android.youtube', name: 'YouTube', color: 'bg-red-600' },
  { id: 'reddit', bundleId: 'com.reddit.frontpage', name: 'Reddit', color: 'bg-orange-500' },
];

const DURATIONS = [
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
];

const VERSES = [
  { id: 'p1', text: "Lord, you are my strength and my shield; my heart trusts in you, and I am helped.", ref: "Psalm 28:7", theme: "Praise" },
  { id: 'p2', text: "Father, I praise you for your unfailing love and your wonderful deeds. You are my rock and my salvation.", ref: "My Prayer", theme: "Praise" },
  { id: 'p3', text: "God, I surrender my worries to you today. Guide my steps and fill my heart with your perfect peace.", ref: "My Prayer", theme: "Surrender" },
  { id: 'p4', text: "Lord, thank you for the breath in my lungs and the grace you've given me. Help me to honor you in all I do.", ref: "My Prayer", theme: "Gratitude" },
  { id: 'p5', text: "Heavenly Father, you are holy and mighty. I stand in awe of your creation and your boundless mercy toward me.", ref: "My Prayer", theme: "Worship" },
  { id: 'p6', text: "Create in me a pure heart, O God, and renew a steadfast spirit within me.", ref: "Psalm 51:10", theme: "Prayer" },
  { id: 'p7', text: "I will give thanks to you, Lord, with all my heart; I will tell of all your wonderful deeds.", ref: "Psalm 9:1", theme: "Gratitude" },
  { id: 'p8', text: "You are my God, and I will praise you; you are my God, and I will exalt you.", ref: "Psalm 118:28", theme: "Praise" },
];

export default function DigitalDetoxScreen() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [selectedApps, setSelectedApps] = useState<string[]>(['instagram', 'tiktok']);
  const [duration, setDuration] = useState<number>(10);
  const [selectedVerse, setSelectedVerse] = useState<string>('p1');
  const [userPrayers, setUserPrayers] = useState<{ id: string, text: string, category: string }[]>([]);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const loadPrayers = async () => {
      try {
        const saved = await StorageService.get('prayers');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setUserPrayers(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load prayers", e);
      }
    };
    loadPrayers();
  }, []);

  const toggleApp = (id: string) => {
    setSelectedApps(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const startDetox = async () => {
    try {
      // Try to call the native plugin
      const bundleIds = selectedApps.map(id => APPS.find(a => a.id === id)?.bundleId).filter(Boolean) as string[];

      // Request permissions first
      const { granted } = await AppBlocker.requestPermissions().catch(() => ({ granted: false }));

      if (granted && bundleIds.length > 0) {
        // We pass duration in minutes to the native plugin (for testing we'll pass the seconds / 60)
        await AppBlocker.blockApps({ appBundleIds: bundleIds, durationMinutes: Math.max(1, Math.ceil(duration / 60)) });
      }
    } catch (e) {
      console.log("Native AppBlocker not available (running in web browser). Falling back to web overlay.");
    }

    setTimeLeft(duration);
    setIsPreviewMode(true);
  };

  const cancelDetox = async () => {
    try {
      await AppBlocker.unblockApps();
    } catch (e) {
      // Ignore web errors
    }
    setIsPreviewMode(false);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPreviewMode && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isPreviewMode && timeLeft === 0) {
      // Auto-unblock when timer finishes
      AppBlocker.unblockApps().catch(() => { });
    }
    return () => clearTimeout(timer);
  }, [isPreviewMode, timeLeft]);

  const activeVerse = selectedVerse.startsWith('prayer_')
    ? {
      text: userPrayers.find(p => `prayer_${p.id}` === selectedVerse)?.text || '',
      ref: 'My Prayer'
    }
    : VERSES.find(v => v.id === selectedVerse);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'text-stone-100' : 'text-stone-900'} relative overflow-hidden pb-32`}>
      {/* Dynamic Background Auras */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.08, 0.12, 0.08]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] rounded-full bg-cyan-500/5 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
            opacity: [0.05, 0.08, 0.05]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[70%] h-[70%] rounded-full bg-sacred-amber/5 blur-[100px]"
        />
      </div>

      {/* Header */}
      <div className={`sticky top-0 z-30 backdrop-blur-2xl border-b pt-safe-4 ${theme === 'dark' ? 'bg-stone-950/60 border-white/5' : 'bg-white/60 border-sacred-amber/10'} px-6 py-5 flex items-center justify-between`}>
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate(-1)}
            className={`p-2.5 rounded-2xl transition-all active:scale-90 ${theme === 'dark' ? 'bg-white/5 text-stone-300' : 'bg-sacred-cream text-stone-600 shadow-sm'}`}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-xl font-black font-serif italic tracking-tight flex items-center gap-3">
              <div className="relative">
                <CloudRain size={24} className="text-cyan-500" />
                <motion.div
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-x-0 -bottom-1 h-1 bg-cyan-500 blur-md rounded-full"
                />
              </div>
              Digital Detox
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-10 mt-4 relative z-10">

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-8 rounded-[2.5rem] border relative overflow-hidden ${theme === 'dark' ? 'glass-dark border-cyan-500/20' : 'bg-cyan-50/50 backdrop-blur-md border-cyan-100 shadow-xl shadow-cyan-500/5'}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
              <Shield size={20} className="text-cyan-500" />
            </div>
            <h2 className="text-lg font-black font-serif italic">Protect Your Peace</h2>
          </div>
          <p className={`text-sm leading-relaxed opacity-80 font-medium ${theme === 'dark' ? 'text-stone-300' : 'text-stone-600'}`}>
            Configure a mindful pause before opening distracting apps. Take a moment to breathe and reflect on God's word before diving into the digital world.
          </p>
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full -z-10" />
        </motion.div>

        {/* App Selection */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] mb-5 opacity-40 flex items-center gap-3">
            <Smartphone size={14} className="text-cyan-500" /> 1. Select Apps to Pause
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {APPS.map(app => {
              const isSelected = selectedApps.includes(app.id);
              return (
                <button
                  key={app.id}
                  onClick={() => toggleApp(app.id)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-[2rem] border transition-all duration-300 active:scale-95 ${isSelected
                    ? (theme === 'dark' ? 'bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/20 shadow-lg shadow-cyan-500/10' : 'bg-white border-cyan-500 shadow-xl shadow-cyan-500/10')
                    : (theme === 'dark' ? 'glass-dark border-white/5 opacity-60' : 'bg-white/40 backdrop-blur-sm border-white opacity-60')
                    }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg ${app.color}`}>
                    {app.name.charAt(0)}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-xs tracking-tight">{app.name}</span>
                    {isSelected && (
                      <motion.div layoutId={`check-${app.id}`} className="mt-1">
                        <Check size={14} className="text-cyan-500" strokeWidth={3} />
                      </motion.div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Duration Selection */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] mb-5 opacity-40 flex items-center gap-3">
            <Clock size={14} className="text-cyan-500" /> 2. Set Pause Duration
          </h3>
          <div className="flex gap-3">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`flex-1 py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${duration === d.value
                  ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/20'
                  : (theme === 'dark' ? 'glass-dark border-white/5 text-stone-400' : 'bg-white/40 backdrop-blur-sm border-white text-stone-500')
                  }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* Verse Selection */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] mb-5 opacity-40 flex items-center gap-3">
            <Heart size={14} className="text-cyan-500" /> 3. Choose Your Focus
          </h3>
          <div className="space-y-4">
            {/* User Prayers */}
            {userPrayers.length > 0 && (
              <div className="mb-8 space-y-4">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 px-2 mt-2">Inner Sanctuary</h4>
                {userPrayers.slice(0, 3).map(prayer => {
                  const isSelected = selectedVerse === `prayer_${prayer.id}`;
                  return (
                    <button
                      key={prayer.id}
                      onClick={() => setSelectedVerse(`prayer_${prayer.id}`)}
                      className={`w-full text-left p-6 rounded-[2.5rem] border transition-all duration-300 relative overflow-hidden ${isSelected
                        ? (theme === 'dark' ? 'bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/20 shadow-xl' : 'bg-white border-cyan-500 shadow-xl shadow-cyan-500/10')
                        : (theme === 'dark' ? 'glass-dark border-white/5 opacity-70' : 'bg-white/40 backdrop-blur-sm border-white opacity-70')
                        }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-white/5 text-stone-400' : 'bg-stone-100 text-stone-500'
                          }`}>
                          Personal Reflection • {prayer.category}
                        </span>
                        {isSelected && <Check size={18} className="text-cyan-500" strokeWidth={3} />}
                      </div>
                      <p className="font-serif text-lg leading-relaxed italic opacity-90 line-clamp-2">"{prayer.text}"</p>
                    </button>
                  );
                })}
              </div>
            )}

            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 px-2 mt-2">Sacred Scripture</h4>
            {VERSES.map(verse => {
              const isSelected = selectedVerse === verse.id;
              return (
                <button
                  key={verse.id}
                  onClick={() => setSelectedVerse(verse.id)}
                  className={`w-full text-left p-6 rounded-[2.5rem] border transition-all duration-300 relative overflow-hidden ${isSelected
                    ? (theme === 'dark' ? 'bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/20 shadow-xl' : 'bg-white border-cyan-500 shadow-xl shadow-cyan-500/10')
                    : (theme === 'dark' ? 'glass-dark border-white/5 opacity-70' : 'bg-white/40 backdrop-blur-sm border-white opacity-70')
                    }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-white/5 text-stone-400' : 'bg-stone-100 text-stone-500'
                      }`}>
                      {verse.theme}
                    </span>
                    {isSelected && <Check size={18} className="text-cyan-500" strokeWidth={3} />}
                  </div>
                  <p className="font-serif text-lg leading-relaxed italic opacity-90 mb-3">"{verse.text}"</p>
                  <div className="flex items-center gap-2 opacity-60">
                    <div className="w-4 h-px bg-cyan-500/50" />
                    <p className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      {verse.ref}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div className="pt-8">
          <button
            onClick={startDetox}
            className="w-full py-5 rounded-[2rem] bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-cyan-500/20 transition-all active:scale-[0.98] relative overflow-hidden group"
          >
            <span className="relative z-10">Start Detox Session</span>
            <motion.div
              className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"
            />
          </button>
          <p className="text-center text-[10px] font-black uppercase tracking-widest opacity-30 mt-6 leading-relaxed">
            Protecting your peace across your digital sanctuary
          </p>
        </div>
      </div>

      {/* Preview Overlay */}
      <AnimatePresence>
        {isPreviewMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-[40px] ${theme === 'dark' ? 'bg-stone-950/90' : 'bg-white/90'}`}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 15, repeat: Infinity }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyan-500/10 blur-[150px] rounded-full"
              />
            </div>

            <div className="max-w-md w-full text-center space-y-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 12 }}
                className="w-32 h-32 mx-auto rounded-full flex items-center justify-center relative shadow-2xl shadow-cyan-500/10"
              >
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-cyan-500 transition-all duration-1000 ease-linear opacity-20"
                    strokeDasharray={377}
                    strokeDashoffset={0}
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-cyan-500 transition-all duration-1000 ease-linear drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * (timeLeft / duration))}
                  />
                </svg>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black font-serif italic">{timeLeft}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">seconds</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                <p className="font-serif text-3xl md:text-4xl leading-[1.4] italic opacity-90 px-4">
                  "{activeVerse?.text}"
                </p>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-px bg-cyan-500/30" />
                  <p className={`text-xs font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    {activeVerse?.ref}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-12"
              >
                {timeLeft === 0 ? (
                  <button
                    onClick={cancelDetox}
                    className="px-10 py-4 rounded-2xl bg-cyan-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-cyan-500/20 active:scale-95 transition-all"
                  >
                    Enter Your Sanctuary
                  </button>
                ) : (
                  <button
                    onClick={cancelDetox}
                    className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-stone-400 hover:text-white' : 'bg-stone-100 border-transparent text-stone-500 hover:text-stone-900'
                      }`}
                  >
                    Break Pause
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
