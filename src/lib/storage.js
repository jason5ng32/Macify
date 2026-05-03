import { DEFAULTS, KNOWN_KEYS } from './defaults.js';

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
