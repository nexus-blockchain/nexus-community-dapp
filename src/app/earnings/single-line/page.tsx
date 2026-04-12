'use client';

import { useTranslations } from 'next-intl';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ChevronUp, ChevronDown, Copy, Check, History, FileText, Filter, Users, Info } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import {
  useSingleLineConfig,
  useSingleLineQueue,
  useSingleLineCommissionRecords,
} from '@/hooks/use-commission';
import {
  useSingleLineOverview,
  useSingleLinePosition,
  useSingleLineMemberView,
} from '@/hooks/use-single-line-commission';
import { useMember } from '@/hooks/use-member';
import { formatBalance, bpsToPercent, shortAddress } from '@/lib/utils/chain-helpers';
import { useMemo, useState, useCallback } from 'react';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationBar } from '@/components/ui/pagination-bar';
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
  const { data: position } = useSingleLinePosition(currentEntityId, address);
  const { data: overview } = useSingleLineOverview(currentEntityId);
  const { data: queue, isLoading: queueLoading } = useSingleLineQueue(currentEntityId);
  const { data: memberView, isLoading: memberViewLoading } = useSingleLineMemberView(currentEntityId, address);
  const { data: coreRecords, isLoading: coreLoading } = useSingleLineCommissionRecords(currentEntityId, address);
  const { data: member } = useMember(currentEntityId, address);

  const [dirFilter, setDirFilter] = useState<DirectionFilter>('all');

  // Plugin payouts — reverse chronological
  // User perspective: filter "upline" = commissions from upline buyers = I am their downline = direction 1
  //                   filter "downline" = commissions from downline buyers = I am their upline = direction 0
  const sortedPayouts = useMemo(() => {
    const payouts = memberView?.recentPayouts ?? [];
    if (!payouts.length) return [];
    const reversed = [...payouts].reverse();
    if (dirFilter === 'all') return reversed;
    return reversed.filter((p) =>
      dirFilter === 'upline' ? p.direction === 1 : p.direction === 0,
    );
  }, [memberView?.recentPayouts, dirFilter]);

  // Core commission records — already sorted newest first from hook, apply filter
  // User perspective: filter "upline" = from upline buyers = chain type SingleLineDownline (I earned as downline)
  //                   filter "downline" = from downline buyers = chain type SingleLineUpline (I earned as upline)
  const filteredRecords = useMemo(() => {
    if (!coreRecords || !coreRecords.length) return [];
    if (dirFilter === 'all') return coreRecords;
    return coreRecords.filter((r) =>
      dirFilter === 'upline'
        ? r.commissionType === 'SingleLineDownline'
        : r.commissionType === 'SingleLineUpline',
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

  const recordsPagination = usePagination(filteredRecords);
  const payoutsPagination = usePagination(sortedPayouts);

  const myPos = position?.position ?? null;

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

  // User perspective: SingleLineDownline = I earned as downline = buyer is my upline → show "upline" label
  const isFromUpline = (r: CommissionRecord) => r.commissionType === 'SingleLineDownline';

  // Level difference stats: aggregate earnings by level distance and direction
  const levelDiffStats = useMemo(() => {
    if (!coreRecords || !coreRecords.length) return [];
    const map = new Map<string, { direction: string; level: number; amount: bigint; count: number }>();
    for (const r of coreRecords) {
      if (r.status === 'Cancelled') continue;
      const dir = isFromUpline(r) ? 'upline' : 'downline';
      const key = `${dir}-${r.level}`;
      const prev = map.get(key) ?? { direction: dir, level: r.level, amount: BigInt(0), count: 0 };
      map.set(key, { ...prev, amount: prev.amount + BigInt(r.amount), count: prev.count + 1 });
    }
    return Array.from(map.values())
      .sort((a, b) => a.direction.localeCompare(b.direction) || a.level - b.level);
  }, [coreRecords]);

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* My single-line earnings */}
          {address && (
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('myEarnings')}</p>
                <p className="mt-1 text-2xl font-bold text-success">
                  {formatBalance(
                    (BigInt(memberView?.summary.totalEarnedAsUpline || '0') + BigInt(memberView?.summary.totalEarnedAsDownline || '0')).toString()
                  )}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">NEX</span>
                </p>
                {memberView && memberView.summary.totalPayoutCount > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('earnedFromUpline')}</p>
                      <p className="text-lg font-bold text-green-500">
                        {formatBalance(memberView.summary.totalEarnedAsDownline)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">NEX</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('earnedFromDownline')}</p>
                      <p className="text-lg font-bold text-blue-500">
                        {formatBalance(memberView.summary.totalEarnedAsUpline)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">NEX</span>
                      </p>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {memberView && memberView.summary.totalPayoutCount > 0
                    ? t('payoutCount', { count: memberView.summary.totalPayoutCount })
                    : t('commissionReceipts', { count: memberView?.summary.totalPayoutCount ?? 0 })}
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
                    {recordsPagination.pageItems.map((r, i) => {
                      const upline = isFromUpline(r);
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
                    <PaginationBar pagination={recordsPagination} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hint / Explanation */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{t('hintTitle')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('hintContent')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
