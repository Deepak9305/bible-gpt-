import { BIBLE_BOOKS } from '../data/books';

const API_BASE_URL = 'https://bible-api.com';

export interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export const getBooks = async () => {
  return BIBLE_BOOKS;
};

export const getChapter = async (bookName: string, chapter: number): Promise<Verse[]> => {
  try {
    // Fetch from bible-api.com
    // Format: https://bible-api.com/john 3
    const encodedBook = encodeURIComponent(bookName);
    const response = await fetch(`${API_BASE_URL}/${encodedBook}+${chapter}?translation=kjv`);
    if (!response.ok) {
      throw new Error('Failed to fetch chapter');
    }
    const data = await response.json();
    
    return data.verses.map((v: any) => ({
      book_id: v.book_id,
      book_name: v.book_name,
      chapter: v.chapter,
      verse: v.verse,
      text: v.text
    }));
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return [];
  }
};

export const searchVerses = async (keyword: string): Promise<Verse[]> => {
  // bible-api.com doesn't support search easily.
  // We'll return a mock result or implement a limited search if needed.
  // For now, let's return an empty array or a message.
  // Alternatively, we could use a different API for search.
  // But given the constraints, let's just return a placeholder.
  console.warn('Search is limited in this web version due to API constraints.');
  return [];
};
