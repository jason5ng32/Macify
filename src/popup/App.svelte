<script>
  import { settings } from "../lib/settings.svelte.js";
  import { loadLanguage, resolveLanguage } from "../lib/i18n.svelte.js";
  import Clock from "../components/Clock.svelte";
  import VideoBackground from "../components/VideoBackground.svelte";
  import VideoMetadata from "../components/VideoMetadata.svelte";
  import Weather from "../components/Weather.svelte";
  import TopSites from "../components/TopSites.svelte";
  import ZenMode from "../components/ZenMode.svelte";
  import RefreshButton from "../components/RefreshButton.svelte";
  import Motto from "../components/Motto.svelte";

  $effect(() => {
    loadLanguage(resolveLanguage(settings.userLanguage));
  });
</script>

<VideoBackground />
<VideoMetadata />
<Weather />

<!-- Bottom-left button stack. flex-col-reverse anchors the first DOM
     child at the bottom; subsequent buttons appear above it. -->
<div
  class="fixed bottom-6 left-6 z-40 flex flex-col-reverse items-center gap-3"
>
  <ZenMode />
</div>

<!-- Bottom-right button stack. Same convention: first child = bottom. -->
<div
  class="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-center gap-3"
>
  <RefreshButton />
  <TopSites />
</div>

<!-- Clock anchored at fixed viewport position; doesn't shift when motto length changes -->
<div
  class="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center justify-center min-h-[240px] h-[240px] gap-4"
>
  <div>
    <Clock class="min-h-[120px] h-[120px]" />
  </div>
  <div class="min-h-[120px] h-[120px]">
    <Motto />
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #000;
    color: #eee;
    font-family: system-ui, sans-serif;
    overflow: hidden;
  }
</style>
