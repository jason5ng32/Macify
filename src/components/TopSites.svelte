<script>
  import { fly } from 'svelte/transition';
  import IconGrid from '~icons/mingcute/grid-line';
  import { settings } from '../lib/settings.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { getTopSites, faviconUrlFor } from '../lib/topsites.js';

  let sites = $state([]);
  let hovering = $state(false);

  $effect(() => {
    if (!settings.showTopSites) {
      sites = [];
      return;
    }
    getTopSites().then((data) => {
      sites = data;
    });
  });

  function open(url) {
    return () => {
      window.location.href = url;
    };
  }
</script>

{#if settings.showTopSites}
  <div
    class="fixed right-6 bottom-19 z-40 flex flex-col items-end gap-3 select-none"
    onmouseenter={() => (hovering = true)}
    onmouseleave={() => (hovering = false)}
    role="region"
    aria-label="Top Sites"
  >
    {#if hovering}
      <div
        class="w-[300px] rounded-[10px] border border-white/[0.14] bg-black/40 p-3 text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
        role="tooltip"
        transition:fly={{ x: 30, opacity: 0, duration: 240 }}
      >
        {#if sites.length === 0}
          <p class="px-1 py-1 text-xs opacity-70">{t('topsites_empty')}</p>
        {:else}
          <ul class="flex flex-col gap-0.5">
            {#each sites as site}
              <li>
                <button
                  type="button"
                  onclick={open(site.url)}
                  class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-white/10 cursor-pointer"
                  title={site.title + ' — ' + site.url}
                >
                  <img
                    src={faviconUrlFor(site.url)}
                    alt=""
                    class="h-4 w-4 shrink-0 rounded-sm"
                  />
                  <span class="min-w-0 flex-1 truncate">{site.title}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}

    <button
      type="button"
      class="flex h-9.5 w-9.5 items-center justify-center rounded-full bg-white/15 text-white shadow-md backdrop-blur-md transition hover:bg-white/25"
      title={t('topsites_label')}
      aria-label={t('topsites_label')}
    >
      <IconGrid class="h-4.5 w-4.5" />
    </button>
  </div>
{/if}
