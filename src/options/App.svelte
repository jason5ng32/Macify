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

  function set(key) {
    return (event) => {
      const target = event.currentTarget;
      const value = target.type === 'checkbox' ? target.checked : target.value;
      updateSetting(key, value);
    };
  }
</script>

<main class="min-h-screen bg-slate-50 text-slate-800 antialiased">
  <div class="mx-auto max-w-2xl px-6 py-10">
    <header class="mb-8 flex items-center gap-4">
      <img
        src="../res/icon.png"
        alt=""
        class="h-12 w-12 rounded-md shadow-sm ring-1 ring-slate-200"
      />
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">
          {t('options_title')}
        </h1>
        <p class="text-xs text-slate-500">
          {t('options_version_label')} {version}
        </p>
      </div>
    </header>

    <!-- Video -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">📺</span>
        {t('options_video_section')}
      </h2>

      <div class="space-y-3">
        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t('options_video_source')}
          </span>
          <select
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            value={settings.videoSrc}
            onchange={set('videoSrc')}
          >
            <option value="apple">{t('options_video_source_apple')}</option>
            <option value="local">{t('options_video_source_local')}</option>
          </select>
        </label>

        {#if settings.videoSrc === 'apple'}
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-slate-700">
              {t('options_video_reverse_proxy')}
            </span>
            <input
              type="checkbox"
              class="h-4 w-4 cursor-pointer accent-blue-600"
              checked={settings.reverseProxy}
              onchange={set('reverseProxy')}
            />
          </label>
          <p class="text-xs leading-relaxed text-slate-500">
            {t('options_video_reverse_proxy_note')}
          </p>
        {:else}
          <label class="flex items-center gap-3">
            <span class="whitespace-nowrap text-sm text-slate-700">
              {t('options_video_local_url')}
            </span>
            <input
              type="text"
              class="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              value={settings.videoSourceUrl}
              onchange={set('videoSourceUrl')}
            />
          </label>
          <p class="text-xs leading-relaxed text-slate-500">
            {t('options_video_local_note')}
          </p>
        {/if}

        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t('options_video_show_refresh')}
          </span>
          <input
            type="checkbox"
            class="h-4 w-4 cursor-pointer accent-blue-600"
            checked={settings.refreshButton}
            onchange={set('refreshButton')}
          />
        </label>
      </div>
    </section>

    <!-- Time -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">🕒</span>
        {t('options_time_section')}
      </h2>

      <div class="space-y-3">
        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t('options_show_time')}
          </span>
          <input
            type="checkbox"
            class="h-4 w-4 cursor-pointer accent-blue-600"
            checked={settings.showTime}
            onchange={set('showTime')}
          />
        </label>

        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t('options_hour_system')}
          </span>
          <select
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            value={settings.hourSystem}
            onchange={set('hourSystem')}
          >
            <option value="12">{t('options_hour_12')}</option>
            <option value="24">{t('options_hour_24')}</option>
          </select>
        </label>
      </div>
    </section>

    <!-- Weather -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">🌤️</span>
        {t('options_weather_section')}
      </h2>

      <div class="space-y-3">
        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t('options_show_weather')}
          </span>
          <input
            type="checkbox"
            class="h-4 w-4 cursor-pointer accent-blue-600"
            checked={settings.showWeather}
            onchange={set('showWeather')}
          />
        </label>

        <div class="space-y-1.5">
          <label class="flex items-center gap-3">
            <span class="whitespace-nowrap text-sm text-slate-700">
              {t('options_weather_city')}
            </span>
            <input
              type="text"
              class="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              value={cityDraft}
              oninput={(e) => (cityDraft = e.currentTarget.value)}
              onkeydown={onCityKeydown}
              placeholder={t('options_weather_city_placeholder')}
            />
            <button
              type="button"
              onclick={onValidateCity}
              disabled={validatingCity}
              class="rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {validatingCity
                ? t('options_weather_save_loading')
                : t('options_weather_save')}
            </button>
          </label>
          {#if cityError}
            <p class="text-xs text-red-600">{cityError}</p>
          {:else if citySaved}
            <p class="text-xs text-emerald-600">
              {t('options_weather_save_success')}
            </p>
          {:else}
            <p class="text-xs leading-relaxed text-slate-500">
              {t('options_weather_city_hint')}
            </p>
          {/if}
        </div>

        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t('options_weather_temp_unit')}
          </span>
          <select
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            value={settings.tempUnit}
            onchange={set('tempUnit')}
          >
            <option value="celsius">{t('options_weather_celsius')}</option>
            <option value="fahrenheit">{t('options_weather_fahrenheit')}</option
            >
          </select>
        </label>

        <p class="text-xs leading-relaxed text-slate-500">
          {t('options_weather_note')}
        </p>
      </div>
    </section>

    <!-- Top Sites -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">📌</span>
        {t('options_topsites_section')}
      </h2>

      <div class="space-y-3">
        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t('options_show_topsites')}
          </span>
          <input
            type="checkbox"
            class="h-4 w-4 cursor-pointer accent-blue-600"
            checked={settings.showTopSites}
            onchange={set('showTopSites')}
          />
        </label>
      </div>
    </section>

    <!-- Motto -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">💬</span>
        {t('options_motto_section')}
      </h2>

      <div class="space-y-3">
        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t('options_show_motto')}
          </span>
          <input
            type="checkbox"
            class="h-4 w-4 cursor-pointer accent-blue-600"
            checked={settings.showMotto}
            onchange={set('showMotto')}
          />
        </label>
      </div>
    </section>

    <!-- Zen Mode -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">🧘</span>
        {t('options_zen_section')}
      </h2>

      <label class="flex items-center justify-between gap-4">
        <span class="text-sm text-slate-700">{t('options_show_zen')}</span>
        <input
          type="checkbox"
          class="h-4 w-4 cursor-pointer accent-blue-600"
          checked={settings.showZenMode}
          onchange={set('showZenMode')}
        />
      </label>
    </section>

    <!-- Language -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">🔤</span>
        {t('options_language_section')}
      </h2>

      <label class="flex items-center justify-between gap-4">
        <span class="text-sm text-slate-700">
          {t('options_language_label')}
        </span>
        <select
          class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          value={settings.userLanguage}
          onchange={set('userLanguage')}
        >
          {#each languageOptions as code}
            <option value={code}>{t(`options_language_${code}`)}</option>
          {/each}
        </select>
      </label>
    </section>

    <details class="mt-8 rounded-xl bg-slate-900 p-5 text-slate-200">
      <summary
        class="cursor-pointer text-xs font-medium tracking-wide text-slate-400 uppercase select-none"
      >
        Current settings (debug)
      </summary>
      <pre
        class="mt-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-200">{JSON.stringify(
          settings,
          null,
          2
        )}</pre>
    </details>
  </div>
</main>
