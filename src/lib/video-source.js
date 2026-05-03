import videos from '../data/videos.json';
import { cache } from './storage.js';

// Apple's modern aerial CDN. Reverse proxy mode swaps the host;
// the path stays the same (Worker must accept /itunes-assets/* and
// the legacy /Videos/* — see scripts/build-videos.mjs header).
const APPLE_HOST = 'https://sylvan.apple.com';
const APPLE_PROXY_HOST = 'https://applescreensaver.macify.workers.dev';

const LOCAL_CACHE_KEY = 'localVideoList';
const LOCAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_FORMATS = ['.mov', '.mp4'];

let appleProxyFailedThisSession = false;

export function reportAppleProxyFailure() {
  appleProxyFailedThisSession = true;
}

export function isAppleProxyFailed() {
  return appleProxyFailedThisSession;
}

function applyProxy(url, useProxy) {
  if (!useProxy) return url;
  return url.replace(APPLE_HOST, APPLE_PROXY_HOST);
}

export async function getPlaylist({ videoSrc, videoSourceUrl, reverseProxy }) {
  if (videoSrc === 'local') {
    return getLocalPlaylist(videoSourceUrl);
  }
  return getApplePlaylist(reverseProxy);
}

function getApplePlaylist(reverseProxy) {
  const useProxy = reverseProxy && !appleProxyFailedThisSession;
  return {
    items: videos.map((v) => ({
      url: applyProxy(v.url, useProxy),
      meta: {
        id: v.id,
        shotID: v.shotID,
        name: v.name,
        category: v.category,
        subcategories: v.subcategories,
        timeOfDay: v.timeOfDay,
        previewImage: v.previewImage,
      },
    })),
    source: 'apple',
    usingProxy: useProxy,
  };
}

async function getLocalPlaylist(baseUrl) {
  if (!baseUrl) {
    throw new Error('Local video source URL not set');
  }
  const cached = await cache.get(LOCAL_CACHE_KEY);
  if (
    cached &&
    cached.baseUrl === baseUrl &&
    Date.now() - cached.ts < LOCAL_CACHE_TTL_MS
  ) {
    return {
      items: cached.urls.map((url) => ({ url, meta: null })),
      source: 'local',
      fromCache: true,
    };
  }
  const urls = await scrapeDirectory(baseUrl);
  await cache.set(LOCAL_CACHE_KEY, { baseUrl, urls, ts: Date.now() });
  return {
    items: urls.map((url) => ({ url, meta: null })),
    source: 'local',
    fromCache: false,
  };
}

export async function refreshLocalPlaylist(baseUrl) {
  await cache.remove(LOCAL_CACHE_KEY);
  return getLocalPlaylist(baseUrl);
}

async function scrapeDirectory(baseUrl) {
  const html = await fetch(baseUrl).then((r) => r.text());
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const mainVideos = Array.from(doc.querySelectorAll('a'))
    .map((a) => a.href)
    .filter((href) => SUPPORTED_FORMATS.some((f) => href.endsWith(f)))
    .map((href) => baseUrl + href.split('/').pop());

  const baseHref = doc.querySelector('base')?.href ?? baseUrl;
  const rootHref = new URL('/', baseHref).href;
  const subDirs = Array.from(doc.querySelectorAll('a'))
    .map((a) => new URL(a.getAttribute('href') ?? '', baseHref).href)
    .filter((href) => href.endsWith('/') && href !== rootHref && href !== baseUrl);

  const subVideos = [];
  for (const dirLink of subDirs) {
    const dirName = dirLink.split('/').slice(-2, -1)[0];
    try {
      const subHtml = await fetch(dirLink).then((r) => r.text());
      const subDoc = new DOMParser().parseFromString(subHtml, 'text/html');
      const found = Array.from(subDoc.querySelectorAll('a'))
        .map((a) => a.href)
        .filter((href) => SUPPORTED_FORMATS.some((f) => href.endsWith(f)))
        .map((href) => baseUrl + dirName + '/' + href.split('/').pop());
      subVideos.push(...found);
    } catch (e) {
      console.warn(`Failed to scan ${dirLink}:`, e);
    }
  }

  return [...mainVideos, ...subVideos];
}
