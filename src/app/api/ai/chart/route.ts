import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs, existsSync } from "fs";
import { join, extname } from "path";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";

import { db } from "@/lib/db";
import { getZAI } from "@/lib/zai";
import { notifyAdmin } from "@/lib/email";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/security";
import {
  buildChartAnalysisPrompt,
  parseChartAnalysisResponse,
  NOT_A_CHART_RESPONSE,
} from "@/lib/ai/chart-prompt";

/**
 * POST /api/ai/chart
 *
 * Public endpoint (no auth required) — uploads a birth chart image, runs it
 * through the VLM, saves the analysis to the ChartAnalysis table, and
 * returns the prose + identified patterns.
 *
 *   Content-Type: multipart/form-data
 *   Body:
 *     image    — File (png/jpg/webp, ≤5MB)
 *     email    — string (required, validated; for non-members this is the
 *                lead-capture email)
 *     website  — honeypot (must be empty; bots fill this)
 *
 *   Returns 200: { analysis, identifiedPatterns, analysisId, isNotAChart }
 *   Returns 4xx: { error }
 *
 * Rate limit: 3 per hour per IP. Chart analysis is expensive — each call
 * sends a base64 image to the VLM — so the limit is intentionally tight.
 *
 * The middleware already whitelists /api/ai/chart for POST and raises the
 * body-size cap to 10MB for this path (see /src/middleware.ts §3). The
 * 5MB file cap below is enforced on the parsed file size after the
 * multipart form is decoded.
 */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

const UPLOAD_DIR = join(process.cwd(), "public", "chart-uploads");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Email too short")
  .max(254, "Email too long")
  .email("Invalid email format")
  .refine((e) => !e.endsWith(".con"), "Did you mean .com?")
  .refine((e) => !e.endsWith(".cm"), "Did you mean .com?");

export async function POST(request: NextRequest) {
  // ─── Rate limit: 3 per hour per IP ────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`chart:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 3,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many chart analyses. Try again in ${rl.retryAfterSeconds}s.` },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  // ─── Parse multipart form ─────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error("Chart upload formData parse error:", err);
    return NextResponse.json(
      { error: "Invalid multipart form data" },
      { status: 400 }
    );
  }

  // ─── Honeypot check — bots fill the "website" field ───────────────────
  // For multipart forms, the honeypot comes in as a regular text field.
  const honeypotValue = formData.get("website");
  if (
    typeof honeypotValue === "string" &&
    honeypotValue.trim() !== ""
  ) {
    // Silently succeed for bots — they think the analysis ran.
    return NextResponse.json(
      {
        analysis:
          "Your chart has been analysed. The identified patterns will be emailed to you shortly.",
        identifiedPatterns: [],
        analysisId: "fake-id",
        isNotAChart: false,
      },
      { status: 200 }
    );
  }

  // ─── Validate email ───────────────────────────────────────────────────
  const emailField = formData.get("email");
  if (typeof emailField !== "string" || emailField.trim() === "") {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }
  const emailResult = emailSchema.safeParse(emailField);
  if (!emailResult.success) {
    return NextResponse.json(
      { error: emailResult.error.issues[0]?.message || "Invalid email" },
      { status: 400 }
    );
  }
  const email = emailResult.data;

  // ─── Validate image file ──────────────────────────────────────────────
  const file = formData.get("image");
  if (!file) {
    return NextResponse.json(
      { error: "Missing 'image' file field" },
      { status: 400 }
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "'image' field must be a file" },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "Image file is empty" },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      {
        error: `Image is ${mb} MB — max upload is 5 MB. Please upload a smaller image.`,
      },
      { status: 413 }
    );
  }

  const mimeType = (file.type || "").toLowerCase();
  const originalName = file.name || "chart.png";
  const ext = extname(originalName).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(mimeType);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk && !extOk) {
    return NextResponse.json(
      {
        error: `File type not allowed. Got ${mimeType || "unknown"} (${ext || "no extension"}). Allowed: PNG, JPG, WEBP.`,
      },
      { status: 415 }
    );
  }

  let safeExt = ext;
  if (!extOk) {
    safeExt = MIME_TO_EXT[mimeType] || ".png";
  }
  if (!safeExt.startsWith(".")) safeExt = `.${safeExt}`;

  // ─── Ensure upload directory exists ───────────────────────────────────
  if (!existsSync(UPLOAD_DIR)) {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (err) {
      console.error("Failed to create chart-uploads directory:", err);
      return NextResponse.json(
        { error: "Server storage unavailable" },
        { status: 500 }
      );
    }
  }

  // ─── Save image to public/chart-uploads/<uuid>.<ext> ──────────────────
  const cuid = randomUUID();
  const filename = `${cuid}${safeExt}`;
  const destPath = join(UPLOAD_DIR, filename);

  let imageBuffer: Buffer;
  try {
    const bytes = await file.arrayBuffer();
    imageBuffer = Buffer.from(bytes);
    await writeFile(destPath, imageBuffer);
  } catch (err) {
    console.error("Failed to write uploaded chart image:", err);
    return NextResponse.json(
      { error: "Failed to store image" },
      { status: 500 }
    );
  }

  const publicUrl = `/chart-uploads/${filename}`;

  // ─── Convert image to base64 data URL for the VLM ─────────────────────
  const dataUrl = `data:${mimeType || "image/png"};base64,${imageBuffer.toString("base64")}`;

  // ─── Call the VLM with the chart prompt ───────────────────────────────
  let rawAnalysis = "";
  try {
    const zai = await getZAI();
    const prompt = buildChartAnalysisPrompt();
    const response = await zai.chat.completions.createVision({
      model: "glm-4.6v",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });
    rawAnalysis = response.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("VLM chart analysis failed:", err);
    // Clean up the uploaded file — no point keeping it if we couldn't analyse.
    try {
      await fs.unlink(destPath);
    } catch {}
    return NextResponse.json(
      {
        error:
          "We couldn't analyse your chart right now. Please try again in a moment.",
      },
      { status: 502 }
    );
  }

  // ─── Parse the VLM response ───────────────────────────────────────────
  const parsed = parseChartAnalysisResponse(rawAnalysis);

  // ─── If the VLM says it's not a chart, return that gracefully ─────────
  // We still save the row (with the not-a-chart prose) so the user has a
  // record and the brand owner can audit false-negatives.
  if (parsed.isNotAChart) {
    let notChartId = "unsaved";
    try {
      const row = await db.chartAnalysis.create({
        data: {
          email,
          imageUrl: publicUrl,
          analysis: NOT_A_CHART_RESPONSE,
          identifiedPatterns: JSON.stringify([]),
        },
      });
      notChartId = row.id;
    } catch (err) {
      console.error("Failed to save not-a-chart row:", err);
    }

    return NextResponse.json(
      {
        analysis: NOT_A_CHART_RESPONSE,
        identifiedPatterns: [],
        analysisId: notChartId,
        isNotAChart: true,
      },
      { status: 200 }
    );
  }

  // ─── Save the analysis to the database ────────────────────────────────
  let analysisId = "unsaved";
  try {
    const row = await db.chartAnalysis.create({
      data: {
        email,
        imageUrl: publicUrl,
        analysis: parsed.prose,
        identifiedPatterns: JSON.stringify(parsed.identifiedPatterns),
      },
    });
    analysisId = row.id;
  } catch (err) {
    console.error("Failed to save chart analysis row:", err);
    // We still return the analysis to the user — the work was done.
  }

  // ─── Notify the brand owner (non-blocking) ────────────────────────────
  // This is a lead-gen tool — every chart analysis is a potential session
  // booking. We send a brief notification so the brand owner can follow up.
  notifyAdmin({
    subject: `[AstroKalki] New chart analysis — ${email}`,
    text: [
      `New chart analysis captured.`,
      ``,
      `Email: ${email}`,
      `Analysis ID: ${analysisId}`,
      `Image: ${publicUrl}`,
      `Identified patterns: ${
        parsed.identifiedPatterns.length > 0
          ? parsed.identifiedPatterns.join(", ")
          : "(none)"
      }`,
      ``,
      `Prose analysis:`,
      parsed.prose,
    ].join("\n"),
    html: `
      <div style="background:#070707;color:#f0eee9;font-family:Georgia,serif;padding:32px 24px;max-width:600px;margin:0 auto;">
        <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 16px;">New chart analysis</p>
        <p style="font-size:14px;line-height:1.8;color:#cfcabf;font-weight:300;">
          <strong>Email:</strong> ${email}<br/>
          <strong>Analysis ID:</strong> ${analysisId}<br/>
          <strong>Image:</strong> <a href="${publicUrl}" style="color:#a58a54;">${publicUrl}</a><br/>
          <strong>Patterns:</strong> ${
            parsed.identifiedPatterns.length > 0
              ? parsed.identifiedPatterns.join(", ")
              : "(none)"
          }
        </p>
        <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;"/>
        <p style="font-size:13px;line-height:1.8;color:#9a9a9a;font-weight:300;white-space:pre-wrap;">${parsed.prose}</p>
      </div>
    `,
  }).catch(() => {
    /* non-blocking */
  });

  return NextResponse.json(
    {
      analysis: parsed.prose,
      identifiedPatterns: parsed.identifiedPatterns,
      analysisId,
      isNotAChart: false,
    },
    { status: 200 }
  );
}
