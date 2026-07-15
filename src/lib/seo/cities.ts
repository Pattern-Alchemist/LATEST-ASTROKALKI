/**
 * M8-b: Programmatic SEO city list.
 *
 * 20 major Indian cities — the local SEO layer of the programmatic
 * pattern×city pages. Each city pairs with each of the Atlas patterns
 * to produce 200+ indexed landing pages
 * (e.g. /patterns/mumbai/the-rescuer).
 *
 * Slugs are URL-safe and unique. Names match common Indian English
 * usage (Bangalore, not Bengaluru) for higher search-volume coverage.
 *
 * Population figures are city-proper (not metro) rounded for editorial
 * display — used by the admin UI to surface the biggest markets first
 * and by the page generator to add local-context colour.
 */

export interface City {
  /** Display name as it appears in copy + headings */
  name: string;
  /** Indian state / Union Territory */
  state: string;
  /** URL-safe slug — used to build the page slug */
  slug: string;
  /** City-proper population (human-readable, e.g. "12.5M") */
  population: string;
}

/**
 * The canonical list of 20 cities targeted by the programmatic SEO
 * matrix. Exported as `SEO_CITIES` per the M8-b spec, with `CITIES`
 * kept as a backward-compatibility alias for the existing
 * /api/admin/programmatic + /admin/programmatic surfaces.
 */
export const SEO_CITIES: City[] = [
  { name: "Mumbai", state: "Maharashtra", slug: "mumbai", population: "12.5M" },
  { name: "Delhi", state: "Delhi", slug: "delhi", population: "11M" },
  { name: "Bangalore", state: "Karnataka", slug: "bangalore", population: "8.4M" },
  { name: "Hyderabad", state: "Telangana", slug: "hyderabad", population: "6.8M" },
  { name: "Chennai", state: "Tamil Nadu", slug: "chennai", population: "4.6M" },
  { name: "Kolkata", state: "West Bengal", slug: "kolkata", population: "4.5M" },
  { name: "Pune", state: "Maharashtra", slug: "pune", population: "3.1M" },
  { name: "Ahmedabad", state: "Gujarat", slug: "ahmedabad", population: "5.5M" },
  { name: "Jaipur", state: "Rajasthan", slug: "jaipur", population: "3.0M" },
  { name: "Surat", state: "Gujarat", slug: "surat", population: "4.4M" },
  { name: "Lucknow", state: "Uttar Pradesh", slug: "lucknow", population: "2.8M" },
  { name: "Kanpur", state: "Uttar Pradesh", slug: "kanpur", population: "2.9M" },
  { name: "Nagpur", state: "Maharashtra", slug: "nagpur", population: "2.4M" },
  { name: "Indore", state: "Madhya Pradesh", slug: "indore", population: "2.0M" },
  { name: "Thane", state: "Maharashtra", slug: "thane", population: "1.8M" },
  { name: "Bhopal", state: "Madhya Pradesh", slug: "bhopal", population: "1.8M" },
  { name: "Patna", state: "Bihar", slug: "patna", population: "1.7M" },
  { name: "Vadodara", state: "Gujarat", slug: "vadodara", population: "1.7M" },
  { name: "Ghaziabad", state: "Uttar Pradesh", slug: "ghaziabad", population: "1.7M" },
  { name: "Ludhiana", state: "Punjab", slug: "ludhiana", population: "1.6M" },
];

/** Backward-compatibility alias — existing surfaces import `CITIES`. */
export const CITIES: City[] = SEO_CITIES;

/** Find a city by slug. */
export function getCity(slug: string): City | null {
  return SEO_CITIES.find((c) => c.slug === slug) ?? null;
}

/**
 * Build the canonical page slug for a pattern×city combo.
 * e.g. ("the-rescuer", "mumbai") → "the-rescuer-mumbai"
 *
 * This is the `slug` column on ProgrammaticPage — the storage key.
 * The new public URL /patterns/{city}/{pattern} does NOT use this slug,
 * but the admin endpoints + sitemap image entries still do.
 */
export function buildProgrammaticSlug(patternSlug: string, citySlug: string): string {
  return `${patternSlug}-${citySlug}`;
}
