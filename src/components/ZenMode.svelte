<script>
  import IconZazen from '~icons/mingcute/zazen-line';
  import { settings } from '../lib/settings.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { enterZen, bindAudioElement } from '../lib/zen.svelte.js';

  // The audio element belongs to this component because it shows the
  // button. The Zen module reaches into it via bindAudioElement so that
  // a separate code path (the reminder pill) can also drive playback.
  let audioEl = $state();

  $effect(() => {
    bindAudioElement(audioEl ?? null);
    return () => bindAudioElement(null);
  });
</script>

{#if settings.showZenMode}
  <button
    type="button"
    onclick={enterZen}
    class="cursor-pointer flex h-9.5 w-9.5 items-center justify-center rounded-full bg-white/15 text-white shadow-md backdrop-blur-md transition hover:bg-white/25"
    title={t('zen_label')}
    aria-label={t('zen_label')}
  >
    <IconZazen class="h-5 w-5" />
  </button>
{/if}

<!-- Audio element exists whenever the extension is loaded, even if the
     Zen button is hidden — the reminder pill still needs to play music
     when it triggers Zen. -->
<audio bind:this={audioEl} loop></audio>
