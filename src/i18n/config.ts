export const locales = ['zh', 'en', 'ja', 'ko', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Eagerly import default locale so the first render is synchronous
// (avoids blank screen in Capacitor WebView where dynamic import may stall).
import defaultMessages from '../../messages/en.json';
export { defaultMessages };

export async function getMessages(locale: Locale = defaultLocale) {
  if (locale === defaultLocale) return defaultMessages;
  return (await import(`../../messages/${locale}.json`)).default;
}
