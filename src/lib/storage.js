import { DEFAULTS, KNOWN_KEYS } from './defaults.js';

// Convert legacy stored keys to their replacements before defaults are
// filled in. Each migration is one-shot: it runs only if the legacy
// key is still present, then deletes it. Adding a new entry here is
// the safe way to evolve the settings shape across releases.
export async function migrateLegacyKeys() {
  // showTime (boolean) → timeDisplay (enum). Existing users who had
  // the clock disabled keep it disabled; everyone else gets 'clock',
  // which matches the behavior they had before.
  const data = await chrome.storage.sync.get(['showTime', 'timeDisplay']);
  if (data.showTime !== undefined && data.timeDisplay === undefined) {
    await chrome.storage.sync.set({
      timeDisplay: data.showTime ? 'clock' : 'off',
    });
    await chrome.storage.sync.remove('showTime');
  }
}

export async function getKnown() {
  const data = await chrome.storage.sync.get(KNOWN_KEYS);
  const result = {};
  for (const key of KNOWN_KEYS) {
    result[key] = data[key] !== undefined ? data[key] : DEFAULTS[key];
  }
  return result;
}

export async function ensureDefaults() {
  const data = await chrome.storage.sync.get(KNOWN_KEYS);
  const missing = {};
  for (const key of KNOWN_KEYS) {
    if (data[key] === undefined) missing[key] = DEFAULTS[key];
  }
  if (Object.keys(missing).length > 0) {
    await chrome.storage.sync.set(missing);
  }
}

export async function setSetting(key, value) {
  if (!KNOWN_KEYS.includes(key)) return;
  await chrome.storage.sync.set({ [key]: value });
}

export const cache = {
  async get(key) {
    const data = await chrome.storage.local.get(key);
    return data[key];
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },
  async remove(key) {
    await chrome.storage.local.remove(key);
  },
};
