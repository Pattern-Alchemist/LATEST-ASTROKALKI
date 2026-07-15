'use client';

import React, { useState } from 'react';
import { usePatternTheme } from '@/lib/pattern-theme-context';
import { getAllPatternColors } from '@/lib/astrology/pattern-colors';
import { Button } from '@/components/ui/button';

const PATTERN_NAMES: Record<string, { name: string; description: string }> = {
  'the-rescuer': { name: 'The Rescuer', description: 'Warm, supportive energy' },
  'the-abandonment': { name: 'Abandonment', description: 'Melancholic, introspective' },
  'the-performer': { name: 'The Performer', description: 'Bold, luminous presence' },
  'the-invisible-child': { name: 'Invisible Child', description: 'Hidden, contemplative' },
  'the-emotional-caretaker': { name: 'Emotional Caretaker', description: 'Nurturing, grounded' },
  'the-self-sabotage': { name: 'Self-Sabotage', description: 'Fiery, intense energy' },
  'the-chaser': { name: 'The Chaser', description: 'Pursuing, dynamic' },
  'the-avoider': { name: 'The Avoider', description: 'Cool, withdrawn' },
  'the-outsider': { name: 'The Outsider', description: 'Bronze, distinct perspective' },
  'the-hyper-independent': { name: 'Hyper-Independent', description: 'Armored, stoic' },
  'the-overthinker': { name: 'The Overthinker', description: 'Intellectual, brass-like clarity' },
};

export function PatternSelector({ showDescription = true }: { showDescription?: boolean }) {
  const { selectedPattern, setSelectedPattern, clearPattern } = usePatternTheme();
  const [isOpen, setIsOpen] = useState(false);
  const colors = getAllPatternColors();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/80">Theme Pattern</label>
        {selectedPattern && (
          <button
            onClick={clearPattern}
            className="text-xs text-foreground/60 hover:text-foreground/80 underline"
          >
            Reset to default
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 md:grid-cols-5 lg:grid-cols-6">
        {Object.entries(colors).map(([slug, color]) => (
          <button
            key={slug}
            onClick={() => {
              setSelectedPattern(slug);
              setIsOpen(false);
            }}
            className={`
              relative h-10 rounded-md transition-all duration-200
              ${selectedPattern === slug
                ? 'ring-2 ring-offset-1 ring-offset-background ring-foreground/50'
                : 'hover:ring-1 hover:ring-foreground/30'
              }
            `}
            style={{ backgroundColor: color }}
            title={PATTERN_NAMES[slug]?.name || slug}
          />
        ))}
      </div>

      {selectedPattern && showDescription && PATTERN_NAMES[selectedPattern] && (
        <div className="text-xs text-foreground/70 pt-2 border-t border-border">
          <p className="font-medium">{PATTERN_NAMES[selectedPattern].name}</p>
          <p className="text-foreground/50">{PATTERN_NAMES[selectedPattern].description}</p>
        </div>
      )}
    </div>
  );
}
