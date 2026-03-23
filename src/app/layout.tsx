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
      <head>
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: https:; img-src 'self' data: blob: https:; font-src 'self' data:;" />
      </head>
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
