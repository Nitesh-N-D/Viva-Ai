/**
 * lib/weather.ts
 *
 * Calls OpenWeatherMap DIRECTLY from the browser — no backend, no Cloud
 * Function, works entirely on Firebase Spark (free) plan. This is a
 * deliberate, documented trade-off: OpenWeatherMap's free-tier key is
 * visible in the shipped JS bundle (anyone can read it from DevTools).
 * That's standard practice for free-tier client-only weather widgets and
 * the key only grants weather lookups, not account access — but if you
 * want to fully hide it later, restrict the key's allowed referrers in
 * the OpenWeatherMap dashboard, or add a backend proxy back in.
 *
 * Falls back, in order: live API → last successful cached response for
 * this location (works offline) → illustrative mock data. Never throws.
 */
export interface WeatherSnapshot {
  district: string;
  tempC: number;
  rainfallOutlookMm: number;
  humidity: number;
  season: "kharif" | "rabi" | "summer";
  source: "live" | "cached" | "mock";
  fetchedAt?: number;
}

const CACHE_PREFIX = "viva-ai:weatherCache:";
const CACHE_TTL_MS = 30 * 60 * 1000; // matches the old server-side proxy's cache window

function currentSeason(): "kharif" | "rabi" | "summer" {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) return "kharif";
  if (month >= 10 || month <= 1) return "rabi";
  return "summer";
}

function geoTile(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function mockSnapshot(): WeatherSnapshot {
  return {
    district: "கோயம்புத்தூர்",
    tempC: 29,
    rainfallOutlookMm: 45,
    humidity: 65,
    season: currentSeason(),
    source: "mock",
  };
}

function readCache(key: string): WeatherSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as WeatherSnapshot;
  } catch {
    return null;
  }
}

function writeCache(key: string, snapshot: WeatherSnapshot): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(snapshot));
  } catch {
    // localStorage full or unavailable (e.g. private browsing) — not fatal,
    // we just lose the cache benefit for this session.
  }
}

export async function getWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const key = geoTile(lat, lng);
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  // Serve a still-fresh cache without hitting the network at all — cuts
  // API calls when several screens request weather in quick succession.
  const cached = readCache(key);
  if (cached?.fetchedAt && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { ...cached, source: "cached" };
  }

  if (!apiKey) {
    return cached ? { ...cached, source: "cached" } : mockSnapshot();
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeatherMap returned ${res.status}`);
    const raw = await res.json();

    const snapshot: WeatherSnapshot = {
      district: raw.name ?? "Unknown",
      tempC: raw.main?.temp ?? mockSnapshot().tempC,
      rainfallOutlookMm: raw.rain?.["1h"] ? raw.rain["1h"] * 24 : 0, // rough daily estimate from the hourly figure OWM provides on the free tier
      humidity: raw.main?.humidity ?? 60,
      season: currentSeason(),
      source: "live",
      fetchedAt: Date.now(),
    };
    writeCache(key, snapshot);
    return snapshot;
  } catch {
    // Network down, key invalid/rate-limited, CORS hiccup — whatever the
    // cause, degrade gracefully rather than ever surfacing an error here.
    if (cached) return { ...cached, source: "cached" };
    return mockSnapshot();
  }
}
