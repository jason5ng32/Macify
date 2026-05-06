import { beginAway, endAway } from './lib/zen-tracking.js';

// chrome.idle minimum is 15s; default is 60s. 60s avoids churning state
// for brief desk-shifts but still catches a real lock or step-away
// quickly. Re-setting on each service-worker wake is idempotent.
chrome.idle.setDetectionInterval(60);

chrome.idle.onStateChanged.addListener(async (state) => {
  try {
    if (state === 'active') {
      await endAway();
    } else {
      // 'idle' or 'locked' — both pause the active accumulator. A long
      // enough away period is later treated as a natural break.
      await beginAway();
    }
  } catch {
    // best-effort
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Stamp install time so the donate prompt can compute "days since install".
    // Stored in chrome.storage.local (per-device, never synced).
    // Also wipe any stale donate state left over from a previous install
    // (cooldown timer + the "user already sponsored" silence flag) so the
    // donate flow starts cleanly.
    await chrome.storage.local.set({ installedAt: Date.now() });
    await chrome.storage.local.remove(['lastDonatePromptAt', 'donateSponsored']);
    chrome.tabs.create({ url: 'options/index.html' });
    return;
  }
  if (details.reason === 'update') {
    // Backfill installedAt for users who upgraded from a build that didn't
    // record it. Best-effort: we don't know the real install date, so we
    // anchor "now" — they'll see the first donate prompt 30 days from this
    // upgrade, which is fine.
    const { installedAt } = await chrome.storage.local.get('installedAt');
    if (!installedAt) {
      await chrome.storage.local.set({ installedAt: Date.now() });
    }

    // Only on a major-version bump (e.g., 1.x → 2.x). Patch updates
    // shouldn't keep popping the settings tab.
    const prevMajor = (details.previousVersion ?? '').split('.')[0];
    const nowMajor = chrome.runtime.getManifest().version.split('.')[0];
    if (prevMajor && prevMajor !== nowMajor) {
      chrome.tabs.create({ url: 'options/index.html' });
    }
  }
});
