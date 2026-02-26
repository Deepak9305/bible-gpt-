import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { MessageSquare, BookOpen, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomeScreen() {
  const { theme } = useTheme();
  const [dailyVerse, setDailyVerse] = useState<{ text: string; reference: string } | null>(null);

  useEffect(() => {
    // Fetch a random verse or a specific one for "Daily Verse"
    // Using John 3:16 as a placeholder or fetch from API
    fetch('https://bible-api.com/john 3:16?translation=kjv')
      .then(res => res.json())
      .then(data => {
        setDailyVerse({
          text: data.text.trim(),
          reference: `${data.reference}`
        });
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className={`p-6 max-w-4xl mx-auto ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, Beloved</h1>
        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Your spiritual companion is ready.
        </p>
      </header>

      {/* Daily Verse Card */}
      <div className={`p-6 rounded-2xl shadow-lg mb-8 ${theme === 'dark' ? 'bg-gradient-to-br from-blue-900 to-indigo-900' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} text-white`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-4">Verse of the Day</h2>
        {dailyVerse ? (
          <>
            <p className="text-xl md:text-2xl font-serif leading-relaxed mb-4">
              "{dailyVerse.text}"
            </p>
            <p className="text-right font-medium opacity-90">— {dailyVerse.reference}</p>
          </>
        ) : (
          <p>Loading verse...</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/chat" className={`p-6 rounded-xl border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <MessageSquare size={24} />
          </div>
          <h3 className="font-semibold text-lg mb-1">Ask Father</h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Get spiritual guidance and comfort.
          </p>
        </Link>

        <Link to="/library" className={`p-6 rounded-xl border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <BookOpen size={24} />
          </div>
          <h3 className="font-semibold text-lg mb-1">Read Bible</h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Browse the King James Version.
          </p>
        </Link>

        <Link to="/bookmarks" className={`p-6 rounded-xl border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
            <Bookmark size={24} />
          </div>
          <h3 className="font-semibold text-lg mb-1">Saved Verses</h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Access your favorite scriptures.
          </p>
        </Link>
      </div>
    </div>
  );
}
