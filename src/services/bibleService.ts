import { BIBLE_BOOKS } from '../data/books';
import { get, set } from 'idb-keyval';
import { GoogleGenAI } from "@google/genai";

const API_BASE_URL = 'https://bible-api.com';
const KJV_JSON_URL = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json';
const DB_KEY = 'kjv_bible_full';

// Initialize Gemini for semantic search
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

// Cache for the full Bible in memory after loading
let fullBibleCache: any[] | null = null;
let isBibleDownloading = false;

export const getBooks = async () => {
  return BIBLE_BOOKS;
};

export const isBibleReady = () => !!fullBibleCache;

// Helper to load the full Bible
export const loadFullBible = async (): Promise<any[]> => {
  if (fullBibleCache) return fullBibleCache;
  
  // Prevent multiple simultaneous downloads
  if (isBibleDownloading) {
    // Wait for the existing download to finish
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (fullBibleCache) {
          clearInterval(check);
          resolve(fullBibleCache);
        } else if (!isBibleDownloading) {
          clearInterval(check);
          resolve([]); // Download failed
        }
      }, 100);
    });
  }

  isBibleDownloading = true;

  try {
    // Try to get from IndexedDB first
    const cached = await get(DB_KEY);
    if (cached) {
      fullBibleCache = cached;
      isBibleDownloading = false;
      return cached;
    }

    // If not in DB, fetch from GitHub
    console.log('Downloading full Bible...');
    const response = await fetch(KJV_JSON_URL);
    if (!response.ok) throw new Error('Failed to download Bible');
    
    const data = await response.json();
    
    await set(DB_KEY, data);
    fullBibleCache = data;
    isBibleDownloading = false;
    return data;
  } catch (error) {
    console.error('Error loading full Bible:', error);
    isBibleDownloading = false;
    return [];
  }
};

export const getChapter = async (bookName: string, chapter: number, translation: string = 'kjv'): Promise<Verse[]> => {
  // If translation is NOT KJV, we must use the API
  if (translation.toLowerCase() !== 'kjv') {
    try {
      const encodedBook = encodeURIComponent(bookName);
      const response = await fetch(`${API_BASE_URL}/${encodedBook}+${chapter}?translation=${translation}`);
      if (!response.ok) throw new Error('Failed to fetch chapter');
      const data = await response.json();
      return data.verses.map((v: any) => ({
        book_id: v.book_id,
        book_name: v.book_name,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text
      }));
    } catch (error) {
      console.error('Error fetching chapter from API:', error);
      return [];
    }
  }

  // For KJV, try to use local data first
  try {
    // Ensure Bible is loaded
    let bible = await loadFullBible();
    
    // If loadFullBible returns empty array (failed download), try one more time or throw
    if (!bible || bible.length === 0) {
       console.warn('Local Bible empty, retrying load...');
       bible = await loadFullBible();
    }

    if (!bible || bible.length === 0) throw new Error('Local Bible not loaded');

    const book = bible.find((b: any) => b.name === bookName);
    if (!book) throw new Error('Book not found locally');

    // Chapters are 0-indexed in array but 1-indexed in Bible
    const chapterData = book.chapters[chapter - 1];
    if (!chapterData) throw new Error('Chapter not found locally');

    // Map strings to Verse objects
    return chapterData.map((text: string, index: number) => ({
      book_id: book.abbrev || book.name.substring(0, 3).toLowerCase(),
      book_name: book.name,
      chapter: chapter,
      verse: index + 1,
      text: text
    }));

  } catch (error) {
    console.warn('Falling back to API for KJV:', error);
    // Fallback to API if local fails
    try {
      const encodedBook = encodeURIComponent(bookName);
      const response = await fetch(`${API_BASE_URL}/${encodedBook}+${chapter}?translation=kjv`);
      if (!response.ok) throw new Error('Failed to fetch chapter');
      const data = await response.json();
      return data.verses.map((v: any) => ({
        book_id: v.book_id,
        book_name: v.book_name,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text
      }));
    } catch (apiError) {
      console.error('Error fetching chapter from API fallback:', apiError);
      return [];
    }
  }
};

export const searchVerses = async (keyword: string, mode: 'exact' | 'smart' = 'exact'): Promise<Verse[]> => {
  if (!keyword || keyword.length < 3) return [];

  // SMART SEARCH (Semantic)
  if (mode === 'smart') {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find 5-10 specific Bible verses (KJV) that are most relevant to this topic or feeling: "${keyword}". 
        Return ONLY a JSON array of objects with this exact structure: 
        [{"book_name": "Book Name", "chapter": 1, "verse": 1, "text": "Verse text"}]
        Do not include any other text or markdown formatting. Ensure the book_name is the full standard name (e.g., "Genesis", "John").`,
      });

      let text = response.text || '';
      // Clean up markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let results: any[] = [];
      try {
        results = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse AI response", text);
        return [];
      }
      
      if (!Array.isArray(results)) return [];

      return results.map((r: any) => ({
        book_id: r.book_name.substring(0, 3).toLowerCase(),
        book_name: r.book_name,
        chapter: r.chapter,
        verse: r.verse,
        text: r.text
      }));
    } catch (error) {
      console.error('Smart search error:', error);
      // Fallback to exact search if AI fails is NOT desired behavior for "Smart Search" usually, 
      // but we can return empty or handle gracefully. For now, return empty to indicate failure.
      return [];
    }
  }

  // EXACT SEARCH (Keyword)
  try {
    const bible = await loadFullBible();
    if (!bible || !Array.isArray(bible) || bible.length === 0) return [];

    const results: Verse[] = [];
    const lowerKeyword = keyword.toLowerCase();

    // Search through the Bible
    // Limit results to avoid freezing UI
    let count = 0;
    const MAX_RESULTS = 50;

    for (const book of bible) {
      if (!book.chapters || !Array.isArray(book.chapters)) continue;
      
      for (let c = 0; c < book.chapters.length; c++) {
        const chapter = book.chapters[c];
        if (!Array.isArray(chapter)) continue;

        for (let v = 0; v < chapter.length; v++) {
          const text = chapter[v];
          if (text.toLowerCase().includes(lowerKeyword)) {
            results.push({
              book_id: book.abbrev || book.name.substring(0, 3).toLowerCase(),
              book_name: book.name,
              chapter: c + 1,
              verse: v + 1,
              text: text
            });
            count++;
            if (count >= MAX_RESULTS) return results;
          }
        }
      }
    }
    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

