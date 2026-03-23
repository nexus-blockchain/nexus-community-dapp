'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ApiProvider } from '@/lib/chain/api-provider';
import { Toaster } from '@/components/ui/toaster';
import { UnlockDialog } from '@/components/wallet/unlock-dialog';
import { SigningDialog } from '@/components/wallet/signing-dialog';
import { useAutoLock } from '@/hooks/use-auto-lock';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, defaultMessages, defaultLocale, type Locale } from '@/i18n/config';

// Pre-warm WASM crypto so wallet creation/import is instant
cryptoWaitReady().catch(() => {});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

function IntlProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  // Start with synchronous default messages so the first paint is never blank
  const [messages, setMessages] = useState<Record<string, any>>(defaultMessages);
  const [currentLocale, setCurrentLocale] = useState<Locale>(defaultLocale);

  // Keep <html lang> in sync with the selected locale
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  useEffect(() => {
    // Only fetch asynchronously when locale differs from the default
    if (locale === defaultLocale) {
      setMessages(defaultMessages);
      setCurrentLocale(defaultLocale);
      return;
    }
    getMessages(locale).then((msgs) => {
      setMessages(msgs);
      setCurrentLocale(locale);
    });
  }, [locale]);

  return (
    <NextIntlClientProvider locale={currentLocale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

function WalletLockGuard() {
  useAutoLock();
  return <UnlockDialog />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider>
        <IntlProvider>
          {children}
          <Toaster />
          <WalletLockGuard />
          <SigningDialog />
        </IntlProvider>
      </ApiProvider>
    </QueryClientProvider>
  );
}
