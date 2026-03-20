import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { BottomTabs } from '@/components/layout/bottom-tabs';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'NEXUS Community',
  description: 'NEXUS Community dApp',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#B2955D',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1 pb-16">{children}</div>
            <BottomTabs />
          </div>
        </Providers>
      </body>
    </html>
  );
}
