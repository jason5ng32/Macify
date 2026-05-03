<script>
  import { settings, updateSetting } from '../lib/settings.svelte.js';
  import {
    SUPPORTED_LANGUAGES,
    t,
    loadLanguage,
    resolveLanguage,
  } from '../lib/i18n.svelte.js';

  const version = chrome.runtime.getManifest().version;

  $effect(() => {
    loadLanguage(resolveLanguage(settings.userLanguage));
  });

  const languageOptions = ['auto', ...SUPPORTED_LANGUAGES];

  function onLanguageChange(event) {
    updateSetting('userLanguage', event.currentTarget.value);
  }

  function onShowTimeChange(event) {
    updateSetting('showTime', event.currentTarget.checked);
  }

  function onHourSystemChange(event) {
    updateSetting('hourSystem', event.currentTarget.value);
  }
</script>

<main>
  <h1>{t('options_title')}</h1>
  <p class="version">{t('options_version_label')} {version}</p>

  <section>
    <h2>{t('options_language_section')}</h2>
    <label class="row">
      <span>{t('options_language_label')}:</span>
      <select value={settings.userLanguage} onchange={onLanguageChange}>
        {#each languageOptions as code}
          <option value={code}>{t(`options_language_${code}`)}</option>
        {/each}
      </select>
    </label>
  </section>

  <section>
    <h2>{t('options_time_section')}</h2>
    <label class="row">
      <input
        type="checkbox"
        checked={settings.showTime}
        onchange={onShowTimeChange}
      />
      <span>{t('options_show_time')}</span>
    </label>
    <label class="row">
      <span>{t('options_hour_system')}:</span>
      <select value={settings.hourSystem} onchange={onHourSystemChange}>
        <option value="12">{t('options_hour_12')}</option>
        <option value="24">{t('options_hour_24')}</option>
      </select>
    </label>
  </section>

  <section class="placeholder">
    <p>{t('options_placeholder')}</p>
  </section>

  <details class="debug">
    <summary>Current settings (debug)</summary>
    <pre>{JSON.stringify(settings, null, 2)}</pre>
  </details>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f8f8f8;
    color: #222;
    font-family: system-ui, sans-serif;
  }
  main {
    max-width: 720px;
    margin: 4rem auto;
    padding: 0 2rem;
  }
  h1 {
    margin-top: 0;
  }
  .version {
    opacity: 0.5;
    font-size: 0.9rem;
    margin-top: -0.5rem;
  }
  section {
    margin: 2rem 0;
    padding: 1rem 1.25rem;
    background: #fff;
    border: 1px solid #e3e3e3;
    border-radius: 6px;
  }
  section h2 {
    margin-top: 0;
    font-size: 1.1rem;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .row + .row {
    margin-top: 0.6rem;
  }
  select {
    padding: 0.3rem 0.5rem;
  }
  .placeholder {
    border-style: dashed;
    color: #777;
  }
  .debug {
    margin-top: 3rem;
    padding: 1rem 1.25rem;
    background: #1a1a1a;
    color: #eee;
    border-radius: 6px;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 0.85rem;
  }
  .debug pre {
    margin: 0.75rem 0 0;
    white-space: pre-wrap;
  }
</style>
