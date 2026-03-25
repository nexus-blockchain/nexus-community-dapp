'use client';

import { useTranslations } from 'next-intl';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ChevronUp, ChevronDown, Copy, Check, History, FileText, Filter } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import {
  useSingleLineConfig,
  useSingleLineEnabled,
  useSingleLineIndex,
  useSingleLineStats,
  useSingleLineQueue,
  useSingleLinePayouts,
  useSingleLineMemberStats,
  useSingleLineCommissionRecords,
} from '@/hooks/use-commission';
import { formatBalance, bpsToPercent, shortAddress } from '@/lib/utils/chain-helpers';
import { useMemo, useState, useCallback } from 'react';
import type { CommissionRecord, CommissionStatus } from '@/lib/types';

function AddressCard({ address, index, isSelf }: { address: string; index: number; isSelf: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [address]);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isSelf ? 'border-primary bg-primary/10' : 'border-border bg-card'
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        isSelf ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-mono text-sm ${isSelf ? 'font-semibold text-primary' : ''}`}>
          {shortAddress(address, 8)}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: CommissionStatus }) {
  const t = useTranslations('singleLine');
  const variants: Record<CommissionStatus, { variant: 'success' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
    Pending: { variant: 'warning', label: t('statusPending') },
    Settled: { variant: 'success', label: t('statusSettled') },
    Cancelled: { variant: 'destructive', label: t('statusCancelled') },
    Distributed: { variant: 'secondary', label: t('statusDistributed') },
  };
  const { variant, label } = variants[status] ?? variants.Pending;
  return <Badge variant={variant} className="text-[10px]">{label}</Badge>;
}

type DirectionFilter = 'all' | 'upline' | 'downline';

export default function SingleLineEarningsPage() {
  const t = useTranslations('singleLine');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();
  const { data: config, isLoading } = useSingleLineConfig(currentEntityId);
  const { data: enabled } = useSingleLineEnabled(currentEntityId);
  const { data: myIndex } = useSingleLineIndex(currentEntityId, address);
  const { data: stats } = useSingleLineStats(currentEntityId);
  const { data: queue, isLoading: queueLoading } = useSingleLineQueue(currentEntityId);
  const { data: payouts, isLoading: payoutsLoading } = useSingleLinePayouts(currentEntityId, address);
  const { data: memberStats } = useSingleLineMemberStats(currentEntityId, address);
  const { data: coreRecords, isLoading: coreLoading } = useSingleLineCommissionRecords(currentEntityId, address);

  const [dirFilter, setDirFilter] = useState<DirectionFilter>('all');

  // Plugin payouts — reverse chronological
  const sortedPayouts = useMemo(() => {
    if (!payouts || !payouts.length) return [];
    const reversed = [...payouts].reverse();
    if (dirFilter === 'all') return reversed;
    return reversed.filter((p) =>
      dirFilter === 'upline' ? p.direction === 'Upline' : p.direction === 'Downline',
    );
  }, [payouts, dirFilter]);

  // Core commission records — already sorted newest first from hook, apply filter
  const filteredRecords = useMemo(() => {
    if (!coreRecords || !coreRecords.length) return [];
    if (dirFilter === 'all') return coreRecords;
    return coreRecords.filter((r) =>
      dirFilter === 'upline'
        ? r.commissionType === 'SingleLineUpline'
        : r.commissionType === 'SingleLineDownline',
    );
  }, [coreRecords, dirFilter]);

  // Total amount from core records
  const recordsTotalAmount = useMemo(() => {
    if (!filteredRecords.length) return '0';
    let total = BigInt(0);
    for (const r of filteredRecords) {
      if (r.status !== 'Cancelled') total += BigInt(r.amount);
    }
    return total.toString();
  }, [filteredRecords]);

  const myPos = myIndex ?? null;

  const { uplines, downlines } = useMemo(() => {
    if (!queue || !queue.length) return { uplines: [] as { address: string; globalIndex: number }[], downlines: [] as { address: string; globalIndex: number }[] };
    if (myPos == null) {
      return {
        uplines: queue.map((addr, i) => ({ address: addr, globalIndex: i })),
        downlines: [] as { address: string; globalIndex: number }[],
      };
    }
    return {
      uplines: queue.slice(0, myPos).map((addr, i) => ({ address: addr, globalIndex: i })),
      downlines: queue.slice(myPos + 1).map((addr, i) => ({ address: addr, globalIndex: myPos + 1 + i })),
    };
  }, [queue, myPos]);

  const isRecordUpline = (r: CommissionRecord) => r.commissionType === 'SingleLineUpline';

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={enabled ? 'success' : 'warning'}>
              {enabled ? t('running') : t('paused')}
            </Badge>
            {queue && (
              <Badge variant="secondary">
                {t('queueLength', { count: queue.length })}
              </Badge>
            )}
            {myPos != null && (
              <Badge variant="outline">
                {t('myPosition')}: #{myPos + 1}
              </Badge>
            )}
          </div>

          {/* My single-line earnings */}
          {address && (
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('myEarnings')}</p>
                <p className="mt-1 text-2xl font-bold text-success">
                  {formatBalance(
                    (BigInt(memberStats?.totalEarnedAsUpline || '0') + BigInt(memberStats?.totalEarnedAsDownline || '0')).toString()
                  )}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">NEX</span>
                </p>
                {memberStats && memberStats.totalPayoutCount > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('earnedAsUpline')}</p>
                      <p className="text-lg font-bold text-green-500">
                        {formatBalance(memberStats.totalEarnedAsUpline)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">NEX</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('earnedAsDownline')}</p>
                      <p className="text-lg font-bold text-blue-500">
                        {formatBalance(memberStats.totalEarnedAsDownline)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">NEX</span>
                      </p>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {memberStats && memberStats.totalPayoutCount > 0
                    ? t('payoutCount', { count: memberStats.totalPayoutCount })
                    : t('commissionReceipts', { count: memberStats?.totalPayoutCount ?? 0 })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Direction filter */}
          {address && (
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {(['all', 'upline', 'downline'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDirFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    dirFilter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f === 'all' ? t('filterAll') : f === 'upline' ? t('filterUpline') : t('filterDownline')}
                </button>
              ))}
            </div>
          )}

          {/* Commission history (core order-level records) */}
          {address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {t('commissionHistory')}
                  {filteredRecords.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {t('recordCount', { count: filteredRecords.length })}
                    </Badge>
                  )}
                </CardTitle>
                {filteredRecords.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('totalAmount')}: {formatBalance(recordsTotalAmount)} NEX
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {coreLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t('noRecords')}</p>
                ) : (
                  <div className="space-y-2">
                    {filteredRecords.map((r, i) => {
                      const upline = isRecordUpline(r);
                      return (
                        <div key={`${r.orderId}-${r.commissionType}-${i}`} className="flex items-start gap-3 rounded-lg border border-border p-3">
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            upline ? 'bg-green-500/15 text-green-500' : 'bg-blue-500/15 text-blue-500'
                          }`}>
                            {upline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-semibold ${upline ? 'text-green-500' : 'text-blue-500'}`}>
                                +{formatBalance(r.amount)} NEX
                              </p>
                              <div className="flex shrink-0 items-center gap-1">
                                <Badge variant="outline" className="text-[10px]">
                                  {t('levelDistanceLabel', {
                                    dir: upline ? t('directionUpline') : t('directionDownline'),
                                    n: r.level,
                                  })}
                                </Badge>
                                <StatusBadge status={r.status} />
                              </div>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {t('orderLabel', { id: r.orderId })} · {t('shopLabel', { id: r.shopId })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {shortAddress(r.buyer, 6)} · {t('blockLabel', { block: r.createdAt })}
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

          {/* Plugin payout history (FIFO buffer) */}
          {address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  {t('pluginPayouts')}
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
                      const isUpline = p.direction === 'Upline';
                      return (
                        <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isUpline ? 'bg-green-500/15 text-green-500' : 'bg-blue-500/15 text-blue-500'
                          }`}>
                            {isUpline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-semibold ${isUpline ? 'text-green-500' : 'text-blue-500'}`}>
                                +{formatBalance(p.amount)} NEX
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {t('levelDistanceLabel', {
                                  dir: isUpline ? t('directionUpline') : t('directionDownline'),
                                  n: p.levelDistance,
                                })}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {t('orderLabel', { id: p.orderId })} · {shortAddress(p.buyer, 6)}
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

          {/* Upline addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ChevronUp className="h-4 w-4 text-green-500" />
                {myPos != null ? t('uplineAddresses') : t('allMembers')}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {uplines.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : uplines.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('noUplines')}</p>
              ) : (
                <div className="space-y-2">
                  {uplines.map((item) => (
                    <AddressCard
                      key={item.globalIndex}
                      address={item.address}
                      index={item.globalIndex}
                      isSelf={false}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Downline addresses */}
          {myPos != null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ChevronDown className="h-4 w-4 text-blue-500" />
                  {t('downlineAddresses')}
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {downlines.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queueLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : downlines.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t('noDownlines')}</p>
                ) : (
                  <div className="space-y-2">
                    {downlines.map((item) => (
                      <AddressCard
                        key={item.globalIndex}
                        address={item.address}
                        index={item.globalIndex}
                        isSelf={false}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Config */}
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
                  <ArrowUpDown className="h-4 w-4" />
                  {t('config')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('uplineRate')} <HelpTip helpKey="singleLine.uplineRate" iconSize={12} /></p>
                    <p className="font-semibold text-primary">{bpsToPercent(config.uplineRate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('downlineRate')} <HelpTip helpKey="singleLine.downlineRate" iconSize={12} /></p>
                    <p className="font-semibold text-primary">{bpsToPercent(config.downlineRate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('baseUplineLevels')} <HelpTip helpKey="singleLine.baseUplineLevels" iconSize={12} /></p>
                    <p className="font-semibold">{config.baseUplineLevels}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('baseDownlineLevels')} <HelpTip helpKey="singleLine.baseDownlineLevels" iconSize={12} /></p>
                    <p className="font-semibold">{config.baseDownlineLevels}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('maxUplineLevels')} <HelpTip helpKey="singleLine.maxUplineLevels" iconSize={12} /></p>
                    <p className="font-semibold">{config.maxUplineLevels}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('maxDownlineLevels')} <HelpTip helpKey="singleLine.maxDownlineLevels" iconSize={12} /></p>
                    <p className="font-semibold">{config.maxDownlineLevels}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground flex items-center gap-1">{t('levelThreshold')} <HelpTip helpKey="singleLine.levelThreshold" iconSize={12} /></p>
                    <p className="font-semibold">{formatBalance(config.levelIncrementThreshold)} NEX</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entity stats */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('stats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('totalOrders')}</p>
                    <p className="text-lg font-semibold">{stats.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('uplinePayouts')}</p>
                    <p className="text-lg font-semibold">{stats.totalUplinePayouts}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('downlinePayouts')}</p>
                    <p className="text-lg font-semibold">{stats.totalDownlinePayouts}</p>
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
