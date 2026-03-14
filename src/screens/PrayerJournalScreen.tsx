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
    const shareText = `Prayer: "${prayer.text}"\nCategory: ${prayer.category}\nDate: ${prayer.date}\n\nShared from Bible GPT 🙏`;
    
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
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h1 className="text-lg font-semibold">Prayer Journal</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b dark:border-gray-700">
        <button
          onClick={() => setFilterCategory('All')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            filterCategory === 'All' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filterCategory === cat 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
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
              key="add-prayer-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-2xl border-2 border-blue-500/30 ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50/30'} mb-6 overflow-hidden`}
            >
              <textarea
                value={newPrayer}
                onChange={(e) => setNewPrayer(e.target.value)}
                placeholder="What is on your heart today?"
                className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 min-h-[100px] ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
              />
              
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider opacity-50 mb-2 flex items-center gap-1">
                  <Tag size={12} /> Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        selectedCategory === cat 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium opacity-60"
                >
                  Cancel
                </button>
                <button 
                  onClick={addPrayer}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-md hover:bg-blue-700 transition-all"
                >
                  Save Prayer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredPrayers.length === 0 && !isAdding ? (
          <div className="text-center py-20 opacity-40">
            <p className="text-lg italic">"Ask, and it shall be given you..."</p>
            <p className="text-sm mt-2">Start your journal by clicking the + button.</p>
          </div>
        ) : (
          <div className="space-y-4">
              <AnimatePresence>
                {filteredPrayers.map((prayer) => (
                  <motion.div 
                    layout
                    key={prayer.id} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-5 rounded-2xl border transition-all ${
                    prayer.isAnswered 
                      ? (theme === 'dark' ? 'bg-emerald-900/10 border-emerald-500/20 opacity-80' : 'bg-emerald-50 border-emerald-100 opacity-80')
                      : (theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm')
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <button 
                      onClick={() => toggleAnswered(prayer.id)}
                      className={`mt-1 transition-colors ${prayer.isAnswered ? 'text-emerald-500' : 'text-gray-400'}`}
                    >
                      {prayer.isAnswered ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs opacity-50 mb-2">
                        <Calendar size={12} />
                        <span>{prayer.date}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-bold text-[10px] uppercase tracking-wider">
                          {prayer.category}
                        </span>
                        {prayer.isAnswered && <span className="ml-2 font-bold text-emerald-500 uppercase tracking-widest">Answered</span>}
                      </div>
                      <p className={`leading-relaxed whitespace-pre-wrap ${prayer.isAnswered ? 'line-through opacity-60' : ''}`}>
                        {prayer.text}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleShare(prayer)}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Share Prayer"
                      >
                        <Share2 size={18} />
                      </button>
                      <button 
                        onClick={() => deletePrayer(prayer.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete Prayer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
