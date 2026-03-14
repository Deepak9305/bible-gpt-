import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getBooks, getChapter, Verse, loadFullBible, isBibleReady } from '../services/bibleService';
import { BIBLE_BOOKS } from '../data/books';
import { playTextToSpeech, stopAudio } from '../services/ttsService';
import { ChevronRight, ArrowLeft, Bookmark, Volume2, VolumeX, Loader2, Crown, Sparkles, Search, PlayCircle, PauseCircle, DownloadCloud, Share2 } from 'lucide-react';
import { incrementVersesRead, getStats } from '../services/statsService';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import PremiumModal from '../components/PremiumModal';
import { Share } from '@capacitor/share';
import { StorageService } from '../services/storageService';

type ViewState = 'books' | 'chapters' | 'verses';

const BookItem = React.memo(({ book, theme, onClick }: { book: any; theme: string; onClick: (book: any) => void }) => (
  <motion.button
    variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
    onClick={() => onClick(book)}
    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all active:scale-95 ${theme === 'dark'
      ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
      : 'bg-white border-gray-100 hover:bg-blue-50/50'
      }`}
  >
    <span className="font-bold text-lg mb-1">{book.name.substring(0, 3)}</span>
    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
      {book.name}
    </span>
  </motion.button>
));

const ChapterItem = React.memo(({ chapter, theme, onClick }: { chapter: number; theme: string; onClick: (chapter: number) => void }) => (
  <motion.button
    variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
    onClick={() => onClick(chapter)}
    className={`aspect-square flex items-center justify-center rounded-xl border text-lg font-medium transition-all hover:shadow-md ${theme === 'dark'
      ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
      : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
  >
    {chapter}
  </motion.button>
));

const VerseItem = React.memo(({
  verse,
  index,
  theme,
  isCurrentInPlaylist,
  isBookmarked,
  speakingVerseId,
  isLoadingAudio,
  onToggleBookmark,
  onShare,
  onSpeak
}: {
  verse: Verse;
  index: number;
  theme: string;
  isCurrentInPlaylist: boolean;
  isBookmarked: boolean;
  speakingVerseId: string | null;
  isLoadingAudio: boolean;
  onToggleBookmark: (verse: Verse) => void;
  onShare: (verse: Verse) => void;
  onSpeak: (text: string, id: string) => void;
}) => {
  const verseId = `${verse.chapter}-${verse.verse}`;
  const isSpeaking = speakingVerseId === verseId;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
      id={`verse-${verseId}`}
      className={`p-4 rounded-xl transition-all duration-500 ${isCurrentInPlaylist
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 border shadow-md scale-[1.02]'
        : (theme === 'dark' ? 'bg-gray-800' : 'bg-white')
        } shadow-sm`}
    >
      <div className="flex justify-between items-start gap-4">
        <span className={`text-xs font-bold mt-1 ${isCurrentInPlaylist ? 'text-blue-600' : 'text-blue-500'
          }`}>{verse.verse}</span>
        <p className="flex-1 leading-relaxed font-serif text-lg">{verse.text}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onToggleBookmark(verse)}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${isBookmarked ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => onShare(verse)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={() => onSpeak(verse.text, verseId)}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${isSpeaking ? 'text-blue-500' : 'text-gray-400'}`}
            disabled={isLoadingAudio && !isSpeaking && speakingVerseId !== null}
          >
            {isSpeaking ? (
              isLoadingAudio ? <Loader2 size={18} className="animate-spin" /> : <VolumeX size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
});

export default function LibraryScreen() {
  const { theme } = useTheme();
  const stats = getStats();
  const isPremium = stats.isPremium;
  const [view, setView] = useState<ViewState>('books');
  const [books] = useState<any[]>(BIBLE_BOOKS);
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

  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number>(-1);
  const [isBibleDownloading, setIsBibleDownloading] = useState(false);
  const [bibleReady, setBibleReady] = useState(false);
  const [bookmarks, setBookmarks] = useState<Verse[]>([]);

  useEffect(() => {
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

  useEffect(() => {
    return () => stopAudio();
  }, []);

  useEffect(() => {
    const loadBookmarks = async () => {
      const saved = await StorageService.get('bookmarks');
      if (saved) {
        try { setBookmarks(JSON.parse(saved)); } catch (e) { console.error(e); }
      }
    };
    loadBookmarks();
  }, []);

  useEffect(() => {
    if (isPlayingPlaylist && currentPlaylistIndex >= 0 && currentPlaylistIndex < verses.length) {
      const verse = verses[currentPlaylistIndex];
      const id = `${verse.chapter}-${verse.verse}`;
      document.getElementById(`verse-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      handleSpeak(verse.text, id, true);
    } else if (isPlayingPlaylist && currentPlaylistIndex >= verses.length) {
      setIsPlayingPlaylist(false);
      setCurrentPlaylistIndex(-1);
    }
  }, [currentPlaylistIndex, isPlayingPlaylist]);

  const togglePlaylist = React.useCallback(() => {
    if (isPlayingPlaylist) {
      setIsPlayingPlaylist(false);
      stopAudio();
      setSpeakingVerse(null);
    } else {
      setIsPlayingPlaylist(true);
      setCurrentPlaylistIndex(0);
    }
  }, [isPlayingPlaylist]);

  const handleSpeak = React.useCallback(async (text: string, id: string, isPlaylist = false) => {
    if (speakingVerse === id && !isPlaylist) {
      setIsPlayingPlaylist(false);
      stopAudio();
      setSpeakingVerse(null);
      setIsLoadingAudio(false);
      return;
    }

    if (!isPlaylist) {
      setIsPlayingPlaylist(false);
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
          setSpeakingVerse(current => (current === id ? null : current));
          setIsLoadingAudio(current => (speakingVerse === id ? false : current));
        }
      });
    } catch (error) {
      console.error(error);
      setSpeakingVerse(current => (current === id ? null : current));
      if (isPlaylist) setIsPlayingPlaylist(false);
    } finally {
      setSpeakingVerse(current => {
        if (current === id) setIsLoadingAudio(false);
        return current;
      });
    }
  }, [speakingVerse]);

  const handleShare = React.useCallback(async (verse: Verse) => {
    try {
      await Share.share({
        title: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
        text: `"${verse.text}" - ${verse.book_name} ${verse.chapter}:${verse.verse}`,
        dialogTitle: 'Share Bible Verse',
      });
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        try {
          const { searchVerses } = await import('../services/bibleService');
          const results = await searchVerses(searchQuery);
          setSearchResults(results);
        } catch (error) { console.error(error); } finally { setIsSearching(false); }
      } else { setSearchResults([]); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const stopWords = new Set(["i", "am", "feeling", "about", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "verses", "bible", "what", "does", "say", "is", "are", "of", "my", "me", "you", "your"]);
    const words = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    let highlightedText = text;
    const exactRegex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    if (exactRegex.test(text)) {
      return text.replace(exactRegex, '<mark class="bg-yellow-200 dark:bg-yellow-900 text-inherit rounded px-0.5">$1</mark>');
    }
    if (words.length > 0) {
      const wordsRegex = new RegExp(`\\b(${words.join('|')})\\b`, 'gi');
      highlightedText = text.replace(wordsRegex, '<mark class="bg-yellow-200 dark:bg-yellow-900 text-inherit rounded px-0.5">$1</mark>');
    }
    return highlightedText;
  };

  const handleBookSelect = React.useCallback((book: any) => {
    setSelectedBook(book);
    setView('chapters');
  }, []);

  const handleChapterSelect = React.useCallback(async (chapter: number) => {
    setSelectedChapter(chapter);
    setLoading(true);
    try {
      if (!isBibleReady()) await loadFullBible();
      const data = await getChapter(selectedBook.name, chapter);
      if (data && data.length > 0) {
        setVerses(data);
        setView('verses');
      } else { alert("Failed to load chapter data."); }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [selectedBook]);

  const handleBack = () => {
    if (view === 'verses') {
      setView('chapters');
      setVerses([]);
      setSelectedChapter(null);
      setIsPlayingPlaylist(false);
      setSpeakingVerse(null);
      setIsLoadingAudio(false);
      stopAudio();
    } else if (view === 'chapters') {
      setView('books');
      setSelectedBook(null);
    }
  };

  const toggleBookmark = React.useCallback(async (verse: Verse) => {
    setBookmarks(prev => {
      const newBookmarks = [...prev];
      const index = newBookmarks.findIndex((b) =>
        b.book_id === verse.book_id && b.chapter === verse.chapter && b.verse === verse.verse
      );
      if (index >= 0) newBookmarks.splice(index, 1);
      else newBookmarks.push(verse);
      StorageService.set('bookmarks', JSON.stringify(newBookmarks));
      return newBookmarks;
    });
  }, []);

  const isBookmarked = React.useCallback((verse: Verse) => {
    return bookmarks.some((b) =>
      b.book_id === verse.book_id && b.chapter === verse.chapter && b.verse === verse.verse
    );
  }, [bookmarks]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
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
          {isBibleDownloading && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium animate-pulse">
              <Loader2 size={14} className="animate-spin" />
              <span className="hidden sm:inline">Loading Bible...</span>
            </div>
          )}
          {view === 'verses' && (
            <button
              onClick={togglePlaylist}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isPlayingPlaylist
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
              onClick={() => { stopAudio(); setSpeakingVerse(null); setIsLoadingAudio(false); }}
              className="p-2 rounded-full bg-red-100 text-red-600 animate-pulse"
            >
              <VolumeX size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {view === 'books' && (
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search Bible or describe a topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-12 pr-10 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                  }`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {searchQuery.length > 0 && view === 'books' ? (
            <motion.div key="search" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              {(() => {
                const matchingBooks = books.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));
                return matchingBooks.length > 0 ? (
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3">Matching Books</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {matchingBooks.map((book) => (
                        <BookItem key={book.id} book={book} theme={theme} onClick={(b) => { setSearchQuery(''); handleBookSelect(b); }} />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {searchQuery.length >= 3 ? (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 mb-3">
                    {isSearching ? 'Searching Verses...' : `Found ${searchResults.length} Verses`}
                  </h2>
                  <div className="space-y-4">
                    {searchResults.map((verse, idx) => (
                      <VerseItem
                        key={`${verse.book_id}-${verse.chapter}-${verse.verse}-${idx}`}
                        verse={verse}
                        index={idx}
                        theme={theme}
                        isCurrentInPlaylist={false}
                        isBookmarked={isBookmarked(verse)}
                        speakingVerseId={speakingVerse}
                        isLoadingAudio={isLoadingAudio}
                        onToggleBookmark={toggleBookmark}
                        onShare={handleShare}
                        onSpeak={handleSpeak}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 opacity-50 text-sm">Type at least 3 characters to search for verses...</div>
              )}
            </motion.div>
          ) : (
            <div key="library">
              {view === 'books' && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {books.map((book) => (
                    <BookItem key={book.id} book={book} theme={theme} onClick={handleBookSelect} />
                  ))}
                </motion.div>
              )}

              {view === 'chapters' && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((chapter) => (
                    <ChapterItem key={chapter} chapter={chapter} theme={theme} onClick={handleChapterSelect} />
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
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
                      {verses.map((verse, index) => (
                        <VerseItem
                          key={verse.verse}
                          verse={verse}
                          index={index}
                          theme={theme}
                          isCurrentInPlaylist={currentPlaylistIndex === index && isPlayingPlaylist}
                          isBookmarked={isBookmarked(verse)}
                          speakingVerseId={speakingVerse}
                          isLoadingAudio={isLoadingAudio}
                          onToggleBookmark={toggleBookmark}
                          onShare={handleShare}
                          onSpeak={handleSpeak}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
      <PremiumModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} onUpgrade={() => { }} />
    </div>
  );
}
