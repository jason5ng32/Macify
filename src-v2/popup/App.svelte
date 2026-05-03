<script>
  import { settings } from '../lib/settings.svelte.js';
  import { t, loadLanguage, resolveLanguage } from '../lib/i18n.svelte.js';
  import Clock from '../components/Clock.svelte';

  $effect(() => {
    loadLanguage(resolveLanguage(settings.userLanguage));
  });
</script>

<main>
  <div class="centered">
    <Clock />
    <p class="bootstrap-note">{t('newtab_bootstrap_message')}</p>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #111;
    color: #eee;
    font-family: system-ui, sans-serif;
  }
  main {
    min-height: 100vh;
  }
  .centered {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }
  .bootstrap-note {
    margin-top: 1rem;
    opacity: 0.45;
    font-size: 0.85rem;
  }
</style>
