/**
 * Shared types for the Pattern Calendar (M10-d).
 *
 * The API at /api/transits/calendar returns these shapes. Both the
 * server page and the client components import from here to keep the
 * contract in sync.
 */

export interface ForecastActivation {
  /** Atlas pattern slug (e.g. "the-abandonment"). */
  pattern: string;
  /** Human-readable Atlas pattern name (e.g. "The Abandonment Pattern"). */
  patternName: string;
  /** Activation intensity, 0.3 – 1.0. */
  intensity: number;
  /** Plain-English explanation of WHY this pattern is activated. */
  reason: string;
}

export interface ForecastDay {
  /** ISO timestamp the forecast is for (noon UTC). */
  date: string;
  /** All activations for this day, sorted by intensity descending. */
  activations: ForecastActivation[];
  /** Atlas slug of the dominant (peak) pattern, or null if quiet day. */
  peakPattern: string | null;
}

export interface CalendarApiResponse {
  forecast: ForecastDay[];
  hasNatalChart: boolean;
  generatedAt: string;
  cached?: boolean;
}
