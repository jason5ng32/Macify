<script>
  import { settings, updateSetting } from "../lib/settings.svelte.js";
  import {
    SUPPORTED_LANGUAGES,
    t,
    loadLanguage,
    resolveLanguage,
  } from "../lib/i18n.svelte.js";
  import { geocodeCity } from "../lib/weather.js";
  import {
    prepareTranslator,
    appLangToBcp47,
    getAvailability,
    isTranslatorApiSupported,
  } from "../lib/translate.js";
  import VideoSetupHelp from "./VideoSetupHelp.svelte";
  import IconGithub from "~icons/mingcute/github-line";
  import IconHeart from "~icons/mingcute/heart-fill";
  import { DONATE_URL } from "../lib/donate.js";

  const version = chrome.runtime.getManifest().version;

  let cityDraft = $state(settings.city);
  let validatingCity = $state(false);
  let cityError = $state("");
  let citySaved = $state(false);
  let citySavedTimer = null;

  $effect(() => {
    if (!validatingCity) {
      cityDraft = settings.city;
    }
  });

  async function onValidateCity() {
    const value = cityDraft.trim();
    cityError = "";
    citySaved = false;
    if (!value) {
      cityError = t("options_weather_city_required");
      return;
    }
    validatingCity = true;
    try {
      await geocodeCity(value);
      await updateSetting("city", value);
      citySaved = true;
      clearTimeout(citySavedTimer);
      citySavedTimer = setTimeout(() => {
        citySaved = false;
      }, 2000);
    } catch (e) {
      console.error("City validation failed:", e);
      cityError = t("options_weather_city_invalid");
    } finally {
      validatingCity = false;
    }
  }

  function onCityKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      onValidateCity();
    }
  }

  $effect(() => {
    loadLanguage(resolveLanguage(settings.userLanguage));
  });

  const languageOptions = ["auto", ...SUPPORTED_LANGUAGES];

  // Visibility toggles, all in the Display card.
  const displayToggles = [
    { key: "showTime", label: "options_show_clock_short" },
    { key: "showWeather", label: "options_show_weather_short" },
    { key: "showMotto", label: "options_show_motto_short" },
    { key: "showTopSites", label: "options_show_topsites_short" },
    { key: "showZenMode", label: "options_show_zen_short" },
    { key: "refreshButton", label: "options_show_refresh_short" },
    { key: "showVideoMetadata", label: "options_show_video_meta_short" },
  ];

  // === Translation card state ===
  // Only meaningful when resolved app language ≠ en. Re-checks on
  // language change.
  const targetLang = $derived(
    appLangToBcp47(resolveLanguage(settings.userLanguage)),
  );
  const showTranslationCard = $derived(targetLang !== "en");

  let translationStatus = $state("checking");
  let downloadProgress = $state(0);

  $effect(() => {
    if (!showTranslationCard) return;
    translationStatus = "checking";
    downloadProgress = 0;
    getAvailability(targetLang).then((s) => {
      translationStatus = s;
    });
  });

  // Click-driven (gesture-eligible) — kicks off model download with
  // progress reporting, then re-queries availability when done.
  function onDownloadModel() {
    translationStatus = "downloading";
    downloadProgress = 0;
    const lang = targetLang;
    const promise = prepareTranslator(lang, (pct) => {
      downloadProgress = pct;
    });
    if (!promise) {
      translationStatus = "unavailable";
      return;
    }
    promise.then((instance) => {
      if (!instance) {
        translationStatus = "unavailable";
        return;
      }
      // Re-query to confirm it really landed.
      getAvailability(lang).then((s) => {
        translationStatus = s;
      });
    });
  }

  // Toggle handler — same gesture trick as before, used both as a
  // place to opt-in AND (when applicable) to start the download.
  function onTranslateMottoToggle(event) {
    const enabled = event.currentTarget.checked;
    if (enabled && targetLang !== "en") {
      // If the model is missing, this click is the user gesture
      // that authorizes the download.
      if (
        translationStatus === "downloadable" ||
        translationStatus === "unavailable"
      ) {
        onDownloadModel();
      } else {
        prepareTranslator(targetLang);
      }
    }
    updateSetting("translateMotto", enabled);
  }

  function set(key) {
    return (event) => {
      const target = event.currentTarget;
      const value = target.type === "checkbox" ? target.checked : target.value;
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
          {t("options_title")}
        </h1>
        <p class="text-xs text-slate-500">
          {t("options_version_label")}
          {version}
        </p>
      </div>
    </header>

    <!-- Language -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">🔤</span>
        {t("options_language_section")}
      </h2>

      <label class="flex items-center justify-between gap-4">
        <span class="text-sm text-slate-700">
          {t("options_language_label")}
        </span>
        <select
          class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          value={settings.userLanguage}
          onchange={set("userLanguage")}
        >
          {#each languageOptions as code}
            <option value={code}>{t(`options_language_${code}`)}</option>
          {/each}
        </select>
      </label>
    </section>

    <!-- Display: all visibility toggles in one place -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">👁️</span>
        {t("options_display_section")}
      </h2>
      <p class="mb-4 text-xs text-slate-500">
        {t("options_display_hint")}
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
        {t("options_video_section")}
      </h2>

      <div class="space-y-3">
        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t("options_video_source")}
          </span>
          <select
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            value={settings.videoSrc}
            onchange={set("videoSrc")}
          >
            <option value="apple">{t("options_video_source_apple")}</option>
            <option value="local">{t("options_video_source_local")}</option>
          </select>
        </label>

        {#if settings.videoSrc === "apple"}
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-slate-700">
              {t("options_video_reverse_proxy")}
            </span>
            <input
              type="checkbox"
              class="h-4 w-4 cursor-pointer accent-blue-600"
              checked={settings.reverseProxy}
              onchange={set("reverseProxy")}
            />
          </label>
          {#if settings.reverseProxy}
            <p
              class="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200"
            >
              {t("options_video_reverse_proxy_warning")}
            </p>
          {/if}
        {:else}
          <label class="flex items-center gap-3">
            <span class="whitespace-nowrap text-sm text-slate-700">
              {t("options_video_local_url")}
            </span>
            <input
              type="text"
              class="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              value={settings.videoSourceUrl}
              onchange={set("videoSourceUrl")}
            />
          </label>
        {/if}

        <VideoSetupHelp />
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
        {t("options_weather_section")}
      </h2>

      <div class="space-y-3">
        <div class="space-y-1.5">
          <label class="flex items-center gap-3">
            <span class="whitespace-nowrap text-sm text-slate-700">
              {t("options_weather_city")}
            </span>
            <input
              type="text"
              class="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              value={cityDraft}
              oninput={(e) => (cityDraft = e.currentTarget.value)}
              onkeydown={onCityKeydown}
              placeholder={t("options_weather_city_placeholder")}
            />
            <button
              type="button"
              onclick={onValidateCity}
              disabled={validatingCity}
              class="cursor-pointer rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {validatingCity
                ? t("options_weather_save_loading")
                : t("options_weather_save")}
            </button>
          </label>
          {#if cityError}
            <p class="text-xs text-red-600">{cityError}</p>
          {:else if citySaved}
            <p class="text-xs text-emerald-600">
              {t("options_weather_save_success")}
            </p>
          {:else}
            <p class="text-xs leading-relaxed text-slate-500">
              {t("options_weather_city_hint")}
            </p>
          {/if}
        </div>

        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t("options_weather_temp_unit")}
          </span>
          <select
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            value={settings.tempUnit}
            onchange={set("tempUnit")}
          >
            <option value="celsius">{t("options_weather_celsius")}</option>
            <option value="fahrenheit">{t("options_weather_fahrenheit")}</option
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
        {t("options_time_section")}
      </h2>

      <label class="flex items-center justify-between gap-4">
        <span class="text-sm text-slate-700">
          {t("options_hour_system")}
        </span>
        <select
          class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          value={settings.hourSystem}
          onchange={set("hourSystem")}
        >
          <option value="12">{t("options_hour_12")}</option>
          <option value="24">{t("options_hour_24")}</option>
        </select>
      </label>
    </section>

    <!-- Zen mode: behavior & accessories. Distinct from the Display
         section, which only governs whether the launcher button shows. -->
    <section
      class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2
        class="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <span aria-hidden="true">🧘</span>
        {t("options_zen_section")}
      </h2>

      <div class="space-y-3">
        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">{t("options_zen_music")}</span>
          <input
            type="checkbox"
            class="h-4 w-4 cursor-pointer accent-blue-600"
            checked={settings.zenMusic}
            onchange={set("zenMusic")}
          />
        </label>

        <label class="flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t("options_zen_breathing")}
          </span>
          <select
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            value={settings.zenBreathingPattern}
            onchange={set("zenBreathingPattern")}
          >
            <option value="off">{t("options_zen_breathing_off")}</option>
            <option value="coherent">
              {t("options_zen_breathing_coherent")}
            </option>
            <option value="box">{t("options_zen_breathing_box")}</option>
            <option value="478">{t("options_zen_breathing_478")}</option>
            <option value="extended">
              {t("options_zen_breathing_extended")}
            </option>
          </select>
        </label>

        <!-- Reminder: toggle + minutes-input pair. Input only appears
             when toggle is on; flipping the toggle on with no value
             yet seeds a sensible default so the user isn't staring
             at a "0 minutes" reminder. -->
        <div class="space-y-2">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-slate-700">
              {t("options_zen_reminder")}
            </span>
            <input
              type="checkbox"
              class="h-4 w-4 cursor-pointer accent-blue-600"
              checked={settings.zenReminderEnabled}
              onchange={(e) => {
                const on = e.currentTarget.checked;
                updateSetting("zenReminderEnabled", on);
                if (on && (!settings.zenReminderMinutes ||
                  settings.zenReminderMinutes < 1)) {
                  updateSetting("zenReminderMinutes", 60);
                }
              }}
            />
          </label>
          {#if settings.zenReminderEnabled}
            <div class="flex items-center justify-end gap-2">
              {#if t("options_zen_reminder_prefix")}
                <span class="text-sm text-slate-500">
                  {t("options_zen_reminder_prefix")}
                </span>
              {/if}
              <input
                type="number"
                min="1"
                max="999"
                step="1"
                class="w-20 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-right text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                value={settings.zenReminderMinutes}
                onchange={(e) => {
                  const v = Math.max(
                    1,
                    Math.min(999, Math.floor(Number(e.currentTarget.value) || 1)),
                  );
                  updateSetting("zenReminderMinutes", v);
                  e.currentTarget.value = String(v);
                }}
              />
              <span class="text-sm text-slate-500">
                {t("options_zen_reminder_suffix")}
              </span>
            </div>
          {/if}
        </div>

        <div class="space-y-2">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-slate-700">
              {t("options_zen_auto_exit")}
            </span>
            <input
              type="checkbox"
              class="h-4 w-4 cursor-pointer accent-blue-600"
              checked={settings.zenAutoExitEnabled}
              onchange={(e) => {
                const on = e.currentTarget.checked;
                updateSetting("zenAutoExitEnabled", on);
                if (on && (!settings.zenAutoExitMinutes ||
                  settings.zenAutoExitMinutes < 1)) {
                  updateSetting("zenAutoExitMinutes", 15);
                }
              }}
            />
          </label>
          {#if settings.zenAutoExitEnabled}
            <div class="flex items-center justify-end gap-2">
              {#if t("options_zen_autoexit_prefix")}
                <span class="text-sm text-slate-500">
                  {t("options_zen_autoexit_prefix")}
                </span>
              {/if}
              <input
                type="number"
                min="1"
                max="999"
                step="1"
                class="w-20 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-right text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                value={settings.zenAutoExitMinutes}
                onchange={(e) => {
                  const v = Math.max(
                    1,
                    Math.min(999, Math.floor(Number(e.currentTarget.value) || 1)),
                  );
                  updateSetting("zenAutoExitMinutes", v);
                  e.currentTarget.value = String(v);
                }}
              />
              <span class="text-sm text-slate-500">
                {t("options_zen_autoexit_suffix")}
              </span>
            </div>
          {/if}
        </div>
      </div>
    </section>

    <!-- Translation: only meaningful when display language is non-English -->
    {#if showTranslationCard}
      <section
        class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <h2
          class="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900"
        >
          <span aria-hidden="true">🌐</span>
          {t("options_translation_section")}
        </h2>
        <p class="mb-4 text-xs leading-relaxed text-slate-500">
          {t("options_translation_description")}
        </p>

        <label class="mb-4 flex items-center justify-between gap-4">
          <span class="text-sm text-slate-700">
            {t("options_translate_motto")}
          </span>
          <input
            type="checkbox"
            class="h-4 w-4 cursor-pointer accent-blue-600"
            checked={settings.translateMotto}
            onchange={onTranslateMottoToggle}
          />
        </label>

        <div class="rounded-md bg-slate-50 p-3 text-xs ring-1 ring-slate-200">
          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-500"
              >{t("options_translation_model_label")}</span
            >
            <span class="font-mono text-slate-700">en → {targetLang}</span>
          </div>
          <div class="mt-1.5 flex items-center justify-between gap-2">
            <span class="text-slate-500"
              >{t("options_translation_status_label")}</span
            >
            <span
              class="font-medium"
              class:text-emerald-600={translationStatus === "available"}
              class:text-amber-600={translationStatus === "downloadable"}
              class:text-blue-600={translationStatus === "downloading" ||
                translationStatus === "checking"}
              class:text-red-600={translationStatus === "unavailable" ||
                translationStatus === "no-api"}
            >
              {#if translationStatus === "available"}
                ✓ {t("options_translation_status_available")}
              {:else if translationStatus === "downloadable"}
                ⬇ {t("options_translation_status_downloadable")}
              {:else if translationStatus === "downloading"}
                ⏳ {t("options_translation_status_downloading")}
                {downloadProgress}%
              {:else if translationStatus === "unavailable"}
                ⚠ {t("options_translation_status_unavailable")}
              {:else if translationStatus === "no-api"}
                ⚠ {t("options_translation_status_no_api")}
              {:else}
                {t("options_translation_status_checking")}
              {/if}
            </span>
          </div>

          {#if translationStatus === "downloadable"}
            <button
              type="button"
              onclick={onDownloadModel}
              class="mt-3 w-full cursor-pointer rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            >
              {t("options_translation_download_button")}
            </button>
          {/if}
        </div>
      </section>
    {/if}

    <!-- Donate: permanent, always visible, intentionally a touch fancier
         than the regular cards. -->
    <section
      class="mb-5 overflow-hidden rounded-xl bg-linear-to-br from-pink-50 via-rose-50 to-amber-50 p-7 shadow-sm ring-1 ring-rose-100"
    >
      <div class="flex flex-col items-center text-center">
        <div
          class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-rose-100"
        >
          <IconHeart class="h-6 w-6 text-rose-500" />
        </div>
        <h2 class="mb-2 text-lg font-semibold text-slate-900">
          {t("donate_section")}
        </h2>
        <p class="mb-5 max-w-md text-sm leading-relaxed text-slate-600">
          {t("donate_explainer")}
        </p>
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-600 focus:ring-2 focus:ring-rose-500/40 focus:outline-none"
        >
          <IconHeart class="h-4 w-4" />
          <span>{t("donate_button")}</span>
        </a>
      </div>
    </section>

    <footer
      class="mt-8 flex flex-col items-center gap-2 text-xs text-slate-500"
    >
      <p>{t("about_created_by")}</p>
      <a
        href="https://github.com/jason5ng32/Macify"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 text-slate-500 transition hover:text-slate-800"
      >
        <IconGithub class="h-4 w-4" />
        <span>{t("about_github_link")}</span>
      </a>
    </footer>
  </div>
</main>
