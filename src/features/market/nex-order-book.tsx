'use client';

import { useTranslations } from 'next-intl';
import { Sprout } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNexPrice, formatBalance } from '@/lib/utils/chain-helpers';

interface NexDepthLevel {
  price: string;
  totalAmount: bigint;
  orderCount: number;
  cumulative: bigint;
  hasSeedOrder: boolean;
}

interface NexOrderBookProps {
  asks: NexDepthLevel[];
  bids: NexDepthLevel[];
  maxDepth: bigint;
  lastPrice: string | undefined;
  isLoading: boolean;
}

const MAX_ROWS = 7;

export function NexOrderBook({
  asks, bids, maxDepth, lastPrice, isLoading,
}: NexOrderBookProps) {
  const t = useTranslations('market');
  const tn = useTranslations('market.nexMarket');

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full rounded-xl" />;
  }

  const ZERO = BigInt(0);
  const HUNDRED = BigInt(100);
  const depthPercent = (cum: bigint) => {
    if (maxDepth === ZERO) return 0;
    return Number((cum * HUNDRED) / maxDepth);
  };

  const visibleAsks = asks.slice(-MAX_ROWS);
  const visibleBids = bids.slice(0, MAX_ROWS);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('orderBook')}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {/* Column headers */}
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{tn('usdtPrice')}</span>
          <span>{tn('nexAmount')}</span>
          <span>{t('cumulative')}</span>
        </div>

        {/* Asks (sells) */}
        <div className="space-y-px">
          {visibleAsks.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">{t('noAsks')}</p>
          ) : (
            visibleAsks.map((level) => (
              <div
                key={level.price}
                className="relative flex items-center justify-between rounded px-1.5 py-0.5 text-xs"
              >
                <div
                  className="absolute inset-y-0 right-0 rounded bg-destructive/10"
                  style={{ width: `${depthPercent(level.cumulative)}%` }}
                />
                <span className="relative z-10 flex items-center gap-1 tabular-nums text-destructive">
                  ${formatNexPrice(level.price)}
                  {level.hasSeedOrder && (
                    <span title={t('seedOrder')}>
                      <Sprout className="h-3 w-3 text-warning" />
                    </span>
                  )}
                </span>
                <span className="relative z-10 tabular-nums text-muted-foreground">
                  {formatBalance(level.totalAmount.toString())}
                </span>
                <span className="relative z-10 tabular-nums text-muted-foreground">
                  {formatBalance(level.cumulative.toString())}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Center - last price */}
        <div className="my-1.5 flex items-center gap-2 text-xs">
          <div className="h-px flex-1 bg-border" />
          <span className="font-semibold tabular-nums text-primary">
            {lastPrice && lastPrice !== '0' ? `$${formatNexPrice(lastPrice)}` : '--'}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Bids (buys) */}
        <div className="space-y-px">
          {visibleBids.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">{t('noBids')}</p>
          ) : (
            visibleBids.map((level) => (
              <div
                key={level.price}
                className="relative flex items-center justify-between rounded px-1.5 py-0.5 text-xs"
              >
                <div
                  className="absolute inset-y-0 right-0 rounded bg-success/10"
                  style={{ width: `${depthPercent(level.cumulative)}%` }}
                />
                <span className="relative z-10 flex items-center gap-1 tabular-nums text-success">
                  ${formatNexPrice(level.price)}
                  {level.hasSeedOrder && (
                    <span title={t('seedOrder')}>
                      <Sprout className="h-3 w-3 text-warning" />
                    </span>
                  )}
                </span>
                <span className="relative z-10 tabular-nums text-muted-foreground">
                  {formatBalance(level.totalAmount.toString())}
                </span>
                <span className="relative z-10 tabular-nums text-muted-foreground">
                  {formatBalance(level.cumulative.toString())}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
