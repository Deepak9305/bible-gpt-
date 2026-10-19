import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { BIBLE_BOOKS } from '../src/data/books';
import { getChapter, isBibleReady, loadFullBible, searchVerses } from '../src/services/bibleService';

test('Bible loading, chapter caching and responsive search regressions', async t => {
  const json = await readFile(new URL('../public/bible.json', import.meta.url), 'utf8');
  const bible = JSON.parse(json) as { name: string; chapters: string[][] }[];

  await t.test('bundled KJV is complete and every catalog chapter is readable', () => {
    assert.equal(bible.length, 66);
    let verses = 0;
    for (const [index, book] of bible.entries()) {
      assert.equal(book.name, BIBLE_BOOKS[index].name);
      assert.equal(book.chapters.length, BIBLE_BOOKS[index].chapters);
      for (const chapter of book.chapters) {
        assert.ok(chapter.length > 0);
        assert.ok(chapter.every(verse => typeof verse === 'string' && verse.trim()));
        verses += chapter.length;
      }
    }
    assert.equal(verses, 31102);
  });

  const originalFetch = globalThis.fetch;
  let requests = 0;
  let failNextRequest = true;
  globalThis.fetch = async () => {
    requests++;
    await new Promise(resolve => setTimeout(resolve, 5));
    if (failNextRequest) {
      failNextRequest = false;
      return new Response('', { status: 503 });
    }
    return new Response(json, { headers: { 'Content-Type': 'application/json' } });
  };

  try {
    await t.test('a failed load can retry, even when IndexedDB is unavailable', async t => {
      const error = t.mock.method(console, 'error', () => {});
      assert.deepEqual(await loadFullBible(), []);
      assert.equal(isBibleReady(), false);
      error.mock.restore();
    });

    await t.test('concurrent readers share one fetch and the same in-memory data', async () => {
      const before = requests;
      const [first, second, third] = await Promise.all([loadFullBible(), loadFullBible(), loadFullBible()]);
      assert.equal(requests - before, 1);
      assert.equal(first.length, 66);
      assert.strictEqual(first, second);
      assert.strictEqual(second, third);
      assert.equal(isBibleReady(), true);
    });

    await t.test('chapter navigation works locally and reuses cached verses', async () => {
      const before = requests;
      const chapter = await getChapter('John', 3);
      assert.equal(chapter.length, 36);
      assert.match(chapter[15].text, /For God so loved the world/);
      assert.strictEqual(await getChapter('John', 3), chapter);
      assert.equal(requests, before);
    });

    await t.test('search keeps exact phrase ranking and limits results', async () => {
      const results = await searchVerses('For God so loved the world');
      assert.equal(results[0].book_name, 'John');
      assert.equal(results[0].chapter, 3);
      assert.equal(results[0].verse, 16);
      assert.equal(results.length, 50);
    });

    await t.test('a full-corpus search yields so UI work can run', async () => {
      let uiWorkRan = false;
      const timer = setTimeout(() => { uiWorkRan = true; }, 0);
      const started = performance.now();
      const results = await searchVerses('love');
      clearTimeout(timer);
      assert.ok(results.length > 0);
      assert.ok(uiWorkRan, 'search blocked the event loop for the entire scan');
      t.diagnostic(`Search over 31,102 verses: ${Math.round(performance.now() - started)} ms total, with event-loop yields.`);
    });

    await t.test('superseded searches cancel while scanning', async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 0);
      assert.deepEqual(await searchVerses('peace', controller.signal), []);
      clearTimeout(timer);
      assert.equal(controller.signal.aborted, true);
      assert.deepEqual(await searchVerses('love', controller.signal), []);
      assert.deepEqual(await searchVerses('  '), []);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
