<script>
  import IconZazen from '~icons/mingcute/zazen-line';
  import { settings } from '../lib/settings.svelte.js';
  import { t } from '../lib/i18n.svelte.js';

  const MUSIC_BASE = 'https://macifymusic.macify.workers.dev/music/';
  const TRACK_COUNT = 40;

  let audioEl;

  function randomTrackUrl() {
    const n = Math.floor(Math.random() * TRACK_COUNT) + 1;
    return MUSIC_BASE + `music${String(n).padStart(5, '0')}`;
  }

  async function enter() {
    const video = document.querySelector('video');
    if (!video) return;
    try {
      await video.requestFullscreen();
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
      return;
    }
    if (audioEl) {
      try {
        audioEl.src = randomTrackUrl();
        await audioEl.play();
      } catch (e) {
        // Music worker unreachable / autoplay blocked — silent degrade
        // to "fullscreen without music".
        console.warn('Zen music playback failed:', e);
      }
    }
  }

  $effect(() => {
    function onChange() {
      if (!document.fullscreenElement && audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  });
</script>

{#if settings.showZenMode}
  <button
    type="button"
    onclick={enter}
    class="cursor-pointer fixed bottom-6 left-6 z-40 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-white/15 text-white shadow-md backdrop-blur-md transition hover:bg-white/25"
    title={t('zen_label')}
    aria-label={t('zen_label')}
  >
    <IconZazen class="h-5 w-5" />
  </button>
  <audio bind:this={audioEl} loop></audio>
{/if}
