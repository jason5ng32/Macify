const messageModules = import.meta.glob('../_locales/*/messages.json', {
  eager: true,
  import: 'default',
});

const allMessages = {};
for (const [path, mod] of Object.entries(messageModules)) {
  const lang = path.match(/_locales\/([^/]+)\//)[1];
  allMessages[lang] = mod;
}

export const SUPPORTED_LANGUAGES = Object.keys(allMessages);

let messages = $state({});

function detectBrowserLanguage() {
  const ui = chrome.i18n.getUILanguage().toLowerCase();
  if (ui.startsWith('zh-cn') || ui.startsWith('zh-hans')) return 'zh_CN';
  return 'en';
}

export function resolveLanguage(setting) {
  if (setting && setting !== 'auto' && SUPPORTED_LANGUAGES.includes(setting)) {
    return setting;
  }
  return detectBrowserLanguage();
}

export function loadLanguage(lang) {
  messages = allMessages[lang] ?? allMessages.en ?? {};
}

export function t(key) {
  return messages[key]?.message ?? key;
}
