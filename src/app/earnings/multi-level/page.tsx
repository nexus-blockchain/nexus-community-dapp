'use client';

import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, History, BarChart3 } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import {
  useMultiLevelConfig,
  useMultiLevelPaused,
  useMultiLevelMemberStats,
  useMultiLevelEntityStats,
  useMultiLevelSummaryStats,
} from '@/hooks/use-commission-multi-level';
import { useMultiLevelPayouts } from '@/hooks/use-commission';
import { formatBalance, bpsToPercent, shortAddress, formatUsdt } from '@/lib/utils/chain-helpers';
import { useMemo } from 'react';

export default function MultiLevelEarningsPage() {
  const t = useTranslations('multiLevel');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();
  const { data: config, isLoading } = useMultiLevelConfig(currentEntityId);
  const { data: paused } = useMultiLevelPaused(currentEntityId);
  const { data: memberStats } = useMultiLevelMemberStats(currentEntityId, address);
  const { data: summaryStats } = useMultiLevelSummaryStats(currentEntityId, address);
  const { data: entityStats } = useMultiLevelEntityStats(currentEntityId);
  const { data: payouts, isLoading: payoutsLoading } = useMultiLevelPayouts(currentEntityId, address);

  // Show payouts in reverse chronological order (newest first)
  const sortedPayouts = useMemo(() => {
    if (!payouts || !payouts.length) return [];
    return [...payouts].reverse();
  }, [payouts]);

  // Look up tier rate by level number (level is 1-based, tiers array is 0-based)
  const getTierRate = (level: number): number | null => {
    if (!config?.levels) return null;
    const idx = level - 1;
    if (idx >= 0 && idx < config.levels.length) return config.levels[idx].rate;
    return null;
  };

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

          {/* My stats — MemberMultiLevelStats + MemberMultiLevelSummaryStats */}
          {address && (memberStats || summaryStats) && (
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('myEarnings')}</p>
                <p className="mt-1 text-2xl font-bold text-success">
                  {formatBalance(memberStats?.totalEarned ?? '0')}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">NEX</span>
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {memberStats && (
                    <>
                      <p>{t('commissionReceipts', { count: memberStats.commissionReceiptCount })}</p>
                      {memberStats.lastCommissionBlock > 0 && (
                        <p>{t('lastCommissionBlock', { block: memberStats.lastCommissionBlock })}</p>
                      )}
                    </>
                  )}
                  {summaryStats && summaryStats.totalPayoutCount > 0 && (
                    <>
                      <p>{t('totalPayoutCount', { count: summaryStats.totalPayoutCount })}</p>
                      {summaryStats.lastPayoutBlock > 0 && (
                        <p>{t('lastPayoutBlock', { block: summaryStats.lastPayoutBlock })}</p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payout history — MemberMultiLevelPayouts (FIFO bounded) */}
          {address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  {t('payoutHistory')}
                  {sortedPayouts.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {sortedPayouts.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payoutsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : sortedPayouts.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t('noPayouts')}</p>
                ) : (
                  <div className="space-y-2">
                    {sortedPayouts.map((p, i) => {
                      const tierRate = getTierRate(p.level);
                      return (
                        <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            L{p.level}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-success">
                                +{formatBalance(p.amount)} NEX
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {t('tierLabel', { level: p.level })}
                                {tierRate != null && ` · ${bpsToPercent(tierRate)}`}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {t('orderLabel', { id: p.orderId })} · {t('buyerLabel', { addr: shortAddress(p.buyer, 6) })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('blockLabel', { block: p.blockNumber })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tier config — MultiLevelConfigs */}
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
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
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
                        {tier.requiredLevelId > 0 && (
                          <div>
                            <p className="flex items-center gap-0.5">{t('levelIdRequired')}</p>
                            <p className="font-medium text-foreground">Lv.{tier.requiredLevelId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entity stats — EntityMultiLevelStats */}
          {entityStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  {t('entityStats')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center justify-center gap-1">{t('totalDistributed')} <HelpTip helpKey="multiLevel.totalDistributed" iconSize={12} /></p>
                    <p className="text-sm font-semibold">{formatBalance(entityStats.totalDistributed)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('orderCount')}</p>
                    <p className="text-lg font-semibold">{entityStats.orderCount}</p>
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
