'use client';

import { useTranslations } from 'next-intl';
import { Sprout } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBalance } from '@/lib/utils/chain-helpers';

interface DepthLevel {
  price: string;
  totalAmount: bigint;
  orderCount: number;
  cumulative: bigint;
  hasSeedOrder?: boolean;
}

interface OrderBookProps {
  asks: DepthLevel[];
  bids: DepthLevel[];
  maxDepth: bigint;
  lastPrice: string | undefined;
  isLoading: boolean;
  onPriceClick?: (price: string) => void;
}

const MAX_ROWS = 7;

export function OrderBook({ asks, bids, maxDepth, lastPrice, isLoading, onPriceClick }: OrderBookProps) {
  const t = useTranslations('market');

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full rounded-xl" />;
  }

  const ZERO = BigInt(0);
  const HUNDRED = BigInt(100);
  const depthPercent = (cum: bigint) => {
    if (maxDepth === ZERO) return 0;
    return Number((cum * HUNDRED) / maxDepth);
  };

  // Show last N asks (highest first → reversed to show lowest near center)
  const visibleAsks = asks.slice(-MAX_ROWS);
  const visibleBids = bids.slice(0, MAX_ROWS);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1">{t('orderBook')} <HelpTip helpKey="market.seedOrder" iconSize={12} /></CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {/* Column headers */}
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{t('price')}</span>
          <span>{t('amount')}</span>
          <span className="flex items-center gap-0.5">{t('cumulative')} <HelpTip helpKey="market.cumulative" iconSize={10} /></span>
        </div>

        {/* Asks (sells) - displayed top to bottom: high price → low price */}
        <div className="space-y-px">
          {visibleAsks.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">{t('noAsks')}</p>
          ) : (
            visibleAsks.map((level) => (
              <div
                key={level.price}
                className="relative flex cursor-pointer items-center justify-between rounded px-1.5 py-0.5 text-xs hover:bg-destructive/20 active:bg-destructive/30"
                onClick={() => onPriceClick?.(level.price)}
              >
                {/* Depth bar background */}
                <div
                  className="absolute inset-y-0 right-0 rounded bg-destructive/10"
                  style={{ width: `${depthPercent(level.cumulative)}%` }}
                />
                <span className="relative z-10 flex items-center gap-1 tabular-nums text-destructive">
                  {formatBalance(level.price)}
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
            {lastPrice && lastPrice !== '0' ? formatBalance(lastPrice) : '--'}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Bids (buys) - displayed top to bottom: high price → low price */}
        <div className="space-y-px">
          {visibleBids.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">{t('noBids')}</p>
          ) : (
            visibleBids.map((level) => (
              <div
                key={level.price}
                className="relative flex cursor-pointer items-center justify-between rounded px-1.5 py-0.5 text-xs hover:bg-success/20 active:bg-success/30"
                onClick={() => onPriceClick?.(level.price)}
              >
                <div
                  className="absolute inset-y-0 right-0 rounded bg-success/10"
                  style={{ width: `${depthPercent(level.cumulative)}%` }}
                />
                <span className="relative z-10 flex items-center gap-1 tabular-nums text-success">
                  {formatBalance(level.price)}
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
