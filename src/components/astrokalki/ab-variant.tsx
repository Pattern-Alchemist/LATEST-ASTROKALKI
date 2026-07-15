"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * <AbVariant> — client-side wrapper for A/B testing.
 *
 * Usage:
 *   <AbVariant
 *     experimentName="hero-headline"
 *     variants={{
 *       b: <AlternativeHeadline/>,
 *       c: <ThirdHeadline/>,
 *     }}
 *     default={<DefaultHeadline/>}
 *   />
 *
 * Behaviour:
 *   1. On mount, fires `GET /api/experiment/assign?name=<experimentName>`.
 *      The server reads (or issues) the visitor's `ak_sid` cookie, looks
 *      up the experiment, and returns the assigned variant for this
 *      session — sticky across visits.
 *   2. While the request is in-flight (or if the request fails, or if
 *      the experiment is inactive/missing), the `default` prop renders.
 *      This avoids layout shift: the visitor sees the control content
 *      immediately and only a small subset swaps to the treatment on
 *      first paint.
 *   3. Once a variant resolves, the matching child from `variants` is
 *      rendered instead. The variant name returned by the server is the
 *      key into the `variants` map.
 *
 * Why client-side (and not server-side) rendering of the variant?
 *   - AstroKalki's hero is a client component (uses framer-motion scroll
 *     transforms). Server-rendering an alternative would require
 *     restructuring that whole component tree.
 *   - The cookie is the only piece of session state needed — and it
 *     travels automatically with the fetch request. There's no need to
 *     plumb the session through React Server Component props.
 *   - The downside (a brief flash of the default headline before the
 *     variant swaps in) is acceptable here because the hero animates in
 *     over 400ms anyway — the variant swap is invisible inside that
 *     animation envelope.
 *
 * Failure-isolation: this component NEVER throws. If the assignment
 * fetch errors, the variant resolves to `null` and the `default` prop
 * renders permanently. A/B test failures must not break the page.
 */

interface AbVariantProps {
  /** Experiment name (must match a row in the Experiment table). */
  experimentName: string;
  /** Map of variant-name → JSX. The server returns one of these names. */
  variants: { [key: string]: ReactNode };
  /** Rendered while loading, on error, or if no experiment is active. */
  default: ReactNode;
}

interface AssignResponse {
  variant: string | null;
  config?: Record<string, unknown>;
}

export function AbVariant({
  experimentName,
  variants,
  default: defaultContent,
}: AbVariantProps) {
  const [variant, setVariant] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // Time-box the request so a slow /api/experiment/assign (e.g. cold
    // start) can't leave the visitor on the default forever. 2500ms is
    // generous for a single Prisma query, and well inside the hero's
    // 400ms-2.6s animation envelope.
    const timeout = setTimeout(() => controller.abort(), 2500);

    fetch(`/api/experiment/assign?name=${encodeURIComponent(experimentName)}`, {
      signal: controller.signal,
      // Always fresh — we never want a stale variant assignment cached
      // across navigations or experiments being toggled mid-session.
      cache: "no-store",
    })
      .then((r) => r.json() as Promise<AssignResponse>)
      .then((data) => {
        if (cancelled) return;
        setVariant(data.variant);
        setResolved(true);
      })
      .catch(() => {
        // Network error, timeout, JSON parse failure — fall back to default.
        if (cancelled) return;
        setVariant(null);
        setResolved(true);
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [experimentName]);

  // While loading AND no variant yet → render default (avoids layout shift).
  if (!resolved || variant === null) {
    return <>{defaultContent}</>;
  }

  // Server returned a variant name we don't have a child for (e.g. the
  // admin added a variant "c" but the component only ships "b"). Render
  // default rather than nothing.
  if (!variants[variant]) {
    return <>{defaultContent}</>;
  }

  return <>{variants[variant]}</>;
}

export default AbVariant;
