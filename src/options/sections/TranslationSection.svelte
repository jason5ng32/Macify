<script>
  import { settings, updateSetting } from '../../lib/settings.svelte.js';
  import { t, resolveLanguage } from '../../lib/i18n.svelte.js';
  import {
    prepareTranslator,
    appLangToBcp47,
    getAvailability,
  } from '../../lib/translate.js';
  import SettingsCard from './SettingsCard.svelte';

  // Whether the section renders at all is decided by the parent — we
  // assume here that the resolved language is non-English. The card
  // itself manages the model availability check / download flow.
  const targetLang = $derived(
    appLangToBcp47(resolveLanguage(settings.userLanguage)),
  );

  let translationStatus = $state('checking');
  let downloadProgress = $state(0);

  $effect(() => {
    translationStatus = 'checking';
    downloadProgress = 0;
    getAvailability(targetLang).then((s) => {
      translationStatus = s;
    });
  });

  // Download is gesture-eligible — driven by either the explicit
  // download button or by toggling the translate-motto setting on
  // when the model is missing.
  function onDownloadModel() {
    translationStatus = 'downloading';
    downloadProgress = 0;
    const lang = targetLang;
    const promise = prepareTranslator(lang, (pct) => {
      downloadProgress = pct;
    });
    if (!promise) {
      translationStatus = 'unavailable';
      return;
    }
    promise.then((instance) => {
      if (!instance) {
        translationStatus = 'unavailable';
        return;
      }
      // Re-query to confirm the model really landed.
      getAvailability(lang).then((s) => (translationStatus = s));
    });
  }

  function onTranslateMottoToggle(event) {
    const enabled = event.currentTarget.checked;
    if (enabled && targetLang !== 'en') {
      // Toggling on counts as the gesture that authorizes the
      // download (Chrome's Translator API requires a user gesture).
      if (
        translationStatus === 'downloadable' ||
        translationStatus === 'unavailable'
      ) {
        onDownloadModel();
      } else {
        prepareTranslator(targetLang);
      }
    }
    updateSetting('translateMotto', enabled);
  }
</script>

<SettingsCard
  emoji="🌐"
  title={t('options_translation_section')}
  description={t('options_translation_description')}
>
  <label class="mb-4 flex items-center justify-between gap-4">
    <span class="text-sm text-slate-700">
      {t('options_translate_motto')}
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
      <span class="text-slate-500">
        {t('options_translation_model_label')}
      </span>
      <span class="font-mono text-slate-700">en → {targetLang}</span>
    </div>
    <div class="mt-1.5 flex items-center justify-between gap-2">
      <span class="text-slate-500">
        {t('options_translation_status_label')}
      </span>
      <span
        class="font-medium"
        class:text-emerald-600={translationStatus === 'available'}
        class:text-amber-600={translationStatus === 'downloadable'}
        class:text-blue-600={translationStatus === 'downloading' ||
          translationStatus === 'checking'}
        class:text-red-600={translationStatus === 'unavailable' ||
          translationStatus === 'no-api'}
      >
        {#if translationStatus === 'available'}
          ✓ {t('options_translation_status_available')}
        {:else if translationStatus === 'downloadable'}
          ⬇ {t('options_translation_status_downloadable')}
        {:else if translationStatus === 'downloading'}
          ⏳ {t('options_translation_status_downloading')}
          {downloadProgress}%
        {:else if translationStatus === 'unavailable'}
          ⚠ {t('options_translation_status_unavailable')}
        {:else if translationStatus === 'no-api'}
          ⚠ {t('options_translation_status_no_api')}
        {:else}
          {t('options_translation_status_checking')}
        {/if}
      </span>
    </div>

    {#if translationStatus === 'downloadable'}
      <button
        type="button"
        onclick={onDownloadModel}
        class="mt-3 w-full cursor-pointer rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
      >
        {t('options_translation_download_button')}
      </button>
    {/if}
  </div>
</SettingsCard>
