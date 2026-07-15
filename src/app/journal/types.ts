/**
 * Shared types for the Pattern Journal feature.
 *
 * The API serializes Prisma JournalEntry rows into this plain shape, so the
 * client and server agree on the contract without coupling the client to
 * Prisma's generated types.
 */

export type Mood = 'heavy' | 'numb' | 'anxious' | 'clear' | 'angry' | 'tender';

export const MOODS: Array<{
  value: Mood;
  label: string;
  color: string;
  description: string;
}> = [
  {
    value: 'heavy',
    label: 'Heavy',
    color: '#3a3a3a',
    description: 'Weighted down, low gravity, hard to move',
  },
  {
    value: 'numb',
    label: 'Numb',
    color: '#6a6a6a',
    description: 'Flat, distant, not much landing',
  },
  {
    value: 'anxious',
    label: 'Anxious',
    color: '#c9a96e',
    description: 'Buzzing, can\'t settle, scanning',
  },
  {
    value: 'clear',
    label: 'Clear',
    color: '#e2c98f',
    description: 'Steady, present, things are landing',
  },
  {
    value: 'angry',
    label: 'Angry',
    color: '#8b3a3a',
    description: 'Heat in the chest, edges sharp',
  },
  {
    value: 'tender',
    label: 'Tender',
    color: '#c98a8a',
    description: 'Soft, open, easily moved',
  },
];

export const MOOD_VALUES = MOODS.map((m) => m.value);

export const MOOD_COLOR: Record<Mood, string> = MOODS.reduce(
  (acc, m) => {
    acc[m.value] = m.color;
    return acc;
  },
  {} as Record<Mood, string>
);

/**
 * Maps a Mood to a numeric scale (1-6) for the line chart. Lower = heavier /
 * darker, higher = lighter / clearer. This is for visualisation only — the
 * ordering reflects the AstroKalki emotional weather map, not a clinical
 * "better / worse" judgement.
 *
 *   heavy   = 1
 *   numb    = 2
 *   angry   = 3
 *   anxious = 4
 *   tender  = 5
 *   clear   = 6
 */
export const MOOD_SCORE: Record<Mood, number> = {
  heavy: 1,
  numb: 2,
  angry: 3,
  anxious: 4,
  tender: 5,
  clear: 6,
};

export interface JournalEntryDTO {
  id: string;
  email: string;
  date: string; // ISO
  mood: Mood;
  energy: number; // 1-5
  trigger: string | null;
  pattern: string | null;
  note: string | null;
  insight: string | null;
  createdAt: string; // ISO
}

/**
 * Format an ISO date string as YYYY-MM-DD for <input type="date">.
 */
export function toDateInputValue(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format an ISO date string as a short human label (e.g. "Mon 14 Jun").
 */
export function formatShortDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

/**
 * Format an ISO date string as a longer human label (e.g. "14 June 2025").
 */
export function formatLongDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
