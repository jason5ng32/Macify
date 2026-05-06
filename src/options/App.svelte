<script>
  import { settings } from "../lib/settings.svelte.js";
  import {
    t,
    loadLanguage,
    resolveLanguage,
  } from "../lib/i18n.svelte.js";
  import { appLangToBcp47 } from "../lib/translate.js";
  import IconGithub from "~icons/mingcute/github-line";

  import LanguageSection from "./sections/LanguageSection.svelte";
  import LocationSection from "./sections/LocationSection.svelte";
  import TimeSection from "./sections/TimeSection.svelte";
  import WeatherSection from "./sections/WeatherSection.svelte";
  import DisplaySection from "./sections/DisplaySection.svelte";
  import VideoSection from "./sections/VideoSection.svelte";
  import ZenSection from "./sections/ZenSection.svelte";
  import TranslationSection from "./sections/TranslationSection.svelte";
  import DonateSection from "./sections/DonateSection.svelte";

  const version = chrome.runtime.getManifest().version;

  $effect(() => {
    loadLanguage(resolveLanguage(settings.userLanguage));
  });

  // City validation gates Time:Sky-Arc and Weather. LocationSection is
  // the source of truth — it validates against the geocoder and binds
  // the result back here for the dependent sections to read.
  let cityValid = $state(false);

  // Translation card only makes sense when the resolved app language
  // isn't English (no en→en translation). Re-evaluates on language
  // change so toggling languages flips the card on/off live.
  const showTranslationCard = $derived(
    appLangToBcp47(resolveLanguage(settings.userLanguage)) !== "en",
  );
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

    <LanguageSection />
    <LocationSection bind:cityValid />
    <TimeSection {cityValid} />
    <WeatherSection {cityValid} />
    <DisplaySection />
    <VideoSection />
    <ZenSection />
    {#if showTranslationCard}
      <TranslationSection />
    {/if}
    <DonateSection />

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
