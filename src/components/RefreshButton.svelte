<script>
  import IconRefresh from '~icons/mingcute/refresh-1-line';
  import { settings } from '../lib/settings.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { requestVideoNext } from '../lib/now-playing.svelte.js';

  // Bumped on every click; used as a {#key} so the icon re-mounts and
  // its CSS animation restarts each press.
  let spinTick = $state(0);

  function onClick() {
    spinTick++;
    requestVideoNext();
  }
</script>

{#if settings.refreshButton}
  <button
    type="button"
    class="cursor-pointer flex h-9.5 w-9.5 items-center justify-center rounded-full bg-white/15 text-white shadow-md backdrop-blur-md transition hover:bg-white/25"
    onclick={onClick}
    title={t('refresh_video')}
    aria-label={t('refresh_video')}
  >
    {#key spinTick}
      <IconRefresh
        class={spinTick > 0
          ? 'h-4.5 w-4.5 animate-[spin_0.5s_ease-in-out]'
          : 'h-4.5 w-4.5'}
      />
    {/key}
  </button>
{/if}
