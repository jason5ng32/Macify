<script>
  import { settings, updateSetting } from '../lib/settings.svelte.js';
  import {
    SUPPORTED_LANGUAGES,
    t,
    loadLanguage,
    resolveLanguage,
  } from '../lib/i18n.svelte.js';
  import { geocodeCity } from '../lib/weather.js';
  import VideoSetupHelp from './VideoSetupHelp.svelte';
  import IconGithub from '~icons/mingcute/github-line';

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

  // Visibility toggles, all in the Display card.
  const displayToggles = [
    { key: 'showTime', label: 'options_show_clock_short' },
    { key: 'showWeather', label: 'options_show_weather_short' },
    { key: 'showMotto', label: 'options_show_motto_short' },
    { key: 'showTopSites', label: 'options_show_topsites_short' },
    { key: 'showZenMode', label: 'options_show_zen_short' },
    { key: 'refreshButton', label: 'options_show_refresh_short' },
    { key: 'showVideoMetadata', label: 'options_show_video_meta_short' },
  ];

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
        class="h-12 w-12 rounded-xl shadow-sm ring-1 ring-slate-200"
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

    <!-- Display: all visibility toggles in one place -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">👁️</span>
        {t('options_display_section')}
      </h2>
      <p class="mb-4 text-xs text-slate-500">
        {t('options_display_hint')}
      </p>

      <div class="grid grid-cols-2 gap-x-6 gap-y-2">
        {#each displayToggles as toggle}
          <label
            class="flex items-center justify-between gap-3 py-1 text-sm text-slate-700"
          >
            <span>{t(toggle.label)}</span>
            <input
              type="checkbox"
              class="h-4 w-4 cursor-pointer accent-blue-600"
              checked={settings[toggle.key]}
              onchange={set(toggle.key)}
            />
          </label>
        {/each}
      </div>
    </section>

    <!-- Video: source + sub-config + inline setup help -->
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
        {/if}

        <VideoSetupHelp src={settings.videoSrc} />
      </div>
    </section>

    <!-- Weather: city + temp unit -->
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
              class="cursor-pointer rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </section>

    <!-- Time: hour system -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">🕒</span>
        {t('options_time_section')}
      </h2>

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

    <footer
      class="mt-8 flex flex-col items-center gap-2 text-xs text-slate-500"
    >
      <p>{t('about_created_by')}</p>
      <a
        href="https://github.com/jason5ng32/macOS-Screen-Saver-as-Chrome-New-Tab"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 text-slate-500 transition hover:text-slate-800"
      >
        <IconGithub class="h-4 w-4" />
        <span>{t('about_github_link')}</span>
      </a>
    </footer>

  </div>
</main>
