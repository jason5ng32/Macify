import videos from '../data/videos.json';
import { cache } from './storage.js';

// Apple's modern aerial CDN. Reverse proxy mode swaps the host;
// the path stays the same (Worker must accept /itunes-assets/*).
//
// VITE_MACIFY_BASE is required at build time (vite.config.js enforces).
// VITE_APPLE_PROXY_KEY is optional — when set, it's appended as ?k=<token>
// to every video request so a Cloudflare firewall rule in front of the
// worker can drop callers that don't know it. Token is build-time inlined
// and therefore visible in the published bundle — its only job is to
// filter casual abuse, not to defend against motivated attackers.
const APPLE_HOST = 'https://sylvan.apple.com';
const APPLE_PROXY_HOST = import.meta.env.VITE_MACIFY_BASE;
const APPLE_PROXY_KEY = import.meta.env.VITE_APPLE_PROXY_KEY ?? '';

const LOCAL_CACHE_KEY = 'localVideoList';
const LOCAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_FORMATS = ['.mov', '.mp4'];
const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

let appleProxyFailedThisSession = false;

// id → metadata lookup, populated once at module load.
const idIndex = new Map(videos.map((v) => [v.id, v]));

export function reportAppleProxyFailure() {
  appleProxyFailedThisSession = true;
}

export function isAppleProxyFailed() {
  return appleProxyFailedThisSession;
}

function applyProxy(url, useProxy) {
  if (!useProxy) return url;
  const proxied = url.replace(APPLE_HOST, APPLE_PROXY_HOST);
  return APPLE_PROXY_KEY ? `${proxied}?k=${APPLE_PROXY_KEY}` : proxied;
}

function metaFromVideo(v) {
  return {
    id: v.id,
    shotID: v.shotID,
    name: v.name,
    category: v.category,
    subcategories: v.subcategories,
    timeOfDay: v.timeOfDay,
    previewImage: v.previewImage,
  };
}

function metaForLocalUrl(url) {
  // macOS names downloaded aerial files by their Apple asset UUID
  // (e.g. /videos/6D6834A4-2F0F-479A-B053-7D4DC5CB8EB7.mov), so we
  // can recover the same metadata as for Apple-hosted videos.
  const filename = url.split('/').pop() || '';
  const m = filename.match(UUID_RE);
  if (!m) return null;
  const v = idIndex.get(m[1].toUpperCase());
  return v ? metaFromVideo(v) : null;
}

export async function getPlaylist({ videoSrc, videoSourceUrl, reverseProxy }) {
  if (videoSrc === 'local') {
    return getLocalPlaylist(videoSourceUrl);
  }
  return getApplePlaylist(reverseProxy);
}

function getApplePlaylist(reverseProxy) {
  const useProxy = reverseProxy && !appleProxyFailedThisSession;
  const items = videos.map((v) => ({
    url: applyProxy(v.url, useProxy),
    meta: metaFromVideo(v),
  }));
  return {
    items,
    source: 'apple',
    usingProxy: useProxy,
  };
}

async function getLocalPlaylist(baseUrl) {
  if (!baseUrl) {
    throw new Error('Local video source URL not set');
  }
  let urls;
  const cached = await cache.get(LOCAL_CACHE_KEY);
  let fromCache = false;
  if (
    cached &&
    cached.baseUrl === baseUrl &&
    Date.now() - cached.ts < LOCAL_CACHE_TTL_MS
  ) {
    urls = cached.urls;
    fromCache = true;
  } else {
    urls = await scrapeDirectory(baseUrl);
    await cache.set(LOCAL_CACHE_KEY, { baseUrl, urls, ts: Date.now() });
  }
  return {
    items: urls.map((url) => ({ url, meta: metaForLocalUrl(url) })),
    source: 'local',
    fromCache,
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
