const isSafari = import.meta.env.VITE_BUILD_TARGET === 'safari';

export async function getTopSites() {
  if (!chrome.topSites?.get) return [];
  try {
    const sites = await chrome.topSites.get();
    return sites.map((s) => ({
      url: s.url,
      title: s.title || hostnameOf(s.url),
    }));
  } catch (e) {
    console.warn('chrome.topSites.get failed:', e);
    return [];
  }
}

export function faviconUrlFor(pageUrl, size = 32) {
  if (!isSafari) {
    return chrome.runtime.getURL(
      `_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`,
    );
  }

  const label = hostnameOf(pageUrl)
    .replace(/^www\./, '')
    .slice(0, 1)
    .toUpperCase();
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.52);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="rgba(255,255,255,0.18)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${fontSize}" font-weight="600" fill="white">${label || '?'}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
