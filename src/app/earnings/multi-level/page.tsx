'use client';

import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { useEntityStore, useWalletStore } from '@/stores';
import {
  useMultiLevelConfig,
  useMultiLevelMemberStats,
} from '@/hooks/use-commission-multi-level';
import { useMultiLevelPayouts } from '@/hooks/use-commission';
import { formatBalance, bpsToPercent, shortAddress } from '@/lib/utils/chain-helpers';
import { useMemo } from 'react';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationBar } from '@/components/ui/pagination-bar';

export default function MultiLevelEarningsPage() {
  const t = useTranslations('multiLevel');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();
  const { data: config } = useMultiLevelConfig(currentEntityId);
  const { data: memberStats } = useMultiLevelMemberStats(currentEntityId, address);
  const { data: payouts, isLoading: payoutsLoading } = useMultiLevelPayouts(currentEntityId, address);

  // Show payouts in reverse chronological order (newest first)
  const sortedPayouts = useMemo(() => {
    if (!payouts || !payouts.length) return [];
    return [...payouts].reverse();
  }, [payouts]);

  const payoutsPagination = usePagination(sortedPayouts);

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
          {/* My earnings */}
          {address && memberStats && (
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('myEarnings')}</p>
                <p className="mt-1 text-2xl font-bold text-success">
                  {formatBalance(memberStats.totalEarned ?? '0')}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">NEX</span>
                </p>
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
                    {payoutsPagination.pageItems.map((p, i) => {
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
                    <PaginationBar pagination={payoutsPagination} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </PageContainer>
    </>
  );
}
