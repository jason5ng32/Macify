// Proxy advisory pill — warns the user that the author-hosted reverse
// proxy isn't guaranteed long-term, and points them to the two stable
// alternatives (trust Apple's cert manually, or run a local server).
//
// Eligibility: only when the user is currently using Apple source AND
// has the reverse proxy turned on. If they've already moved off (local
// server, or Apple direct without proxy), the advisory is moot.
//
// Cadence: at most once a week, but ONLY stamped on user dismiss / CTA.
// If the user opens a new tab and ignores (doesn't click ✕), the pill
// reappears on the next new tab — by design, so the message can't be
// missed by a stray scroll past it.
//
// Storage: chrome.storage.local (survives browser restarts; this is a
// per-device, slow-cadence reminder, not a per-session one).

import IconAlert from '~icons/mingcute/alert-line';
import { settings } from './settings.svelte.js';
import { cache } from './storage.js';
import { t } from './i18n.svelte.js';

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STORAGE_KEY = 'proxyAdvisoryLastShownAt';

function isEligible() {
  return settings.videoSrc === 'apple' && settings.reverseProxy === true;
}

async function stamp() {
  try {
    await cache.set(STORAGE_KEY, Date.now());
  } catch {
    // best-effort, swallow
  }
}

export async function checkProxyAdvisoryPill() {
  if (!isEligible()) return null;

  let lastShownAt;
  try {
    lastShownAt = await cache.get(STORAGE_KEY);
  } catch {
    return null;
  }
  if (lastShownAt && Date.now() - lastShownAt < COOLDOWN_MS) return null;

  return {
    icon: IconAlert,
    iconClass: 'text-amber-300',
    message: t('proxy_advisory_message'),
    cta: {
      label: t('proxy_advisory_cta'),
      onClick: async () => {
        await stamp();
        // Send the user to the options page where they can flip the
        // source / read the help section. openOptionsPage handles the
        // tab-vs-popup vagaries across browsers.
        try {
          chrome.runtime.openOptionsPage();
        } catch {
          // Fallback: open manifest's options_page directly.
          const url = chrome.runtime.getURL('options/index.html');
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      },
    },
    dismissLabel: t('proxy_advisory_dismiss'),
    onDismiss: stamp,
    // No onShow — see comment at top: the pill must keep reappearing on
    // each new tab until the user explicitly engages with it.
  };
}
