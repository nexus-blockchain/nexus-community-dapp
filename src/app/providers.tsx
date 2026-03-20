'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { ApiProvider } from '@/lib/chain/api-provider';
import { Toaster } from '@/components/ui/toaster';
import { UnlockDialog } from '@/components/wallet/unlock-dialog';
import { SigningDialog } from '@/components/wallet/signing-dialog';
import { useAutoLock } from '@/hooks/use-auto-lock';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, type Locale } from '@/i18n/config';

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
  const [messages, setMessages] = useState<Record<string, any> | null>(null);
  const [currentLocale, setCurrentLocale] = useState<Locale>(locale);

  useEffect(() => {
    getMessages(locale).then((msgs) => {
      setMessages(msgs);
      setCurrentLocale(locale);
    });
  }, [locale]);

  if (!messages) return null;

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
