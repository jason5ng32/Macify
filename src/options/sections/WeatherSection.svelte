<script>
  import { settings, bindSetting } from '../../lib/settings.svelte.js';
  import { t } from '../../lib/i18n.svelte.js';
  import SettingsCard from './SettingsCard.svelte';

  // Weather needs a validated city for the geocoded lat/lng. The
  // toggle stays clickable when no city is set so users can see the
  // intent — but flipping it on without a city would just produce a
  // silently-empty card, so we lock it instead and explain.
  let { cityValid = false } = $props();
</script>

<SettingsCard emoji="🌤️" title={t('options_weather_section')}>
  <div class="space-y-3">
    <label class="flex items-center justify-between gap-4">
      <span class="text-sm text-slate-700">
        {t('options_show_weather_short')}
      </span>
      <input
        type="checkbox"
        class="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        checked={settings.showWeather}
        disabled={!cityValid}
        onchange={bindSetting('showWeather')}
      />
    </label>



    <label class="flex items-center justify-between gap-4">
      <span class="text-sm text-slate-700">
        {t('options_weather_temp_unit')}
      </span>
      <select
        class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        value={settings.tempUnit}
        onchange={bindSetting('tempUnit')}
      >
        <option value="celsius">{t('options_weather_celsius')}</option>
        <option value="fahrenheit">{t('options_weather_fahrenheit')}</option>
      </select>
    </label>

    {#if !cityValid}
    <p
      class="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200"
    >
      {t('options_weather_needs_city')}
    </p>
  {/if}
  </div>
</SettingsCard>
