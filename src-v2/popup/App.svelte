<script>
  import { settings } from '../lib/settings.svelte.js';
  import { loadLanguage, resolveLanguage } from '../lib/i18n.svelte.js';
  import Clock from '../components/Clock.svelte';
  import VideoBackground from '../components/VideoBackground.svelte';
  import Weather from '../components/Weather.svelte';
  import Motto from '../components/Motto.svelte';

  $effect(() => {
    loadLanguage(resolveLanguage(settings.userLanguage));
  });
</script>

<VideoBackground />
<Weather />

<main>
  <div class="centered">
    <Clock />
    <Motto />
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #000;
    color: #eee;
    font-family: system-ui, sans-serif;
    overflow: hidden;
  }
  main {
    min-height: 100vh;
  }
  .centered {
    position: absolute;
    top: 44%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }
</style>
