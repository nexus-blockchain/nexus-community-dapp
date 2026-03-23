export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh';

// Eagerly import default locale so the first render is synchronous
// (avoids blank screen in Capacitor WebView where dynamic import may stall).
import defaultMessages from '../../messages/zh.json';
export { defaultMessages };

export async function getMessages(locale: Locale = defaultLocale) {
  if (locale === defaultLocale) return defaultMessages;
  return (await import(`../../messages/${locale}.json`)).default;
}
