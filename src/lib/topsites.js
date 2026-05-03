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
  return chrome.runtime.getURL(
    `_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`,
  );
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
