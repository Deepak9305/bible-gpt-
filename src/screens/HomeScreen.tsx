import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, BookOpen, Bookmark, Volume2, VolumeX, Loader2, Heart, Shield, Sun, Moon, CloudRain, PenLine, Share2, Sparkles, Flame, Trophy, Rocket, Lightbulb } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { POPULAR_VERSES } from '../data/popularVerses';
import { playTextToSpeech, stopAudio } from '../services/ttsService';
import { sendMessageStream } from '../services/aiService';
import { getStats, updateStreak, UserStats } from '../services/statsService';
import { motion } from 'motion/react';
import { StorageService } from '../services/storageService';

const MOODS = [
  { name: 'Anxious', icon: Shield, color: 'bg-blue-100 text-blue-600', prompt: 'I am feeling anxious and need peace.' },
  { name: 'Lonely', icon: Heart, color: 'bg-red-100 text-red-600', prompt: 'I am feeling lonely and need comfort.' },
  { name: 'Grateful', icon: Sun, color: 'bg-yellow-100 text-yellow-600', prompt: 'I am feeling grateful and want to give thanks.' },
  { name: 'Inspired', icon: Lightbulb, color: 'bg-emerald-100 text-emerald-600', prompt: 'I am feeling inspired and want to grow in my faith.' },
];

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dailyVerse, setDailyVerse] = useState<{ text: string; reference: string } | null>(null);
  const [dailyReflection, setDailyReflection] = useState<string | null>(null);
  const [isReflecting, setIsReflecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [stats, setStats] = useState<UserStats>(getStats());

  useEffect(() => {
    // Update streak on mount
    const updatedStats = updateStreak();
    setStats(updatedStats);

    const fetchDailyVerse = async () => {
      const now = new Date();
      const istDateString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const istDate = new Date(istDateString);

      const hours = istDate.getHours();
      const minutes = istDate.getMinutes();

      let cycleDate = new Date(istDate);
      if (hours < 5 || (hours === 5 && minutes < 30)) {
        cycleDate.setDate(cycleDate.getDate() - 1);
      }

      const dateKey = cycleDate.toLocaleDateString("en-CA");

      const storedData = await StorageService.get('daily_verse_data');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          if (parsed.date === dateKey) {
            setDailyVerse(parsed.verse);
            if (parsed.reflection) setDailyReflection(parsed.reflection);
            return;
          }
        } catch (e) {
          console.error("Failed to parse daily verse data", e);
        }
      }

      let hash = 0;
      for (let i = 0; i < dateKey.length; i++) {
        hash = ((hash << 5) - hash) + dateKey.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % POPULAR_VERSES.length;
      const verseRef = POPULAR_VERSES[index];

      try {
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(verseRef)}?translation=kjv`);
        if (!response.ok) {
          throw new Error('Failed to fetch verse from API');
        }
        const data = await response.json();
        const newVerse = {
          text: data.text.trim(),
          reference: data.reference
        };

        setDailyVerse(newVerse);

        // Generate reflection
        setIsReflecting(true);
        let reflection = "";
        const prompt = `As "Father", provide a very short (1-2 sentences), warm, and wise reflection on this verse: "${newVerse.text}" (${newVerse.reference}). Speak directly to the user's heart.`;

        try {
          await sendMessageStream(prompt, [], {}, (chunk) => {
            reflection += chunk;
            setDailyReflection(reflection);
          });
        } catch (aiErr) {
          console.warn("AI reflection failed, using default", aiErr);
          reflection = "May this word guide your path today and bring peace to your heart.";
          setDailyReflection(reflection);
        }

        await StorageService.set('daily_verse_data', JSON.stringify({
          date: dateKey,
          verse: newVerse,
          reflection: reflection
        }));
      } catch (err) {
        console.error("Failed to fetch daily verse, falling back to local:", err);
        const { getRandomVerseLocally } = await import('../services/bibleService');
        const localVerse = await getRandomVerseLocally();

        if (localVerse) {
          const fallbackVerse = {
            text: localVerse.text,
            reference: `${localVerse.book_name} ${localVerse.chapter}:${localVerse.verse}`
          };
          setDailyVerse(fallbackVerse);
          setDailyReflection("The Word of the Lord endures forever, even when the world fades.");
        } else {
          setDailyVerse({
            text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
            reference: "John 3:16"
          });
          setDailyReflection("A timeless promise for your soul today.");
        }
      } finally {
        setIsReflecting(false);
      }
    };

    fetchDailyVerse();

    return () => {
      stopAudio();
    };
  }, []);

  const handleSpeak = async () => {
    if (!dailyVerse) return;

    if (isSpeaking || isLoadingAudio) {
      stopAudio();
      setIsSpeaking(false);
      setIsLoadingAudio(false);
      return;
    }

    setIsLoadingAudio(true);
    setIsSpeaking(true);

    const textToSpeak = `${dailyVerse.text}. ${dailyReflection || ''}`;

    try {
      await playTextToSpeech(textToSpeak, () => {
        setIsSpeaking(false);
        setIsLoadingAudio(false);
      });
    } catch (error) {
      console.error("Audio failed", error);
      setIsSpeaking(false);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleMoodClick = (prompt: string) => {
    navigate('/chat', { state: { initialPrompt: prompt } });
  };

  const handleShare = async () => {
    if (!dailyVerse) return;
    const shareText = `"${dailyVerse.text}" - ${dailyVerse.reference}\n\nShared from Father AI 🙏`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Daily Bread',
          text: shareText,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      alert("Verse copied to clipboard!");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`min-h-full p-6 max-w-4xl mx-auto flex flex-col relative z-10 ${theme === 'dark' ? 'text-stone-100' : 'text-stone-900'}`}
    >
      {/* Dynamic Background Auras */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-sacred-amber/10 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, 50, 0],
            opacity: [0.05, 0.15, 0.05]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[100px]"
        />
      </div>
      <motion.header variants={itemVariants} className="mb-12 flex justify-between items-start pt-4">
        <div className="flex-1">
          <h1 className="text-4xl font-black font-serif italic leading-tight tracking-tight">
            Welcome, <span className="text-sacred-amber dark:text-sacred-amber">{user?.name || 'Beloved'}</span>
          </h1>
          <p className={`text-[10px] font-black mt-2 opacity-40 tracking-[0.2em] uppercase flex items-center gap-2`}>
            <span className="w-1.5 h-1.5 rounded-full bg-sacred-amber animate-pulse"></span>
            Your spiritual sanctuary
          </p>
        </div>

        {/* Growth Stats Mini-Widget */}
        <div className={`flex gap-4 p-2.5 rounded-3xl border ${theme === 'dark' ? 'glass-dark border-white/5' : 'glass-light border-amber-500/10'}`}>
          <div className="flex flex-col items-center px-2">
            <div className="flex items-center gap-1.5 text-orange-500 font-black">
              <Flame size={16} fill="currentColor" />
              <span>{stats.streak}</span>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Day</span>
          </div>
          <div className="w-px h-6 bg-stone-300/20 self-center" />
          <div className="flex flex-col items-center px-2">
            <div className="flex items-center gap-1.5 text-sacred-amber font-black">
              <Sparkles size={16} />
              <span>{stats.totalVersesRead + stats.totalPrayers}</span>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Soul</span>
          </div>
        </div>
      </motion.header>

      {/* Daily Verse Card: Fluid & Elegant */}
      <motion.div
        variants={itemVariants}
        className={`relative overflow-hidden p-8 md:p-14 rounded-[3.5rem] mb-12 border transition-all duration-700 hover:scale-[1.01] ${theme === 'dark'
          ? 'bg-stone-900/40 border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]'
          : 'bg-white/40 backdrop-blur-md border-white/60 shadow-[0_20px_50px_-15px_rgba(212,163,115,0.15)]'
          } group`}>

        {/* Inner Card Glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-sacred-amber/5 blur-[80px] rounded-full group-hover:bg-sacred-amber/10 transition-colors" />

        <div className="flex justify-between items-center relative z-10 mb-12">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-sacred-amber/10 text-sacred-amber shadow-inner' : 'bg-sacred-amber/10 text-sacred-amber shadow-inner'}`}>
              <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">
              Morning Manna
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className={`p-3 rounded-2xl transition-all active:scale-90 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white/80 hover:bg-white'}`}
              title="Share Verse"
            >
              <Share2 size={18} className="opacity-70" />
            </button>
            <button
              onClick={handleSpeak}
              className={`p-3 rounded-2xl transition-all active:scale-90 ${isSpeaking ? 'bg-sacred-amber text-white' : (theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white/80 hover:bg-white')}`}
              title="Listen"
            >
              {isLoadingAudio ? <Loader2 size={18} className="animate-spin" /> : (isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} className="opacity-70" />)}
            </button>
          </div>
        </div>

        {dailyVerse ? (
          <div className="relative z-10 text-center px-4">
            <h3 className="text-3xl md:text-5xl font-serif leading-[1.3] mb-10 italic text-stone-900 dark:text-stone-50 transition-all">
              "{dailyVerse.text}"
            </h3>

            <div className="flex flex-col items-center gap-8">
              <p className="font-black text-[10px] tracking-[0.5em] uppercase opacity-30 pb-8 border-b border-stone-200/50 dark:border-white/5 w-32">
                {dailyVerse.reference}
              </p>

              {/* AI Reflection in a premium container */}
              <div className={`w-full max-w-2xl p-8 rounded-[3rem] transition-all relative overflow-hidden ${isReflecting ? 'animate-pulse' : ''} ${theme === 'dark' ? 'bg-white/5 border border-white/5' : 'bg-white/60 border border-white/80 shadow-inner'}`}>
                <div className="flex items-center justify-center gap-2 mb-4 text-sacred-amber">
                  <Sparkles size={14} fill="currentColor" className="opacity-50" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">The Father's Heart</span>
                </div>
                <p className="text-lg md:text-xl font-medium leading-relaxed italic opacity-80 font-serif">
                  {dailyReflection || (isReflecting ? "Listening for the Spirit's voice..." : "")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-pulse flex flex-col items-center gap-8 py-10">
            <div className={`h-12 rounded-[2rem] w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-stone-100'}`}></div>
            <div className={`h-6 rounded-full w-24 ${theme === 'dark' ? 'bg-white/5' : 'bg-stone-100'}`}></div>
            <div className={`h-32 rounded-[2.5rem] w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-stone-100'}`}></div>
          </div>
        )}
      </motion.div>

      {/* Mood Guidance: Soft & Approachable */}
      <motion.section variants={itemVariants} className="mb-14 px-2">
        <div className="flex items-center justify-between mb-8 opacity-40">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3">
            Inquire of the Heart
          </h2>
          <div className="h-px flex-1 bg-sacred-amber/20 ml-6" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {MOODS.map((mood) => (
            <button
              key={mood.name}
              onClick={() => handleMoodClick(mood.prompt)}
              className={`flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border transition-all active:scale-95 group ${theme === 'dark'
                ? 'bg-stone-900/40 border-white/5 hover:bg-stone-800/60 hover:border-sacred-amber/30'
                : 'bg-white/50 backdrop-blur-sm border-white/80 hover:bg-white hover:shadow-2xl hover:shadow-sacred-amber/10'
                }`}
            >
              <div className={`w-14 h-14 rounded-[1.4rem] flex items-center justify-center transition-all bg-sacred-cream/50 shadow-inner group-hover:scale-110 ${mood.color.split(' ')[1]}`}>
                <mood.icon size={26} strokeWidth={2.5} />
              </div>
              <span className="font-black text-xs uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{mood.name}</span>
            </button>
          ))}
        </div>
      </motion.section>

      {/* Deep Exploration Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-16 px-2">
        <Link to="/chat" className={`p-10 rounded-[3.5rem] border transition-all active:scale-95 group relative overflow-hidden ${theme === 'dark'
          ? 'bg-stone-900/40 border-white/5 hover:bg-stone-800/60'
          : 'bg-white/50 backdrop-blur-md border-white/80 hover:bg-white hover:shadow-2xl'
          }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-sacred-amber/5 blur-3xl rounded-full" />
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 rounded-[1.8rem] bg-sacred-amber/10 text-sacred-amber flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <MessageSquare size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-[22px] font-serif italic">Seek Wisdom</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sacred-amber mt-1.5">Dialogue with Father AI</p>
            </div>
          </div>
          <p className={`text-base leading-relaxed opacity-60 font-medium font-serif italic`}>
            "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you."
          </p>
        </Link>

        <div className="grid grid-cols-2 gap-4">
          <Link to="/library" className={`p-6 rounded-[2.5rem] border transition-all active:scale-95 group ${theme === 'dark'
            ? 'bg-stone-900/40 border-white/5 hover:bg-stone-800/60'
            : 'bg-white/50 border-white/80 hover:bg-white hover:shadow-xl'
            }`}>
            <div className="w-12 h-12 rounded-2xl bg-sacred-cream/50 text-emerald-600 flex items-center justify-center mb-5 shadow-inner group-hover:scale-110 transition-transform">
              <BookOpen size={24} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-sm uppercase tracking-widest mb-1">Bible</h3>
            <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Scripture</p>
          </Link>

          <Link to="/bookmarks" className={`p-6 rounded-[2.5rem] border transition-all active:scale-95 group ${theme === 'dark'
            ? 'bg-stone-900/40 border-white/5 hover:bg-stone-800/60'
            : 'bg-white/50 border-white/80 hover:bg-white hover:shadow-xl'
            }`}>
            <div className="w-12 h-12 rounded-2xl bg-sacred-cream/50 text-purple-600 flex items-center justify-center mb-5 shadow-inner group-hover:scale-110 transition-transform">
              <Bookmark size={24} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-sm uppercase tracking-widest mb-1">Treasury</h3>
            <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Saved</p>
          </Link>

          <Link to="/journal" className={`p-6 rounded-[2.5rem] border transition-all active:scale-95 group ${theme === 'dark'
            ? 'bg-stone-900/40 border-white/5 hover:bg-stone-800/60'
            : 'bg-white/50 border-white/80 hover:bg-white hover:shadow-xl'
            }`}>
            <div className="w-12 h-12 rounded-2xl bg-sacred-cream/50 text-orange-600 flex items-center justify-center mb-5 shadow-inner group-hover:scale-110 transition-transform">
              <PenLine size={24} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-sm uppercase tracking-widest mb-1">Journal</h3>
            <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Prayers</p>
          </Link>

          <button
            onClick={() => navigate('/detox')}
            className={`p-6 text-left rounded-[2.5rem] border transition-all active:scale-95 group ${theme === 'dark'
              ? 'bg-stone-900/40 border-white/5 hover:bg-stone-800/60'
              : 'bg-white/50 border-white/80 hover:bg-white hover:shadow-xl'
              }`}>
            <div className="w-12 h-12 rounded-2xl bg-sacred-cream/50 text-cyan-600 flex items-center justify-center mb-5 shadow-inner group-hover:scale-110 transition-transform">
              <CloudRain size={24} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-sm uppercase tracking-widest mb-1">Detox</h3>
            <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Peace</p>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
