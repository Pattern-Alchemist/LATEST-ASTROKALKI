/**
 * Integration prompts — AI-generated reflective prompts for the recap email.
 *
 * When admin marks a session as completed, we ask the LLM to generate five
 * journal-style questions tailored to the booking's focus areas (contexts).
 * The prompts are designed to help the client sit with what surfaced in the
 * session — not to predict, mystify, or promise transformation.
 *
 * Voice + guardrails:
 *   - Second-person ("you"), direct, psychologically precise.
 *   - Specific, not generic — reference the named pattern/area.
 *   - Questions only, never statements.
 *   - Banned vocabulary: karmic, cosmic, destiny, reveal, unlock.
 *
 * Output contract:
 *   The LLM is instructed to return a strict JSON array of 5 strings. We
 *   defensively parse the response (strip code fences, repair common
 *   malformed output) and fall back to a curated generic set if anything
 *   fails — the recap email must never ship empty.
 */

import { getZAI } from "@/lib/zai";

export interface IntegrationPromptInput {
  /** Booking.contexts (JSON-stringified array of emotional focus areas). */
  contexts: string;
  /** Booking.duration in minutes (30 / 60 / 90). */
  duration: number;
  /** Optional: client's free-text message they left at booking time. */
  message?: string | null;
  /** Optional: the client's first name (for personalization). */
  name?: string | null;
}

const BANNED_WORDS = [
  "karmic",
  "cosmic",
  "destiny",
  "reveal",
  "unlock",
  "reveals",
  "revealed",
  "unlocking",
  "unlocked",
];

const SYSTEM_PROMPT = `You are the voice of AstroKalki — a depth-psychology + Vedic architecture practice. You write with second-person directness, psychological precision, and zero mystical fluff. You do not promise healing. You do not predict. You name patterns.

Your task: write exactly FIVE reflective journal prompts for a client who just finished a one-on-one session. These prompts help the client sit with what surfaced and integrate it slowly — not "fix" anything.

Voice rules (NON-NEGOTIABLE):
- Every prompt is a question, ending with a question mark.
- Address the client as "you". Never "we" or "one".
- Be specific to the named focus area. Reference the pattern language when possible.
- Avoid generic therapy-speak ("How did that make you feel?"). Get under the surface.
- Short. One sentence per prompt. No preamble, no explanation.
- Banned words (never use): karmic, cosmic, destiny, reveal, unlock, reveals, revealed, unlocking, unlocked.

Output format (STRICT):
Return ONLY a JSON array of exactly 5 strings. No prose, no code fences, no explanation.
Example shape: ["Prompt one?", "Prompt two?", "Prompt three?", "Prompt four?", "Prompt five?"]`;

function buildUserMessage(input: IntegrationPromptInput): string {
  const contexts = parseContexts(input.contexts);
  const durationLine = `Session duration: ${input.duration} minutes.`;
  const contextsLine =
    contexts.length > 0
      ? `Focus areas named in the intake:\n${contexts
          .map((c) => `- ${c}`)
          .join("\n")}`
      : `Focus areas: (none explicitly selected — write five prompts that fit a depth-psychology session about recurring patterns.)`;
  const messageLine =
    input.message && input.message.trim().length > 0
      ? `Client's own words at booking time: "${input.message.trim().slice(0, 400)}"`
      : null;
  const nameLine = input.name
    ? `Client's first name: ${input.name}.`
    : null;

  return [
    durationLine,
    nameLine,
    contextsLine,
    messageLine,
    "",
    "Generate 5 integration prompts now. Return only the JSON array.",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseContexts(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
        .filter((s) => s.length > 0)
        .slice(0, 10);
    }
  } catch {
    // Some legacy bookings stored a comma-separated string.
    return raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 10);
  }
  return [];
}

/**
 * Strip code fences + extract the first JSON array from the LLM response.
 */
function extractJsonArray(text: string): string | null {
  if (!text) return null;
  let t = text.trim();
  // Strip ```json ... ``` fences
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  // Find the first '[' ... matching ']' span.
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return t.slice(start, end + 1);
}

function sanitizePrompt(p: string): string | null {
  let s = (p || "").trim();
  if (!s) return null;
  // Strip banned words (case-insensitive) — replace with a neutral phrasing.
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${w}\\b`, "gi");
    if (re.test(s)) {
      s = s.replace(re, "");
      s = s.replace(/\s{2,}/g, " ").trim();
    }
  }
  // Ensure it ends with a question mark.
  if (!s.endsWith("?")) {
    // If it ends with a period or no punctuation, append a question mark.
    s = s.replace(/[.!?]+$/, "").trim();
    s += "?";
  }
  // Cap length — keep prompts tight.
  if (s.length > 220) {
    s = s.slice(0, 217).replace(/[,;:\s-]+$/, "") + "?";
  }
  return s.length >= 8 ? s : null;
}

const FALLBACK_PROMPTS = [
  "What did you notice in your body when the pattern was named out loud?",
  "Where did the story you tell about yourself start to feel incomplete?",
  "What is one situation this week where the old pattern will try to repeat?",
  "Which part of what was said do you most want to argue with — and why?",
  "What would change first if you stopped treating this pattern as who you are?",
];

/**
 * Generate 5 integration prompts via the LLM. Always returns 5 strings —
 * on any failure, a curated fallback set is returned so the recap email
 * never ships empty.
 */
export async function generateIntegrationPrompts(
  input: IntegrationPromptInput
): Promise<string[]> {
  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(input) },
      ],
      thinking: { type: "disabled" },
    });

    const raw =
      // The SDK returns an array of choices; take the first.
      (completion as { choices?: Array<{ message?: { content?: string } }> })
        ?.choices?.[0]?.message?.content ?? "";

    const jsonArray = extractJsonArray(raw);
    if (!jsonArray) {
      console.warn(
        "[integration-prompts] No JSON array found in LLM response; using fallback."
      );
      return FALLBACK_PROMPTS.slice();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonArray);
    } catch {
      console.warn(
        "[integration-prompts] JSON.parse failed on extracted array; using fallback."
      );
      return FALLBACK_PROMPTS.slice();
    }

    if (!Array.isArray(parsed)) {
      return FALLBACK_PROMPTS.slice();
    }

    const cleaned = parsed
      .map((p) => (typeof p === "string" ? sanitizePrompt(p) : null))
      .filter((p): p is string => Boolean(p));

    if (cleaned.length === 0) {
      return FALLBACK_PROMPTS.slice();
    }

    // Pad to 5 if the LLM returned fewer (rare but possible).
    while (cleaned.length < 5) {
      const filler = FALLBACK_PROMPTS[cleaned.length % FALLBACK_PROMPTS.length];
      cleaned.push(filler);
    }

    // Cap at 5.
    return cleaned.slice(0, 5);
  } catch (error) {
    console.error("[integration-prompts] LLM call failed:", error);
    return FALLBACK_PROMPTS.slice();
  }
}
