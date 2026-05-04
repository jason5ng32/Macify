<script>
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import IconHeart from '~icons/mingcute/heart-fill';
  import IconClose from '~icons/mingcute/close-line';
  import { t } from '../lib/i18n.svelte.js';
  import {
    shouldShowDonatePrompt,
    markDonatePromptShown,
    markDonateSponsored,
    DONATE_URL,
  } from '../lib/donate.js';

  // No auto-dismiss timer: the pill stays put for the entire life of this
  // tab. It goes away when (a) the user clicks ✕, (b) clicks the Sponsor
  // CTA, or (c) navigates away / closes the tab. Opening a fresh new tab
  // re-checks the interval; if it hasn't elapsed, the pill won't show again.
  let visible = $state(false);

  $effect(() => {
    let cancelled = false;
    shouldShowDonatePrompt().then(async (should) => {
      if (cancelled || !should) return;
      // Stamp first, render second — guarantees the next-tab-page open
      // doesn't double-fire if storage write is slow.
      await markDonatePromptShown();
      if (cancelled) return;
      visible = true;
    });
    return () => {
      cancelled = true;
    };
  });

  function onDismiss() {
    visible = false;
  }

  function onSponsorClick() {
    // Treat a Sponsor click as "the message landed, never nag again."
    // Fire-and-forget: don't block the navigation on the storage write.
    markDonateSponsored();
    // Open sponsor page in a new tab so the new-tab page itself stays put.
    window.open(DONATE_URL, '_blank', 'noopener,noreferrer');
    onDismiss();
  }
</script>

{#if visible}
  <div
    class="fixed top-6 left-1/2 z-50 -translate-x-1/2"
    transition:fly={{ y: -40, duration: 450, easing: quintOut }}
  >
    <div
      class="flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-md ring-1 ring-white/10"
    >
      <IconHeart class="h-4 w-4 text-pink-300" />
      <span class="leading-tight">{t('donate_pill_message')}</span>
      <button
        type="button"
        onclick={onSponsorClick}
        class="cursor-pointer rounded-full bg-white/25 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/35"
      >
        {t('donate_pill_cta')}
      </button>
      <button
        type="button"
        onclick={onDismiss}
        class="cursor-pointer rounded-full p-1 text-white/70 transition hover:bg-white/15 hover:text-white"
        title={t('donate_pill_dismiss')}
        aria-label={t('donate_pill_dismiss')}
      >
        <IconClose class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
{/if}
