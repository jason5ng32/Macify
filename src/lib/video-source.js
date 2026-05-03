import videoSrcMap from '../data/videosrc.json';
import { cache } from './storage.js';

const APPLE_DIRECT_PREFIX = 'https://sylvan.apple.com/Videos/';
const APPLE_PROXY_PREFIX = 'https://applescreensaver.macify.workers.dev/Videos/';

const LOCAL_CACHE_KEY = 'localVideoList';
const LOCAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const VIDEO_FILENAMES = Object.values(videoSrcMap);
const SUPPORTED_FORMATS = ['.mov', '.mp4'];

let appleProxyFailedThisSession = false;

export function reportAppleProxyFailure() {
  appleProxyFailedThisSession = true;
}

export function isAppleProxyFailed() {
  return appleProxyFailedThisSession;
}

export async function getPlaylist({ videoSrc, videoSourceUrl, reverseProxy }) {
  if (videoSrc === 'local') {
    return getLocalPlaylist(videoSourceUrl);
  }
  return getApplePlaylist(reverseProxy);
}

function getApplePlaylist(reverseProxy) {
  const useProxy = reverseProxy && !appleProxyFailedThisSession;
  const prefix = useProxy ? APPLE_PROXY_PREFIX : APPLE_DIRECT_PREFIX;
  return {
    urls: VIDEO_FILENAMES.map((f) => prefix + f),
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
    return { urls: cached.urls, source: 'local', fromCache: true };
  }
  const urls = await scrapeDirectory(baseUrl);
  await cache.set(LOCAL_CACHE_KEY, { baseUrl, urls, ts: Date.now() });
  return { urls, source: 'local', fromCache: false };
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
