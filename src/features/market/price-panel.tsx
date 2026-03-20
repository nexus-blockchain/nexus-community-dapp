'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatBalance } from '@/lib/utils/chain-helpers';

interface PricePanelProps {
  lastPrice: string | undefined;
  bestAsk: string | null | undefined;
  bestBid: string | null | undefined;
  change24h: number | null; // percentage, e.g. 2.3 or -1.5
}

export function PricePanel({ lastPrice, bestAsk, bestBid, change24h }: PricePanelProps) {
  const t = useTranslations('market');

  const hasPrice = lastPrice && lastPrice !== '0';
  const isPositive = change24h !== null && change24h > 0;
  const isNegative = change24h !== null && change24h < 0;

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('lastPrice')}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
              {hasPrice ? formatBalance(lastPrice) : '--'}
            </p>
          </div>
          {change24h !== null && (
            <div
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium ${
                isPositive
                  ? 'bg-success/15 text-success'
                  : isNegative
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-secondary text-muted-foreground'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : isNegative ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              <span className="tabular-nums">
                {isPositive ? '+' : ''}{change24h.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">{t('bestAsk')} </span>
            <span className="tabular-nums text-destructive">
              {bestAsk ? formatBalance(bestAsk) : '--'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('bestBid')} </span>
            <span className="tabular-nums text-success">
              {bestBid ? formatBalance(bestBid) : '--'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
