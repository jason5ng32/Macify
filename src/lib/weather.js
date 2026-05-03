import { cache } from './storage.js';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const FORECAST_TTL_MS = 30 * 60 * 1000;
const GEOCODE_CACHE_KEY = 'geocodeCache';
const FORECAST_CACHE_KEY = 'forecastCache';

export async function geocodeCity(name) {
  const key = name.trim().toLowerCase();
  if (!key) throw new Error('City name is empty');

  const stored = (await cache.get(GEOCODE_CACHE_KEY)) ?? {};
  if (stored[key]) return stored[key];

  const url = `${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=1&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`No geocoding results for "${name}"`);
  }
  const r = data.results[0];
  const entry = {
    lat: r.latitude,
    lng: r.longitude,
    displayName: r.name,
    country: r.country_code,
  };
  stored[key] = entry;
  await cache.set(GEOCODE_CACHE_KEY, stored);
  return entry;
}

async function fetchWeather(geo, tempUnit) {
  const params = new URLSearchParams({
    latitude: String(geo.lat),
    longitude: String(geo.lng),
    current: 'temperature_2m,apparent_temperature,weather_code',
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_direction_10m_dominant',
      'uv_index_max',
    ].join(','),
    forecast_days: '3',
    temperature_unit: tempUnit === 'fahrenheit' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);
  return res.json();
}

async function fetchAirQuality(geo) {
  const params = new URLSearchParams({
    latitude: String(geo.lat),
    longitude: String(geo.lng),
    current: 'pm2_5,us_aqi',
    timezone: 'auto',
  });
  const res = await fetch(`${AIR_QUALITY_URL}?${params}`);
  if (!res.ok) throw new Error(`Air quality HTTP ${res.status}`);
  return res.json();
}

function num(value) {
  return value == null || Number.isNaN(value) ? null : value;
}

function roundOrNull(value) {
  const n = num(value);
  return n == null ? null : Math.round(n);
}

function arrayItem(arr, i) {
  return Array.isArray(arr) ? num(arr[i]) : null;
}

function parseCurrent(data) {
  const c = data?.current ?? {};
  return {
    temperature: roundOrNull(c.temperature_2m),
    feelsLike: roundOrNull(c.apparent_temperature),
    weatherCode: num(c.weather_code),
  };
}

function parseDaily(data) {
  const d = data?.daily ?? {};
  const times = Array.isArray(d.time) ? d.time : [];
  return times.map((date, i) => ({
    date,
    weatherCode: arrayItem(d.weather_code, i),
    max: (() => {
      const v = arrayItem(d.temperature_2m_max, i);
      return v == null ? null : Math.round(v);
    })(),
    min: (() => {
      const v = arrayItem(d.temperature_2m_min, i);
      return v == null ? null : Math.round(v);
    })(),
    sunrise: (Array.isArray(d.sunrise) ? d.sunrise[i] : null) || null,
    sunset: (Array.isArray(d.sunset) ? d.sunset[i] : null) || null,
    precipProbability: arrayItem(d.precipitation_probability_max, i),
    windSpeed: (() => {
      const v = arrayItem(d.wind_speed_10m_max, i);
      return v == null ? null : Math.round(v);
    })(),
    windDirection: arrayItem(d.wind_direction_10m_dominant, i),
    uvIndex: (() => {
      const v = arrayItem(d.uv_index_max, i);
      return v == null ? null : Math.round(v * 10) / 10;
    })(),
  }));
}

function parseAirQuality(data) {
  if (!data) return null;
  const c = data.current ?? {};
  const pm25 = num(c.pm2_5);
  const aqi = num(c.us_aqi);
  if (pm25 == null && aqi == null) return null;
  return {
    pm25: pm25 == null ? null : Math.round(pm25 * 10) / 10,
    aqi: aqi == null ? null : Math.round(aqi),
  };
}

export async function getForecast({ city, tempUnit }) {
  const cacheKey = `${city.trim().toLowerCase()}|${tempUnit}`;
  const cached = await cache.get(FORECAST_CACHE_KEY);
  if (
    cached &&
    cached.key === cacheKey &&
    Date.now() - cached.ts < FORECAST_TTL_MS
  ) {
    return cached.data;
  }

  const geo = await geocodeCity(city);

  const [weatherSettled, airSettled] = await Promise.allSettled([
    fetchWeather(geo, tempUnit),
    fetchAirQuality(geo),
  ]);

  if (weatherSettled.status === 'rejected') {
    throw weatherSettled.reason;
  }

  const result = {
    location: geo.displayName,
    current: parseCurrent(weatherSettled.value),
    daily: parseDaily(weatherSettled.value),
    airQuality:
      airSettled.status === 'fulfilled'
        ? parseAirQuality(airSettled.value)
        : null,
  };

  if (airSettled.status === 'rejected') {
    console.warn('Air quality fetch failed (continuing without):', airSettled.reason);
  }

  await cache.set(FORECAST_CACHE_KEY, { key: cacheKey, data: result, ts: Date.now() });
  return result;
}

const WMO_MAP = {
  0: { icon: '☀️', label: 'clear sky' },
  1: { icon: '🌤️', label: 'mostly clear' },
  2: { icon: '⛅️', label: 'partly cloudy' },
  3: { icon: '☁️', label: 'overcast' },
  45: { icon: '🌫️', label: 'fog' },
  48: { icon: '🌫️', label: 'rime fog' },
  51: { icon: '🌦️', label: 'light drizzle' },
  53: { icon: '🌦️', label: 'drizzle' },
  55: { icon: '🌧️', label: 'heavy drizzle' },
  56: { icon: '🌧️', label: 'freezing drizzle' },
  57: { icon: '🌧️', label: 'freezing drizzle' },
  61: { icon: '🌧️', label: 'light rain' },
  63: { icon: '🌧️', label: 'rain' },
  65: { icon: '🌧️', label: 'heavy rain' },
  66: { icon: '🌧️', label: 'freezing rain' },
  67: { icon: '🌧️', label: 'freezing rain' },
  71: { icon: '🌨️', label: 'light snow' },
  73: { icon: '🌨️', label: 'snow' },
  75: { icon: '❄️', label: 'heavy snow' },
  77: { icon: '🌨️', label: 'snow grains' },
  80: { icon: '🌦️', label: 'rain showers' },
  81: { icon: '🌧️', label: 'rain showers' },
  82: { icon: '⛈️', label: 'heavy showers' },
  85: { icon: '🌨️', label: 'snow showers' },
  86: { icon: '❄️', label: 'snow showers' },
  95: { icon: '⛈️', label: 'thunderstorm' },
  96: { icon: '⛈️', label: 'thunderstorm with hail' },
  99: { icon: '⛈️', label: 'thunderstorm with hail' },
};

export function describeWeather(code) {
  if (code == null) return { icon: '·', label: 'unknown' };
  return WMO_MAP[code] ?? { icon: '·', label: 'unknown' };
}

const COMPASS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
];

export function windDirectionLabel(deg) {
  if (deg == null || Number.isNaN(deg)) return null;
  return COMPASS[Math.round(deg / 22.5) % 16];
}

export function uvLevel(value) {
  if (value == null || Number.isNaN(value)) return null;
  if (value < 3) return 'low';
  if (value < 6) return 'moderate';
  if (value < 8) return 'high';
  if (value < 11) return 'very_high';
  return 'extreme';
}

export function aqiLevel(value) {
  if (value == null || Number.isNaN(value)) return null;
  if (value <= 50) return 'good';
  if (value <= 100) return 'moderate';
  if (value <= 150) return 'unhealthy_sensitive';
  if (value <= 200) return 'unhealthy';
  if (value <= 300) return 'very_unhealthy';
  return 'hazardous';
}

export function isFutureTime(isoString) {
  if (!isoString) return false;
  const t = new Date(isoString).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export function formatTimeOfDay(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
