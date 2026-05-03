import bundledQuotes from '../data/quotes.json';
import { cache } from './storage.js';

const ZENQUOTES_BATCH_URL = 'https://zenquotes.io/api/quotes/';
const QUOTES_CACHE_KEY = 'quotesBatch';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let memoryBatch = null;

async function fetchOnlineBatch() {
  const res = await fetch(ZENQUOTES_BATCH_URL);
  if (!res.ok) throw new Error(`zenquotes HTTP ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('zenquotes returned no quotes');
  }
  const quotes = raw
    .map((q) => ({ content: q?.q, author: q?.a }))
    .filter((q) => q.content && q.author);
  if (quotes.length === 0) {
    throw new Error('zenquotes returned no usable quotes');
  }
  return quotes;
}

async function loadBatch() {
  if (memoryBatch) return memoryBatch;

  const cached = await cache.get(QUOTES_CACHE_KEY);
  if (cached?.quotes?.length && Date.now() - cached.ts < CACHE_TTL_MS) {
    memoryBatch = cached.quotes;
    return memoryBatch;
  }

  try {
    const fresh = await fetchOnlineBatch();
    await cache.set(QUOTES_CACHE_KEY, { quotes: fresh, ts: Date.now() });
    memoryBatch = fresh;
    return memoryBatch;
  } catch (e) {
    console.warn('zenquotes failed, using bundled fallback:', e);
    memoryBatch = bundledQuotes;
    return memoryBatch;
  }
}

export async function nextQuote(currentContent = null) {
  const batch = await loadBatch();
  if (batch.length === 0) return null;
  if (batch.length === 1) return batch[0];
  // Avoid showing the same quote twice in a row.
  let pick;
  do {
    pick = batch[Math.floor(Math.random() * batch.length)];
  } while (pick.content === currentContent);
  return pick;
}
