<script>
  import { settings, updateSetting, bindSetting } from '../../lib/settings.svelte.js';
  import { t } from '../../lib/i18n.svelte.js';
  import SettingsCard from './SettingsCard.svelte';

  // Clamp a free-form minutes input to [1, 999] integer. Both reminder
  // and auto-exit use this — same constraint, same UI shape.
  function clampMinutes(raw) {
    return Math.max(1, Math.min(999, Math.floor(Number(raw) || 1)));
  }

  // Toggle handler that also seeds a sensible default when the user
  // first enables the feature, so they never see "0 minutes".
  function onToggleWithDefault(toggleKey, minutesKey, fallback) {
    return (event) => {
      const on = event.currentTarget.checked;
      updateSetting(toggleKey, on);
      if (on && (!settings[minutesKey] || settings[minutesKey] < 1)) {
        updateSetting(minutesKey, fallback);
      }
    };
  }

  function onMinutesChange(key) {
    return (event) => {
      const v = clampMinutes(event.currentTarget.value);
      updateSetting(key, v);
      event.currentTarget.value = String(v);
    };
  }
</script>

<SettingsCard emoji="🧘" title={t('options_zen_section')}>
  <div class="space-y-3">
    <label class="flex items-center justify-between gap-4">
      <span class="text-sm text-slate-700">{t('options_zen_music')}</span>
      <input
        type="checkbox"
        class="h-4 w-4 cursor-pointer accent-blue-600"
        checked={settings.zenMusic}
        onchange={bindSetting('zenMusic')}
      />
    </label>

    <label class="flex items-center justify-between gap-4">
      <span class="text-sm text-slate-700">
        {t('options_zen_breathing')}
      </span>
      <select
        class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        value={settings.zenBreathingPattern}
        onchange={bindSetting('zenBreathingPattern')}
      >
        <option value="off">{t('options_zen_breathing_off')}</option>
        <option value="coherent">{t('options_zen_breathing_coherent')}</option>
        <option value="box">{t('options_zen_breathing_box')}</option>
        <option value="478">{t('options_zen_breathing_478')}</option>
        <option value="extended">{t('options_zen_breathing_extended')}</option>
      </select>
    </label>

    <!-- Reminder: toggle + minutes-input pair. Input only appears when
         toggle is on; flipping the toggle on with no value yet seeds
         a sensible default so the user isn't staring at "0 minutes". -->
    <div class="space-y-2">
      <label class="flex items-center justify-between gap-4">
        <span class="text-sm text-slate-700">
          {t('options_zen_reminder')}
        </span>
        <input
          type="checkbox"
          class="h-4 w-4 cursor-pointer accent-blue-600"
          checked={settings.zenReminderEnabled}
          onchange={onToggleWithDefault('zenReminderEnabled', 'zenReminderMinutes', 60)}
        />
      </label>
      {#if settings.zenReminderEnabled}
        <div class="flex items-center justify-end gap-2">
          {#if t('options_zen_reminder_prefix')}
            <span class="text-sm text-slate-500">
              {t('options_zen_reminder_prefix')}
            </span>
          {/if}
          <input
            type="number"
            min="1"
            max="999"
            step="1"
            class="w-20 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-right text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            value={settings.zenReminderMinutes}
            onchange={onMinutesChange('zenReminderMinutes')}
          />
          <span class="text-sm text-slate-500">
            {t('options_zen_reminder_suffix')}
          </span>
        </div>
      {/if}
    </div>

    <div class="space-y-2">
      <label class="flex items-center justify-between gap-4">
        <span class="text-sm text-slate-700">
          {t('options_zen_auto_exit')}
        </span>
        <input
          type="checkbox"
          class="h-4 w-4 cursor-pointer accent-blue-600"
          checked={settings.zenAutoExitEnabled}
          onchange={onToggleWithDefault('zenAutoExitEnabled', 'zenAutoExitMinutes', 15)}
        />
      </label>
      {#if settings.zenAutoExitEnabled}
        <div class="flex items-center justify-end gap-2">
          {#if t('options_zen_autoexit_prefix')}
            <span class="text-sm text-slate-500">
              {t('options_zen_autoexit_prefix')}
            </span>
          {/if}
          <input
            type="number"
            min="1"
            max="999"
            step="1"
            class="w-20 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-right text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            value={settings.zenAutoExitMinutes}
            onchange={onMinutesChange('zenAutoExitMinutes')}
          />
          <span class="text-sm text-slate-500">
            {t('options_zen_autoexit_suffix')}
          </span>
        </div>
      {/if}
    </div>
  </div>
</SettingsCard>
