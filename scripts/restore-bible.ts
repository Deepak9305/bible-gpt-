// Regenerate the KJV asset from a pinned upstream revision; no app build needed.
import { writeFile } from 'node:fs/promises';
import { BIBLE_BOOKS } from '../src/data/books';

const revision = '0e8fd65a89727f5b73e9f88edb220da8e0d5daba';
const source = `https://raw.githubusercontent.com/thiagobodruk/bible/${revision}`;
const response = await fetch(`${source}/json/en_kjv.json`);
if (!response.ok) throw new Error(`KJV download failed: ${response.status}`);
const books = await response.json() as { abbrev: string; name: string; chapters: string[][] }[];
if (books.length !== BIBLE_BOOKS.length) throw new Error('Incomplete KJV book list');
for (const [index, book] of books.entries()) {
  const expected = BIBLE_BOOKS[index];
  if (book.chapters.length !== expected.chapters || book.chapters.some(chapter =>
    !Array.isArray(chapter) || !chapter.length || chapter.some(verse => typeof verse !== 'string' || !verse.trim())
  )) throw new Error(`Invalid chapters in ${expected.name}`);
  // Upstream uses Portuguese book labels for the English text.
  book.name = expected.name;
}
const verseCount = books.reduce((total, book) => total + book.chapters.reduce((n, chapter) => n + chapter.length, 0), 0);
if (verseCount !== 31102) throw new Error(`Incomplete KJV: ${verseCount} verses`);
const license = await fetch(`${source}/LICENSE`);
if (!license.ok) throw new Error('Could not retrieve upstream license');
const licenseText = await license.text();
await writeFile(new URL('../public/bible.json', import.meta.url), JSON.stringify(books) + '\n');
await writeFile(new URL('../public/bible.LICENSE.txt', import.meta.url), `KJV JSON source: ${source}/json/en_kjv.json\nEnglish book names normalized to the app catalog.\n\n${licenseText}`);
console.log(`Restored ${books.length} books and ${verseCount} verses.`);
