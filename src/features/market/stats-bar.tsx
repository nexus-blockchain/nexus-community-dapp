'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBalance } from '@/lib/utils/chain-helpers';
import type { MarketStats } from '@/lib/types';

interface StatsBarProps {
  stats: MarketStats | undefined;
  isLoading: boolean;
}

export function StatsBar({ stats, isLoading }: StatsBarProps) {
  const t = useTranslations('market');

  if (isLoading) {
    return <Skeleton className="h-[68px] w-full rounded-xl" />;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Card>
        <CardContent className="px-3 py-2.5 text-center">
          <p className="text-[11px] text-muted-foreground">{t('totalOrders')}</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums">{stats?.totalOrders ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="px-3 py-2.5 text-center">
          <p className="text-[11px] text-muted-foreground">{t('totalTrades')}</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums">{stats?.totalTrades ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="px-3 py-2.5 text-center">
          <p className="text-[11px] text-muted-foreground">{t('totalVolume')}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {stats?.totalVolumeNex ? formatBalance(stats.totalVolumeNex) : '0'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
