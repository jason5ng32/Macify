export const DEFAULTS = Object.freeze({
  userLanguage: 'auto',
  city: 'San Francisco',
  showTime: true,
  hourSystem: '24',
  showWeather: true,
  showMotto: true,
  showTopSites: true,
  showZenMode: true,
  videoSourceUrl: 'http://localhost:18000/videos/',
  refreshButton: true,
  tempUnit: 'celsius',
  authorInfo: true,
  videoSrc: 'apple',
  reverseProxy: true,
  showVideoMetadata: true,
  translateMotto: false,
  zenMusic: true,
  zenBreathingPattern: 'coherent', // 'off' | 'coherent' | 'box' | '478'
  zenReminderEnabled: false,
  zenReminderMinutes: 60,
  zenAutoExitEnabled: false,
  zenAutoExitMinutes: 15,
});

export const KNOWN_KEYS = Object.freeze(Object.keys(DEFAULTS));
