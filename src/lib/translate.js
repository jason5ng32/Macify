// Thin wrapper around Chrome's built-in Translator API
// (https://developer.chrome.com/docs/ai/translator-api).
//
// On-device translation, no API key, no remote network beyond the
// one-time model download. Chrome 138+. Feature-detected; falls back
// to returning the source text unchanged.
//
// Gesture caveat: Translator.create() requires a user gesture when
// the model still needs downloading. Once cached locally, subsequent
// create() calls work without one. So `prepareTranslator()` should
// be called synchronously inside a click handler the first time the
// user opts in; later sessions just hit the cache.

const SOURCE = 'en';

// `${SOURCE}→${target}` → Promise<Translator | null>
const cache = new Map();

export function appLangToBcp47(appLang) {
  if (appLang === 'zh_CN') return 'zh-Hans';
  if (appLang === 'zh_TW') return 'zh-Hant';
  if (appLang === 'ja') return 'ja';
  if (appLang === 'es') return 'es';
  return 'en';
}

export function isTranslatorApiSupported() {
  return typeof Translator !== 'undefined';
}

/**
 * Returns one of:
 *   'no-api'      — browser lacks the Translator API entirely
 *   'na-english'  — target is en (no translation needed)
 *   'available'   — model is on disk, translate() works immediately
 *   'downloadable'— model needs to be downloaded; requires user gesture
 *   'downloading' — download in progress in another tab/session
 *   'unavailable' — Chrome can't translate this pair at all
 */
export async function getAvailability(targetLang) {
  if (!isTranslatorApiSupported()) return 'no-api';
  if (targetLang === SOURCE) return 'na-english';
  try {
    return await Translator.availability({
      sourceLanguage: SOURCE,
      targetLanguage: targetLang,
    });
  } catch (e) {
    console.warn('Translator.availability failed:', e);
    return 'unavailable';
  }
}

/**
 * Synchronously start creating a translator. Returns the cached
 * promise (or null if API unsupported / target is English). Must be
 * called inside a user-gesture context the first time a given pair
 * is needed. Pass `onProgress(percent)` to track download progress.
 */
export function prepareTranslator(targetLang, onProgress) {
  if (!isTranslatorApiSupported()) return null;
  if (targetLang === SOURCE) return null;
  const key = `${SOURCE}→${targetLang}`;
  if (cache.has(key)) return cache.get(key);

  const opts = {
    sourceLanguage: SOURCE,
    targetLanguage: targetLang,
  };
  if (onProgress) {
    opts.monitor = (m) => {
      m.addEventListener('downloadprogress', (e) => {
        onProgress(Math.round((e.loaded ?? 0) * 100));
      });
    };
  }

  const promise = Translator.create(opts).catch((e) => {
    console.warn('Translator init failed:', e);
    cache.delete(key);
    return null;
  });
  cache.set(key, promise);
  return promise;
}

export async function translate(text, targetLang) {
  if (!text) return text;
  if (targetLang === SOURCE) return text;
  if (!isTranslatorApiSupported()) return text;

  const key = `${SOURCE}→${targetLang}`;
  const instance = await (cache.get(key) ?? prepareTranslator(targetLang));
  if (!instance) return text;

  try {
    return await instance.translate(text);
  } catch (e) {
    console.warn('Translation failed:', e);
    return text;
  }
}
