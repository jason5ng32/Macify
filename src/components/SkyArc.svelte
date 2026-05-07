<script>
  import { settings } from '../lib/settings.svelte.js';
  import { getForecast, formatTimeOfDay } from '../lib/weather.js';
  import {
    sunAltitudeDeg,
    moonAltitudeDeg,
    getSunTimes,
    getMoonTimes,
  } from '../lib/sky.js';

  let forecast = $state(null);
  let now = $state(new Date());
  let hovering = $state(false);

  // Tick once a minute. Solar/lunar altitudes drift slowly enough that
  // sub-minute resolution would be wasted work.
  $effect(() => {
    const id = setInterval(() => {
      now = new Date();
    }, 60_000);
    return () => clearInterval(id);
  });

  $effect(() => {
    // Only fetch when this mode is actually selected and a city is
    // set. Both gates matter: skipping the fetch when not selected
    // avoids wasted bandwidth, and skipping when no city is set keeps
    // SkyArc cleanly hidden until the user has supplied location.
    if (settings.timeDisplay !== 'sky-arc' || !settings.city?.trim()) {
      forecast = null;
      return;
    }
    getForecast({ city: settings.city, tempUnit: settings.tempUnit })
      .then((d) => (forecast = d))
      .catch((e) => {
        console.warn('SkyArc: forecast load failed:', e);
        forecast = null;
      });
  });

  // === Layout ===
  // SVG is symmetric around the horizon: equal headroom for day (above)
  // and night (below) so the moon's deep-night dips at high latitudes
  // never clip off the bottom edge.
  const W = 320;
  const H = 120;
  const HORIZON_Y = 60;
  const DEG_TO_PX = 60 / 90; // ±90° fills the full half exactly

  function altToY(alt) {
    return HORIZON_Y - alt * DEG_TO_PX;
  }

  // City wall-clock offset in milliseconds (e.g., +3_600_000 for BST).
  // Drives both the chart's day boundaries and how every time label
  // (now, sunrise/sunset, moonrise/moonset) is rendered, so a user
  // viewing a city in a different timezone sees the city's wall clock
  // — not their browser's.
  const offsetMs = $derived(
    (forecast?.geo?.utcOffsetSeconds ?? 0) * 1000,
  );

  function fmt(date) {
    return formatTimeOfDay(date.toISOString(), {
      hour12: settings.hourSystem === '12',
      offsetMs,
    });
  }

  // Anchor labels so they don't overflow the SVG edges.
  function labelAnchor(x) {
    if (x < 22) return 'start';
    if (x > W - 22) return 'end';
    return 'middle';
  }

  // === Curves & crossings (re-derived when forecast or `now` changes) ===
  const curves = $derived.by(() => {
    if (!forecast?.geo?.lat || forecast?.geo?.lng == null) return null;
    const { lat, lng } = forecast.geo;
    const dayMs = 86_400_000;

    // City's "today" midnight as a real UTC instant.
    // The fake-UTC trick: `new Date(now + offsetMs)` is a Date whose
    // UTC fields equal the city's wall-clock components. We strip to
    // midnight in those fields, then subtract the offset to get the
    // real UTC moment when the city's calendar day began. With this
    // anchor, x=0 is city midnight and x=W is the next city midnight,
    // so a sky-arc viewer reading "10:00" near sunrise on the chart
    // sees London at 10:00 — not their own JST 18:00.
    const cityNowWall = new Date(now.getTime() + offsetMs);
    const cityMidnightWall = new Date(cityNowWall);
    cityMidnightWall.setUTCHours(0, 0, 0, 0);
    const dayStartMs = cityMidnightWall.getTime() - offsetMs;

    // 144 segments = every 10 min. Smooth enough at 320px wide.
    const segments = 144;
    const sunPts = [];
    const moonPts = [];
    for (let i = 0; i <= segments; i++) {
      const t = new Date(dayStartMs + (i / segments) * dayMs);
      const x = (i / segments) * W;
      sunPts.push(`${x.toFixed(1)},${altToY(sunAltitudeDeg(t, lat, lng)).toFixed(1)}`);
      moonPts.push(`${x.toFixed(1)},${altToY(moonAltitudeDeg(t, lat, lng)).toFixed(1)}`);
    }

    // Crossings come straight from suncalc — same source the Weather
    // card uses, so the times match to the second. Pass the city's
    // local noon so suncalc returns rise/set for the city's calendar
    // day (rather than the browser's, which can differ across the
    // dateline).
    const cityNoonForLookup = new Date(dayStartMs + dayMs / 2);
    const inToday = (d) =>
      d != null &&
      d.getTime() >= dayStartMs &&
      d.getTime() < dayStartMs + dayMs;
    const toCrossing = (date, type) => ({
      time: date,
      type,
      x: ((date.getTime() - dayStartMs) / dayMs) * W,
    });

    const sunT = getSunTimes(cityNoonForLookup, lat, lng);
    const sunCrossings = [];
    if (inToday(sunT.sunrise)) sunCrossings.push(toCrossing(sunT.sunrise, 'rise'));
    if (inToday(sunT.sunset)) sunCrossings.push(toCrossing(sunT.sunset, 'set'));

    const moonT = getMoonTimes(cityNoonForLookup, lat, lng);
    const moonCrossings = [];
    if (inToday(moonT.rise)) moonCrossings.push(toCrossing(moonT.rise, 'rise'));
    if (inToday(moonT.set)) moonCrossings.push(toCrossing(moonT.set, 'set'));

    const cx = ((now.getTime() - dayStartMs) / dayMs) * W;
    const sunY = altToY(sunAltitudeDeg(now, lat, lng));
    const moonY = altToY(moonAltitudeDeg(now, lat, lng));

    return {
      sunPath: 'M ' + sunPts.join(' L '),
      moonPath: 'M ' + moonPts.join(' L '),
      cx,
      sunY,
      moonY,
      sunCrossings,
      moonCrossings,
    };
  });
</script>

{#if settings.timeDisplay === 'sky-arc' && curves}
  <div
    class="sky-arc"
    onmouseenter={() => (hovering = true)}
    onmouseleave={() => (hovering = false)}
    role="img"
    aria-label="Sun and moon trajectory"
  >
    <svg viewBox="0 0 {W} {H}" class="block w-full">
      <defs>
        <!-- Clip the band fills to above the horizon so they don't
             bleed into the night side. The mental model is "the body
             is visible in the sky" — once the sun or moon dips below
             the horizon, drawing a colored band there reads as
             misleading rather than informative. -->
        <clipPath id="sky-arc-above-horizon">
          <rect x="0" y="0" width={W} height={HORIZON_Y} />
        </clipPath>
        <linearGradient id="sky-arc-sun-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgb(255,200,100)" stop-opacity="0.30" />
          <stop offset="100%" stop-color="rgb(255,200,100)" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="sky-arc-moon-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgb(150,180,240)" stop-opacity="0.22" />
          <stop offset="100%" stop-color="rgb(150,180,240)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Day band (sun curve closed back to the horizon) -->
      <path
        d="{curves.sunPath} L {W},{HORIZON_Y} L 0,{HORIZON_Y} Z"
        fill="url(#sky-arc-sun-fill)"
        clip-path="url(#sky-arc-above-horizon)"
      />

      <!-- Moon presence band (moon curve closed back to the horizon) -->
      <path
        d="{curves.moonPath} L {W},{HORIZON_Y} L 0,{HORIZON_Y} Z"
        fill="url(#sky-arc-moon-fill)"
        clip-path="url(#sky-arc-above-horizon)"
      />

      <!-- Horizon -->
      <line
        x1="0"
        y1={HORIZON_Y}
        x2={W}
        y2={HORIZON_Y}
        stroke="white"
        stroke-opacity="0.22"
        stroke-dasharray="2 4"
      />

      <!-- 6h tick marks -->
      {#each [0.25, 0.5, 0.75] as frac (frac)}
        <line
          x1={frac * W}
          y1={HORIZON_Y - 3}
          x2={frac * W}
          y2={HORIZON_Y + 3}
          stroke="white"
          stroke-opacity="0.22"
        />
      {/each}

      <!-- Moon curve (under the sun so an overlap reads as layered) -->
      <path
        d={curves.moonPath}
        fill="none"
        stroke="rgb(200, 220, 255)"
        stroke-opacity="0.75"
        stroke-width="1.3"
      />

      <!-- Sun curve -->
      <path
        d={curves.sunPath}
        fill="none"
        stroke="rgb(255, 205, 110)"
        stroke-opacity="0.95"
        stroke-width="1.6"
      />

      <!-- Now-line + current-time label -->
      <line
        x1={curves.cx}
        y1="0"
        x2={curves.cx}
        y2={H}
        stroke="white"
        stroke-opacity="0.25"
        stroke-width="1"
      />
      <text
        x={curves.cx}
        y="9"
        text-anchor={labelAnchor(curves.cx)}
        class="now-label"
      >
        {fmt(now)}
      </text>

      <!-- Crossing markers — small color-coded dots that hint there's
           information here. On hover they reveal as time labels. -->
      {#each curves.sunCrossings as c (c.time.getTime())}
        <circle
          cx={c.x}
          cy={HORIZON_Y}
          r="2"
          fill="rgb(255, 200, 100)"
          opacity={hovering ? 0 : 0.85}
        />
        {#if hovering}
          <text
            x={c.x}
            y={HORIZON_Y + 13}
            text-anchor={labelAnchor(c.x)}
            class="crossing-label sun-label"
          >
            {fmt(c.time)}
          </text>
        {/if}
      {/each}
      {#each curves.moonCrossings as c (c.time.getTime())}
        <circle
          cx={c.x}
          cy={HORIZON_Y}
          r="2"
          fill="rgb(200, 220, 255)"
          opacity={hovering ? 0 : 0.85}
        />
        {#if hovering}
          <text
            x={c.x}
            y={HORIZON_Y + 24}
            text-anchor={labelAnchor(c.x)}
            class="crossing-label moon-label"
          >
            {fmt(c.time)}
          </text>
        {/if}
      {/each}

      <!-- Moon glyph (drawn first so a coincident sun overlaps on top
           — visually correct for a new moon). Crescent suggested via a
           dark offset circle; phase-accurate rendering is a later
           refinement. -->
      <g transform="translate({curves.cx}, {curves.moonY})">
        <circle r="4" fill="rgb(230, 240, 255)" />
        <circle cx="1.4" r="3.3" fill="rgba(15, 25, 50, 0.72)" />
      </g>

      <!-- Sun glyph: bright core + soft halo. -->
      <g transform="translate({curves.cx}, {curves.sunY})">
        <circle r="6" fill="rgba(255, 200, 100, 0.28)" />
        <circle r="3.5" fill="rgb(255, 215, 130)" />
        <circle r="1.5" fill="rgb(255, 245, 210)" />
      </g>
    </svg>
  </div>
{/if}

<style>
  .sky-arc {
    width: 320px;
    color: #fff;
    user-select: none;
    /* Soft drop shadow so the strokes/labels read against bright video
       backgrounds without a backing card. */
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55));
  }
  .now-label {
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    fill: #fff;
    fill-opacity: 0.92;
  }
  .crossing-label {
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
  .sun-label {
    fill: rgb(255, 220, 150);
  }
  .moon-label {
    fill: rgb(210, 225, 255);
  }
</style>
