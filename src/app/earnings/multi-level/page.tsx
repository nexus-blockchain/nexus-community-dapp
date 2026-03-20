'use client';

import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, TrendingUp } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import { useMultiLevelConfig, useMultiLevelPaused, useMultiLevelMemberStats, useMultiLevelEntityStats } from '@/hooks/use-commission-multi-level';
import { formatBalance, bpsToPercent, formatUsdt } from '@/lib/utils/chain-helpers';

export default function MultiLevelEarningsPage() {
  const t = useTranslations('multiLevel');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();
  const { data: config, isLoading } = useMultiLevelConfig(currentEntityId);
  const { data: paused } = useMultiLevelPaused(currentEntityId);
  const { data: myStats } = useMultiLevelMemberStats(currentEntityId, address);
  const { data: entityStats } = useMultiLevelEntityStats(currentEntityId);

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={paused ? 'warning' : 'success'}>
              {paused ? t('paused') : t('running')}
            </Badge>
            {config && (
              <Badge variant="outline">
                {t('maxTotalRate', { rate: bpsToPercent(config.maxTotalRate) })}
              </Badge>
            )}
          </div>

          {/* My stats */}
          {address && myStats && (
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('myEarnings')}</p>
                <p className="mt-1 text-2xl font-bold text-success">
                  {formatBalance(myStats.totalEarned)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">NEX</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('commissionOrders', { count: myStats.totalOrders })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tier config */}
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !config ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t('noConfig')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4" />
                  {t('tierConfig', { count: config.levels.length })}
                  <HelpTip helpKey="multiLevel.tierConfig" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {config.levels.map((tier, idx) => (
                    <div key={idx} className="rounded-lg bg-secondary p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">L{idx + 1}</span>
                        <Badge variant={tier.rate > 0 ? 'default' : 'secondary'}>
                          {bpsToPercent(tier.rate)}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>
                          <p className="flex items-center gap-0.5">{t('directRequired')} <HelpTip helpKey="multiLevel.directRequired" iconSize={10} /></p>
                          <p className="font-medium text-foreground">{tier.requiredDirects}</p>
                        </div>
                        <div>
                          <p className="flex items-center gap-0.5">{t('teamRequired')} <HelpTip helpKey="multiLevel.teamRequired" iconSize={10} /></p>
                          <p className="font-medium text-foreground">{tier.requiredTeamSize}</p>
                        </div>
                        <div>
                          <p className="flex items-center gap-0.5">{t('spentRequired')} <HelpTip helpKey="multiLevel.spentRequired" iconSize={10} /></p>
                          <p className="font-medium text-foreground">{formatUsdt(tier.requiredSpent)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entity stats */}
          {entityStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('entityStats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center justify-center gap-1">{t('totalDistributed')} <HelpTip helpKey="multiLevel.totalDistributed" iconSize={12} /></p>
                    <p className="text-sm font-semibold">{formatBalance(entityStats.totalDistributed)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('totalOrders')}</p>
                    <p className="text-lg font-semibold">{entityStats.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center justify-center gap-1">{t('distributionEntries')} <HelpTip helpKey="multiLevel.distributionEntries" iconSize={12} /></p>
                    <p className="text-lg font-semibold">{entityStats.totalDistributionEntries}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}
