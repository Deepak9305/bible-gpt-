import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getBooks, getChapter, Verse, loadFullBible, isBibleReady } from '../services/bibleService';
import { playTextToSpeech, stopAudio } from '../services/ttsService';
import { ChevronRight, ArrowLeft, Bookmark, Volume2, VolumeX, Loader2, Crown, Sparkles, Search, PlayCircle, PauseCircle, DownloadCloud } from 'lucide-react';
import { incrementVersesRead, getStats } from '../services/statsService';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import PremiumModal from '../components/PremiumModal';

type ViewState = 'books' | 'chapters' | 'verses';

export default function LibraryScreen() {
  const { theme } = useTheme();
  const stats = getStats();
  const isPremium = stats.isPremium;
  const [view, setView] = useState<ViewState>('books');
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [speakingVerse, setSpeakingVerse] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  
  // New State for Features
  const [searchMode, setSearchMode] = useState<'exact' | 'smart'>('exact');
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number>(-1);
  const [isBibleDownloading, setIsBibleDownloading] = useState(false);
  const [bibleReady, setBibleReady] = useState(false);

  useEffect(() => {
    getBooks().then(setBooks);
    
    // Check if Bible is ready, if not start downloading
    if (isBibleReady()) {
      setBibleReady(true);
    } else {
      setIsBibleDownloading(true);
      loadFullBible().then(() => {
        setIsBibleDownloading(false);
        setBibleReady(true);
      }).catch(() => {
        setIsBibleDownloading(false);
      });
    }
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Playlist Logic
  useEffect(() => {
    if (isPlayingPlaylist && currentPlaylistIndex >= 0 && currentPlaylistIndex < verses.length) {
      const verse = verses[currentPlaylistIndex];
      const id = `${verse.chapter}-${verse.verse}`;
      
      // Scroll to verse
      const element = document.getElementById(`verse-${id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      handleSpeak(verse.text, id, true);
    } else if (isPlayingPlaylist && currentPlaylistIndex >= verses.length) {
      setIsPlayingPlaylist(false);
      setCurrentPlaylistIndex(-1);
    }
  }, [currentPlaylistIndex, isPlayingPlaylist]);

  const togglePlaylist = () => {
    if (isPlayingPlaylist) {
      setIsPlayingPlaylist(false);
      stopAudio();
      setSpeakingVerse(null);
    } else {
      setIsPlayingPlaylist(true);
      setCurrentPlaylistIndex(0);
    }
  };

  const handleSpeak = async (text: string, id: string, isPlaylist = false) => {
    if (speakingVerse === id && !isPlaylist) {
      stopAudio();
      setSpeakingVerse(null);
      return;
    }

    if (!isPlaylist) {
      setIsPlayingPlaylist(false); // Stop playlist if manual play
      stopAudio();
    }

    setSpeakingVerse(id);
    setIsLoadingAudio(true);
    incrementVersesRead();

    try {
      await playTextToSpeech(text, () => {
        if (isPlaylist) {
          setCurrentPlaylistIndex(prev => prev + 1);
        } else {
          setSpeakingVerse(current => current === id ? null : current);
          setIsLoadingAudio(current => speakingVerse === id ? false : current);
        }
      });
    } catch (error) {
      console.error("Audio failed", error);
      setSpeakingVerse(current => current === id ? null : current);
      if (isPlaylist) setIsPlayingPlaylist(false);
    } finally {
      // Only reset loading if this is still the active verse
      setSpeakingVerse(current => {
        if (current === id) {
          setIsLoadingAudio(false);
        }
        return current;
      });
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        try {
          const { searchVerses } = await import('../services/bibleService');
          // Use the selected search mode
          const results = await searchVerses(searchQuery, searchMode);
          setSearchResults(results);
        } catch (error) {
          console.error(error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]); // Re-run when mode changes

  const handleBookSelect = (book: any) => {
    setSelectedBook(book);
    setView('chapters');
  };

  const handleChapterSelect = async (chapter: number) => {
    setSelectedChapter(chapter);
    setLoading(true);
    try {
      // Ensure Bible is loaded before fetching chapter
      if (!isBibleReady()) {
        await loadFullBible();
      }
      
      const data = await getChapter(selectedBook.name, chapter);
      if (data && data.length > 0) {
        setVerses(data);
        setView('verses');
      } else {
        // If data is empty, it might be a download failure.
        // We could show an error toast here.
        console.error("Failed to load chapter data");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (view === 'verses') {
      setView('chapters');
      setVerses([]);
      setSelectedChapter(null);
      setIsPlayingPlaylist(false);
      stopAudio();
    } else if (view === 'chapters') {
      setView('books');
      setSelectedBook(null);
    }
  };

  const [bookmarks, setBookmarks] = useState<Verse[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('bookmarks');
    if (saved) {
      setBookmarks(JSON.parse(saved));
    }
  }, []);

  const toggleBookmark = (verse: Verse) => {
    const newBookmarks = [...bookmarks];
    const index = newBookmarks.findIndex((b) => 
      b.book_id === verse.book_id && b.chapter === verse.chapter && b.verse === verse.verse
    );

    if (index >= 0) {
      newBookmarks.splice(index, 1);
    } else {
      newBookmarks.push(verse);
    }
    
    setBookmarks(newBookmarks);
    localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
  };

  const isBookmarked = (verse: Verse) => {
    return bookmarks.some((b) => 
      b.book_id === verse.book_id && b.chapter === verse.chapter && b.verse === verse.verse
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-4">
          {view !== 'books' && (
            <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-lg font-semibold">
            {view === 'books' && 'Bible Library'}
            {view === 'chapters' && selectedBook?.name}
            {view === 'verses' && `${selectedBook?.name} ${selectedChapter}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Download Indicator */}
          {isBibleDownloading && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium animate-pulse">
              <DownloadCloud size={14} />
              <span className="hidden sm:inline">Downloading Bible...</span>
            </div>
          )}

          {/* Playlist Controls (Only in Verse View) */}
          {view === 'verses' && (
            <button
              onClick={togglePlaylist}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isPlayingPlaylist 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
            >
              {isPlayingPlaylist ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
              {isPlayingPlaylist ? 'Stop' : 'Listen All'}
            </button>
          )}

          {!isPremium && (
            <button 
              onClick={() => setIsPremiumModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-yellow-500/20 active:scale-95 transition-all"
            >
              <Crown size={12} fill="currentColor" />
              Premium
            </button>
          )}
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Search Bar & Toggle */}
        {view === 'books' && (
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={searchMode === 'smart' ? "Describe a feeling or topic..." : "Search Bible (e.g., 'Jesus wept')..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            
            {/* Smart Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
              <button
                onClick={() => setSearchMode('exact')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  searchMode === 'exact' 
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Exact Match
              </button>
              <button
                onClick={() => {
                  if (!isPremium) {
                    setIsPremiumModalOpen(true);
                  } else {
                    setSearchMode('smart');
                  }
                }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  searchMode === 'smart' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Sparkles size={12} />
                Smart Search
                {!isPremium && <Crown size={10} className="text-yellow-500" />}
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Search Results */}
          {searchQuery.length >= 3 && view === 'books' ? (
            <motion.div 
              key="search"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-2">
                {isSearching ? 'Searching...' : `Found ${searchResults.length} results`}
              </h2>
              {searchResults.map((verse, idx) => (
                <motion.div 
                  variants={itemVariants}
                  key={`${verse.book_id}-${verse.chapter}-${verse.verse}-${idx}`} 
                  className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-xs font-bold text-blue-500 block mb-1">
                        {verse.book_name} {verse.chapter}:{verse.verse}
                      </span>
                      <p 
                        className="leading-relaxed font-serif text-sm mt-1"
                        dangerouslySetInnerHTML={{
                          __html: searchMode === 'exact' 
                            ? verse.text.replace(new RegExp(`(${searchQuery})`, 'gi'), (match) => `<mark class="bg-yellow-200 dark:bg-yellow-900 text-inherit rounded px-0.5">${match}</mark>`)
                            : verse.text
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => toggleBookmark(verse)}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${isBookmarked(verse) ? 'text-blue-500' : 'text-gray-400'}`}
                      >
                        <Bookmark size={18} fill={isBookmarked(verse) ? "currentColor" : "none"} />
                      </button>
                      <button 
                        onClick={() => handleSpeak(verse.text, `search-${verse.book_id}-${verse.chapter}-${verse.verse}`)}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${speakingVerse === `search-${verse.book_id}-${verse.chapter}-${verse.verse}` ? 'text-blue-500' : 'text-gray-400'}`}
                        disabled={isLoadingAudio && speakingVerse !== `search-${verse.book_id}-${verse.chapter}-${verse.verse}` && speakingVerse !== null}
                      >
                        {speakingVerse === `search-${verse.book_id}-${verse.chapter}-${verse.verse}` ? (
                          isLoadingAudio ? <Loader2 size={18} className="animate-spin" /> : <VolumeX size={18} />
                        ) : (
                          <Volume2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div key="library">
              {view === 'books' && (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                >
                  {books.map((book) => (
                    <motion.button
                      variants={itemVariants}
                      key={book.id}
                      onClick={() => handleBookSelect(book)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all active:scale-95 ${
                        theme === 'dark' 
                          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                          : 'bg-white border-gray-100 hover:bg-blue-50/50'
                      }`}
                    >
                      <span className="font-bold text-lg mb-1">{book.name.substring(0, 3)}</span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {book.name}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {view === 'chapters' && (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4"
                >
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((chapter) => (
                    <motion.button
                      variants={itemVariants}
                      key={chapter}
                      onClick={() => handleChapterSelect(chapter)}
                      className={`aspect-square flex items-center justify-center rounded-xl border text-lg font-medium transition-all hover:shadow-md ${
                        theme === 'dark' 
                          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {chapter}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {view === 'verses' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-4"
                    >
                      {verses.map((verse, index) => (
                        <motion.div 
                          variants={itemVariants}
                          key={verse.verse} 
                          id={`verse-${verse.chapter}-${verse.verse}`}
                          className={`p-4 rounded-xl transition-all duration-500 ${
                            currentPlaylistIndex === index && isPlayingPlaylist
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 border shadow-md scale-[1.02]'
                              : (theme === 'dark' ? 'bg-gray-800' : 'bg-white')
                          } shadow-sm`}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <span className={`text-xs font-bold mt-1 ${
                              currentPlaylistIndex === index && isPlayingPlaylist ? 'text-blue-600' : 'text-blue-500'
                            }`}>{verse.verse}</span>
                            <p className="flex-1 leading-relaxed font-serif text-lg">{verse.text}</p>
                            <div className="flex flex-col gap-2">
                              <button 
                                onClick={() => toggleBookmark(verse)}
                                className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${isBookmarked(verse) ? 'text-blue-500' : 'text-gray-400'}`}
                              >
                                <Bookmark size={18} fill={isBookmarked(verse) ? "currentColor" : "none"} />
                              </button>
                              <button 
                                onClick={() => handleSpeak(verse.text, `${verse.chapter}-${verse.verse}`)}
                                className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${speakingVerse === `${verse.chapter}-${verse.verse}` ? 'text-blue-500' : 'text-gray-400'}`}
                                disabled={isLoadingAudio && speakingVerse !== `${verse.chapter}-${verse.verse}` && speakingVerse !== null}
                              >
                                {speakingVerse === `${verse.chapter}-${verse.verse}` ? (
                                  isLoadingAudio ? <Loader2 size={18} className="animate-spin" /> : <VolumeX size={18} />
                                ) : (
                                  <Volume2 size={18} />
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
