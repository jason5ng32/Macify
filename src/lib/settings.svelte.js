import { DEFAULTS, KNOWN_KEYS } from './defaults.js';
import { ensureDefaults, getKnown, setSetting } from './storage.js';

export const settings = $state({ ...DEFAULTS });

let initialized = false;

export async function initSettings() {
  if (initialized) return;
  initialized = true;

  await ensureDefaults();
  const loaded = await getKnown();
  Object.assign(settings, loaded);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (KNOWN_KEYS.includes(key)) {
        settings[key] = newValue;
      }
    }
  });
}

export function updateSetting(key, value) {
  return setSetting(key, value);
}
