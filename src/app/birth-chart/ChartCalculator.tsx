"use client";

/**
 * ChartCalculator — the form + state machine for the /birth-chart page.
 *
 * Flow:
 *   1. User enters name, email, birth date, birth time, birth place.
 *   2. Birth place is chosen from a dropdown of major Indian cities
 *      (auto-fills lat/lng/tzOffset), or "Custom" — in which case the
 *      user enters lat/lng manually.
 *   3. POST to /api/birth-chart with honeypot + Zod-validated payload.
 *   4. On success, render the ChartDisplay component with the returned
 *      chartData + svgChart.
 *
 * Lead-gen: the email is required. Saved against the email in the DB
 * so the user can return to /account and see their charts.
 */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import ChartDisplay from "./ChartDisplay";
import type { ChartData } from "@/lib/astrology/chart-calculator";
import { CITY_PRESETS, geocode, type GeoEntry } from "@/lib/astrology/geocode";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

// Re-export the GeoEntry type under the local name the component used
// before the geocode.ts extraction — keeps the diff small.
type CityPreset = GeoEntry;

interface BirthChartResponse {
  chartData: ChartData | null;
  svgChart: string;
  chartId: string;
}

interface ChartCalculatorProps {
  /** Pre-fills the email field if the user is signed in. */
  email?: string | null;
  /** Pre-fills the name field if the user is signed in. */
  name?: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ChartCalculator({
  email: sessionEmail,
  name: sessionName,
}: ChartCalculatorProps) {
  const [name, setName] = useState(sessionName ?? "");
  const [email, setEmail] = useState(sessionEmail ?? "");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [cityChoice, setCityChoice] = useState<string>("");
  const [birthPlace, setBirthPlace] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [tzOffset, setTzOffset] = useState<string>("5.5");
  const [isCustomPlace, setIsCustomPlace] = useState(false);

  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BirthChartResponse | null>(null);

  const selectedCity = useMemo(
    () => CITY_PRESETS.find((c) => c.name === cityChoice),
    [cityChoice]
  );

  // Hint shown under the custom "Place name" input — reflects whether
  // the last-blurred place name was resolved by `geocode()` or not.
  const [placeLookupHint, setPlaceLookupHint] = useState<string | null>(null);

  const handleCityChange = useCallback((value: string) => {
    if (value === "__custom__") {
      setIsCustomPlace(true);
      setCityChoice("");
      setBirthPlace("");
      setLat("");
      setLng("");
      setTzOffset("");
      setPlaceLookupHint(null);
      return;
    }
    const city = CITY_PRESETS.find((c) => c.name === value);
    if (!city) return;
    setIsCustomPlace(false);
    setCityChoice(value);
    setBirthPlace(value);
    setLat(String(city.lat));
    setLng(String(city.lng));
    setTzOffset(String(city.tzOffset));
    setPlaceLookupHint(null);
  }, []);

  /**
   * Custom place-name flow: when the user blurs the "Place name"
   * field, attempt a `geocode()` lookup against the curated city
   * database. If hit, auto-fill the lat / lng / tzOffset fields.
   * If miss, clear the hint and let the user enter coordinates
   * manually.
   */
  const handlePlaceLookup = useCallback(() => {
    const place = birthPlace.trim();
    if (!place) {
      setPlaceLookupHint(null);
      return;
    }
    const hit = geocode(place);
    if (hit) {
      setLat(String(hit.lat));
      setLng(String(hit.lng));
      setTzOffset(String(hit.tzOffset));
      setPlaceLookupHint(
        `Resolved to ${hit.name} — ${hit.lat.toFixed(4)}°, ${hit.lng.toFixed(4)}° · UTC${hit.tzOffset >= 0 ? "+" : ""}${hit.tzOffset}`,
      );
    } else {
      setPlaceLookupHint(
        "Not found in the city database — enter the coordinates manually.",
      );
    }
  }, [birthPlace]);

  const canSubmit =
    name.trim().length >= 2 &&
    email.trim().length >= 5 &&
    birthDate &&
    birthTime &&
    birthPlace.trim().length >= 2 &&
    lat &&
    lng &&
    tzOffset;

  const calculate = useCallback(async () => {
    setError(null);

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const tzNum = parseFloat(tzOffset);

    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      setError("Latitude must be a number between -90 and +90.");
      return;
    }
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      setError("Longitude must be a number between -180 and +180.");
      return;
    }
    if (!Number.isFinite(tzNum) || Math.abs(tzNum) > 14) {
      setError("Timezone offset must be a number between -14 and +14 hours.");
      return;
    }

    setIsCalculating(true);
    try {
      const res = await fetch("/api/birth-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          birthDate,
          birthTime,
          birthPlace: birthPlace.trim(),
          lat: latNum,
          lng: lngNum,
          tzOffset: tzNum,
          // Honeypot — must be empty.
          website: "",
        }),
      });

      const data = (await res.json().catch(() => ({}))) as
        | BirthChartResponse
        | { error?: string };

      if (!res.ok) {
        const msg =
          (data && typeof (data as { error?: string }).error === "string" && (data as { error?: string }).error) ||
          "We couldn't calculate your chart right now. Please try again.";
        setError(msg);
        return;
      }

      const payload = data as BirthChartResponse;
      if (!payload.chartData) {
        // Honeypot-triggered response — silently abort.
        return;
      }
      setResult(payload);

      setTimeout(() => {
        document
          .getElementById("birth-chart-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setError("Network error — please retry.");
    } finally {
      setIsCalculating(false);
    }
  }, [name, email, birthDate, birthTime, birthPlace, lat, lng, tzOffset]);

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="w-full">
      {/* ─── Form ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
        {/* Name */}
        <div>
          <label
            htmlFor="bc-name"
            className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
          >
            Your name
          </label>
          <input
            id="bc-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            required
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a]"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="bc-email"
            className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
          >
            Email
          </label>
          <input
            id="bc-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a]"
          />
        </div>

        {/* Birth date */}
        <div>
          <label
            htmlFor="bc-date"
            className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
          >
            Birth date
          </label>
          <input
            id="bc-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            min="1900-01-01"
            max="2100-12-31"
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a] [color-scheme:dark]"
          />
        </div>

        {/* Birth time */}
        <div>
          <label
            htmlFor="bc-time"
            className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
          >
            Birth time <span className="text-[#3a3a3a] normal-case tracking-normal">(24-hour, local)</span>
          </label>
          <input
            id="bc-time"
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            required
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a] [color-scheme:dark]"
          />
        </div>

        {/* Birth place — city dropdown */}
        <div className="sm:col-span-2">
          <label
            htmlFor="bc-city"
            className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
          >
            Birth place
          </label>
          <select
            id="bc-city"
            value={isCustomPlace ? "__custom__" : cityChoice}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors [color-scheme:dark] appearance-none cursor-pointer"
          >
            <option value="" className="bg-[#0a0a0a] text-[#7a7a7a]">
              Select a city…
            </option>
            {CITY_PRESETS.map((c) => (
              <option key={c.name} value={c.name} className="bg-[#0a0a0a] text-[#f0eee9]">
                {c.name}
              </option>
            ))}
            <option value="__custom__" className="bg-[#0a0a0a] text-[#c9a96e]">
              Custom (enter lat / lng manually)
            </option>
          </select>
          <p className="mt-2 text-[11px] text-[#5a5a5a] font-light leading-relaxed">
            {selectedCity
              ? `Auto-filled: ${selectedCity.lat.toFixed(4)}°, ${selectedCity.lng.toFixed(4)}° · UTC${selectedCity.tzOffset >= 0 ? "+" : ""}${selectedCity.tzOffset}`
              : isCustomPlace
                ? "Type a city name (auto-looked up on blur) or enter coordinates manually."
                : "Choose a city to auto-fill the coordinates, or pick Custom."}
          </p>
        </div>

        {/* Custom lat / lng / tz — only shown when "Custom" is selected */}
        <AnimatePresence>
          {isCustomPlace && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6 overflow-hidden"
            >
              <div>
                <label
                  htmlFor="bc-place"
                  className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
                >
                  Place name
                </label>
                <input
                  id="bc-place"
                  type="text"
                  value={birthPlace}
                  onChange={(e) => {
                    setBirthPlace(e.target.value);
                    setPlaceLookupHint(null);
                  }}
                  onBlur={handlePlaceLookup}
                  placeholder="e.g. Rishikesh"
                  required
                  className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a]"
                />
                {placeLookupHint && (
                  <p className="mt-2 text-[11px] text-[#a58a54] font-light leading-relaxed">
                    {placeLookupHint}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="bc-lat"
                  className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
                >
                  Latitude <span className="text-[#3a3a3a] normal-case tracking-normal">°N</span>
                </label>
                <input
                  id="bc-lat"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 30.0869"
                  required
                  className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a] font-mono"
                />
              </div>
              <div>
                <label
                  htmlFor="bc-lng"
                  className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
                >
                  Longitude <span className="text-[#3a3a3a] normal-case tracking-normal">°E</span>
                </label>
                <input
                  id="bc-lng"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. 78.2676"
                  required
                  className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a] font-mono"
                />
              </div>
              <div className="sm:col-span-3">
                <label
                  htmlFor="bc-tz"
                  className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
                >
                  Timezone offset <span className="text-[#3a3a3a] normal-case tracking-normal">(hours from UTC, e.g. 5.5 for IST)</span>
                </label>
                <input
                  id="bc-tz"
                  type="number"
                  step="0.25"
                  value={tzOffset}
                  onChange={(e) => setTzOffset(e.target.value)}
                  placeholder="e.g. 5.5"
                  required
                  className="w-full max-w-xs bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a] font-mono"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Honeypot — visually hidden, must stay empty ─────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor="bc-website">Website (leave empty)</label>
        <input
          type="text"
          id="bc-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value=""
          onChange={() => {}}
        />
      </div>

      {/* ─── Error display ───────────────────────────────────────────── */}
      {error && (
        <div className="mt-8 flex items-start gap-3 border border-[#a58a54]/30 bg-[#a58a54]/[0.04] p-4">
          <AlertCircle
            size={16}
            className="text-[#a58a54] shrink-0 mt-0.5"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="text-sm text-[#cfcabf] font-light leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {/* ─── Calculate button ────────────────────────────────────────── */}
      <div className="mt-10">
        <button
          type="button"
          onClick={calculate}
          disabled={isCalculating || !canSubmit}
          className="group inline-flex items-center gap-4 px-8 py-4 bg-[#c9a96e] text-[#050505] text-[11px] tracking-[0.3em] uppercase font-medium hover:bg-[#d8b876] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isCalculating ? (
            <>
              <Loader2
                size={14}
                className="animate-spin"
                strokeWidth={2}
                aria-hidden
              />
              <span className="animate-pulse">Calculating…</span>
            </>
          ) : (
            <>
              <Sparkles size={14} strokeWidth={1.5} aria-hidden />
              <span>Calculate my chart</span>
              <span className="text-[#050505]/60">→</span>
            </>
          )}
        </button>
        {isCalculating && (
          <p className="mt-4 text-[11px] text-[#5a5a5a] font-light leading-relaxed">
            Computing planetary positions from the JPL ephemeris. This
            takes a moment.
          </p>
        )}
      </div>

      {/* ─── Result ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && result.chartData && (
          <motion.div
            id="birth-chart-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-20 pt-12 border-t border-white/[0.06]"
          >
            <ChartDisplay
              chartData={result.chartData}
              svgChart={result.svgChart}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
