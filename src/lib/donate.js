// Donate prompt scheduling.
//
// Behavior:
// - First prompt: shown on the first new-tab open after the user has had
//   the extension installed for INTERVAL_MS.
// - Subsequent prompts: every INTERVAL_MS after the last shown timestamp.
// - "Shown" = pill actually rendered.
// - Once the user clicks the Sponsor CTA, we never show the pill again
//   on this device — we got the message across, no need to keep nagging.
//
// Storage (chrome.storage.local, per-device):
// - installedAt: number (ms since epoch), set in background.js on install
// - lastDonatePromptAt: number (ms since epoch), set when pill renders
// - donateSponsored: boolean, set true when user clicks the Sponsor CTA
//
// Production default: 7 days. Override at build time via the
// VITE_DONATE_INTERVAL_MS environment variable (milliseconds), e.g.
//
//   VITE_DONATE_INTERVAL_MS=60000 npm run build   # 1 minute
//   VITE_DONATE_INTERVAL_MS=10000 npm run dev     # 10 seconds
//
// You can also persist a value in .env.local (gitignored) — see
// .env.example. Vite inlines this at build time.
const PRODUCTION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function resolveInterval() {
  const raw = import.meta.env.VITE_DONATE_INTERVAL_MS;
  if (raw === undefined || raw === '') return PRODUCTION_INTERVAL_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    console.warn(
      `[donate] Invalid VITE_DONATE_INTERVAL_MS=${raw}, falling back to default.`,
    );
    return PRODUCTION_INTERVAL_MS;
  }
  return n;
}

export const DONATE_INTERVAL_MS = resolveInterval();

export const DONATE_URL = 'https://github.com/sponsors/jason5ng32';

/**
 * Decide whether the donate pill should appear right now.
 *
 * Three checks; ALL must pass:
 *   1. Sponsored gate: if the user has already clicked Sponsor on any
 *      previous prompt, we never show again.
 *   2. Hard floor: at least DONATE_INTERVAL_MS has elapsed since install.
 *      The pill must NEVER appear earlier — even on the very first new
 *      tab right after install.
 *   3. Cooldown floor: at least DONATE_INTERVAL_MS has elapsed since the
 *      last time we showed it (if any).
 *
 * Returns false on any storage error or missing installedAt.
 */
export async function shouldShowDonatePrompt() {
  try {
    const { installedAt, lastDonatePromptAt, donateSponsored } =
      await chrome.storage.local.get([
        'installedAt',
        'lastDonatePromptAt',
        'donateSponsored',
      ]);
    if (donateSponsored) return false;
    if (!installedAt) return false;
    const now = Date.now();
    if (now - installedAt < DONATE_INTERVAL_MS) return false;
    if (lastDonatePromptAt && now - lastDonatePromptAt < DONATE_INTERVAL_MS) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark the prompt as shown right now. Called by the pill the moment it
 * commits to rendering — resets the cooldown timer.
 */
export async function markDonatePromptShown() {
  try {
    await chrome.storage.local.set({ lastDonatePromptAt: Date.now() });
  } catch {
    // best-effort, swallow
  }
}

/**
 * Permanently silence the pill. Called when the user clicks Sponsor —
 * we treat that as "you got my support, stop bothering me."
 * Survives reloads/updates; only cleared on full reinstall (background.js).
 */
export async function markDonateSponsored() {
  try {
    await chrome.storage.local.set({ donateSponsored: true });
  } catch {
    // best-effort, swallow
  }
}
