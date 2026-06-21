/**
 * lib/mandi.ts
 *
 * Fetches Agmarknet mandi prices via a Vite dev proxy (/api-mandi/) which
 * forwards to api.data.gov.in — no CORS issues on localhost or deployed.
 * The proxy is configured in vite.config.ts.
 *
 * On the deployed (production) build, requests go directly to
 * api.data.gov.in since the same-origin rule doesn't apply there
 * (Firebase Hosting / Vercel / Netlify serve over HTTPS and data.gov.in
 * does send CORS headers for deployed origins in practice).
 *
 * Fallback chain: live API → stale localStorage cache → rich mock data.
 */

export interface MandiPrice {
  market: string;
  commodity: string;
  pricePerQuintal: number;
  distanceKm: number;
  source: "live" | "cached" | "mock";
}

const CACHE_PREFIX = "viva-ai:mandiCache:";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const PUBLIC_DEMO_KEY = "579b464db66ec23bdd0000014e8f29609d374cfc6c50b7b29fa1ef23";

const CROP_API_NAME: Record<string, string> = {
  groundnut: "Groundnut",
  paddy: "Paddy",
  millet: "Bajra",
  blackgram: "Black Gram",
  cotton: "Cotton",
  vegetables: "Tomato",
  wheat: "Wheat",
  maize: "Maize",
  sugarcane: "Sugarcane",
  turmeric: "Turmeric",
  banana: "Banana",
  onion: "Onion",
};

const MOCK_PRICES: Record<string, MandiPrice[]> = {
  groundnut: [
    { market: "திருப்பூர் சந்தை", commodity: "நிலக்கடலை", pricePerQuintal: 6400, distanceKm: 12, source: "mock" },
    { market: "ஈரோடு சந்தை", commodity: "நிலக்கடலை", pricePerQuintal: 6200, distanceKm: 28, source: "mock" },
    { market: "கோவை சந்தை", commodity: "நிலக்கடலை", pricePerQuintal: 6100, distanceKm: 35, source: "mock" },
  ],
  paddy: [
    { market: "திருச்சி சந்தை", commodity: "நெல்", pricePerQuintal: 2200, distanceKm: 9, source: "mock" },
    { market: "தஞ்சாவூர் சந்தை", commodity: "நெல்", pricePerQuintal: 2150, distanceKm: 42, source: "mock" },
    { market: "நாகப்பட்டினம் சந்தை", commodity: "நெல்", pricePerQuintal: 2100, distanceKm: 65, source: "mock" },
  ],
  millet: [
    { market: "சேலம் சந்தை", commodity: "சிறுதானியம்", pricePerQuintal: 3600, distanceKm: 17, source: "mock" },
    { market: "நாமக்கல் சந்தை", commodity: "சிறுதானியம்", pricePerQuintal: 3500, distanceKm: 33, source: "mock" },
  ],
  blackgram: [
    { market: "மதுரை சந்தை", commodity: "உளுந்து", pricePerQuintal: 8200, distanceKm: 15, source: "mock" },
    { market: "விருதுநகர் சந்தை", commodity: "உளுந்து", pricePerQuintal: 8000, distanceKm: 48, source: "mock" },
  ],
  cotton: [
    { market: "ஈரோடு சந்தை", commodity: "பருத்தி", pricePerQuintal: 7400, distanceKm: 22, source: "mock" },
    { market: "கோவை சந்தை", commodity: "பருத்தி", pricePerQuintal: 7200, distanceKm: 38, source: "mock" },
  ],
  vegetables: [
    { market: "கோயம்புத்தூர் சந்தை", commodity: "தக்காளி", pricePerQuintal: 3200, distanceKm: 6, source: "mock" },
    { market: "உடுமலை சந்தை", commodity: "தக்காளி", pricePerQuintal: 3000, distanceKm: 22, source: "mock" },
  ],
  maize: [
    { market: "சேலம் சந்தை", commodity: "மக்காச்சோளம்", pricePerQuintal: 2400, distanceKm: 18, source: "mock" },
    { market: "ஈரோடு சந்தை", commodity: "மக்காச்சோளம்", pricePerQuintal: 2350, distanceKm: 28, source: "mock" },
  ],
  turmeric: [
    { market: "ஈரோடு சந்தை", commodity: "மஞ்சள்", pricePerQuintal: 14000, distanceKm: 22, source: "mock" },
    { market: "சேலம் சந்தை", commodity: "மஞ்சள்", pricePerQuintal: 13500, distanceKm: 45, source: "mock" },
  ],
  onion: [
    { market: "பெரியகுளம் சந்தை", commodity: "வெங்காயம்", pricePerQuintal: 2800, distanceKm: 14, source: "mock" },
    { market: "மதுரை சந்தை", commodity: "வெங்காயம்", pricePerQuintal: 2600, distanceKm: 32, source: "mock" },
  ],
  banana: [
    { market: "தஞ்சாவூர் சந்தை", commodity: "வாழைப்பழம்", pricePerQuintal: 2200, distanceKm: 25, source: "mock" },
    { market: "திருச்சி சந்தை", commodity: "வாழைப்பழம்", pricePerQuintal: 2000, distanceKm: 18, source: "mock" },
  ],
};

function readCache(key: string): { payload: MandiPrice[]; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, payload: MandiPrice[]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ payload, fetchedAt: Date.now() }));
  } catch {}
}

function buildUrl(cropId: string, district: string): string {
  const apiKey = (import.meta.env.VITE_AGMARKNET_API_KEY as string) || PUBLIC_DEMO_KEY;
  const commodity = CROP_API_NAME[cropId] ?? cropId;
  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    "filters[state]": "Tamil Nadu",
    "filters[commodity]": commodity,
    limit: "20",
  });
  if (district) params.set("filters[district]", district);

  // On localhost (dev), use the Vite proxy path /api-mandi/ which
  // forwards to https://api.data.gov.in — see vite.config.ts.
  // On production builds, call data.gov.in directly.
  const isDev = import.meta.env.DEV;
  const base = isDev
    ? `/api-mandi/resource/${AGMARKNET_RESOURCE_ID}`
    : `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}`;

  return `${base}?${params}`;
}

function parseRecords(raw: any, cropId: string): MandiPrice[] {
  const records: any[] = raw.records ?? raw.data ?? [];
  return records
    .map((r: any) => ({
      market: r.market ?? r.Market ?? "Unknown",
      commodity: r.commodity ?? r.Commodity ?? CROP_API_NAME[cropId] ?? cropId,
      pricePerQuintal: Number(r.modal_price ?? r.Modal_Price ?? r.min_price ?? 0) || 0,
      distanceKm: 0,
      source: "live" as const,
    }))
    .filter((p) => p.pricePerQuintal > 0);
}

export async function getMandiPrices(cropId: string, district: string): Promise<MandiPrice[]> {
  const cacheKey = `${district}_${cropId}`;

  const cached = readCache(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.payload.map((p) => ({ ...p, source: "cached" as const }));
  }

  try {
    const url = buildUrl(cropId, district);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const raw = await res.json();
      const prices = parseRecords(raw, cropId);
      if (prices.length > 0) {
        writeCache(cacheKey, prices);
        return prices;
      }
    }
  } catch {
    // network error or timeout — fall through
  }

  if (cached) {
    return cached.payload.map((p) => ({ ...p, source: "cached" as const }));
  }

  return MOCK_PRICES[cropId] ?? MOCK_PRICES["vegetables"] ?? [];
}
