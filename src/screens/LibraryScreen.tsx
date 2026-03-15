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
    className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border text-center transition-all active:scale-95 group relative overflow-hidden ${theme === 'dark'
      ? 'bg-stone-900/40 border-white/5 hover:bg-stone-800/60 hover:border-sacred-amber/30'
      : 'bg-white/60 backdrop-blur-sm border-white/80 hover:bg-white hover:shadow-2xl hover:shadow-sacred-amber/10'
      }`}
  >
    <div className={`w-14 h-14 rounded-[1.4rem] flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-inner ${theme === 'dark' ? 'bg-sacred-amber/10 text-sacred-amber' : 'bg-sacred-cream text-sacred-amber'}`}>
      <span className="font-black text-xl font-serif italic">{book.name.substring(0, 1)}</span>
    </div>
    <span className="font-black text-xs uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity font-serif italic">{book.name}</span>

    {/* Subtle inner glow */}
    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-sacred-amber/5 blur-xl rounded-full" />
  </motion.button>
));

const ChapterItem = React.memo(({ chapter, theme, onClick }: { chapter: number; theme: string; onClick: (chapter: number) => void }) => (
  <motion.button
    variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
    onClick={() => onClick(chapter)}
    className={`aspect-square flex items-center justify-center rounded-2xl border text-lg font-black transition-all active:scale-90 hover:shadow-lg ${theme === 'dark'
      ? 'bg-stone-900/40 border-white/5 hover:bg-sacred-amber/10 hover:text-sacred-amber hover:border-sacred-amber/30'
      : 'bg-white/60 backdrop-blur-sm border-white/80 hover:bg-white hover:text-sacred-amber hover:shadow-xl hover:shadow-sacred-amber/10'
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
      variants={{ hidden: { opacity: 0, scale: 0.98, y: 10 }, visible: { opacity: 1, scale: 1, y: 0 } }}
      id={`verse-${verseId}`}
      className={`p-8 rounded-[3rem] transition-all duration-700 border relative overflow-hidden ${isCurrentInPlaylist
        ? (theme === 'dark' ? 'bg-sacred-amber/20 border-sacred-amber/40 shadow-2xl scale-[1.02]' : 'bg-sacred-cream border-sacred-amber/20 shadow-xl scale-[1.02]')
        : (theme === 'dark' ? 'bg-stone-900/40 border-white/5 hover:bg-stone-800/60' : 'bg-white/50 backdrop-blur-sm border-white/80 hover:bg-white')
        }`}
    >
      <div className="flex justify-between items-start gap-6 relative z-10">
        <span className={`text-[10px] font-black mt-2 min-w-[28px] h-7 flex items-center justify-center rounded-xl transition-all ${isCurrentInPlaylist ? 'bg-sacred-amber text-white shadow-lg shadow-sacred-amber/30' : 'bg-sacred-cream/50 text-sacred-amber shadow-inner'
          }`}>{verse.verse}</span>
        <p className="flex-1 leading-[1.6] font-serif text-lg md:text-xl italic opacity-90 transition-all group-hover:opacity-100">{verse.text}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onToggleBookmark(verse)}
            className={`p-3 rounded-2xl transition-all active:scale-90 ${isBookmarked ? 'bg-sacred-amber text-white shadow-lg shadow-sacred-amber/20' : 'text-stone-300 hover:bg-sacred-amber/10 hover:text-sacred-amber'}`}
          >
            <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => onShare(verse)}
            className="p-3 rounded-2xl text-stone-300 hover:bg-sacred-amber/10 hover:text-sacred-amber transition-all active:scale-90"
          >
            <Share2 size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => onSpeak(verse.text, verseId)}
            className={`p-3 rounded-2xl transition-all active:scale-90 relative ${isSpeaking ? 'bg-sacred-amber text-white shadow-lg shadow-sacred-amber/20' : 'text-stone-300 hover:bg-sacred-amber/10 hover:text-sacred-amber'}`}
            disabled={isLoadingAudio && !isSpeaking && speakingVerseId !== null}
          >
            {isSpeaking && !isLoadingAudio && (
              <motion.div
                layoutId={`pulse-verse-${verseId}`}
                className="absolute inset-0 rounded-2xl bg-sacred-amber/30"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            {isSpeaking ? (
              isLoadingAudio ? <Loader2 size={18} className="animate-spin" /> : <VolumeX size={18} className="relative z-10" />
            ) : (
              <Volume2 size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      {/* Subtle atmospheric touch for each item */}
      {isCurrentInPlaylist && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-sacred-amber/10 blur-3xl rounded-full -z-10" />
      )}
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
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-stone-100' : 'text-stone-900'} relative overflow-hidden`}>
      {/* Dynamic Background Auras (Shared with Home/Chat) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-sacred-amber/5 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, 50, 0],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[100px]"
        />
      </div>
      <div className={`p-6 border-b flex items-center justify-between backdrop-blur-2xl sticky top-0 z-30 pt-safe-4 transition-all ${theme === 'dark' ? 'bg-stone-950/60 border-white/5' : 'bg-white/60 border-sacred-amber/10'}`}>
        <div className="flex items-center gap-4">
          {view !== 'books' && (
            <button onClick={handleBack} className={`p-2.5 rounded-2xl transition-all active:scale-90 ${theme === 'dark' ? 'bg-white/5 text-stone-300' : 'bg-white/80 text-stone-500 shadow-sm border border-stone-100'}`}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black font-serif italic leading-none tracking-tight">
              {view === 'books' && 'Holy Library'}
              {view === 'chapters' && selectedBook?.name}
              {view === 'verses' && `${selectedBook?.name} ${selectedChapter}`}
            </h1>
            <div className="flex items-center gap-1.5 mt-1.5 opacity-40">
              <span className="w-1.5 h-1.5 rounded-full bg-sacred-amber animate-pulse"></span>
              <p className="text-[9px] font-black uppercase tracking-[0.2em]">King James Version</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isBibleDownloading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider animate-pulse">
              <Loader2 size={12} className="animate-spin" />
              <span>Soul Preparing</span>
            </div>
          )}
          {view === 'verses' && (
            <button
              onClick={togglePlaylist}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-90 ${isPlayingPlaylist
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                : 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                }`}
            >
              {isPlayingPlaylist ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
              {isPlayingPlaylist ? 'Stop' : 'Read All'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {view === 'books' && (
          <div className="max-w-4xl mx-auto w-full">
            <div className="relative mb-8 group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-sacred-amber transition-transform group-focus-within:scale-110 duration-300">
                <Search size={22} strokeWidth={2.5} />
              </div>
              <input
                type="text"
                placeholder="Inquire of the Word or describe a feeling..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-16 pr-12 py-5 rounded-[2.5rem] border transition-all duration-500 placeholder-stone-400/60 font-medium text-lg leading-none ${theme === 'dark'
                  ? 'bg-stone-900/40 border-white/5 focus:bg-stone-800/60 focus:border-sacred-amber/30 text-white'
                  : 'bg-white/50 backdrop-blur-md border-white focus:bg-white focus:shadow-2xl focus:shadow-sacred-amber/10 text-stone-900'
                  }`}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {searchQuery.length > 0 && view === 'books' ? (
            <motion.div key="search" variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 max-w-4xl mx-auto w-full">
              {(() => {
                const matchingBooks = books.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));
                return matchingBooks.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-2">Matching Books</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {matchingBooks.map((book) => (
                        <BookItem key={book.id} book={book} theme={theme} onClick={(b) => { setSearchQuery(''); handleBookSelect(b); }} />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {searchQuery.length >= 3 ? (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-2">
                    {isSearching ? 'Seeking Truth...' : `Found ${searchResults.length} Divine Verses`}
                  </p>
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
                <div className="text-center py-12 opacity-30 text-xs font-black uppercase tracking-widest">Type more to search the Word</div>
              )}
            </motion.div>
          ) : (
            <div key="library" className="max-w-4xl mx-auto w-full">
              {view === 'books' && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                      <Loader2 size={32} className="animate-spin text-amber-500" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Opening Scriptures</p>
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
