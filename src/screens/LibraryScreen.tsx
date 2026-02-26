import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getBooks, getChapter, Verse } from '../services/bibleService';
import { ChevronRight, ArrowLeft, Bookmark } from 'lucide-react';

type ViewState = 'books' | 'chapters' | 'verses';

export default function LibraryScreen() {
  const { theme } = useTheme();
  const [view, setView] = useState<ViewState>('books');
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBooks().then(setBooks);
  }, []);

  const handleBookSelect = (book: any) => {
    setSelectedBook(book);
    setView('chapters');
  };

  const handleChapterSelect = async (chapter: number) => {
    setSelectedChapter(chapter);
    setLoading(true);
    try {
      const data = await getChapter(selectedBook.name, chapter);
      setVerses(data);
      setView('verses');
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

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center gap-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {view === 'books' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <button
                key={book.id}
                onClick={() => handleBookSelect(book)}
                className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all hover:shadow-md ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{book.name}</span>
                <ChevronRight size={16} className="opacity-50" />
              </button>
            ))}
          </div>
        )}

        {view === 'chapters' && (
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((chapter) => (
              <button
                key={chapter}
                onClick={() => handleChapterSelect(chapter)}
                className={`aspect-square flex items-center justify-center rounded-xl border text-lg font-medium transition-all hover:shadow-md ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {chapter}
              </button>
            ))}
          </div>
        )}

        {view === 'verses' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              verses.map((verse) => (
                <div key={verse.verse} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-bold text-blue-500 mt-1">{verse.verse}</span>
                    <p className="flex-1 leading-relaxed font-serif text-lg">{verse.text}</p>
                    <button 
                      onClick={() => toggleBookmark(verse)}
                      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${isBookmarked(verse) ? 'text-blue-500' : 'text-gray-400'}`}
                    >
                      <Bookmark size={18} fill={isBookmarked(verse) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
