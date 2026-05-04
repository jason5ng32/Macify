<script>
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import IconZazen from '~icons/mingcute/zazen-line';
  import IconClose from '~icons/mingcute/close-line';
  import { settings } from '../lib/settings.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { enterZen, zen } from '../lib/zen.svelte.js';

  // Reminder fires only on new-tab open (this component mount), never via
  // setInterval — explicit decision to avoid interrupting deep work in
  // an already-open tab.
  //
  // Storage: chrome.storage.session, NOT local. We want the cooldown to
  // reset on every Chrome cold start — otherwise the pill greets the
  // user with "you've been working for 8h" first thing in the morning.
  // session storage clears when the browser process exits and is shared
  // across windows within a session, which is exactly the right scope.
  //
  //   lastZenSessionAt: ms — last time Zen actually started OR a reminder
  //   pill was rendered. Either counts as "the reminder happened" so it
  //   won't fire again until the next interval is up.
  //
  // Why reset on render: if user opens tab 1 (pill shows) then opens
  // tab 2 a second later, we don't want tab 2 to also pop the pill —
  // they already saw it. Refreshing tab 1 hits the same path. So the
  // first display "consumes" this interval; ✕ and CTA buttons are
  // pure UI dismissals after that point.

  let visible = $state(false);
  let elapsedMinutes = $state(0);

  $effect(() => {
    let cancelled = false;
    if (!settings.zenReminderEnabled) return;
    const interval = Number(settings.zenReminderMinutes) || 0;
    if (interval <= 0) return;

    (async () => {
      try {
        const { lastZenSessionAt } = await chrome.storage.session.get(
          'lastZenSessionAt',
        );
        const now = Date.now();
        // First-run case: no anchor, treat now as the start. Don't fire
        // immediately — wait one full interval.
        if (!lastZenSessionAt) {
          await chrome.storage.session.set({ lastZenSessionAt: now });
          return;
        }
        const elapsedMs = now - lastZenSessionAt;
        if (elapsedMs >= interval * 60_000 && !cancelled) {
          elapsedMinutes = Math.floor(elapsedMs / 60_000);
          // Stamp BEFORE rendering so any concurrent / immediately
          // following new-tab page doesn't double-fire.
          await chrome.storage.session.set({ lastZenSessionAt: now });
          if (cancelled) return;
          visible = true;
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  async function onEnterZen() {
    visible = false;
    // enterZen() also stamps lastZenSessionAt — fine, that's idempotent
    // here. We don't need to reset cooldown ourselves: the moment the
    // pill rendered above already did it.
    await enterZen();
  }

  function onDismiss() {
    visible = false;
  }

  // If the user enters Zen via any other entry point (the bottom-left
  // launcher button on this same tab), the pill is now contextually
  // moot — they already started a session. Hide it so it doesn't keep
  // floating on top of the fullscreen video.
  $effect(() => {
    if (zen.active) visible = false;
  });
</script>

{#if visible}
  <div
    class="fixed top-6 left-1/2 z-50 -translate-x-1/2"
    transition:fly={{ y: -40, duration: 450, easing: quintOut }}
  >
    <div
      class="flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-md ring-1 ring-white/10"
    >
      <IconZazen class="h-4 w-4 text-white/80" />
      <span class="leading-tight">
        {t('zen_reminder_message').replace('{n}', String(elapsedMinutes))}
      </span>
      <button
        type="button"
        onclick={onEnterZen}
        class="cursor-pointer rounded-full bg-white/25 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/35"
      >
        {t('zen_reminder_cta')}
      </button>
      <button
        type="button"
        onclick={onDismiss}
        class="cursor-pointer rounded-full p-1 text-white/70 transition hover:bg-white/15 hover:text-white"
        title={t('zen_reminder_dismiss')}
        aria-label={t('zen_reminder_dismiss')}
      >
        <IconClose class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
{/if}
