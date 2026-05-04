// Shared Zen mode state. Both the on-screen Zen button (ZenMode.svelte)
// and the break-reminder pill (ZenReminderPill.svelte) call enterZen()
// from here, so a session can start whether or not the new-tab UI is
// showing the button at the moment.
//
// Storage key (chrome.storage.session — wipes on Chrome cold start):
//   lastZenSessionAt — ms timestamp set on every enterZen(); the reminder
//   pill uses this to compute "minutes since last session". Using session
//   storage instead of local means the cooldown resets each time Chrome
//   restarts, so users don't get hit with a stale "X hours ago" pill on
//   first launch of the day.

import { settings } from './settings.svelte.js';

const MUSIC_BASE = `${import.meta.env.VITE_MACIFY_BASE}/music/`;
const TRACK_COUNT = 40;

// Final 5 seconds of an auto-exit session: ramp music volume to 0 so
// the end of the session feels like a fade rather than a cut.
const FADE_OUT_MS = 5000;

/** Reactive state observable from any component. */
export const zen = $state({ active: false });

/** Set by ZenMode.svelte once its <audio> element mounts. */
let audioEl = null;
let autoExitTimer = null;
let fadeStartTimer = null;
let fadeRaf = null;
let fullscreenListener = null;

export function bindAudioElement(el) {
  audioEl = el;
}

function randomTrackUrl() {
  const n = Math.floor(Math.random() * TRACK_COUNT) + 1;
  return MUSIC_BASE + `music${String(n).padStart(5, '0')}.mp3`;
}

function cancelFade() {
  if (fadeStartTimer) {
    clearTimeout(fadeStartTimer);
    fadeStartTimer = null;
  }
  if (fadeRaf) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = null;
  }
}

/**
 * Linearly ramp the audio element's volume from its current value down
 * to 0 over `durationMs`. Driven by rAF rather than a CSS transition
 * because we're animating a JS property on a media element.
 */
function fadeAudioOut(durationMs) {
  if (!audioEl) return;
  const startVol = audioEl.volume;
  const startTime = performance.now();
  function step() {
    if (!audioEl) {
      fadeRaf = null;
      return;
    }
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, elapsed / durationMs);
    audioEl.volume = startVol * (1 - t);
    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
    } else {
      fadeRaf = null;
    }
  }
  fadeRaf = requestAnimationFrame(step);
}

/**
 * Enter Zen mode: fullscreen the video stage, optionally start music,
 * optionally start the auto-exit timer. Stamps lastZenSessionAt so the
 * reminder pill cooldown begins now.
 *
 * Must be called from a user gesture (browser fullscreen + autoplay rules).
 */
export async function enterZen() {
  // Fullscreen the stage div (set up in popup/App.svelte) so any overlay
  // siblings — breathing guide, etc — are part of the fullscreen view.
  // Fall back to the video element if the stage somehow isn't there.
  const stage =
    document.getElementById('zen-stage') ?? document.querySelector('video');
  if (!stage) return;

  try {
    await stage.requestFullscreen();
  } catch (e) {
    console.warn('Fullscreen request failed:', e);
    return;
  }

  zen.active = true;

  // Reset the reminder cooldown timer.
  try {
    await chrome.storage.session.set({ lastZenSessionAt: Date.now() });
  } catch {
    // best-effort, swallow
  }

  // Music — opt-out via settings.
  if (settings.zenMusic && audioEl) {
    try {
      // Reset to full volume in case a previous session faded it down.
      audioEl.volume = 1;
      audioEl.src = randomTrackUrl();
      await audioEl.play();
    } catch (e) {
      console.warn('Zen music playback failed:', e);
    }
  }

  // Auto-exit timer + matching fade-out scheduled FADE_OUT_MS earlier.
  // For sessions shorter than the fade window the fade simply runs from
  // session start; teardown() always cancels both timers cleanly.
  const minutes = Number(settings.zenAutoExitMinutes) || 0;
  if (settings.zenAutoExitEnabled && minutes > 0) {
    const totalMs = minutes * 60_000;
    const fadeStartAt = Math.max(0, totalMs - FADE_OUT_MS);
    fadeStartTimer = setTimeout(() => {
      fadeStartTimer = null;
      fadeAudioOut(Math.min(FADE_OUT_MS, totalMs));
    }, fadeStartAt);
    autoExitTimer = setTimeout(() => {
      exitZen();
    }, totalMs);
  }

  // Listen once for the user (or auto-exit) leaving fullscreen, so we
  // tear everything down in one place.
  if (!fullscreenListener) {
    fullscreenListener = () => {
      if (!document.fullscreenElement) {
        teardown();
      }
    };
    document.addEventListener('fullscreenchange', fullscreenListener);
  }
}

/**
 * Programmatically exit. Same effect as the user pressing Esc — leaving
 * fullscreen triggers the listener which calls teardown().
 */
export function exitZen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    teardown();
  }
}

function teardown() {
  zen.active = false;
  cancelFade();
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
    // Restore for the next session — fade may have left it at 0.
    audioEl.volume = 1;
  }
  if (autoExitTimer) {
    clearTimeout(autoExitTimer);
    autoExitTimer = null;
  }
}
