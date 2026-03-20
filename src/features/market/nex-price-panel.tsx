'use client';

import { useTranslations } from 'next-intl';
import { Shield, ShieldAlert } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNexPrice, bpsToPercent } from '@/lib/utils/chain-helpers';
import type { NexMarketStats, NexPriceProtection } from '@/lib/types';

interface NexPricePanelProps {
  stats: NexMarketStats | undefined;
  protection: NexPriceProtection | undefined;
  seedPricePremiumBps: number | undefined;
}

export function NexPricePanel({ stats, protection, seedPricePremiumBps }: NexPricePanelProps) {
  const t = useTranslations('market.nexMarket');

  const hasLastPrice = stats?.lastPrice && stats.lastPrice !== '0';
  const hasTwapLastPrice = stats?.twapLastPrice && stats.twapLastPrice !== '0';

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4">
        {/* Last price + TWAP accumulator last price */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('lastPrice')}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
              {hasLastPrice ? `$${formatNexPrice(stats!.lastPrice)}` : '--'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground flex items-center gap-1">{t('twapPrice')} <HelpTip helpKey="nexMarket.twapPrice" iconSize={12} /></p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {hasTwapLastPrice ? `$${formatNexPrice(stats!.twapLastPrice)}` : '--'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t('volume')} </span>
            <span className="tabular-nums font-medium">
              {stats?.totalVolumeUsdt && stats.totalVolumeUsdt !== '0'
                ? `$${formatNexPrice(stats.totalVolumeUsdt)}`
                : stats?.totalTrades ?? 0}
            </span>
          </div>

          {/* Circuit breaker */}
          <div className="flex items-center gap-1">
            {protection?.circuitBreakerActive ? (
              <Badge variant="destructive" className="gap-1 text-xs">
                <ShieldAlert className="h-3 w-3" />
                {t('triggered')}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Shield className="h-3 w-3" />
                {t('normal')}
              </Badge>
            )}
            <HelpTip helpKey="nexMarket.circuitBreaker" iconSize={12} />
          </div>
        </div>

        {/* Seed price info */}
        {seedPricePremiumBps != null && seedPricePremiumBps > 0 && (
          <div className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs">
            <span className="text-muted-foreground flex items-center gap-1">{t('premium')}: <HelpTip helpKey="nexMarket.premium" iconSize={10} /></span>
            <span className="font-medium">{bpsToPercent(seedPricePremiumBps)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
