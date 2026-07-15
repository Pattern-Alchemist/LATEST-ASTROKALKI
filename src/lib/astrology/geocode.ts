/**
 * City → lat / lng / tzOffset lookup — AstroKalki M10-a.
 *
 * Vedic chart calculation requires the geographic latitude and longitude
 * of the birth place, plus the timezone offset (hours east of UTC) at the
 * moment of birth. We don't ship a full geocoding integration — instead
 * we ship a hand-curated lookup of ~70 major Indian cities and a handful
 * of major global cities. Users whose birth place is not in the list
 * fall back to "Custom" and enter the coordinates manually.
 *
 * The lookup is intentionally fuzzy: it normalises the query (lowercase,
 * trim, strip punctuation) and matches against the canonical name and a
 * small set of aliases (e.g. "Bombay" → Mumbai, "Madras" → Chennai).
 *
 * DST is NOT handled — for DST-observing zones the user should use
 * "Custom" and enter the wall-clock UTC offset that was in effect at
 * their moment of birth. All Indian cities are IST (+5.5) year-round.
 */

export interface GeoEntry {
  /** Canonical display name. */
  name: string;
  /** Geographic latitude, degrees north of the equator. */
  lat: number;
  /** Geographic longitude, degrees east of the Greenwich meridian. */
  lng: number;
  /**
   * Standard timezone offset, hours east of UTC.
   * IST = +5.5. For DST-observing zones this is the standard-time
   * offset — callers in DST should override via Custom.
   */
  tzOffset: number;
  /** Lowercase aliases that should also match this entry. */
  aliases?: string[];
}

/**
 * The curated city database — ~65 Indian cities + ~10 global cities.
 *
 * Coordinates are accurate to ~1 km (4 decimal places of a degree).
 * Indian cities all use IST (+5.5). Global cities use their standard
 * (non-DST) offset; users in DST-observing zones should override via
 * the Custom entry on the calculator form.
 */
export const CITY_PRESETS: readonly GeoEntry[] = [
  // ─── Major Indian metros ──────────────────────────────────────────────
  { name: 'Mumbai', lat: 19.076, lng: 72.8777, tzOffset: 5.5, aliases: ['bombay'] },
  { name: 'Delhi (NCR)', lat: 28.6139, lng: 77.209, tzOffset: 5.5, aliases: ['new delhi', 'delhi', 'nct'] },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, tzOffset: 5.5, aliases: ['bangalore'] },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867, tzOffset: 5.5 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, tzOffset: 5.5, aliases: ['madras'] },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, tzOffset: 5.5, aliases: ['calcutta'] },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, tzOffset: 5.5, aliases: ['poona'] },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, tzOffset: 5.5 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873, tzOffset: 5.5 },
  { name: 'Surat', lat: 21.1702, lng: 72.8311, tzOffset: 5.5 },

  // ─── North India ──────────────────────────────────────────────────────
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462, tzOffset: 5.5 },
  { name: 'Kanpur', lat: 26.4499, lng: 80.3319, tzOffset: 5.5 },
  { name: 'Patna', lat: 25.5941, lng: 85.1376, tzOffset: 5.5 },
  { name: 'Ludhiana', lat: 30.901, lng: 75.8573, tzOffset: 5.5 },
  { name: 'Agra', lat: 27.1767, lng: 78.0081, tzOffset: 5.5 },
  { name: 'Varanasi', lat: 25.3176, lng: 82.9739, tzOffset: 5.5, aliases: ['benares', 'kashi'] },
  { name: 'Meerut', lat: 28.9845, lng: 77.7064, tzOffset: 5.5 },
  { name: 'Ghaziabad', lat: 28.6692, lng: 77.4538, tzOffset: 5.5 },
  { name: 'Faridabad', lat: 28.4089, lng: 77.3178, tzOffset: 5.5 },
  { name: 'Amritsar', lat: 31.634, lng: 74.8723, tzOffset: 5.5 },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794, tzOffset: 5.5 },
  { name: 'Dehradun', lat: 30.3165, lng: 78.0322, tzOffset: 5.5 },
  { name: 'Shimla', lat: 31.1048, lng: 77.1734, tzOffset: 5.5 },
  { name: 'Srinagar', lat: 34.0837, lng: 74.7973, tzOffset: 5.5 },
  { name: 'Jodhpur', lat: 26.2389, lng: 73.0243, tzOffset: 5.5 },
  { name: 'Udaipur', lat: 24.5854, lng: 73.7125, tzOffset: 5.5 },
  { name: 'Rishikesh', lat: 30.0869, lng: 78.2676, tzOffset: 5.5 },
  { name: 'Haridwar', lat: 29.9457, lng: 78.1642, tzOffset: 5.5 },
  { name: 'Allahabad (Prayagraj)', lat: 25.4358, lng: 81.8463, tzOffset: 5.5, aliases: ['prayagraj'] },
  { name: 'Gwalior', lat: 26.2183, lng: 78.1828, tzOffset: 5.5 },

  // ─── Central + West India ─────────────────────────────────────────────
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882, tzOffset: 5.5 },
  { name: 'Indore', lat: 22.7196, lng: 75.8577, tzOffset: 5.5 },
  { name: 'Bhopal', lat: 23.2599, lng: 77.4126, tzOffset: 5.5 },
  { name: 'Vadodara', lat: 22.3072, lng: 73.1812, tzOffset: 5.5, aliases: ['baroda'] },
  { name: 'Rajkot', lat: 22.3039, lng: 70.8022, tzOffset: 5.5 },
  { name: 'Nashik', lat: 19.9975, lng: 73.7898, tzOffset: 5.5 },
  { name: 'Aurangabad', lat: 19.8762, lng: 75.3433, tzOffset: 5.5, aliases: ['chhatrapati sambhajinagar'] },
  { name: 'Raipur', lat: 21.2514, lng: 81.6296, tzOffset: 5.5 },
  { name: 'Goa (Panaji)', lat: 15.4909, lng: 73.8278, tzOffset: 5.5, aliases: ['panaji', 'panjim'] },

  // ─── East India ───────────────────────────────────────────────────────
  { name: 'Ranchi', lat: 23.3441, lng: 85.3096, tzOffset: 5.5 },
  { name: 'Bhubaneswar', lat: 20.2961, lng: 85.8245, tzOffset: 5.5 },
  { name: 'Cuttack', lat: 20.4625, lng: 85.8828, tzOffset: 5.5 },
  { name: 'Guwahati', lat: 26.1445, lng: 91.7362, tzOffset: 5.5 },
  { name: 'Shillong', lat: 25.5788, lng: 91.8933, tzOffset: 5.5 },

  // ─── South India ──────────────────────────────────────────────────────
  { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366, tzOffset: 5.5, aliases: ['trivandrum'] },
  { name: 'Kochi (Cochin)', lat: 9.9312, lng: 76.2673, tzOffset: 5.5, aliases: ['cochin'] },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558, tzOffset: 5.5 },
  { name: 'Madurai', lat: 9.9252, lng: 78.1198, tzOffset: 5.5 },
  { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, tzOffset: 5.5, aliases: ['vizag'] },
  { name: 'Vijayawada', lat: 16.5062, lng: 80.648, tzOffset: 5.5 },
  { name: 'Mysuru', lat: 12.2958, lng: 76.6394, tzOffset: 5.5, aliases: ['mysore'] },
  { name: 'Mangaluru', lat: 12.9141, lng: 74.856, tzOffset: 5.5, aliases: ['mangalore'] },
  { name: 'Tirupati', lat: 13.6288, lng: 79.4192, tzOffset: 5.5 },
  { name: 'Puducherry', lat: 11.9416, lng: 79.8083, tzOffset: 5.5, aliases: ['pondicherry'] },

  // ─── Major global cities (standard-time offsets — DST not handled) ────
  { name: 'New York', lat: 40.7128, lng: -74.006, tzOffset: -5 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, tzOffset: -8 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, tzOffset: -8 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, tzOffset: -6 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, tzOffset: -5 },
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207, tzOffset: -8 },
  { name: 'London', lat: 51.5074, lng: -0.1278, tzOffset: 0 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, tzOffset: 1 },
  { name: 'Berlin', lat: 52.52, lng: 13.405, tzOffset: 1 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, tzOffset: 8 },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694, tzOffset: 8 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, tzOffset: 9 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, tzOffset: 10 },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, tzOffset: 10 },
  { name: 'Auckland', lat: -36.8485, lng: 174.7633, tzOffset: 12 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, tzOffset: 4 },
  { name: 'Doha', lat: 25.2854, lng: 51.531, tzOffset: 3 },
  { name: 'Kathmandu', lat: 27.7172, lng: 85.324, tzOffset: 5.75 },
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125, tzOffset: 6 },
  { name: 'Colombo', lat: 6.9271, lng: 79.8612, tzOffset: 5.5 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011, tzOffset: 5 },
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479, tzOffset: 5 },
];

/* -------------------------------------------------------------------------- */
/*  Internals                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Normalise a place name for matching: lowercase, trim, collapse
 * internal whitespace, strip parentheticals, strip common suffixes
 * ("city", "town"). Stops short of fuzzy matching — we want exact
 * (case-insensitive) match against name or alias.
 */
function normalizePlace(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*(city|town|nct)\s*$/i, '')
    .trim();
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Look up a city by name (case-insensitive, with alias support).
 *
 * Returns `{ name, lat, lng, tzOffset }` on a hit, `null` on a miss.
 * Callers should fall back to manual coordinate entry when null.
 *
 * @example
 *   geocode('Mumbai')            // → { name: 'Mumbai', lat: 19.076, ... }
 *   geocode('bombay')            // → same (alias)
 *   geocode('Bombay (Mumbai)')   // → same (parenthetical stripped)
 *   geocode('nonexistent place') // → null
 */
export function geocode(place: string): GeoEntry | null {
  if (!place || typeof place !== 'string') return null;
  const q = normalizePlace(place);
  if (!q) return null;

  for (const entry of CITY_PRESETS) {
    if (normalizePlace(entry.name) === q) return entry;
    if (entry.aliases?.some((a) => normalizePlace(a) === q)) return entry;
  }
  return null;
}

/**
 * Suggest cities whose name starts with the given prefix — used to
 * power a typeahead on the calculator form.
 *
 * Returns at most `limit` entries (default 8), ordered alphabetically.
 */
export function suggestCities(prefix: string, limit = 8): GeoEntry[] {
  if (!prefix || typeof prefix !== 'string') return [];
  const q = normalizePlace(prefix);
  if (!q) return [];

  const matches = CITY_PRESETS.filter((c) => {
    if (normalizePlace(c.name).startsWith(q)) return true;
    return c.aliases?.some((a) => normalizePlace(a).startsWith(q)) ?? false;
  });

  return matches
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}
