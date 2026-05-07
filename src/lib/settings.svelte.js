import { DEFAULTS, KNOWN_KEYS } from './defaults.js';
import {
  ensureDefaults,
  getKnown,
  migrateLegacyKeys,
  setSetting,
} from './storage.js';

export const settings = $state({ ...DEFAULTS });

let initialized = false;

export async function initSettings() {
  if (initialized) return;
  initialized = true;

  // Migrations run before ensureDefaults so legacy values seed their
  // replacements (rather than getting overwritten by the new default).
  await migrateLegacyKeys();
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

// Convenience: returns a `change` handler for inputs/selects/checkboxes
// that writes the new value straight to the named setting. Used pretty
// much everywhere in the options page, so factoring it out keeps each
// section terser.
export function bindSetting(key) {
  return (event) => {
    const target = event.currentTarget;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    return updateSetting(key, value);
  };
}
