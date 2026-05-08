// Non-"all" scopes derive their UI label from videos-i18n.json by looking up
// `category` (Apple's localized category names). Only "all" needs an in-app
// i18n string because it doesn't correspond to any Apple category.
export const SHUFFLE_SCOPE_OPTIONS = Object.freeze([
  { value: 'all', category: null, labelKey: 'shuffle_scope_all' },
  { value: 'landscapes', category: 'Landscapes' },
  { value: 'cities', category: 'Cities' },
  { value: 'underwater', category: 'Underwater' },
  { value: 'space', category: 'Space' },
  { value: 'mac', category: 'Mac' },
]);

const OPTION_BY_VALUE = new Map(SHUFFLE_SCOPE_OPTIONS.map((o) => [o.value, o]));

function normalizeShuffleScope(scope) {
  return OPTION_BY_VALUE.has(scope) ? scope : 'all';
}

export function normalizeShuffleScopes(scopes) {
  const raw = Array.isArray(scopes) ? scopes : [scopes];
  const normalized = raw.map(normalizeShuffleScope).filter(Boolean);
  if (normalized.length === 0 || normalized.includes('all')) return ['all'];
  return [...new Set(normalized)];
}

export function primaryShuffleScope(scopes) {
  return normalizeShuffleScopes(scopes)[0] ?? 'all';
}

export function itemsForShuffleScopes(items, scopes) {
  const normalized = normalizeShuffleScopes(scopes);
  if (normalized.includes('all')) return items;

  const categories = new Set(
    normalized.map((scope) => OPTION_BY_VALUE.get(scope)?.category).filter(Boolean),
  );
  return items.filter((item) => categories.has(item.meta?.category));
}

function randomIndexFromPool(items, pool, currentIndex = -1) {
  const current = currentIndex >= 0 ? items[currentIndex] : null;
  let candidates = pool;

  if (current && candidates.length > 1) {
    candidates = candidates.filter((item) => item !== current);
  }

  if (candidates.length === 0) {
    return currentIndex >= 0 ? currentIndex : 0;
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const index = items.indexOf(pick);
  return index >= 0 ? index : 0;
}

export function pickInitialVideoIndex(items, scopes = ['all']) {
  if (items.length === 0) return -1;
  const scopedItems = itemsForShuffleScopes(items, scopes);
  const pool = scopedItems.length > 0 ? scopedItems : items;
  return randomIndexFromPool(items, pool);
}

export function pickNextVideoIndex(items, currentIndex = -1, scopes = ['all']) {
  if (items.length === 0) return -1;

  const normalized = normalizeShuffleScopes(scopes);
  const scopedItems = itemsForShuffleScopes(items, normalized);
  const isAllOrFallback = normalized.includes('all') || scopedItems.length === 0;

  if (isAllOrFallback) {
    return currentIndex >= 0 ? (currentIndex + 1) % items.length : 0;
  }

  return randomIndexFromPool(items, scopedItems, currentIndex);
}
