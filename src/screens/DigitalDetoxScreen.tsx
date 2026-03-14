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
  const [userPrayers, setUserPrayers] = useState<{id: string, text: string, category: string}[]>([]);
  
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
      AppBlocker.unblockApps().catch(() => {});
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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} pb-24`}>
      {/* Header */}
      <div className={`sticky top-0 z-30 backdrop-blur-md border-b ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'} px-4 py-4 flex items-center gap-4`}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CloudRain size={20} className="text-cyan-500" /> Digital Detox
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-8 mt-4">
        
        {/* Intro */}
        <div className={`p-6 rounded-3xl ${theme === 'dark' ? 'bg-cyan-900/20 border border-cyan-800/30' : 'bg-cyan-50 border border-cyan-100'}`}>
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Shield size={20} className="text-cyan-600 dark:text-cyan-400" /> Protect Your Peace
          </h2>
          <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Configure a mindful pause before opening distracting apps. Take a moment to breathe and reflect on God's word before diving into the digital world.
          </p>
        </div>

        {/* App Selection */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-70 flex items-center gap-2">
            <Smartphone size={16} /> 1. Select Apps to Pause
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {APPS.map(app => {
              const isSelected = selectedApps.includes(app.id);
              return (
                <button
                  key={app.id}
                  onClick={() => toggleApp(app.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    isSelected 
                      ? (theme === 'dark' ? 'bg-gray-800 border-cyan-500 ring-1 ring-cyan-500' : 'bg-white border-cyan-500 ring-1 ring-cyan-500 shadow-sm')
                      : (theme === 'dark' ? 'bg-gray-800/50 border-gray-700 opacity-70' : 'bg-white border-gray-200 opacity-70')
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${app.color}`}>
                    {app.name.charAt(0)}
                  </div>
                  <span className="font-medium text-sm">{app.name}</span>
                  {isSelected && <Check size={16} className="ml-auto text-cyan-500" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Duration Selection */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-70 flex items-center gap-2">
            <Clock size={16} /> 2. Set Pause Duration
          </h3>
          <div className="flex gap-3">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`flex-1 py-3 rounded-2xl border font-medium transition-all ${
                  duration === d.value
                    ? (theme === 'dark' ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-cyan-50 border-cyan-500 text-cyan-700')
                    : (theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500')
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* Verse Selection */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-70 flex items-center gap-2">
            <Heart size={16} /> 3. Choose Your Focus
          </h3>
          <div className="space-y-3">
            {/* User Prayers */}
            {userPrayers.length > 0 && (
              <div className="mb-6 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-50 mb-2">Your Prayers</h4>
                {userPrayers.slice(0, 3).map(prayer => {
                  const isSelected = selectedVerse === `prayer_${prayer.id}`;
                  return (
                    <button
                      key={prayer.id}
                      onClick={() => setSelectedVerse(`prayer_${prayer.id}`)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? (theme === 'dark' ? 'bg-gray-800 border-cyan-500 ring-1 ring-cyan-500' : 'bg-white border-cyan-500 ring-1 ring-cyan-500 shadow-sm')
                          : (theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50')
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          My Prayer • {prayer.category}
                        </span>
                        {isSelected && <Check size={18} className="text-cyan-500" />}
                      </div>
                      <p className="font-serif text-lg leading-relaxed mb-2 line-clamp-2">"{prayer.text}"</p>
                    </button>
                  );
                })}
              </div>
            )}

            <h4 className="text-xs font-bold uppercase tracking-wider opacity-50 mb-2">Bible Verses</h4>
            {VERSES.map(verse => {
              const isSelected = selectedVerse === verse.id;
              return (
                <button
                  key={verse.id}
                  onClick={() => setSelectedVerse(verse.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? (theme === 'dark' ? 'bg-gray-800 border-cyan-500 ring-1 ring-cyan-500' : 'bg-white border-cyan-500 ring-1 ring-cyan-500 shadow-sm')
                      : (theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50')
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {verse.theme}
                    </span>
                    {isSelected && <Check size={18} className="text-cyan-500" />}
                  </div>
                  <p className="font-serif text-lg leading-relaxed mb-2">"{verse.text}"</p>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    {verse.ref}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div className="pt-6">
          <button
            onClick={startDetox}
            className="w-full py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-lg shadow-lg shadow-cyan-500/30 transition-all active:scale-[0.98]"
          >
            Start Detox Session
          </button>
          <p className="text-center text-xs opacity-50 mt-4">
            In the web preview, this shows an overlay timer. In the native app, it will block the selected apps via OS-level controls.
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
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white p-6"
          >
            <div className="max-w-md w-full text-center space-y-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-24 h-24 mx-auto rounded-full border-4 border-cyan-500/30 flex items-center justify-center relative"
              >
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-cyan-500 transition-all duration-1000 ease-linear"
                    strokeDasharray={276}
                    strokeDashoffset={276 - (276 * (timeLeft / duration))}
                  />
                </svg>
                <span className="text-3xl font-bold">{timeLeft}</span>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <p className="font-serif text-2xl md:text-3xl leading-relaxed mb-4">
                  "{activeVerse?.text}"
                </p>
                <p className="text-cyan-400 font-medium tracking-wide">
                  {activeVerse?.ref}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-8"
              >
                {timeLeft === 0 ? (
                  <button
                    onClick={cancelDetox}
                    className="px-8 py-3 rounded-full bg-white text-gray-900 font-bold hover:bg-gray-100 transition-colors"
                  >
                    Continue to App
                  </button>
                ) : (
                  <button
                    onClick={cancelDetox}
                    className="px-8 py-3 rounded-full border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
                  >
                    Cancel Detox
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
