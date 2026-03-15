import { BIBLE_BOOKS } from '../data/books';
import { get, set } from 'idb-keyval';

const API_BASE_URL = 'https://bible-api.com';
const KJV_JSON_URL = '/bible.json'; // Bundled locally inside the app
const DB_KEY = 'kjv_bible_full';

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

    // If not in DB, fetch from local bundle
    console.log('Loading bundled Bible...');
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
  // 1. Always attempt Web API first for 'Pure Web' experience
  try {
    const encodedBook = encodeURIComponent(bookName);
    const response = await fetch(`${API_BASE_URL}/${encodedBook}+${chapter}?translation=${translation}`);
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return data.verses.map((v: any) => ({
      book_id: v.book_id,
      book_name: v.book_name,
      chapter: v.chapter,
      verse: v.verse,
      text: v.text
    }));
  } catch (apiError) {
    console.warn('Web API failed, attempting local fallback:', apiError);

    // 2. Fallback to local data ONLY if API fails
    if (translation.toLowerCase() === 'kjv') {
      try {
        let bible = await loadFullBible();
        if (!bible || bible.length === 0) throw new Error('Local Bible not available');

        const book = bible.find((b: any) => b.name === bookName);
        if (!book) throw new Error('Book not found locally');

        const chapterData = book.chapters[chapter - 1];
        if (!chapterData) throw new Error('Chapter not found locally');

        return chapterData.map((text: string, index: number) => ({
          book_id: book.abbrev || book.name.substring(0, 3).toLowerCase(),
          book_name: book.name,
          chapter: chapter,
          verse: index + 1,
          text: text
        }));
      } catch (localError) {
        console.error('Local fallback also failed:', localError);
        return [];
      }
    }
    return [];
  }
};

export const getRandomVerseLocally = async (): Promise<Verse | null> => {
  try {
    const bible = await loadFullBible();
    if (!bible || !Array.isArray(bible) || bible.length === 0) return null;

    const randomBook = bible[Math.floor(Math.random() * bible.length)];
    const randomChapterIdx = Math.floor(Math.random() * randomBook.chapters.length);
    const randomChapter = randomBook.chapters[randomChapterIdx];
    const randomVerseIdx = Math.floor(Math.random() * randomChapter.length);

    return {
      book_id: randomBook.abbrev || randomBook.name.substring(0, 3).toLowerCase(),
      book_name: randomBook.name,
      chapter: randomChapterIdx + 1,
      verse: randomVerseIdx + 1,
      text: randomChapter[randomVerseIdx]
    };
  } catch (error) {
    console.error('Error getting random verse:', error);
    return null;
  }
};

export const searchVerses = async (keyword: string): Promise<Verse[]> => {
  if (!keyword || keyword.length < 3) return [];

  try {
    const bible = await loadFullBible();
    if (!bible || !Array.isArray(bible) || bible.length === 0) return [];

    const lowerKeyword = keyword.toLowerCase().trim();

    const synonyms: Record<string, string[]> = {
      "anxious": ["anxious", "care", "worry", "fear", "peace", "trouble", "afraid", "anxiety", "fret", "dismay", "panic"],
      "sad": ["sorrow", "weep", "mourn", "brokenhearted", "comfort", "tears", "grief", "sadness", "depressed", "downcast", "despair", "cry"],
      "happy": ["joy", "rejoice", "glad", "blessed", "cheerful", "delight", "happiness", "merry", "smile"],
      "love": ["love", "charity", "compassion", "heart", "affection", "mercy", "kindness", "beloved", "care"],
      "angry": ["anger", "wrath", "fury", "peace", "patience", "slow to anger", "mad", "bitterness", "rage", "resentment"],
      "forgive": ["forgive", "pardon", "mercy", "grace", "remission", "cleanse", "forgiveness", "absolve"],
      "tired": ["weary", "rest", "heavy laden", "sleep", "faint", "strength", "exhausted", "fatigue", "burden"],
      "scared": ["fear", "afraid", "terror", "courage", "dismayed", "tremble", "panic", "terrified", "frightened"],
      "hope": ["hope", "trust", "wait", "expectation", "promise", "faith", "future", "assurance"],
      "faith": ["faith", "believe", "trust", "confidence", "faithful", "belief", "certainty"],
      "money": ["money", "gold", "silver", "riches", "wealth", "treasure", "poor", "debt", "lender", "borrower", "finance"],
      "family": ["father", "mother", "children", "brother", "sister", "house", "son", "daughter", "parent", "household"],
      "marriage": ["husband", "wife", "marry", "flesh", "joined", "adultery", "wedding", "bride", "groom", "spouse"],
      "healing": ["heal", "cure", "physician", "disease", "sickness", "whole", "health", "illness", "sick", "recover"],
      "strength": ["strength", "power", "might", "strong", "rock", "fortress", "refuge", "weak", "courage"],
      "sin": ["sin", "iniquity", "transgression", "wicked", "evil", "repent", "guilt", "guilty", "wrong"],
      "death": ["death", "die", "grave", "resurrection", "life", "perish", "dead", "mourn"],
      "peace": ["peace", "quiet", "still", "calm", "rest", "tranquility", "serene"],
      "patience": ["patience", "endurance", "longsuffering", "wait", "patient", "persevere"],
      "wisdom": ["wisdom", "understanding", "knowledge", "fool", "wise", "discernment", "insight"],
      "courage": ["courage", "brave", "bold", "fearless", "strong", "valiant", "hero"],
      "lonely": ["alone", "forsaken", "abandoned", "orphan", "widow", "comfort", "presence", "isolate"],
      "friend": ["friend", "companion", "neighbor", "brother", "fellowship", "ally"],
      "guidance": ["guide", "lead", "path", "way", "light", "lamp", "direction", "instruct", "shepherd"],
      "protection": ["protect", "shield", "deliver", "save", "refuge", "fortress", "hide", "guard", "safe"],
      "grace": ["grace", "favor", "mercy", "gift", "unmerited", "blessing"],
      "salvation": ["save", "salvation", "deliver", "redeem", "ransom", "savior", "rescue"],
      "heaven": ["heaven", "paradise", "kingdom", "glory", "eternal", "everlasting", "sky"],
      "hell": ["hell", "hades", "sheol", "fire", "destruction", "torment", "lake of fire"],
      "devil": ["devil", "satan", "adversary", "enemy", "dragon", "serpent", "tempter", "evil one"],
      "temptation": ["tempt", "temptation", "trial", "test", "snare", "trap", "lust", "desire"],
      "pride": ["pride", "proud", "haughty", "arrogant", "boast", "humble", "vain"],
      "humility": ["humble", "meek", "lowly", "gentle", "submit", "modest"],
      "work": ["work", "labor", "toil", "sluggard", "lazy", "diligence", "reward", "job", "effort"],
      "justice": ["justice", "judge", "righteous", "fair", "equity", "oppress", "law"],
      "truth": ["truth", "true", "lie", "deceit", "false", "honest", "integrity"],
      "worship": ["worship", "praise", "bow", "sing", "exalt", "magnify", "glorify", "honor"],
      "prayer": ["pray", "prayer", "ask", "seek", "knock", "petition", "supplication", "plead"],
      "fasting": ["fast", "fasting", "hunger", "mourn", "starve"],
      "baptism": ["baptize", "baptism", "water", "wash", "cleanse", "immerse"],
      "communion": ["bread", "wine", "cup", "body", "blood", "supper", "remembrance", "eucharist"],
      "church": ["church", "assembly", "body", "brethren", "congregation", "temple"],
      "pastor": ["pastor", "shepherd", "elder", "bishop", "overseer", "flock", "minister"],
      "prophet": ["prophet", "prophecy", "seer", "vision", "dream", "foretell", "revelation"],
      "angel": ["angel", "messenger", "host", "cherubim", "seraphim", "spirit"],
      "miracle": ["miracle", "sign", "wonder", "power", "heal", "raise", "marvel"],
      "law": ["law", "commandment", "statute", "ordinance", "decree", "rule", "torah"]
    };

    const stopWords = new Set([
      "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves",
      "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
      "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while",
      "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once",
      "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now",
      "feeling", "feel", "verses", "bible", "say", "says", "show", "give", "find", "looking", "need", "want", "help", "please", "tell", "read"
    ]);

    const words = lowerKeyword.replace(/[^\w\s]/g, '').split(/\s+/);
    const originalTerms = new Set<string>();
    const expandedTerms = new Set<string>();

    words.forEach(word => {
      // Basic stemming: remove trailing 's', 'ing', 'ed' if word is long enough
      let baseWord = word;
      if (word.length > 4) {
        if (word.endsWith('ing')) baseWord = word.slice(0, -3);
        else if (word.endsWith('ed')) baseWord = word.slice(0, -2);
        else if (word.endsWith('s') && !word.endsWith('ss')) baseWord = word.slice(0, -1);
      }

      if (!stopWords.has(word) && word.length > 2) {
        originalTerms.add(word);
        if (baseWord !== word) originalTerms.add(baseWord);

        expandedTerms.add(word);
        if (baseWord !== word) expandedTerms.add(baseWord);

        for (const [key, syns] of Object.entries(synonyms)) {
          if (key === word || key === baseWord || syns.includes(word) || syns.includes(baseWord)) {
            syns.forEach(s => expandedTerms.add(s));
            expandedTerms.add(key);
          }
        }
      }
    });

    if (originalTerms.size === 0) {
      originalTerms.add(lowerKeyword);
      expandedTerms.add(lowerKeyword);
    }

    const originalTermsArray = Array.from(originalTerms);
    const expandedTermsArray = Array.from(expandedTerms);

    // Optimization: Pre-compile regexes for all terms
    const originalRegexes = originalTermsArray.map(term => new RegExp(`\\b${term}`, 'i'));
    const expandedRegexes = expandedTermsArray.filter(term => !originalTerms.has(term)).map(term => new RegExp(`\\b${term}`, 'i'));
    const keywordRegex = new RegExp(lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const scoredResults: { verse: Verse, score: number }[] = [];

    for (const book of bible) {
      if (!book.chapters || !Array.isArray(book.chapters)) continue;
      for (let c = 0; c < book.chapters.length; c++) {
        const chapter = book.chapters[c];
        if (!Array.isArray(chapter)) continue;
        for (let v = 0; v < chapter.length; v++) {
          const text = chapter[v];
          const lowerText = text.toLowerCase();
          let score = 0;

          // 1. Exact phrase match (Highest priority)
          if (keywordRegex.test(lowerText)) {
            score += 2000;
          }

          // 2. Original terms match
          let originalMatches = 0;
          for (let i = 0; i < originalRegexes.length; i++) {
            if (originalRegexes[i].test(lowerText)) {
              score += 100;
              originalMatches++;
            }
          }

          // Boost if ALL original terms are present
          if (originalMatches === originalTermsArray.length && originalTermsArray.length > 1) {
            score += 500;
          }

          // 3. Expanded terms (Synonyms) match
          for (let i = 0; i < expandedRegexes.length; i++) {
            if (expandedRegexes[i].test(lowerText)) {
              score += 15;
            }
          }

          if (score > 0) {
            scoredResults.push({
              verse: {
                book_id: book.abbrev || book.name.substring(0, 3).toLowerCase(),
                book_name: book.name,
                chapter: c + 1,
                verse: v + 1,
                text: text
              },
              score
            });
          }
        }
      }
    }

    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, 50).map(r => r.verse);

  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

