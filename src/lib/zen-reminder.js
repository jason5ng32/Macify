// Zen break-reminder candidate. Logic was previously embedded in
// ZenReminderPill.svelte; extracted here so the new tab page can
// orchestrate multiple pill candidates through a single PillStack.
//
// Reminder fires only on new-tab open, never via setInterval — keeps
// it from interrupting deep work in an already-open tab.
//
// Storage: chrome.storage.session, NOT local. The cooldown should
// reset on every Chrome cold start; otherwise the pill greets the
// user with "you've been working for 8h" first thing in the morning.
//
// lastZenSessionAt: ms — last time Zen actually started OR a reminder
// pill was rendered. Either counts as "the reminder happened" so it
// won't fire again until the next interval is up.

import IconZazen from '~icons/mingcute/zazen-line';
import { settings } from './settings.svelte.js';
import { t } from './i18n.svelte.js';
import { enterZen } from './zen.svelte.js';

export async function checkZenReminderPill() {
  if (!settings.zenReminderEnabled) return null;
  const interval = Number(settings.zenReminderMinutes) || 0;
  if (interval <= 0) return null;

  let lastZenSessionAt;
  try {
    const data = await chrome.storage.session.get('lastZenSessionAt');
    lastZenSessionAt = data.lastZenSessionAt;
  } catch {
    return null;
  }

  const now = Date.now();
  // First-run case: no anchor, treat now as the start. Don't fire
  // immediately — wait one full interval.
  if (!lastZenSessionAt) {
    try {
      await chrome.storage.session.set({ lastZenSessionAt: now });
    } catch {}
    return null;
  }

  const elapsedMs = now - lastZenSessionAt;
  if (elapsedMs < interval * 60_000) return null;

  const elapsedMinutes = Math.floor(elapsedMs / 60_000);

  return {
    icon: IconZazen,
    iconClass: 'text-white/80',
    message: t('zen_reminder_message').replace('{n}', String(elapsedMinutes)),
    cta: {
      label: t('zen_reminder_cta'),
      onClick: async () => {
        // enterZen() also stamps lastZenSessionAt — fine, idempotent
        // here since onShow already stamped before render.
        await enterZen();
      },
    },
    dismissLabel: t('zen_reminder_dismiss'),
    onShow: async () => {
      // Stamp BEFORE rendering so a concurrent / immediately following
      // new-tab page doesn't double-fire.
      try {
        await chrome.storage.session.set({ lastZenSessionAt: now });
      } catch {}
    },
    // No onDismiss — onShow already stamped; ✕ is just UI dismissal.
  };
}
