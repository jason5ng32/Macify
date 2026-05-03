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
    isFutureTime,
    formatTimeOfDay,
  } from '../lib/weather.js';

  let forecast = $state(null);
  let hovering = $state(false);

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
  {@const showSunrise = today && isFutureTime(today.sunrise)}
  {@const showSunset = today && isFutureTime(today.sunset)}
  {@const air = forecast.airQuality}
  {@const showAir = air && (air.aqi != null || air.pm25 != null)}

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

              {#if showSunrise}
                <div class="detail">
                  <span class="detail-icon" aria-hidden="true">🌅</span>
                  <span class="detail-label">{t('weather_sunrise')}</span>
                  <span class="detail-value"
                    >{formatTimeOfDay(today.sunrise)}</span
                  >
                </div>
              {/if}
              {#if showSunset}
                <div class="detail">
                  <span class="detail-icon" aria-hidden="true">🌇</span>
                  <span class="detail-label">{t('weather_sunset')}</span>
                  <span class="detail-value"
                    >{formatTimeOfDay(today.sunset)}</span
                  >
                </div>
              {/if}


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
