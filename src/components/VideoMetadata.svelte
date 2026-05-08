<script>
  import { settings } from '../lib/settings.svelte.js';
  import { resolveLanguage } from '../lib/i18n.svelte.js';
  import { nowPlaying } from '../lib/now-playing.svelte.js';
  import { videoName, categoryName } from '../lib/video-i18n.js';

  const meta = $derived(nowPlaying.item?.meta);
  const lang = $derived(resolveLanguage(settings.userLanguage));

  // Fields to surface, in display order. Any null/empty is skipped.
  // Translations come from Apple's bundled loctable (see videos-i18n.json),
  // with English (then the raw value) as fallback.
  const fields = $derived.by(() => {
    if (!meta) return [];
    return [
      videoName(meta.shotID, lang) ?? meta.name,
      categoryName(meta.category, lang) ?? meta.category,
    ].filter(Boolean);
  });

  const visible = $derived(settings.showVideoMetadata && fields.length > 0);
</script>

{#if visible}
  <div
    class="fixed top-6 left-6 z-30 max-w-[260px] text-white select-none [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]"
  >
    <p class="text-sm font-medium leading-tight">{fields[0]}</p>
    {#each fields.slice(1) as line}
      <p class="text-xs leading-tight opacity-70 mt-0.5">{line}</p>
    {/each}
  </div>
{/if}
