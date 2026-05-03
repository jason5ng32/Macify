<script>
  import { settings, updateSetting } from '../lib/settings.svelte.js';
  import {
    SUPPORTED_LANGUAGES,
    t,
    loadLanguage,
    resolveLanguage,
  } from '../lib/i18n.svelte.js';
  import { geocodeCity } from '../lib/weather.js';

  const version = chrome.runtime.getManifest().version;

  let cityDraft = $state(settings.city);
  let validatingCity = $state(false);
  let cityError = $state('');
  let citySaved = $state(false);
  let citySavedTimer = null;

  $effect(() => {
    if (!validatingCity) {
      cityDraft = settings.city;
    }
  });

  async function onValidateCity() {
    const value = cityDraft.trim();
    cityError = '';
    citySaved = false;
    if (!value) {
      cityError = t('options_weather_city_required');
      return;
    }
    validatingCity = true;
    try {
      await geocodeCity(value);
      await updateSetting('city', value);
      citySaved = true;
      clearTimeout(citySavedTimer);
      citySavedTimer = setTimeout(() => {
        citySaved = false;
      }, 2000);
    } catch (e) {
      console.error('City validation failed:', e);
      cityError = t('options_weather_city_invalid');
    } finally {
      validatingCity = false;
    }
  }

  function onCityKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onValidateCity();
    }
  }

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

  function onVideoSrcChange(event) {
    updateSetting('videoSrc', event.currentTarget.value);
  }

  function onReverseProxyChange(event) {
    updateSetting('reverseProxy', event.currentTarget.checked);
  }

  function onVideoSourceUrlChange(event) {
    updateSetting('videoSourceUrl', event.currentTarget.value);
  }

  function onRefreshButtonChange(event) {
    updateSetting('refreshButton', event.currentTarget.checked);
  }

  function onShowWeatherChange(event) {
    updateSetting('showWeather', event.currentTarget.checked);
  }

  function onShowMottoChange(event) {
    updateSetting('showMotto', event.currentTarget.checked);
  }

  function onTempUnitChange(event) {
    updateSetting('tempUnit', event.currentTarget.value);
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
    <h2>{t('options_video_section')}</h2>
    <label class="row">
      <span>{t('options_video_source')}:</span>
      <select value={settings.videoSrc} onchange={onVideoSrcChange}>
        <option value="apple">{t('options_video_source_apple')}</option>
        <option value="local">{t('options_video_source_local')}</option>
      </select>
    </label>

    {#if settings.videoSrc === 'apple'}
      <label class="row">
        <input
          type="checkbox"
          checked={settings.reverseProxy}
          onchange={onReverseProxyChange}
        />
        <span>{t('options_video_reverse_proxy')}</span>
      </label>
      <p class="note">{t('options_video_reverse_proxy_note')}</p>
    {:else}
      <label class="row">
        <span>{t('options_video_local_url')}:</span>
        <input
          type="text"
          class="text-input"
          value={settings.videoSourceUrl}
          onchange={onVideoSourceUrlChange}
        />
      </label>
      <p class="note">{t('options_video_local_note')}</p>
    {/if}

    <label class="row">
      <input
        type="checkbox"
        checked={settings.refreshButton}
        onchange={onRefreshButtonChange}
      />
      <span>{t('options_video_show_refresh')}</span>
    </label>
  </section>

  <section>
    <h2>{t('options_weather_section')}</h2>
    <label class="row">
      <input
        type="checkbox"
        checked={settings.showWeather}
        onchange={onShowWeatherChange}
      />
      <span>{t('options_show_weather')}</span>
    </label>
    <label class="row">
      <span>{t('options_weather_city')}:</span>
      <input
        type="text"
        class="text-input"
        value={cityDraft}
        oninput={(e) => (cityDraft = e.currentTarget.value)}
        onkeydown={onCityKeydown}
        placeholder={t('options_weather_city_placeholder')}
      />
      <button
        type="button"
        onclick={onValidateCity}
        disabled={validatingCity}
        class="aux-button primary"
      >
        {validatingCity
          ? t('options_weather_save_loading')
          : t('options_weather_save')}
      </button>
    </label>
    {#if cityError}
      <p class="error-note">{cityError}</p>
    {:else if citySaved}
      <p class="success-note">{t('options_weather_save_success')}</p>
    {/if}
    <p class="note">{t('options_weather_city_hint')}</p>
    <label class="row">
      <span>{t('options_weather_temp_unit')}:</span>
      <select value={settings.tempUnit} onchange={onTempUnitChange}>
        <option value="celsius">{t('options_weather_celsius')}</option>
        <option value="fahrenheit">{t('options_weather_fahrenheit')}</option>
      </select>
    </label>
    <p class="note">{t('options_weather_note')}</p>
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

  <section>
    <h2>{t('options_motto_section')}</h2>
    <label class="row">
      <input
        type="checkbox"
        checked={settings.showMotto}
        onchange={onShowMottoChange}
      />
      <span>{t('options_show_motto')}</span>
    </label>
    <p class="note">{t('options_motto_note')}</p>
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
  .text-input {
    flex: 1;
    padding: 0.3rem 0.5rem;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 0.85rem;
  }
  .note {
    margin: 0.6rem 0 0;
    color: #777;
    font-size: 0.8rem;
    line-height: 1.4;
  }
  .aux-button {
    padding: 0.3rem 0.7rem;
    font-size: 0.85rem;
    cursor: pointer;
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .aux-button:hover:not(:disabled) {
    background: #e6e6e6;
  }
  .aux-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .error-note {
    margin: 0.4rem 0 0;
    color: #b00;
    font-size: 0.8rem;
  }
  .success-note {
    margin: 0.4rem 0 0;
    color: #0a7d2c;
    font-size: 0.8rem;
  }
  .aux-button.primary {
    background: #2563eb;
    color: #fff;
    border-color: #1e40af;
  }
  .aux-button.primary:hover:not(:disabled) {
    background: #1d4ed8;
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
