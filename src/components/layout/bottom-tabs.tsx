'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, BarChart3, Coins, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useTranslations } from 'next-intl';

const tabDefs = [
  { id: 'community', key: 'community' as const, icon: Home, href: '/' },
  { id: 'mall', key: 'mall' as const, icon: Store, href: '/mall' },
  { id: 'market', key: 'market' as const, icon: BarChart3, href: '/market' },
  { id: 'earnings', key: 'earnings' as const, icon: Coins, href: '/earnings' },
  { id: 'me', key: 'me' as const, icon: User, href: '/me' },
] as const;

function getActiveTab(pathname: string): string {
  if (pathname.includes('/shop') || pathname.includes('/mall') || pathname.includes('/product')) return 'mall';
  if (pathname.includes('/market')) return 'market';
  if (pathname.includes('/earnings')) return 'earnings';
  if (pathname.includes('/me')) return 'me';
  return 'community';
}

export function BottomTabs() {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const t = useTranslations('nav');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="flex h-16 items-center justify-around px-2 pb-safe">
        {tabDefs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="font-medium">{t(tab.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
