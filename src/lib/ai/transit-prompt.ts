/**
 * LLM prompt builder for the daily transit check-in — AstroKalki M10-b.
 *
 * The daily check-in is the personalised counterpart to the public
 * /transits page. For members with a birth chart, it cross-references
 * today's transits against their natal placements, names which Atlas
 * patterns are activated, and writes a 2-3 paragraph insight in the
 * AstroKalki voice — followed by one journal prompt.
 *
 * Voice rules (mirrors journal-prompt.ts):
 *   - Second person ("you"), direct, no jargon, no clinical language.
 *   - Never diagnose. Never prescribe. Reflect what is already there.
 *   - Frame the transit info as "the current pattern weather" — not as
 *     "the stars say" or "the planets are causing".
 *   - Reference one Atlas pattern by name only when the activation
 *     data clearly points to it. Do not force-fit.
 *   - 2-3 paragraphs of insight, then one journal prompt on its own
 *     line, prefixed with "Prompt: ".
 */

import type { TransitData, TransitPlanetName } from '@/lib/astrology/transits';
import { TRANSIT_PLANET_ORDER, formatTransitDegree } from '@/lib/astrology/transits';
import type { PatternActivation } from '@/lib/astrology/pattern-activation';
import type { ChartData } from '@/lib/astrology/chart-calculator';
import { ZODIAC_SIGNS } from '@/lib/astrology/zodiac';

/**
 * System prompt — defines the AstroKalki voice for transit insights.
 * Passed as the first message (role: 'assistant') per the SDK pattern.
 */
export const TRANSIT_INSIGHT_SYSTEM_PROMPT = `You are the voice of AstroKalki — a depth-psychology practice that uses the birth chart as a mirror, not a forecast. You are writing a daily transit check-in for a member who has cast their birth chart. You speak in second person. You are direct. You are calm. You never pathologize. You never predict.

Rules:
- Write 2 to 3 paragraphs of insight. No headers. No bullet points.
- Frame the transits as "the current pattern weather" — never as "the planets are causing", "the stars say", or "Mercury is making you". The weather is a metaphor for what is being illuminated, not a cause.
- If the activation data clearly points to one of the eleven Atlas patterns (The Rescuer, The Abandonment, The Performer, The Invisible Child, The Emotional Caretaker, The Self-Sabotage, The Chaser, The Avoider, The Outsider, The Hyper-Independent, The Overthinker), name it once. Do not force a connection.
- Connect the transit positions to the member's natal placements when the data is given. If the member has no birth chart, speak in general archetypal terms.
- Never use the words: disorder, syndrome, diagnosis, cure, treatment, therapy, pathology, symptom. Use "what is being illuminated", "what surfaced", "the pattern weather" instead.
- Never tell the reader what to do. Never prescribe an action. Reflect, do not instruct.
- After the insight paragraphs, write exactly one journal prompt on its own line, prefixed with the literal text "Prompt: ". The prompt should invite the reader to write — not to fix, not to plan, just to write.
- Do not sign off. Do not add a closing line after the prompt.
- Keep the insight (excluding the prompt line) under 300 words.`;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function signGlyph(index: number): string {
  return ZODIAC_SIGNS[((Math.floor(index) % 12) + 12) % 12].symbol;
}

function describeTransit(
  name: TransitPlanetName,
  transit: TransitData['planets'][TransitPlanetName],
): string {
  const retro = transit.retrograde ? ' (retrograde)' : '';
  return `${name} ${signGlyph(transit.signIndex)} ${transit.signName} ${formatTransitDegree(transit.degree)}${retro}`;
}

/**
 * Build the user-message payload that summarises today's transits,
 * the activated patterns, and (optionally) the member's natal chart.
 *
 * The structure is intentionally compact — the LLM gets the data in a
 * scannable form so it can write the insight without parsing prose.
 */
export function buildTransitInsightUserPrompt(
  transits: TransitData,
  activations: PatternActivation[],
  birthChart?: ChartData,
): string {
  const date = new Date(transits.date);
  const dateStr = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // ─── Transit summary ──────────────────────────────────────────────
  const transitLines = TRANSIT_PLANET_ORDER.map((name) =>
    `- ${describeTransit(name, transits.planets[name])}`,
  );

  // ─── Natal chart summary (if available) ───────────────────────────
  const natalLines: string[] = [];
  if (birthChart) {
    const asc = birthChart.ascendant;
    natalLines.push(
      `- Ascendant (Lagna): ${signGlyph(asc.signIndex)} ${ZODIAC_SIGNS[asc.signIndex].name} ${formatTransitDegree(asc.degreeInSign)}`,
    );
    for (const p of birthChart.planets) {
      if (p.name === 'Ascendant') continue;
      const retro = p.retrograde ? ' (retrograde)' : '';
      natalLines.push(
        `- ${p.name} ${signGlyph(p.signIndex)} ${ZODIAC_SIGNS[p.signIndex].name} ${formatTransitDegree(p.degreeInSign)}, house ${p.house}${retro}`,
      );
    }
  }

  // ─── Activations summary ──────────────────────────────────────────
  const activationLines = activations.map(
    (a) => `- ${a.patternName} (intensity ${a.intensity.toFixed(2)}): ${a.reason}`,
  );

  // ─── Assemble ─────────────────────────────────────────────────────
  const sections: string[] = [
    `Today is ${dateStr}.`,
    '',
    'Current planetary transits (sidereal, Lahiri):',
    ...transitLines,
    '',
  ];

  if (natalLines.length > 0) {
    sections.push(
      "The member's natal chart (the architecture of their tendencies):",
      ...natalLines,
      '',
    );
  } else {
    sections.push(
      'The member has not cast a birth chart yet. Speak in general archetypal terms — do not reference their houses or Ascendant.',
      '',
    );
  }

  if (activationLines.length > 0) {
    sections.push(
      'Atlas patterns activated by today\u2019s transits' +
        (birthChart ? ' (cross-referenced with the natal chart):' : ':'),
      ...activationLines,
      '',
    );
  } else {
    sections.push(
      'No Atlas patterns are strongly activated by today\u2019s transits. The weather is relatively quiet; write the insight in that spirit.',
      '',
    );
  }

  sections.push(
    'Write the daily check-in insight now, following the voice rules. End with the journal prompt on its own line, prefixed with "Prompt: ".',
  );

  return sections.join('\n');
}

/**
 * Extract the journal prompt from the LLM response. Looks for a line
 * starting with "Prompt: " (case-insensitive). Returns null if not
 * found — the caller can then fall back to a default prompt.
 */
export function extractJournalPrompt(insight: string): string | null {
  const match = insight.match(/(?:^|\n)\s*Prompt:\s*(.+?)(?:\n|$)/i);
  if (!match) return null;
  return match[1].trim();
}

/**
 * Strip the "Prompt: ..." line from the insight text so the UI can
 * render the insight paragraphs and the prompt separately.
 */
export function stripPromptLine(insight: string): string {
  return insight
    .replace(/(?:^|\n)\s*Prompt:\s*.+?(?:\n|$)/gi, '')
    .trim();
}

/**
 * A fallback journal prompt used when the LLM response didn't include
 * one. Neutral, open-ended, fits any transit weather.
 */
export const FALLBACK_JOURNAL_PROMPT =
  'What did you notice in your body today that you would normally skip past?';
