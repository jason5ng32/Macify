// Active-work-time tracker for the Zen break reminder.
//
// Older versions used wall-clock elapsed time since the last reminder.
// That over-counts: a locked screen overnight or a long meeting in
// another app would still tick up the timer, so the pill could greet
// the user with "you've been at the screen for 456 min" the moment
// Chrome regained focus.
//
// New model: accumulate time only while chrome.idle reports `active`.
// A long enough idle/locked stretch is treated as a *natural break* and
// fully resets the accumulator — the user already took the break we
// would have nudged them toward.
//
// All state lives in chrome.storage.session so it wipes on Chrome cold
// start; opening a fresh browser shouldn't surface a stale pill.
//
// Storage shape:
//   zenActiveStartedAt    — ms; current active period began here.
//                           Cleared while away.
//   zenAccumulatedActiveMs — ms; active time banked since last reset.
//   zenAwayAt             — ms; idle/locked period began here.
//                           Cleared on return.
//   zenSnoozedUntil       — ms; reminder is suppressed until this time.

// Treat away periods of at least this long as a real break.
// Shorter than this: pause and resume so a quick coffee run doesn't
// reset a real working session. Longer: assume the body got what the
// pill would have suggested anyway.
const NATURAL_BREAK_MS = 5 * 60_000;

// iOS-alarm-style snooze duration applied when the user dismisses the
// pill. Fixed (not user-configurable) for the same reason iOS picked
// 9 minutes: a single, predictable number means users learn the
// behavior instead of fiddling with it.
export const SNOOZE_MS = 9 * 60_000;

// Brief auto-suppress after the pill is shown. Without this, opening
// several new tabs in quick succession would re-render the same pill
// in each one. 30s is enough to read the message and decide.
export const SHOW_DEBOUNCE_MS = 30_000;

const KEYS = [
  'zenActiveStartedAt',
  'zenAccumulatedActiveMs',
  'zenAwayAt',
  'zenSnoozedUntil',
];

async function read() {
  return chrome.storage.session.get(KEYS);
}

/**
 * Called when chrome.idle transitions to `idle` or `locked`. Flushes any
 * in-progress active duration into the accumulator and stamps the away
 * timestamp so the eventual return can decide whether it was a real
 * break.
 */
export async function beginAway(now = Date.now()) {
  const s = await read();
  const set = { zenAwayAt: now };
  if (s.zenActiveStartedAt) {
    const delta = Math.max(0, now - s.zenActiveStartedAt);
    set.zenAccumulatedActiveMs = (s.zenAccumulatedActiveMs || 0) + delta;
  }
  await chrome.storage.session.set(set);
  await chrome.storage.session.remove('zenActiveStartedAt');
}

/**
 * Called when chrome.idle transitions back to `active`. If the away
 * period was long enough, treats it as a natural break (full reset);
 * otherwise resumes the previous accumulator. Idempotent: also called
 * from the reminder check to handle the race where a new tab opens
 * before the idle event lands.
 */
export async function endAway(now = Date.now()) {
  const s = await read();
  if (s.zenAwayAt == null) {
    if (s.zenActiveStartedAt == null) {
      await chrome.storage.session.set({ zenActiveStartedAt: now });
    }
    return;
  }
  const breakMs = now - s.zenAwayAt;
  if (breakMs >= NATURAL_BREAK_MS) {
    await chrome.storage.session.set({
      zenActiveStartedAt: now,
      zenAccumulatedActiveMs: 0,
    });
    // The user already broke; clear any pending snooze too — they
    // shouldn't come back to a silenced reminder from before the break.
    await chrome.storage.session.remove(['zenAwayAt', 'zenSnoozedUntil']);
  } else {
    await chrome.storage.session.set({ zenActiveStartedAt: now });
    await chrome.storage.session.remove('zenAwayAt');
  }
}

/**
 * Total active milliseconds since the last natural break or Zen
 * session — banked accumulator plus the in-progress active period.
 *
 * Side-effects: calls endAway() to handle the new-tab-immediately-
 * after-unlock race. The reminder check is the only caller, so this
 * stays consistent.
 */
export async function getEffectiveActiveMs(now = Date.now()) {
  await endAway(now);
  const s = await read();
  const ongoing = s.zenActiveStartedAt
    ? Math.max(0, now - s.zenActiveStartedAt)
    : 0;
  return (s.zenAccumulatedActiveMs || 0) + ongoing;
}

/** Called by enterZen(): the user is taking a break, restart the cycle. */
export async function resetTracking(now = Date.now()) {
  await chrome.storage.session.set({
    zenAccumulatedActiveMs: 0,
    zenActiveStartedAt: now,
  });
  await chrome.storage.session.remove(['zenAwayAt', 'zenSnoozedUntil']);
}

export async function snoozeReminder(durationMs, now = Date.now()) {
  await chrome.storage.session.set({ zenSnoozedUntil: now + durationMs });
}

export async function isSnoozed(now = Date.now()) {
  const { zenSnoozedUntil } = await chrome.storage.session.get('zenSnoozedUntil');
  return !!zenSnoozedUntil && now < zenSnoozedUntil;
}
