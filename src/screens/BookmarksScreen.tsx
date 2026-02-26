import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Verse } from '../services/bibleService';
import { Trash2 } from 'lucide-react';

export default function BookmarksScreen() {
  const { theme } = useTheme();
  const [bookmarks, setBookmarks] = useState<Verse[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('bookmarks');
    if (saved) {
      setBookmarks(JSON.parse(saved));
    }
  }, []);

  const removeBookmark = (verse: Verse) => {
    const newBookmarks = bookmarks.filter((b) => 
      !(b.book_id === verse.book_id && b.chapter === verse.chapter && b.verse === verse.verse)
    );
    setBookmarks(newBookmarks);
    localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
  };

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h1 className="text-lg font-semibold">Saved Verses</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {bookmarks.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <p>No bookmarks yet.</p>
          </div>
        ) : (
          bookmarks.map((verse, index) => (
            <div key={index} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-blue-500 mb-2">
                    {verse.book_name} {verse.chapter}:{verse.verse}
                  </h3>
                  <p className="leading-relaxed font-serif text-lg">{verse.text}</p>
                </div>
                <button 
                  onClick={() => removeBookmark(verse)}
                  className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
