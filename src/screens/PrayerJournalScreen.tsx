import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Plus, Trash2, CheckCircle2, Circle, Calendar, Tag, Filter, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { incrementPrayers } from '../services/statsService';
import { StorageService } from '../services/storageService';

interface Prayer {
  id: string;
  text: string;
  date: string;
  isAnswered: boolean;
  category: string;
}

const CATEGORIES = ['General', 'Family', 'Health', 'Career', 'Faith', 'Others'];

export default function PrayerJournalScreen() {
  const { theme } = useTheme();
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [newPrayer, setNewPrayer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const loadPrayers = async () => {
      const saved = await StorageService.get('prayers');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setPrayers(parsed);
          }
        } catch (e) {
          console.error("Failed to parse prayers", e);
        }
      }
    };
    loadPrayers();
  }, []);

  const savePrayers = async (updated: Prayer[]) => {
    setPrayers(updated);
    await StorageService.set('prayers', JSON.stringify(updated));
  };

  const addPrayer = () => {
    if (!newPrayer.trim()) return;
    const prayer: Prayer = {
      id: Date.now().toString(),
      text: newPrayer,
      date: new Date().toLocaleDateString(),
      isAnswered: false,
      category: selectedCategory,
    };
    savePrayers([prayer, ...prayers]);
    incrementPrayers();
    setNewPrayer('');
    setIsAdding(false);
  };

  const toggleAnswered = (id: string) => {
    const updated = prayers.map((p) =>
      p.id === id ? { ...p, isAnswered: !p.isAnswered } : p
    );
    savePrayers(updated);
  };

  const deletePrayer = (id: string) => {
    const updated = prayers.filter((p) => p.id !== id);
    savePrayers(updated);
  };

  const handleShare = async (prayer: Prayer) => {
    const shareText = `Prayer: "${prayer.text}"\nCategory: ${prayer.category}\nDate: ${prayer.date}\n\nShared from Bible Nova 🙏`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Prayer',
          text: shareText,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Prayer copied to clipboard!");
    }
  };

  const filteredPrayers = filterCategory === 'All'
    ? prayers
    : prayers.filter(p => p.category === filterCategory);

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-stone-100' : 'text-stone-900'} relative overflow-hidden`}>
      {/* Dynamic Background Auras */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full bg-sacred-amber/5 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[100px]"
        />
      </div>

      <div className={`p-6 border-b flex justify-between items-center backdrop-blur-2xl sticky top-0 z-30 pt-safe-4 ${theme === 'dark' ? 'bg-stone-950/60 border-white/5' : 'bg-white/60 border-sacred-amber/10'}`}>
        <div>
          <h1 className="text-xl font-black font-serif italic tracking-tight">Prayer Journal</h1>
          <div className="flex items-center gap-1.5 mt-1 opacity-40">
            <span className="w-1 h-1 rounded-full bg-sacred-amber animate-pulse"></span>
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">Sacred Reflections</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`p-3 rounded-full transition-all active:scale-90 shadow-lg ${isAdding ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-sacred-amber text-white shadow-sacred-amber/20'}`}
        >
          {isAdding ? <Plus size={22} className="rotate-45" /> : <Plus size={22} />}
        </button>
      </div>

      {/* Category Filter */}
      <div className={`px-4 py-4 flex gap-2 overflow-x-auto no-scrollbar border-b backdrop-blur-md sticky top-[84px] z-20 ${theme === 'dark' ? 'border-white/5 bg-stone-950/40' : 'border-sacred-amber/5 bg-white/40'}`}>
        <button
          onClick={() => setFilterCategory('All')}
          className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${filterCategory === 'All'
            ? 'bg-sacred-amber text-white shadow-md'
            : 'bg-stone-500/10 text-stone-400'
            }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${filterCategory === cat
              ? 'bg-sacred-amber text-white shadow-md'
              : 'bg-stone-500/10 text-stone-400'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              key="sanctuary-prayer-form"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-6 rounded-[2.5rem] border relative overflow-hidden mb-8 ${theme === 'dark' ? 'glass-dark border-sacred-amber/20' : 'bg-white/70 backdrop-blur-md border-sacred-amber/10 shadow-xl shadow-sacred-amber/5'}`}
            >
              <textarea
                value={newPrayer}
                onChange={(e) => setNewPrayer(e.target.value)}
                placeholder="What is on your heart today?"
                className={`w-full p-4 rounded-2xl border-none focus:ring-2 focus:ring-sacred-amber/30 mb-4 min-h-[120px] font-serif italic text-lg leading-relaxed ${theme === 'dark' ? 'bg-white/5 text-stone-100 placeholder-stone-500' : 'bg-sacred-cream/50 text-stone-900 placeholder-stone-400'
                  }`}
              />

              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                  <Tag size={12} className="text-sacred-amber" /> Select Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 border ${selectedCategory === cat
                        ? 'bg-sacred-amber text-white border-sacred-amber shadow-md'
                        : 'bg-stone-500/5 text-stone-500 border-transparent hover:border-sacred-amber/20'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  onClick={addPrayer}
                  className="px-8 py-2.5 rounded-xl bg-sacred-amber text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sacred-amber/20 active:scale-95 transition-all"
                >
                  Save to Sanctuary
                </button>
              </div>

              {/* Decorative aura */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-sacred-amber/10 blur-2xl rounded-full -z-10" />
            </motion.div>
          )}
        </AnimatePresence>

        {filteredPrayers.length === 0 && !isAdding ? (
          <div className="text-center py-20 flex flex-col items-center justify-center space-y-4">
            <div className="p-8 rounded-full bg-sacred-amber/5 blur-xl absolute" />
            <p className="text-xl font-serif italic text-stone-400 relative z-10 font-medium">"Ask, and it shall be given you..."</p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400/60 transition-all group-hover:tracking-[0.3em]">Open your heart below</p>
          </div>
        ) : (
          <div className="space-y-6 pb-24">
            <AnimatePresence>
              {filteredPrayers.map((prayer) => (
                <motion.div
                  layout
                  key={prayer.id}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-6 rounded-[2.5rem] border relative overflow-hidden transition-all duration-500 ${prayer.isAnswered
                    ? (theme === 'dark' ? 'bg-emerald-950/20 border-emerald-500/20 opacity-90' : 'bg-emerald-50/50 border-emerald-100 opacity-90 shadow-inner')
                    : (theme === 'dark' ? 'glass-dark border-white/5' : 'bg-white/60 backdrop-blur-sm border-white shadow-sm hover:shadow-xl hover:shadow-sacred-amber/10')
                    }`}
                >
                  <div className="flex justify-between items-start gap-5 relative z-10">
                    <button
                      onClick={() => toggleAnswered(prayer.id)}
                      className={`mt-1.5 transition-all active:scale-90 ${prayer.isAnswered ? 'text-emerald-500' : 'text-stone-300 hover:text-sacred-amber'}`}
                    >
                      {prayer.isAnswered ? <CheckCircle2 size={26} strokeWidth={2.5} /> : <Circle size={26} strokeWidth={2.5} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-3">
                        <div className="flex items-center gap-1.5 bg-stone-500/5 px-2.5 py-1 rounded-full">
                          <Calendar size={12} className="text-sacred-amber" />
                          <span>{prayer.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-stone-500/5 px-2.5 py-1 rounded-full">
                          <Tag size={12} className="text-sacred-amber" />
                          <span>{prayer.category}</span>
                        </div>
                        {prayer.isAnswered && (
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Answered</span>
                          </div>
                        )}
                      </div>
                      <p className={`leading-[1.6] font-serif text-lg md:text-xl italic opacity-90 ${prayer.isAnswered ? 'line-through decoration-sacred-amber/30 text-stone-500' : ''}`}>
                        {prayer.text}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleShare(prayer)}
                        className={`p-2.5 rounded-2xl transition-all active:scale-90 ${theme === 'dark' ? 'bg-white/5 text-stone-400 hover:text-white' : 'bg-stone-50 text-stone-400 hover:text-stone-900 shadow-inner'}`}
                        title="Share Prayer"
                      >
                        <Share2 size={18} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => deletePrayer(prayer.id)}
                        className={`p-2.5 rounded-2xl transition-all active:scale-90 ${theme === 'dark' ? 'bg-red-500/5 text-stone-400 hover:text-red-500' : 'bg-red-50 text-stone-400 hover:text-red-500 shadow-inner'}`}
                        title="Delete Prayer"
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* Subtle status glow */}
                  {prayer.isAnswered && (
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
