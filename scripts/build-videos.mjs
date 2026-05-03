/**
 * Rebuild src/data/videos.json from the local macOS aerial manifest.
 *
 * macOS 14+ keeps the authoritative aerial-screensaver catalog at
 *   ~/Library/Application Support/com.apple.wallpaper/aerials/manifest/entries.json
 * (with a static fallback inside the system framework).
 *
 * That file contains 4K SDR 240fps URLs for each video, plus rich
 * metadata (location label, top-level category, subcategory).
 * This script extracts what we need and writes it to a project-local
 * JSON we can bundle into the extension.
 *
 * Usage: npm run build:videos
 *
 * Note: URLs are at sylvan.apple.com/itunes-assets/Aerials<N>/v4/...,
 * a different path than the legacy /Videos/comp_<...>.mov set. The
 * reverse proxy Worker must be updated to also handle /itunes-assets/
 * paths before the new URLs work in proxy mode.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const USER_MANIFEST = path.join(
  os.homedir(),
  'Library/Application Support/com.apple.wallpaper/aerials/manifest/entries.json',
);
const SYSTEM_MANIFEST =
  '/System/Library/PrivateFrameworks/WallpaperAerialAssets.framework/Versions/A/Resources/entries.json';

const OUT_PATH = path.join(repoRoot, 'src/data/videos.json');

function loadManifest() {
  for (const p of [USER_MANIFEST, SYSTEM_MANIFEST]) {
    if (fs.existsSync(p)) {
      console.log(`reading: ${p}`);
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  throw new Error(
    'No aerial manifest found. Looked at:\n  ' +
      [USER_MANIFEST, SYSTEM_MANIFEST].join('\n  '),
  );
}

function buildCategoryIndex(manifest) {
  const byId = new Map();
  for (const cat of manifest.categories || []) {
    const topName = (cat.localizedNameKey || '').replace(/^AerialCategory/, '');
    byId.set(cat.id, { kind: 'category', name: topName });
    for (const sub of cat.subcategories || []) {
      const subName = (sub.localizedNameKey || '').replace(/^AerialSubcategory/, '');
      byId.set(sub.id, { kind: 'subcategory', name: subName, parent: topName });
    }
  }
  return byId;
}

function inferTimeOfDay(asset, subNames) {
  // accessibilityLabel suffix: e.g. "Tahoe Day" / "Tahoe Night"
  const label = (asset.accessibilityLabel || '').toLowerCase();
  if (/\bnight\b/.test(label)) return 'night';
  if (/\bday\b/.test(label)) return 'day';
  if (/\bsunrise\b|\bdawn\b/.test(label)) return 'sunrise';
  if (/\bsunset\b|\bdusk\b/.test(label)) return 'sunset';
  // Subcategory suffix as fallback (e.g. "AfricaNight", "CaribbeanDay")
  for (const sub of subNames) {
    if (/Night$/.test(sub)) return 'night';
    if (/Day$/.test(sub)) return 'day';
  }
  return null;
}

const manifest = loadManifest();
const categoryIndex = buildCategoryIndex(manifest);

const videos = [];
for (const a of manifest.assets) {
  const url = a['url-4K-SDR-240FPS'];
  if (!url) continue;

  const cats = (a.categories || [])
    .map((id) => categoryIndex.get(id))
    .filter(Boolean);
  const subs = (a.subcategories || [])
    .map((id) => categoryIndex.get(id))
    .filter(Boolean);

  const topCategory = cats.find((c) => c.kind === 'category')?.name ?? null;
  const subNames = subs.map((s) => s.name);

  videos.push({
    id: a.id,
    shotID: a.shotID || null,
    name: a.accessibilityLabel || null,
    url,
    previewImage: a.previewImage || null,
    category: topCategory,
    subcategories: subNames,
    timeOfDay: inferTimeOfDay(a, subNames),
  });
}

const stats = {
  total: videos.length,
  byCategory: {},
  byTimeOfDay: { day: 0, night: 0, sunrise: 0, sunset: 0, unknown: 0 },
};
for (const v of videos) {
  stats.byCategory[v.category] = (stats.byCategory[v.category] || 0) + 1;
  stats.byTimeOfDay[v.timeOfDay ?? 'unknown']++;
}
console.log('total assets:', stats.total);
console.log('by category:', stats.byCategory);
console.log('by time of day:', stats.byTimeOfDay);

fs.writeFileSync(OUT_PATH, JSON.stringify(videos, null, 2) + '\n');
console.log(`wrote ${OUT_PATH}`);
