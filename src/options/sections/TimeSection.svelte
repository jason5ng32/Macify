<script>
  import { settings, bindSetting } from '../../lib/settings.svelte.js';
  import { t } from '../../lib/i18n.svelte.js';
  import SettingsCard from './SettingsCard.svelte';

  // 'sky-arc' depends on a validated city; if the user hasn't set one
  // we still let them see the option but disable it and explain why,
  // so the relationship is discoverable rather than mysterious.
  let { cityValid = false } = $props();

  const skyArcAvailable = $derived(cityValid);

  // If the user is currently on sky-arc but the city becomes invalid
  // (e.g., they cleared it), fall back to clock so the launcher
  // doesn't render an empty SkyArc.
  $effect(() => {
    if (settings.timeDisplay === 'sky-arc' && !skyArcAvailable) {
      // No automatic write here — let the user see what's happening
      // and decide. The hint below the select explains the state.
    }
  });
</script>

<SettingsCard emoji="🕒" title={t('options_time_section')}>
  <div class="space-y-3">
    <label class="flex items-center justify-between gap-4">
      <span class="text-sm text-slate-700">
        {t('options_time_display_label')}
      </span>
      <select
        class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        value={settings.timeDisplay}
        onchange={bindSetting('timeDisplay')}
      >
        <option value="off">{t('options_time_display_off')}</option>
        <option value="clock">{t('options_time_display_clock')}</option>
        <option value="sky-arc" disabled={!skyArcAvailable}>
          {t('options_time_display_sky_arc')}
        </option>
      </select>
    </label>


    {#if settings.timeDisplay !== 'off'}
      <label class="flex items-center justify-between gap-4">
        <span class="text-sm text-slate-700">
          {t('options_hour_system')}
        </span>
        <select
          class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          value={settings.hourSystem}
          onchange={bindSetting('hourSystem')}
        >
          <option value="12">{t('options_hour_12')}</option>
          <option value="24">{t('options_hour_24')}</option>
        </select>
      </label>
    {/if}


    {#if !skyArcAvailable}
      <p
        class="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200"
      >
        {t('options_sky_arc_needs_city')}
      </p>
    {/if}

    {#if settings.timeDisplay === 'sky-arc' && skyArcAvailable}
      <p
        class="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200"
      >
        {t('options_sky_arc_time_zone')}
      </p>
    {/if}
  </div>
</SettingsCard>
