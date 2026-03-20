import { create } from 'zustand';
import type { Locale } from '@/i18n/config';
import { locales, defaultLocale } from '@/i18n/config';

const STORAGE_KEY = 'nexus_locale';

function loadLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && locales.includes(saved)) return saved;
  } catch {}
  return defaultLocale;
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: loadLocale(),
  setLocale: (locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale);
    }
    set({ locale });
  },
}));
