/**
 * Journal weekly-insight prompt builder.
 *
 * The Pattern Journal is the only AstroKalki feature that asks members to do
 * the daily emotional labour of self-observation. The weekly insight is the
 * reward — a quiet, second-person synthesis of what surfaced across the last
 * seven days, written in the AstroKalki editorial voice.
 *
 * Voice rules:
 *   - Second person ("you"), direct, no jargon, no clinical language.
 *   - Never diagnose. Never prescribe. Only reflect what is already there.
 *   - Never use the words "disorder", "syndrome", "diagnosis", "cure",
 *     "treatment", "therapy", "pathology", "symptom" (the journal uses "sign"
 *     and "what surfaced" instead).
 *   - Reference one of the 10 Atlas patterns only when the data clearly
 *     points to it. Do not force-fit.
 *   - 2-3 paragraphs. End with one reflective question. No bullet points,
 *     no headers, no closing signature.
 */

import type { Prisma } from '@prisma/client';
import { ATLAS_PATTERNS } from '@/lib/content/patterns/atlas';

export type Mood = 'heavy' | 'numb' | 'anxious' | 'clear' | 'angry' | 'tender';
type JournalEntry = Prisma.JournalEntryUncheckedCreateInput & { date: Date; id: string };

const MOOD_LABEL: Record<Mood, string> = {
  heavy: 'heavy',
  numb: 'numb',
  anxious: 'anxious',
  clear: 'clear',
  angry: 'angry',
  tender: 'tender',
};

/**
 * Render a single journal entry as a one-line summary for the LLM context.
 * Example: "Mon 14 — mood: anxious, energy: 3/5, trigger: a text from an ex,
 * pattern: the-abandonment, note: 'couldn't focus after that'."
 */
function entryToLine(entry: JournalEntry): string {
  const day = entry.date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const parts: string[] = [
    `${day}`,
    `mood: ${MOOD_LABEL[entry.mood as Mood] || entry.mood}`,
    `energy: ${entry.energy}/5`,
  ];
  if (entry.trigger && entry.trigger.trim()) {
    parts.push(`trigger: "${entry.trigger.trim()}"`);
  }
  if (entry.pattern && entry.pattern.trim()) {
    const atlas = ATLAS_PATTERNS.find((p) => p.slug === entry.pattern);
    parts.push(`pattern: ${atlas ? atlas.name : entry.pattern}`);
  }
  if (entry.note && entry.note.trim()) {
    parts.push(`note: "${entry.note.trim()}"`);
  }
  return `- ${parts.join(', ')}`;
}

/**
 * The AstroKalki system prompt — defines the voice and the rules of reflection.
 * Passed as the first message (role: 'assistant') per the SDK usage pattern.
 */
export const JOURNAL_INSIGHT_SYSTEM_PROMPT = `You are the voice of AstroKalki — a depth-psychology practice that uses the birth chart as a mirror, not a forecast. You are writing a weekly synthesis for someone who has been logging their emotional state daily. You speak in second person. You are direct. You are calm. You never pathologize.

Rules:
- Write 2 to 3 paragraphs. No headers. No bullet points.
- Begin by naming what surfaced across the week — the dominant emotional weather, not a diagnosis.
- If the data clearly points to one of the ten Atlas patterns (The Rescuer, The Abandonment, The Performer, The Invisible Child, The Emotional Caretaker, The Self-Sabotage, The Chaser, The Avoider, The Outsider, The Hyper-Independent, The Overthinker), name it once. Do not force a connection. If no pattern fits, say nothing about patterns.
- Connect the moods, energies, and triggers to each other when a thread is visible. If there is no thread, simply describe the variation.
- Never use the words: disorder, syndrome, diagnosis, cure, treatment, therapy, pathology, symptom. Use "what surfaced", "what you noticed", "the shape of the week" instead.
- Never tell the reader what to do. Never prescribe an action. Reflect, do not instruct.
- End with exactly one reflective question, on its own line. The question should invite the reader to sit with something, not to fix it.
- Do not sign off. Do not add a closing line after the question.
- Keep the total response under 320 words.`;

/**
 * Build the user-message payload that summarises the week's entries.
 * Returns the prompt string ready to pass to the LLM as the user message.
 */
export function buildJournalInsightUserPrompt(entries: JournalEntry[]): string {
  if (entries.length === 0) {
    return 'The member has no journal entries for the past 7 days. Respond with a single short paragraph inviting them to log tomorrow.';
  }

  const sorted = [...entries].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Compact statistical summary — helps the model see the shape at a glance.
  const moodCounts = new Map<string, number>();
  let energySum = 0;
  const patternCounts = new Map<string, number>();
  for (const e of sorted) {
    moodCounts.set(e.mood, (moodCounts.get(e.mood) || 0) + 1);
    energySum += e.energy;
    if (e.pattern) {
      patternCounts.set(e.pattern, (patternCounts.get(e.pattern) || 0) + 1);
    }
  }
  const dominantMood = [...moodCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];
  const avgEnergy = (energySum / sorted.length).toFixed(1);
  const topPattern = [...patternCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  const lines = sorted.map(entryToLine);

  const summary: string[] = [
    `Week of ${sorted[0].date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${sorted[sorted.length - 1].date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}.`,
    `${sorted.length} entr${sorted.length === 1 ? 'y' : 'ies'}.`,
    `Dominant mood: ${dominantMood || 'mixed'}.`,
    `Average energy: ${avgEnergy}/5.`,
  ];
  if (topPattern) {
    const atlas = ATLAS_PATTERNS.find((p) => p.slug === topPattern);
    summary.push(
      `Most-tagged pattern: ${atlas ? atlas.name : topPattern}.`
    );
  }

  return [
    'Here is this week\'s Pattern Journal data, in chronological order:',
    '',
    ...lines,
    '',
    'Summary:',
    summary.join(' '),
    '',
    'Write the weekly synthesis now, following the voice rules.',
  ].join('\n');
}

/**
 * The set of Atlas pattern slugs the LLM is allowed to reference. Exported so
 * the insight route can sanity-check the model's output if needed.
 */
export const ALLOWED_PATTERN_SLUGS = ATLAS_PATTERNS.map((p) => p.slug);
