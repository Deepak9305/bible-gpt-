import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Verse } from '../services/bibleService';
import { Trash2, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { playTextToSpeech, stopAudio } from '../services/ttsService';

export default function BookmarksScreen() {
  const { theme } = useTheme();
  const [bookmarks, setBookmarks] = useState<Verse[]>([]);
  const [speakingVerse, setSpeakingVerse] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('bookmarks');
    if (saved) {
      setBookmarks(JSON.parse(saved));
    }
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const handleSpeak = async (text: string, id: string) => {
    if (speakingVerse === id) {
      stopAudio();
      setSpeakingVerse(null);
      return;
    }

    stopAudio();
    setSpeakingVerse(id);
    setIsLoadingAudio(true);

    try {
      await playTextToSpeech(text, () => {
        setSpeakingVerse(current => current === id ? null : current);
        setIsLoadingAudio(current => speakingVerse === id ? false : current);
      });
    } catch (error) {
      console.error("Audio failed", error);
      setSpeakingVerse(current => current === id ? null : current);
    } finally {
      setSpeakingVerse(current => {
        if (current === id) setIsLoadingAudio(false);
        return current;
      });
    }
  };

  const removeBookmark = (verse: Verse) => {
    const newBookmarks = bookmarks.filter((b) => 
      !(b.book_id === verse.book_id && b.chapter === verse.chapter && b.verse === verse.verse)
    );
    setBookmarks(newBookmarks);
    localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
  };

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h1 className="text-lg font-semibold">Saved Verses</h1>
        {speakingVerse && (
          <button 
            onClick={() => {
              stopAudio();
              setSpeakingVerse(null);
            }}
            className="p-2 rounded-full bg-red-100 text-red-600 animate-pulse"
          >
            <VolumeX size={20} />
          </button>
        )}
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
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-500 mb-2">
                    {verse.book_name} {verse.chapter}:{verse.verse}
                  </h3>
                  <p className="leading-relaxed font-serif text-lg">{verse.text}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => removeBookmark(verse)}
                    className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    title="Remove bookmark"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleSpeak(verse.text, `${verse.book_id}-${verse.chapter}-${verse.verse}`)}
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${speakingVerse === `${verse.book_id}-${verse.chapter}-${verse.verse}` ? 'text-blue-500' : 'text-gray-400'}`}
                    disabled={isLoadingAudio && speakingVerse !== `${verse.book_id}-${verse.chapter}-${verse.verse}` && speakingVerse !== null}
                  >
                    {speakingVerse === `${verse.book_id}-${verse.chapter}-${verse.verse}` ? (
                      isLoadingAudio ? <Loader2 size={18} className="animate-spin" /> : <VolumeX size={18} />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
