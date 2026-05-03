<script>
  import { settings } from '../lib/settings.svelte.js';
  import { t, loadLanguage, resolveLanguage } from '../lib/i18n.svelte.js';

  $effect(() => {
    loadLanguage(resolveLanguage(settings.userLanguage));
  });
</script>

<main>
  <h1>{t('ext_name')}</h1>
  <p>{t('newtab_bootstrap_message')}</p>
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
    display: grid;
    place-items: center;
    text-align: center;
  }
  h1 {
    font-size: 2.5rem;
    margin: 0 0 0.5rem;
  }
  p {
    opacity: 0.6;
  }
</style>
