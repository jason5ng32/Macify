<script>
  import { settings, bindSetting } from '../../lib/settings.svelte.js';
  import { t } from '../../lib/i18n.svelte.js';
  import SettingsCard from './SettingsCard.svelte';

  // Visibility toggles for elements that don't have their own
  // dedicated section. Time and Weather have richer UI elsewhere; this
  // grid is only for plain on/off chrome decisions.
  const toggles = [
    { key: 'showMotto', label: 'options_show_motto_short' },
    { key: 'showTopSites', label: 'options_show_topsites_short' },
    { key: 'showZenMode', label: 'options_show_zen_short' },
    { key: 'refreshButton', label: 'options_show_refresh_short' },
    { key: 'showVideoMetadata', label: 'options_show_video_meta_short' },
  ];
</script>

<SettingsCard
  emoji="👁️"
  title={t('options_display_section')}
  description={t('options_display_hint')}
>
  <div class="grid grid-cols-2 gap-x-6 gap-y-2">
    {#each toggles as toggle (toggle.key)}
      <label
        class="flex items-center justify-between gap-3 py-1 text-sm text-slate-700"
      >
        <span>{t(toggle.label)}</span>
        <input
          type="checkbox"
          class="h-4 w-4 cursor-pointer accent-blue-600"
          checked={settings[toggle.key]}
          onchange={bindSetting(toggle.key)}
        />
      </label>
    {/each}
  </div>
</SettingsCard>
