'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight, UserPlus, Layers, Trophy,
  Users2, ArrowUpDown, TrendingDown, Wallet,
  CheckCircle2, XCircle, AlertTriangle,
  Loader2, ArrowDownToLine, History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntityStore, useWalletStore } from '@/stores';
import { useCommissionDashboard, useEntityCommissionOverview } from '@/hooks/use-commission-dashboard';
import { useMemberCommissionStats, useWithdrawCommission, useWithdrawalRecords, useRepurchaseConfig } from '@/hooks/use-commission-core';
import { useSingleLineMemberView } from '@/hooks/use-single-line-commission';
import { formatBalance, bpsToPercent, isTxBusy, formatUsdt } from '@/lib/utils/chain-helpers';
import { TxStatusIndicator } from '@/components/ui/tx-status-indicator';
import type { LucideIcon } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useShoppingBalance } from '@/hooks/use-loyalty';
import { useNexPrice } from '@/hooks/use-nex-price';

// CommissionModes bitmask constants (mirror of Rust CommissionModes)
const MODES = {
  DIRECT_REWARD:        0b0000_0001,
  MULTI_LEVEL:          0b0000_0010,
  TEAM_PERFORMANCE:     0b0000_0100,
  LEVEL_DIFF:           0b0000_1000,
  FIXED_AMOUNT:         0b0001_0000,
  FIRST_ORDER:          0b0010_0000,
  REPEAT_PURCHASE:      0b0100_0000,
  SINGLE_LINE_UPLINE:   0b1000_0000,
  SINGLE_LINE_DOWNLINE: 0b1_0000_0000,
  POOL_REWARD:          0b10_0000_0000,
  OWNER_REWARD:       0b100_0000_0000,
} as const;

interface PluginSummary {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string | null;
  status: 'enabled' | 'paused';
  description: string;
  stat?: string;
  stat2?: string;
}

// Collapsible withdrawal history with pagination
const PAGE_SIZE = 5;
function WithdrawalHistoryCard({ withdrawalRecords, isZh }: { withdrawalRecords: any[] | undefined; isZh: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);

  const records = withdrawalRecords ? [...withdrawalRecords].reverse() : [];
  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const pagedRecords = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex w-full items-center justify-between"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">{isZh ? '提现记录' : 'Withdrawal History'}</CardTitle>
            {records.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{records.length}</Badge>
            )}
          </div>
          <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </CardHeader>
      {expanded && (
        <CardContent>
          {records.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              {isZh ? '暂无提现明细记录' : 'No withdrawal records yet'}
            </p>
          ) : (
            <div className="space-y-2">
              {pagedRecords.map((record, i) => (
                <div
                  key={`wr-${record.blockNumber}-${page}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <span className="text-sm font-semibold text-success">
                      +{formatBalance(record.withdrawn)} NEX
                    </span>
                    {BigInt(record.repurchased || '0') > BigInt(0) && (
                      <p className="text-[10px] text-muted-foreground">
                        {isZh ? '回购' : 'Repurchased'}: {formatBalance(record.repurchased)} NEX
                      </p>
                    )}
                    {BigInt(record.bonus || '0') > BigInt(0) && (
                      <p className="text-[10px] text-amber-500">
                        {isZh ? '奖励' : 'Bonus'}: +{formatBalance(record.bonus)} NEX
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">#{record.blockNumber}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBalance(record.totalAmount)} NEX</p>
                  </div>
                </div>
              ))}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Button variant="ghost" size="sm" disabled={page <= 0} onClick={() => setPage(page - 1)}>
                    ‹
                  </Button>
                  <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    ›
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function EarningsPage() {
  const t = useTranslations('earnings');
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { currentEntityId, entityName } = useEntityStore();
  const { address } = useWalletStore();

  const { data: dashboard, isLoading: dashLoading } = useCommissionDashboard(currentEntityId, address);
  const { data: memberStats, isLoading: statsLoading } = useMemberCommissionStats(currentEntityId, address);
  const { data: overview, isLoading: overviewLoading } = useEntityCommissionOverview(currentEntityId);
  const { data: slMemberView } = useSingleLineMemberView(currentEntityId, address);

  const withdraw = useWithdrawCommission();
  const withdrawBusy = isTxBusy(withdraw.txState);

  // Withdrawal history from chain
  const { data: withdrawalRecords } = useWithdrawalRecords(currentEntityId, address);

  // 购物余额阈值检查
  const { data: repurchaseConfig } = useRepurchaseConfig(currentEntityId);
  const { data: shoppingBal } = useShoppingBalance(currentEntityId, address);
  const { toUsdt: nexToUsdt } = useNexPrice();
  const shoppingBalUsdt = shoppingBal && nexToUsdt ? nexToUsdt(shoppingBal) : null;
  const thresholdUsdt = repurchaseConfig?.maxShoppingBalanceUsdt ?? '0';
  // 阈值 > 0 且有购物余额时：价格未加载则保守阻止，价格已加载则比较
  const hasThreshold = BigInt(thresholdUsdt) > BigInt(0);
  const hasShoppingBal = shoppingBal != null && BigInt(shoppingBal) > BigInt(0);
  const shoppingExceedsThreshold = hasThreshold && hasShoppingBal
    && (shoppingBalUsdt == null || BigInt(shoppingBalUsdt) > BigInt(thresholdUsdt));

  const isLoading = dashLoading || statsLoading || overviewLoading;

  const commissionActive = overview?.isEnabled === true;
  const modes = commissionActive ? (overview?.enabledModes ?? 0) : 0;
  const commissionRate = overview?.commissionRate ?? 0;

  const totalEarned = dashboard?.nexStats.totalEarned ?? '0';
  const pending = memberStats?.pending ?? dashboard?.nexStats.pending ?? '0';
  const withdrawn = memberStats?.withdrawn ?? dashboard?.nexStats.withdrawn ?? '0';
  const repurchased = memberStats?.repurchased ?? dashboard?.nexStats.repurchased ?? '0';
  const orderCount = memberStats?.orderCount ?? dashboard?.nexStats.orderCount ?? 0;

  const handleWithdraw = () => {
    withdraw.mutate([
      currentEntityId,
      pending,
      null,
    ]);
  };

  // Build plugin list
  const plugins: PluginSummary[] = [];

  const referralModes = modes & (MODES.DIRECT_REWARD | MODES.FIXED_AMOUNT | MODES.FIRST_ORDER | MODES.REPEAT_PURCHASE);
  if (referralModes > 0) {
    plugins.push({
      key: 'referral',
      label: t('referral'),
      icon: UserPlus,
      href: null,
      status: 'enabled',
      description: t('referralDesc'),
      stat: dashboard?.referral
        ? `${formatBalance(dashboard.referral.totalEarned)} NEX`
        : undefined,
    });
  }

  if ((modes & MODES.MULTI_LEVEL) > 0) {
    const mlPaused = overview?.multiLevelPaused ?? false;
    const activatedLevels = dashboard?.multiLevelProgress?.filter((p) => p.activated).length ?? 0;
    plugins.push({
      key: 'multiLevel',
      label: t('multiLevel'),
      icon: Layers,
      href: '/earnings/multi-level',
      status: mlPaused ? 'paused' : 'enabled',
      description: mlPaused ? t('paused') : activatedLevels > 0
        ? t('activatedLevels', { count: activatedLevels })
        : t('multiLevelDesc'),
      stat: dashboard?.multiLevelStats
        ? `${formatBalance(dashboard.multiLevelStats.totalEarned)} NEX`
        : undefined,
    });
  }

  if ((modes & MODES.TEAM_PERFORMANCE) > 0) {
    const teamConfigured = overview != null && (overview.teamStatus[0] || overview.teamStatus[1]);
    plugins.push({
      key: 'team',
      label: t('teamPerformance'),
      icon: Users2,
      href: null,
      status: teamConfigured ? 'enabled' : 'paused',
      description: dashboard?.teamTier
        ? `${t('currentTier')}: ${dashboard.teamTier.name || `T${dashboard.teamTier.tierIndex}`} (${bpsToPercent(dashboard.teamTier.rate)})`
        : t('teamDesc'),
      stat: dashboard?.teamTier
        ? `${formatBalance(dashboard.teamTier.totalEarned)} NEX`
        : undefined,
    });
  }

  if ((modes & MODES.LEVEL_DIFF) > 0) {
    plugins.push({
      key: 'levelDiff',
      label: t('levelDiff'),
      icon: TrendingDown,
      href: null,
      status: 'enabled',
      description: t('levelDiffDesc'),
    });
  }

  const slUpline = (modes & MODES.SINGLE_LINE_UPLINE) > 0;
  const slDownline = (modes & MODES.SINGLE_LINE_DOWNLINE) > 0;
  if (slUpline || slDownline) {
    const slRunning = overview?.singleLineEnabled ?? false;
    const slTotal = slMemberView
      ? (BigInt(slMemberView.summary.totalEarnedAsUpline || '0') + BigInt(slMemberView.summary.totalEarnedAsDownline || '0')).toString()
      : null;
    plugins.push({
      key: 'singleLine',
      label: t('singleLine'),
      icon: ArrowUpDown,
      href: '/earnings/single-line',
      status: slRunning ? 'enabled' : 'paused',
      description: dashboard?.singleLine?.position != null
        ? t('position', { pos: dashboard.singleLine.position })
        : t('singleLineDesc'),
      stat: slTotal && BigInt(slTotal) > BigInt(0)
        ? `${formatBalance(slTotal)} NEX`
        : undefined,
    });
  }

  if ((modes & MODES.POOL_REWARD) > 0) {
    const prPaused = overview?.poolRewardPaused ?? false;
    const poolBalance = overview?.unallocatedPoolNex ?? '0';
    plugins.push({
      key: 'poolReward',
      label: t('poolReward'),
      icon: Trophy,
      href: '/earnings/pool-reward',
      status: prPaused ? 'paused' : 'enabled',
      description: dashboard?.poolReward?.currentRoundId
        ? t('currentRound', { id: dashboard.poolReward.currentRoundId })
        : t('poolRewardDesc'),
      stat: dashboard?.poolReward?.claimableNex && BigInt(dashboard.poolReward.claimableNex) > BigInt(0)
        ? `${t('claimable')}: ${formatBalance(dashboard.poolReward.claimableNex)} NEX`
        : undefined,
      stat2: BigInt(poolBalance) > BigInt(0)
        ? `${isZh ? '沉淀池' : 'Pool'}: ${formatBalance(poolBalance)} NEX`
        : undefined,
    });
  }

  if ((modes & MODES.OWNER_REWARD) > 0) {
    // Owner Reward hidden per design
  }

  const statusBadge = (status: PluginSummary['status']) => {
    switch (status) {
      case 'enabled':
        return <Badge variant="success" className="text-[10px]"><CheckCircle2 className="mr-1 h-3 w-3" />{t('enabled')}</Badge>;
      case 'paused':
        return <Badge variant="warning" className="text-[10px]"><XCircle className="mr-1 h-3 w-3" />{t('paused')}</Badge>;
    }
  };

  return (
    <>
      <MobileHeader title={t('title')} />
      <PageContainer>
        <div className="space-y-4">
          {/* Total earnings card */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t('totalEarnings')}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentEntityId == null ? (
                <p className="text-sm text-muted-foreground">{t('noEntityHint')}</p>
              ) : isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              ) : !commissionActive ? (
                <p className="text-sm text-muted-foreground">{t('commissionNotEnabled')}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-success">
                      {formatBalance(totalEarned)}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">NEX</span>
                    </p>
                  </div>
                  {/* Breakdown */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground flex items-center gap-0.5">{t('pendingAmount')} <HelpTip helpKey="earnings.pendingAmount" iconSize={10} /></p>
                      <p className="font-medium">{formatBalance(pending)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-0.5">{t('withdrawnAmount')} <HelpTip helpKey="earnings.withdrawnAmount" iconSize={10} /></p>
                      <p className="font-medium">{formatBalance(withdrawn)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-0.5">{t('repurchasedAmount')} <HelpTip helpKey="earnings.repurchasedAmount" iconSize={10} /></p>
                      <p className="font-medium">{formatBalance(repurchased)}</p>
                    </div>
                  </div>

                  {/* Withdrawal section */}
                  {address && (
                    <div className="mt-4 space-y-2">
                      {/* Shopping balance threshold warning */}
                      {shoppingExceedsThreshold && (
                        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>{t('shoppingBalanceExceedsThreshold')}</span>
                          </div>
                          {shoppingBalUsdt != null && (
                            <p className="mt-1 text-[10px] text-destructive/80">
                              {isZh
                                ? `当前购物余额 ≈ ${formatUsdt(shoppingBalUsdt, 0)} USDT，阈值 ${formatUsdt(thresholdUsdt, 0)} USDT`
                                : `Balance ≈ ${formatUsdt(shoppingBalUsdt, 0)} USDT, threshold ${formatUsdt(thresholdUsdt, 0)} USDT`}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-muted-foreground">{t('remainingShoppingBalance')}</span>
                          <span className="text-sm font-semibold text-primary">{formatBalance(shoppingBal ?? '0')} NEX</span>
                        </div>
                      </div>

                      {/* Withdraw button */}
                      <Button
                        className="w-full gap-1.5 text-sm font-bold"
                        variant="default"
                        disabled={withdrawBusy || overview?.withdrawalPaused || BigInt(pending || '0') <= BigInt(0) || shoppingExceedsThreshold}
                        onClick={handleWithdraw}
                      >
                        {withdrawBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowDownToLine className="h-4 w-4" />
                        )}
                        {t('withdrawBtn')} ({formatBalance(pending)} NEX)
                      </Button>
                    </div>
                  )}

                  {/* Withdraw tx status */}
                  <TxStatusIndicator txState={withdraw.txState} successMessage={t('withdrawSuccess')} />
                </>
              )}
            </CardContent>
          </Card>

          {/* 购物余额到期提示 — hidden per design */}

          {/* Plugin cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="mb-2 h-10 w-10 rounded-xl" />
                    <Skeleton className="mb-1 h-4 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : plugins.length > 0 ? (
            <div className="space-y-2">
              {plugins.map((plugin) => {
                const inner = (
                  <Card className="group transition-colors hover:border-primary/50">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <plugin.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{plugin.label}</p>
                          {statusBadge(plugin.status)}
                        </div>
                        {plugin.stat && (
                          <p className="text-xs font-semibold text-success truncate">{plugin.stat}</p>
                        )}
                        {plugin.stat2 && (
                          <p className="text-xs font-semibold text-amber-500 truncate">{plugin.stat2}</p>
                        )}
                      </div>
                      {plugin.href && (
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </CardContent>
                  </Card>
                );
                return plugin.href ? (
                  <Link key={plugin.key} href={plugin.href}>{inner}</Link>
                ) : (
                  <div key={plugin.key}>{inner}</div>
                );
              })}
            </div>
          ) : null}

          {/* Withdrawal History — default collapsed */}
          {!isLoading && commissionActive && address && currentEntityId != null && (
            <WithdrawalHistoryCard
              withdrawalRecords={withdrawalRecords}
              isZh={isZh}
            />
          )}

          {/* Connect wallet hint */}
          {!address && (
            <p className="text-center text-sm text-muted-foreground">
              {t('connectWalletHint')}
            </p>
          )}
        </div>
      </PageContainer>
    </>
  );
}
