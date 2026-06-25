/**
 * Zentro Digital Twin — Locale Context
 *
 * Provides a `t(key)` translation function and `setLocale` to every component.
 * Components never import locale dicts directly — they consume this context only.
 *
 * The context has a built-in default value (Hebrew) so components render
 * correctly even when rendered outside a <LocaleProvider> (e.g., in unit tests).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Locale, TranslationKey, LocaleConfig } from './types.js';
import { HE, HE_CONFIG } from './locales/he.js';
import { EN, EN_CONFIG } from './locales/en.js';

// ---------------------------------------------------------------------------
// Locale registry — add entries here to support new locales
// ---------------------------------------------------------------------------

const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  he: HE_CONFIG,
  en: EN_CONFIG,
};

const LOCALE_TRANSLATIONS = { he: HE, en: EN };

// ---------------------------------------------------------------------------
// t() function factory
// ---------------------------------------------------------------------------

export type TFunction = (key: TranslationKey, args?: { count: number }) => string;

function makeTFunction(locale: Locale): TFunction {
  const dict = LOCALE_TRANSLATIONS[locale];
  return (key, args) => {
    const val = dict[key];
    if (typeof val === 'function') {
      return val(args ?? { count: 0 });
    }
    return val;
  };
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface LocaleContextValue {
  locale:    Locale;
  config:    LocaleConfig;
  t:         TFunction;
  setLocale: (locale: Locale) => void;
}

const DEFAULT_LOCALE: Locale = 'he';

const LocaleContext = createContext<LocaleContextValue>({
  locale:    DEFAULT_LOCALE,
  config:    HE_CONFIG,
  t:         makeTFunction(DEFAULT_LOCALE),
  setLocale: () => void 0,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface LocaleProviderProps {
  children:       ReactNode;
  defaultLocale?: Locale;
}

export function LocaleProvider({ children, defaultLocale = DEFAULT_LOCALE }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  // Sync document.documentElement.lang and dir on locale change
  useEffect(() => {
    const cfg = LOCALE_CONFIGS[locale];
    if (typeof document !== 'undefined') {
      document.documentElement.lang = cfg.htmlLang;
      document.documentElement.dir  = cfg.dir;
    }
  }, [locale]);

  const config = LOCALE_CONFIGS[locale]!;
  const t      = makeTFunction(locale);

  return (
    <LocaleContext.Provider value={{ locale, config, t, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
