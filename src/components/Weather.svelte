<script>
  import { fly } from 'svelte/transition';
  import { settings } from '../lib/settings.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import {
    getForecast,
    describeWeather,
    windDirectionLabel,
    uvLevel,
    aqiLevel,
    nextFutureTime,
    formatTimeOfDay,
  } from '../lib/weather.js';

  let forecast = $state(null);
  let hovering = $state(false);

  // Tick once a minute so the sunrise/sunset countdown stays fresh on
  // tabs that stay open for a long time. Cheap — one Date.now() write
  // per minute, only computed values inside the panel re-render.
  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => {
      now = Date.now();
    }, 60_000);
    return () => clearInterval(id);
  });

  /**
   * Format a positive duration (ms) into a localized "in 8h 32m" /
   * "8 小时 32 分钟后" style string. Returns null if the duration is
   * <= 0 (caller should skip rendering in that case).
   */
  function formatCountdown(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const totalMin = Math.floor(ms / 60_000);
    if (totalMin < 1) {
      // Less than a minute out — just show "1 min" rather than "0 min"
      // to avoid a confusing zero. Rounding up is friendlier.
      return t('weather_in_minutes').replace('{m}', '1');
    }
    if (totalMin < 60) {
      return t('weather_in_minutes').replace('{m}', String(totalMin));
    }
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return t('weather_in_hour_minutes')
      .replace('{h}', String(h))
      .replace('{m}', String(m));
  }

  // getForecast caches to chrome.storage.local with 30min TTL keyed by
  // city + tempUnit, so opening many tabs in a 30min window doesn't
  // hit the network. On cache hit the await resolves on the next
  // microtask, fast enough that the user never sees an empty state.
  $effect(() => {
    if (!settings.showWeather || !settings.city?.trim()) {
      forecast = null;
      return;
    }
    const city = settings.city;
    const tempUnit = settings.tempUnit;
    getForecast({ city, tempUnit })
      .then((data) => {
        forecast = data;
      })
      .catch((e) => {
        // Silent failure — don't render anything rather than show an
        // error chip the user could mistake for a real problem.
        console.error('Weather load failed:', e);
        forecast = null;
      });
  });

  function formatTemp(value) {
    return value == null ? '—' : `${value}°`;
  }

  const upcomingLabels = ['weather_tomorrow', 'weather_day_after'];
</script>

{#if settings.showWeather && forecast}
  {@const today = forecast.daily?.[0]}
  {@const upcoming = forecast.daily?.slice(1) ?? []}
  {@const air = forecast.airQuality}
  {@const showAir = air && (air.aqi != null || air.pm25 != null)}
  <!-- Next sunrise/sunset across today + tomorrow + day-after. We never
       show a stale (past) one — at 9pm "next sunrise" is tomorrow's.
       Cells are sorted by ISO time so the soonest event is on the left. -->
  {@const allSunrises = forecast.daily?.map((d) => d.sunrise) ?? []}
  {@const allSunsets = forecast.daily?.map((d) => d.sunset) ?? []}
  {@const nextSunrise = nextFutureTime(allSunrises, now)}
  {@const nextSunset = nextFutureTime(allSunsets, now)}
  {@const sunEvents = [
    nextSunrise && {
      kind: 'sunrise',
      icon: '🌅',
      labelKey: 'weather_sunrise',
      iso: nextSunrise,
      ts: new Date(nextSunrise).getTime(),
    },
    nextSunset && {
      kind: 'sunset',
      icon: '🌇',
      labelKey: 'weather_sunset',
      iso: nextSunset,
      ts: new Date(nextSunset).getTime(),
    },
  ].filter(Boolean).sort((a, b) => a.ts - b.ts)}
  {@const showSun = sunEvents.length > 0}

  <div
    class="weather"
    role="region"
    aria-label="Weather"
    onmouseenter={() => (hovering = true)}
    onmouseleave={() => (hovering = false)}
  >
    <!-- Region: 当时 (always visible, never inside panel) -->
    <div class="now">
      <span class="now-icon" aria-hidden="true"
        >{describeWeather(forecast.current.weatherCode).icon}</span
      >
      <span class="now-temp">{formatTemp(forecast.current.temperature)}</span>
    </div>
    {#if forecast.current.feelsLike != null}
      <div class="now-feels">
        {t('weather_feels_like')} {forecast.current.feelsLike}°
      </div>
    {/if}

    {#if hovering}
      <div
        class="absolute top-full right-0 w-[300px] rounded-[10px] border border-white/[0.14] bg-black/40 p-4 text-sm text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
        role="tooltip"
        transition:fly={{ x: 30, opacity: 0, duration: 240 }}
      >
        <div class="location">{forecast.location}</div>

        <!-- Region: 当天 -->
        {#if today}
          <section class="region">
            <h3 class="region-title">{t('weather_today')}</h3>

            <div class="today-summary">
              <span class="today-icon" aria-hidden="true"
                >{describeWeather(today.weatherCode).icon}</span
              >
              <span class="today-temp"
                >{formatTemp(today.min)} / {formatTemp(today.max)}</span
              >
            </div>

            <div class="today-details">
              {#if today.precipProbability != null}
                <div class="detail">
                  <span class="detail-icon" aria-hidden="true">💧</span>
                  <span class="detail-label">{t('weather_precip')}</span>
                  <span class="detail-value">{today.precipProbability}%</span>
                </div>
              {/if}

              {#if today.windSpeed != null}
                <div class="detail">
                  <span class="detail-icon" aria-hidden="true">💨</span>
                  <span class="detail-label">{t('weather_wind')}</span>
                  <span class="detail-value"
                    >{today.windSpeed} km/h{#if windDirectionLabel(today.windDirection)}
                      · {windDirectionLabel(today.windDirection)}{/if}</span
                  >
                </div>
              {/if}

              {#if today.uvIndex != null}
                {@const lvl = uvLevel(today.uvIndex)}
                <div class="detail">
                  <span class="detail-icon" aria-hidden="true">☀️</span>
                  <span class="detail-label">{t('weather_uv')}</span>
                  <span class="detail-value"
                    >{today.uvIndex}{#if lvl} · {t(`weather_uv_${lvl}`)}{/if}</span
                  >
                </div>
              {/if}

              {#if showAir}
              {@const lvl = aqiLevel(air.aqi)}
              <div class="detail">
                <span class="detail-icon" aria-hidden="true">🌫</span>
                <span class="detail-label">{t('weather_air_quality')}</span>
                <span class="detail-value">
                  {#if air.aqi != null}AQI {air.aqi}{#if lvl}
                      · {t(`weather_aqi_${lvl}`)}{/if}{/if}{#if air.aqi != null && air.pm25 != null}
                    ·
                  {/if}{#if air.pm25 != null}PM2.5 {air.pm25}{/if}
                </span>
              </div>
            {/if}
            </div>
          </section>
        {/if}

        <!-- Region: 日出日落 (next occurrence + minute-precision countdown).
             Cells render in chronological order: soonest event on the left. -->
        {#if showSun}
          <section class="region">
            <h3 class="region-title">{t('weather_section_sun')}</h3>
            <div class="sun-grid">
              {#each sunEvents as event (event.kind)}
                {@const countdown = formatCountdown(event.ts - now)}
                <div class="sun-cell">
                  <div class="sun-icon" aria-hidden="true">{event.icon}</div>
                  <div class="sun-label">{t(event.labelKey)}</div>
                  <div class="sun-time">
                    {formatTimeOfDay(event.iso, {
                      hour12: settings.hourSystem === '12',
                    })}
                  </div>
                  {#if countdown}
                    <div class="sun-countdown">{countdown}</div>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Region: 未来 -->
        {#if upcoming.length > 0}
          <section class="region">
            <h3 class="region-title">{t('weather_upcoming')}</h3>
            <div class="days">
              {#each upcoming as day, i}
                <div class="day">
                  <span class="day-label"
                    >{t(upcomingLabels[i] ?? 'weather_day_after')}</span
                  >
                  <span class="day-icon" aria-hidden="true"
                    >{describeWeather(day.weatherCode).icon}</span
                  >
                  <span class="day-temp"
                    >{formatTemp(day.min)} / {formatTemp(day.max)}</span
                  >
                  {#if day.precipProbability != null}
                    <span class="day-precip">💧{day.precipProbability}%</span>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .weather {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    /* 16px invisible padding bridges the visual gap between the temp
       and the panel, so cursor traversal doesn't fire mouseleave. */
    padding-bottom: 16px;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    z-index: 50;
    user-select: none;
  }
  .now {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 1.5rem;
    cursor: default;
  }
  .now-icon {
    font-size: 1.5rem;
    line-height: 1;
  }
  .now-temp {
    font-weight: 300;
  }
  .now-feels {
    font-size: 0.75rem;
    opacity: 0.75;
    text-align: right;
    margin-top: 0.1rem;
  }

  .location {
    font-size: 0.75rem;
    opacity: 0.6;
    margin-bottom: 0.65rem;
  }

  .region + .region {
    margin-top: 0.85rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255, 255, 255, 0.13);
  }
  .region-title {
    margin: 0 0 0.6rem;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.55;
  }

  .today-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    margin-bottom: 0.55rem;
  }
  .today-icon {
    font-size: 1.1rem;
  }
  .today-temp {
    font-variant-numeric: tabular-nums;
  }
  .today-details {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .detail {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }
  .detail-icon {
    width: 1.25rem;
    text-align: center;
  }
  .detail-label {
    flex: 1;
    opacity: 0.75;
  }
  .detail-value {
    font-variant-numeric: tabular-nums;
  }
  /* Sun region: two centered cells side-by-side with a soft warm tint.
     Tighter visual weight than the today details — designed to read
     like a small almanac block, in keeping with the screensaver vibe. */
  .sun-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .sun-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.55rem 0.4rem;
    border-radius: 8px;
    background: linear-gradient(
      180deg,
      rgba(255, 220, 180, 0.07),
      rgba(255, 180, 130, 0.04)
    );
    border: 1px solid rgba(255, 200, 160, 0.1);
  }
  .sun-icon {
    font-size: 1.2rem;
    line-height: 1;
    margin-bottom: 0.1rem;
  }
  .sun-label {
    font-size: 0.65rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.6;
  }
  .sun-time {
    font-size: 1rem;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    margin-top: 0.05rem;
  }
  .sun-countdown {
    font-size: 0.7rem;
    opacity: 0.7;
    font-variant-numeric: tabular-nums;
  }

  .days {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .day {
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    align-items: center;
    gap: 0.5rem;
    padding: 0.15rem 0;
    font-size: 0.85rem;
  }
  .day-label {
    opacity: 0.85;
  }
  .day-temp {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .day-precip {
    font-size: 0.75rem;
    opacity: 0.7;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
