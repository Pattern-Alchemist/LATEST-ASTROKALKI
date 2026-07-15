"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { translations, type Locale } from "./i18n";

const STORAGE_KEY = "astrokalki-locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "hi" || stored === "en") return stored;
  } catch {
    // localStorage unavailable
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getStoredLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = translations[locale] ?? translations.en;
      const value = dict[key];
      if (value !== undefined) return value;
      // Fallback to English
      const fallback = translations.en[key];
      if (fallback !== undefined) return fallback;
      // Last resort: return the key itself
      return key;
    },
    [locale]
  );

  // Always render children — the locale starts as "en" on SSR,
  // then updates to the stored locale on client hydration.
  // This prevents a blank flash on first load.

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
