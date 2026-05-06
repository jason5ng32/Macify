// Single source of truth for sun & moon position/timing.
//
// Wraps `suncalc` with the conventions used elsewhere in the app:
// - Altitudes returned in degrees (suncalc uses radians)
// - Rise/set times returned as plain Date objects
// - alwaysUp / alwaysDown surfaced explicitly so callers can render
//   sensible UI on those rare days
//
// Both Weather (sunrise/sunset display) and SkyArc (continuous arc
// curves and crossing labels) go through this module so the two views
// always agree to the second.

import SunCalc from 'suncalc';

const RAD_TO_DEG = 180 / Math.PI;

// Sun altitude in degrees at the given moment / location. Includes
// the conventional refraction correction (suncalc applies ~0.583° at
// the horizon), so altitude=0° aligns with the visible-horizon
// definition of sunrise/sunset.
export function sunAltitudeDeg(date, lat, lng) {
  return SunCalc.getPosition(date, lat, lng).altitude * RAD_TO_DEG;
}

export function moonAltitudeDeg(date, lat, lng) {
  return SunCalc.getMoonPosition(date, lat, lng).altitude * RAD_TO_DEG;
}

// Sun rise/set times for the calendar day containing `date`. We pull
// only the fields anyone in this codebase actually uses; suncalc
// returns several twilight phases that we don't currently surface.
export function getSunTimes(date, lat, lng) {
  const t = SunCalc.getTimes(date, lat, lng);
  return {
    sunrise: validDate(t.sunrise),
    sunset: validDate(t.sunset),
    solarNoon: validDate(t.solarNoon),
  };
}

// Moon rise/set for the calendar day. Unlike the sun, the moon
// doesn't necessarily transit the horizon on every calendar day —
// `alwaysUp` / `alwaysDown` flag those days so the caller can skip
// drawing crossing labels rather than show bogus times.
export function getMoonTimes(date, lat, lng) {
  const t = SunCalc.getMoonTimes(date, lat, lng);
  return {
    rise: validDate(t.rise),
    set: validDate(t.set),
    alwaysUp: !!t.alwaysUp,
    alwaysDown: !!t.alwaysDown,
  };
}

// Phase information — currently unused but kept available for a
// future phase-aware moon glyph. `phase` is 0..1 (0=new, 0.5=full),
// `fraction` is the illuminated fraction (0..1).
export function getMoonIllumination(date) {
  const i = SunCalc.getMoonIllumination(date);
  return { phase: i.phase, fraction: i.fraction, angle: i.angle };
}

// suncalc returns Invalid Date instead of null when an event doesn't
// occur (e.g., moon doesn't rise that day, or polar summer for sun).
// Normalize to null so callers can do a simple truthy check.
function validDate(d) {
  if (!(d instanceof Date)) return null;
  return Number.isFinite(d.getTime()) ? d : null;
}
