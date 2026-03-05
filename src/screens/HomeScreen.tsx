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
      
      const storedData = localStorage.getItem('daily_verse_data');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed.date === dateKey) {
          setDailyVerse(parsed.verse);
          if (parsed.reflection) setDailyReflection(parsed.reflection);
          return;
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
        
        await sendMessageStream(prompt, [], (chunk) => {
          reflection += chunk;
          setDailyReflection(reflection);
        });

        localStorage.setItem('daily_verse_data', JSON.stringify({
          date: dateKey,
          verse: newVerse,
          reflection: reflection
        }));
      } catch (err) {
        console.error("Failed to fetch daily verse:", err);
        setDailyVerse({
          text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
          reference: "John 3:16"
        });
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
    
    if (isSpeaking) {
      stopAudio();
      setIsSpeaking(false);
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
      className={`p-6 max-w-4xl mx-auto ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
    >
      <motion.header variants={itemVariants} className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name || 'Beloved'}</h1>
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Your spiritual companion is ready.
          </p>
        </div>
        
        {/* Growth Stats Mini-Widget */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-orange-500 font-bold">
              <Flame size={18} fill="currentColor" />
              <span>{stats.streak}</span>
            </div>
            <span className="text-[10px] uppercase tracking-tighter opacity-50">Streak</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-blue-500 font-bold">
              <Trophy size={18} />
              <span>{stats.totalVersesRead + stats.totalPrayers}</span>
            </div>
            <span className="text-[10px] uppercase tracking-tighter opacity-50">Points</span>
          </div>
        </div>
      </motion.header>

      {/* Daily Verse Card */}
      <motion.div 
        variants={itemVariants}
        className={`relative overflow-hidden p-6 md:p-8 rounded-[2.5rem] shadow-2xl mb-10 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900' 
          : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700'
      } text-white group transition-all`}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BookOpen size={160} />
        </div>
        
        <div className="flex justify-between items-center relative z-10 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-70 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            Daily Bread
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={handleShare}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 text-white"
              title="Share Verse"
            >
              <Share2 size={20} />
            </button>
            <button 
              onClick={handleSpeak}
              className={`p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 ${isSpeaking ? 'text-yellow-300' : 'text-white'}`}
              title="Listen"
            >
              {isLoadingAudio ? <Loader2 size={20} className="animate-spin" /> : (isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />)}
            </button>
          </div>
        </div>
        
        {dailyVerse ? (
          <div className="relative z-10">
            <p className="text-2xl md:text-4xl font-serif leading-tight mb-6 drop-shadow-md italic">
              "{dailyVerse.text}"
            </p>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-10 bg-white/40"></div>
              <p className="font-bold text-xl tracking-wide opacity-90">{dailyVerse.reference}</p>
            </div>

            {/* AI Reflection */}
            <div className={`p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 transition-all ${isReflecting ? 'animate-pulse' : ''}`}>
              <p className="text-sm md:text-base font-medium leading-relaxed opacity-95">
                {dailyReflection || (isReflecting ? "Father is reflecting on this word..." : "")}
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/20 rounded-xl w-3/4"></div>
            <div className="h-8 bg-white/20 rounded-xl w-full"></div>
            <div className="h-24 bg-white/10 rounded-2xl w-full"></div>
          </div>
        )}
      </motion.div>

      {/* Mood Guidance */}
      <motion.section variants={itemVariants} className="mb-10">
        <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
          <Heart size={20} className="text-red-500" /> How is your heart today?
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MOODS.map((mood) => (
            <button
              key={mood.name}
              onClick={() => handleMoodClick(mood.prompt)}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 hover:shadow-md ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                  : 'bg-white border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mood.color} shadow-sm`}>
                <mood.icon size={24} />
              </div>
              <span className="font-bold text-sm">{mood.name}</span>
            </button>
          ))}
        </div>
      </motion.section>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link to="/chat" className={`col-span-2 md:col-span-1 p-6 rounded-3xl border transition-all active:scale-95 hover:shadow-xl ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
            : 'bg-white border-gray-100 hover:bg-blue-50/50'
        }`}>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
              <MessageSquare size={24} />
            </div>
            <h3 className="font-bold text-xl">Ask Father</h3>
          </div>
          <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Seek wisdom and comfort in your time of need.
          </p>
        </Link>

        <Link to="/library" className={`p-6 rounded-3xl border transition-all active:scale-95 hover:shadow-xl ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
            : 'bg-white border-gray-100 hover:bg-emerald-50/50'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm mb-4">
            <BookOpen size={24} />
          </div>
          <h3 className="font-bold text-lg mb-1">Read Bible</h3>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Explore the KJV Scriptures
          </p>
        </Link>

        <Link to="/bookmarks" className={`p-6 rounded-3xl border transition-all active:scale-95 hover:shadow-xl ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
            : 'bg-white border-gray-100 hover:bg-purple-50/50'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm mb-4">
            <Bookmark size={24} />
          </div>
          <h3 className="font-bold text-lg mb-1">Saved</h3>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Your treasured verses
          </p>
        </Link>

        <Link to="/journal" className={`p-6 rounded-3xl border transition-all active:scale-95 hover:shadow-xl ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
            : 'bg-white border-gray-100 hover:bg-orange-50/50'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm mb-4">
            <PenLine size={24} />
          </div>
          <h3 className="font-bold text-lg mb-1">Journal</h3>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Write your prayers
          </p>
        </Link>

        <div className={`p-6 rounded-3xl border transition-all ${
          theme === 'dark' 
            ? 'bg-gray-800/50 border-gray-700' 
            : 'bg-gray-50 border-gray-100'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm mb-4 ${
             theme === 'dark' ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
          }`}>
            <Rocket size={24} />
          </div>
          <h3 className={`font-bold text-lg mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Coming Soon</h3>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
            More features ahead
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
