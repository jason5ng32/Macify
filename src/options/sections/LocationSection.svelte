<script>
  import { settings, updateSetting } from '../../lib/settings.svelte.js';
  import { t } from '../../lib/i18n.svelte.js';
  import { geocodeCity } from '../../lib/weather.js';
  import SettingsCard from './SettingsCard.svelte';

  // The city the rest of the app uses to find the user. Validated via
  // the geocoder before saving — this section is also the single
  // gatekeeper that decides whether downstream features (Time:Sky Arc,
  // Weather) are usable. The truth flows up via $bindable so the
  // parent page can show locked states without re-implementing the
  // validation here.
  let { cityValid = $bindable(false) } = $props();

  let cityDraft = $state(settings.city);
  let validating = $state(false);
  let error = $state('');
  let saved = $state(false);
  let savedTimer = null;

  // Sync the draft with the saved setting when not actively editing.
  // This handles two cases: initial mount, and external changes (e.g.,
  // settings imported / synced across devices).
  $effect(() => {
    if (!validating) cityDraft = settings.city;
  });

  // Passive validation on mount and whenever the saved city changes.
  // geocodeCity hits an in-memory cache before the network, so this is
  // free for the common case (no city change since last validation).
  $effect(() => {
    const city = settings.city?.trim();
    if (!city) {
      cityValid = false;
      return;
    }
    geocodeCity(city)
      .then(() => (cityValid = true))
      .catch(() => (cityValid = false));
  });

  async function onValidate() {
    const value = cityDraft.trim();
    error = '';
    saved = false;
    if (!value) {
      error = t('options_weather_city_required');
      return;
    }
    validating = true;
    try {
      await geocodeCity(value);
      await updateSetting('city', value);
      cityValid = true;
      saved = true;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => (saved = false), 2000);
    } catch (e) {
      console.error('City validation failed:', e);
      error = t('options_weather_city_invalid');
      cityValid = false;
    } finally {
      validating = false;
    }
  }

  function onKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onValidate();
    }
  }
</script>

<SettingsCard
  emoji="📍"
  title={t('options_location_section')}
  description={t('options_location_hint')}
>
  <div class="space-y-1.5">
    <label class="flex items-center gap-3">
      <span class="text-sm whitespace-nowrap text-slate-700">
        {t('options_weather_city')}
      </span>
      <input
        type="text"
        class="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        value={cityDraft}
        oninput={(e) => (cityDraft = e.currentTarget.value)}
        onkeydown={onKeydown}
        placeholder={t('options_weather_city_placeholder')}
      />
      <button
        type="button"
        onclick={onValidate}
        disabled={validating}
        class="cursor-pointer rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {validating
          ? t('options_weather_save_loading')
          : t('options_weather_save')}
      </button>
    </label>
    {#if error}
      <p class="text-xs text-red-600">{error}</p>
    {:else if saved}
      <p class="text-xs text-emerald-600">
        {t('options_weather_save_success')}
      </p>
    {:else}
      <p class="text-xs leading-relaxed text-slate-500">
        {t('options_weather_city_hint')}
      </p>
    {/if}
  </div>
</SettingsCard>
