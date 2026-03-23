import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';

/**
 * Write text to clipboard. Works in Capacitor native WebView and browsers.
 * Returns true if copy succeeded.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1) Capacitor native plugin — works reliably on Android/iOS WebView
  if (Capacitor.isNativePlatform()) {
    try {
      await Clipboard.write({ string: text });
      return true;
    } catch {}
  }

  // 2) Clipboard API (requires HTTPS or localhost)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  // 3) Legacy execCommand fallback
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return true;
  } catch {}

  return false;
}

/**
 * Read text from clipboard. Works in Capacitor native WebView and browsers.
 * Returns the clipboard text, or empty string on failure.
 */
export async function readFromClipboard(): Promise<string> {
  // 1) Capacitor native plugin
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Clipboard.read();
      return result.value ?? '';
    } catch {}
  }

  // 2) Clipboard API (requires HTTPS + permission)
  if (navigator.clipboard?.readText) {
    try {
      return await navigator.clipboard.readText();
    } catch {}
  }

  return '';
}
