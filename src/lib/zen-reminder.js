// Zen break-reminder pill candidate. Logic was previously embedded in
// ZenReminderPill.svelte; extracted here so the new tab page can
// orchestrate multiple pill candidates through a single PillStack.
//
// Reminder fires only on new-tab open, never via setInterval — keeps
// it from interrupting deep work in an already-open tab.
//
// "How long has the user been working" is computed by zen-tracking.js,
// which excludes locked/idle stretches. See that file for the model.
//
// Dismissal is iOS-alarm-style snooze: the reminder is suppressed for
// SNOOZE_MS (9 min), then returns showing the new (still-elevated)
// active-time number. Only entering Zen actually resets the cycle.

import IconZazen from '~icons/mingcute/zazen-line';
import { settings } from './settings.svelte.js';
import { t } from './i18n.svelte.js';
import { enterZen } from './zen.svelte.js';
import {
  getEffectiveActiveMs,
  isSnoozed,
  snoozeReminder,
  SNOOZE_MS,
  SHOW_DEBOUNCE_MS,
} from './zen-tracking.js';

export async function checkZenReminderPill() {
  if (!settings.zenReminderEnabled) return null;
  const interval = Number(settings.zenReminderMinutes) || 0;
  if (interval <= 0) return null;

  try {
    if (await isSnoozed()) return null;
  } catch {
    return null;
  }

  let activeMs;
  try {
    activeMs = await getEffectiveActiveMs();
  } catch {
    return null;
  }
  if (activeMs < interval * 60_000) return null;

  const elapsedMinutes = Math.floor(activeMs / 60_000);

  return {
    icon: IconZazen,
    iconClass: 'text-white/80',
    message: t('zen_reminder_message').replace('{n}', String(elapsedMinutes)),
    cta: {
      label: t('zen_reminder_cta'),
      onClick: async () => {
        // enterZen() resets the active-time tracker.
        await enterZen();
      },
    },
    dismissLabel: t('zen_reminder_snooze'),
    onShow: async () => {
      // Brief auto-suppress so opening several new tabs in a row
      // doesn't re-render the same pill in each one.
      try {
        await snoozeReminder(SHOW_DEBOUNCE_MS);
      } catch {}
    },
    onDismiss: async () => {
      // iOS-alarm-style snooze. The active-time accumulator keeps
      // ticking; the pill returns later showing the new total.
      try {
        await snoozeReminder(SNOOZE_MS);
      } catch {}
    },
  };
}
