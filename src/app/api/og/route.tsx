import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { ALL_ARTICLES } from "@/lib/content/articles";
import { GUIDES } from "@/lib/content/guides";

/**
 * Dynamic OG image — A24-poster / editorial style, matching the site hero.
 *
 * Two paths through this route:
 *
 *  1. AI-generated card (preferred when available)
 *     If a SocialImage exists for the requested slug — either passed
 *     explicitly as ?slug=, or resolved from ?title= by looking up the
 *     matching article or guide — we serve the pre-rendered PNG from
 *     /public/social-images/<slug>.png. These are dark cinematic cards in
 *     the AstroKalki aesthetic, generated via the admin at
 *     /admin/social-images.
 *
 *  2. Programmatic fallback (always available)
 *     If no SocialImage exists, we generate a 1200×630 dark cinematic
 *     poster on-the-fly using next/og. This preserves the original
 *     behaviour for pages that don't have an AI card yet (e.g. the
 *     homepage, /what-to-expect, /patterns/[slug] pillar pages).
 *
 * Usage:
 *   /api/og                              — default hero tagline (fallback)
 *   /api/og?slug=<article-or-guide-slug> — AI card if generated, else fallback
 *   /api/og?title=Custom Title           — AI card (if title matches an
 *                                          article/guide), else custom-title
 *                                          fallback poster
 *   /api/og?subtitle=Custom Subtitle     — optional secondary line on fallback
 *   /api/og?pattern=abandonment          — pillar-page fallback variant
 *                                          (renders pattern number + name)
 *
 * Runtime: nodejs (was edge). Required because we read from Prisma to
 * look up SocialImage rows. ImageResponse still works under nodejs in
 * Next.js 16.
 */

export const runtime = "nodejs";
// Cache the programmatic fallback at the edge for a week. AI cards are
// served directly from /public/social-images/*.png (static files) and
// inherit Next.js's default static-asset caching, so this header only
// applies to the ImageResponse path.
export const revalidate = 86400;

const SOCIAL_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "social-images");

// Pattern → big numeral (matches the homepage micro-reading UI)
const PATTERN_NUMBERS: Record<string, { number: string; name: string }> = {
  abandonment: { number: "4", name: "The Abandonment Loop" },
  control: { number: "8", name: "The Control Architecture" },
  "people-pleasing": { number: "2", name: "The Chameleon Pattern" },
  "emotional-numbness": { number: "7", name: "The Deep Freeze" },
  overthinking: { number: "5", name: "The Mental Labyrinth" },
  "self-doubt": { number: "3", name: "The Erosion Pattern" },
};

/**
 * Try to resolve a SocialImage for the requested params.
 *
 * Lookup order:
 *   1. ?slug=<slug>          → direct lookup by slug
 *   2. ?title=<title>        → find article/guide with matching title,
 *                              derive its slug, look up SocialImage
 *
 * Returns { slug, imageUrl, filepath } if an AI card exists on disk,
 * null otherwise.
 */
async function resolveSocialImage(
  slugParam: string | null,
  titleParam: string | null
): Promise<{ slug: string; imageUrl: string; filepath: string } | null> {
  let slug: string | undefined;

  if (slugParam) {
    slug = slugParam;
  } else if (titleParam) {
    // Try articles first, then guides. Title match is case-insensitive
    // and exact (titles are unique within their content set).
    const title = titleParam.trim().toLowerCase();
    const article = ALL_ARTICLES.find(
      (a) => a.title.toLowerCase() === title
    );
    if (article) {
      slug = article.slug;
    } else {
      const guide = GUIDES.find((g) => g.title.toLowerCase() === title);
      if (guide) slug = guide.slug;
    }
  }

  if (!slug) return null;

  // DB lookup — if the row doesn't exist, no AI card was ever generated.
  const row = await db.socialImage.findUnique({
    where: { slug },
    select: { slug: true, imageUrl: true },
  });
  if (!row) return null;

  // File lookup — defends against a row existing but the file having been
  // deleted from disk. Falls back to the programmatic OG in that case.
  const filepath = path.join(SOCIAL_DIR, `${slug}.png`);
  if (!existsSync(filepath)) return null;

  return { slug: row.slug, imageUrl: row.imageUrl, filepath };
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const slugParam = sp.get("slug");
  const titleParam = sp.get("title");
  const patternKey = sp.get("pattern");

  // ─── Path 1: serve AI-generated card if available ──────────────────
  try {
    const ai = await resolveSocialImage(slugParam, titleParam);
    if (ai) {
      const buffer = await readFile(ai.filepath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control":
            "public, max-age=86400, s-maxage=604800, immutable",
          // OG images are commonly hot-linked; allow it.
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  } catch (err) {
    // If anything goes wrong looking up the AI card, fall through to the
    // programmatic fallback rather than returning a broken image. Log it
    // so we can see the failure mode in dev.
    console.error("[og] AI card lookup failed, falling back:", err);
  }

  // ─── Path 2: programmatic fallback ─────────────────────────────────
  // Defaults — the homepage tagline. This is what WhatsApp / iMessage /
  // Slack / Twitter preview shows when the bare URL is shared.
  let title = titleParam || "The Same Pain. Different Face. Same Pattern.";
  let subtitle =
    sp.get("subtitle") ||
    "Relationships. Self-sabotage. Emotional confusion.";

  // Pillar-page variant — uses the pattern's signature number + name
  if (patternKey && PATTERN_NUMBERS[patternKey]) {
    const p = PATTERN_NUMBERS[patternKey];
    title = p.name;
    subtitle = "One pattern. Named.";
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#070707",
          padding: "80px 90px",
          fontFamily: "Georgia, 'Times New Roman', serif",
          position: "relative",
        }}
      >
        {/* Top-right ambient glow — psychological red, not mystical */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(120,20,20,0.22), transparent 60%)",
            display: "flex",
          }}
        />

        {/* Top bar — brand + pattern number (if pillar variant) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: "16px",
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: "#c9a96e",
              fontWeight: 400,
            }}
          >
            AstroKalki
          </div>
          {patternKey && PATTERN_NUMBERS[patternKey] && (
            <div
              style={{
                fontSize: "80px",
                color: "#c9a96e",
                fontWeight: 300,
                lineHeight: 1,
                fontStyle: "italic",
                display: "flex",
              }}
            >
              {PATTERN_NUMBERS[patternKey].number}
            </div>
          )}
        </div>

        {/* Title block — light weight, tight tracking, like a movie poster */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 1,
            marginTop: "-40px",
          }}
        >
          <div
            style={{
              fontSize:
                title.length > 60 ? "48px" : title.length > 40 ? "60px" : "72px",
              fontWeight: 300,
              color: "#f0eee9",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              display: "flex",
              maxWidth: "1020px",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: "22px",
                color: "#9a9a9a",
                fontWeight: 300,
                marginTop: "28px",
                letterSpacing: "0.01em",
                display: "flex",
                maxWidth: "900px",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Bottom bar — URL + tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            position: "relative",
            zIndex: 1,
            borderTop: "1px solid rgba(201, 169, 110, 0.18)",
            paddingTop: "24px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#5a5a5a",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontWeight: 300,
              display: "flex",
            }}
          >
            Not prediction. Pattern recognition.
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#7a7a7a",
              letterSpacing: "0.05em",
              fontStyle: "italic",
              display: "flex",
            }}
          >
            astrokalki.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    }
  );
}
