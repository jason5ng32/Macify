<script>
  import { settings, bindSetting } from '../../lib/settings.svelte.js';
  import { SUPPORTED_LANGUAGES, t } from '../../lib/i18n.svelte.js';
  import SettingsCard from './SettingsCard.svelte';

  // 'auto' tracks the browser; explicit codes pin a language.
  const languageOptions = ['auto', ...SUPPORTED_LANGUAGES];
</script>

<SettingsCard emoji="🔤" title={t('options_language_section')}>
  <label class="flex items-center justify-between gap-4">
    <span class="text-sm text-slate-700">{t('options_language_label')}</span>
    <select
      class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
      value={settings.userLanguage}
      onchange={bindSetting('userLanguage')}
    >
      {#each languageOptions as code (code)}
        <option value={code}>{t(`options_language_${code}`)}</option>
      {/each}
    </select>
  </label>
</SettingsCard>
