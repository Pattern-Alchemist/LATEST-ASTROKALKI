import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getZAI } from "@/lib/zai";
import {
  checkRateLimit,
  getClientIp,
  isHoneypotTriggered,
  honeypotSuccessResponse,
  emailSchema,
  honeypotSchema,
} from "@/lib/security";
import { getPortraitPrompt } from "@/lib/ai/portrait-prompts";
import { getAllAtlasSlugs } from "@/lib/content/patterns/atlas";

/**
 * POST /api/ai/portrait — generate a unique AI pattern portrait.
 *
 * Flow:
 *   1. Rate-limit by IP (3 per hour — image generation is expensive).
 *   2. Honeypot check (silent 200 for bots).
 *   3. Zod-validate { pattern, email, website }.
 *   4. Resolve the per-pattern image prompt via getPortraitPrompt().
 *   5. Call zai.images.generations.create({ prompt, size: '1024x1024' }).
 *   6. Persist the PNG to /public/portraits/<uuid>.png.
 *   7. Create a PatternPortrait row (email + pattern + prompt + imageUrl).
 *   8. Return { imageUrl, portraitId }.
 *
 * Image generation can take 10-30s. The client sets a 60s timeout. This
 * route does NOT set its own timeout — the SDK call blocks until the model
 * responds or the underlying fetch fails. Next.js route handlers run on a
 * generous default runtime for this kind of work.
 *
 * Public endpoint — no session required (the user has just entered their
 * email in the micro-reading flow). The honeypot + rate limit + Zod
 * validation are the defenses. The middleware already whitelists
 * /api/ai/portrait as a public POST API with a 10MB body cap.
 */

// ─── Pattern slug validation ────────────────────────────────────────────────
// Zod enum of the 10 Atlas slugs. Built dynamically from the source of truth
// so a future Atlas addition is automatically accepted by this route.
const ATLAS_SLUGS = getAllAtlasSlugs() as [string, ...string[]];
const patternSchema = z
  .enum(ATLAS_SLUGS, { message: "Invalid pattern slug" });

const portraitInputSchema = z.object({
  pattern: patternSchema,
  email: emailSchema,
  // Honeypot — bots fill this, humans don't see it.
  website: honeypotSchema,
});

// ─── Rate limit: 3 per IP per hour ──────────────────────────────────────────
// Image generation is expensive (compute + cost). Three per hour lets a user
// generate a portrait, retry on a failure, and regenerate once or twice —
// without leaving the door open to abuse.
const PORTRAIT_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  max: 3,
} as const;

const PORTRAITS_DIR = path.join(process.cwd(), "public", "portraits");

export async function POST(request: NextRequest) {
  // 1. Rate limit
  const ip = getClientIp(request);
  const rl = checkRateLimit(`portrait:${ip}`, PORTRAIT_RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Portrait generation is limited to ${PORTRAIT_RATE_LIMIT.max} per hour. Retry in ${rl.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  // 2. Parse body (10MB cap — already enforced by middleware for /api/ai/portrait,
  // but we double-check here so this route is safe even if middleware changes).
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Body too large" }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3. Honeypot — silently succeed for bots
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      honeypotSuccessResponse("micro-reading"),
      { status: 200 }
    );
  }

  // 4. Zod validation
  const parsed = portraitInputSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
      : "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { pattern, email } = parsed.data;

  // 5. Resolve the image prompt
  let prompt: string;
  try {
    prompt = getPortraitPrompt(pattern);
  } catch {
    return NextResponse.json(
      { error: "Invalid pattern slug" },
      { status: 400 }
    );
  }

  // 6. Call the Z.ai image-generation SDK
  let imageBase64: string;
  try {
    const zai = await getZAI();
    const response = await zai.images.generations.create({
      prompt,
      size: "1024x1024",
    });
    imageBase64 = response.data[0]?.base64;
    if (!imageBase64) {
      throw new Error("Image generation returned no base64 data");
    }
  } catch (error) {
    console.error("[portrait] Image generation failed:", error);
    return NextResponse.json(
      {
        error:
          "Portrait generation failed. The image service is temporarily unavailable — please try again in a moment.",
      },
      { status: 502 }
    );
  }

  // 7. Persist the PNG to /public/portraits/
  //    Filename: a fresh UUID per generation — regenerations get a new file
  //    (and a new row) so the gallery shows distinct portraits.
  const filename = `${randomUUID()}.png`;
  const filepath = path.join(PORTRAITS_DIR, filename);

  try {
    if (!existsSync(PORTRAITS_DIR)) {
      await mkdir(PORTRAITS_DIR, { recursive: true });
    }
    const buffer = Buffer.from(imageBase64, "base64");
    await writeFile(filepath, buffer);
  } catch (error) {
    console.error("[portrait] Failed to write image file:", error);
    return NextResponse.json(
      { error: "Failed to save portrait. Please try again." },
      { status: 500 }
    );
  }

  // 8. Create the PatternPortrait DB row
  const imageUrl = `/portraits/${filename}`;
  let portraitId: string;
  try {
    const portrait = await db.patternPortrait.create({
      data: {
        email,
        pattern,
        prompt,
        imageUrl,
      },
      select: { id: true },
    });
    portraitId = portrait.id;
  } catch (error) {
    console.error("[portrait] DB write failed:", error);
    // The image file was written but the DB row failed. The orphan PNG is
    // harmless — it just sits in /public/portraits/. We return 500 so the
    // client can retry; the next successful call will write a new file.
    return NextResponse.json(
      { error: "Failed to record portrait. Please try again." },
      { status: 500 }
    );
  }

  // 9. Return the public image URL + portrait ID
  return NextResponse.json(
    { imageUrl, portraitId, pattern },
    { status: 201 }
  );
}
