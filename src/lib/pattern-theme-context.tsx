'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getPatternColor } from '@/lib/astrology/pattern-colors';

type PatternThemeContextType = {
  selectedPattern: string | null;
  setSelectedPattern: (pattern: string) => void;
  accentColor: string;
  clearPattern: () => void;
};

const PatternThemeContext = createContext<PatternThemeContextType | undefined>(undefined);

export function PatternThemeProvider({ children }: { children: React.ReactNode }) {
  const [selectedPattern, setSelectedPatternState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('astrokalki_pattern');
    if (saved) {
      setSelectedPatternState(saved);
    }
    setMounted(true);
  }, []);

  // Update localStorage and CSS variable when pattern changes
  useEffect(() => {
    if (!mounted) return;

    if (selectedPattern) {
      localStorage.setItem('astrokalki_pattern', selectedPattern);
      const color = getPatternColor(selectedPattern);
      document.documentElement.style.setProperty('--pattern-accent', color);
      // Also update primary color for accent elements
      document.documentElement.style.setProperty('--pattern-accent-rgb', hexToRgb(color));
    } else {
      localStorage.removeItem('astrokalki_pattern');
      document.documentElement.style.setProperty('--pattern-accent', 'var(--gold)');
      document.documentElement.style.setProperty('--pattern-accent-rgb', 'var(--gold)');
    }
  }, [selectedPattern, mounted]);

  const setSelectedPattern = (pattern: string) => {
    setSelectedPatternState(pattern);
  };

  const clearPattern = () => {
    setSelectedPatternState(null);
  };

  const accentColor = selectedPattern ? getPatternColor(selectedPattern) : '#c9a96e'; // default gold

  return (
    <PatternThemeContext.Provider
      value={{
        selectedPattern,
        setSelectedPattern,
        accentColor,
        clearPattern,
      }}
    >
      {children}
    </PatternThemeContext.Provider>
  );
}

export function usePatternTheme() {
  const context = useContext(PatternThemeContext);
  if (context === undefined) {
    throw new Error('usePatternTheme must be used within PatternThemeProvider');
  }
  return context;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return '201, 169, 110'; // default gold RGB
}
