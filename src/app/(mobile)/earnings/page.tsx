'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  ArrowRight, UserPlus, Layers, Trophy,
  Users2, ArrowUpDown, TrendingDown, Wallet,
  CheckCircle2, XCircle, AlertTriangle, Eye,
  Loader2, ArrowDownToLine, History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntityStore, useWalletStore } from '@/stores';
import { useCommissionDashboard, useEntityCommissionOverview } from '@/hooks/use-commission-dashboard';
import { useMemberCommissionStats, useWithdrawCommission, useWithdrawalRecords } from '@/hooks/use-commission-core';
import { useSingleLineMemberStats } from '@/hooks/use-commission';
import { formatBalance, bpsToPercent, isTxBusy } from '@/lib/utils/chain-helpers';
import type { LucideIcon } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';

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
  CREATOR_REWARD:       0b100_0000_0000,
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

/** Validate a Substrate SS58 address (basic check) */
function isValidAddress(addr: string): boolean {
  if (!addr) return true; // empty is valid (optional)
  try {
    const { decodeAddress } = require('@polkadot/util-crypto');
    decodeAddress(addr);
    return true;
  } catch {
    return false;
  }
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
  const { data: slMemberStats } = useSingleLineMemberStats(currentEntityId, address);

  const withdraw = useWithdrawCommission();
  const withdrawBusy = isTxBusy(withdraw.txState);

  // Repurchase recipient input
  const [repurchaseAccount, setRepurchaseAccount] = useState('');
  const [addressError, setAddressError] = useState(false);

  // Withdrawal history from chain
  const { data: withdrawalRecords } = useWithdrawalRecords(currentEntityId, address);

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
    const recipient = repurchaseAccount.trim();
    if (recipient && !isValidAddress(recipient)) {
      setAddressError(true);
      return;
    }
    setAddressError(false);
    withdraw.mutate([
      currentEntityId,
      pending,
      null,
      recipient || null,
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
        ? `${formatBalance(dashboard.referral.totalEarned, 12, 4)} NEX`
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
        ? `${formatBalance(dashboard.multiLevelStats.totalEarned, 12, 4)} NEX`
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
        ? `${formatBalance(dashboard.teamTier.totalEarned, 12, 4)} NEX`
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
    const slTotal = slMemberStats
      ? (BigInt(slMemberStats.totalEarnedAsUpline || '0') + BigInt(slMemberStats.totalEarnedAsDownline || '0')).toString()
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
        ? `${formatBalance(slTotal, 12, 4)} NEX`
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
        ? `${t('claimable')}: ${formatBalance(dashboard.poolReward.claimableNex, 12, 4)} NEX`
        : undefined,
      stat2: BigInt(poolBalance) > BigInt(0)
        ? `${isZh ? '沉淀池' : 'Pool'}: ${formatBalance(poolBalance, 12, 4)} NEX`
        : undefined,
    });
  }

  if ((modes & MODES.CREATOR_REWARD) > 0) {
    plugins.push({
      key: 'creatorReward',
      label: t('creatorReward'),
      icon: Wallet,
      href: null,
      status: 'enabled',
      description: t('creatorRewardDesc'),
    });
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
                      {formatBalance(totalEarned, 12, 4)}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">NEX</span>
                    </p>
                  </div>
                  {orderCount > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="text-muted-foreground">
                        {t('commissionOrdersWithContext', { count: orderCount, entity: entityName || t('currentEntity') })}
                      </span>
                    </div>
                  )}
                  {/* Breakdown */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground flex items-center gap-0.5">{t('pendingAmount')} <HelpTip helpKey="earnings.pendingAmount" iconSize={10} /></p>
                      <p className="font-medium">{formatBalance(pending, 12, 4)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-0.5">{t('withdrawnAmount')} <HelpTip helpKey="earnings.withdrawnAmount" iconSize={10} /></p>
                      <p className="font-medium">{formatBalance(withdrawn, 12, 4)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-0.5">{t('repurchasedAmount')} <HelpTip helpKey="earnings.repurchasedAmount" iconSize={10} /></p>
                      <p className="font-medium">{formatBalance(repurchased, 12, 4)}</p>
                    </div>
                  </div>

                  {/* Withdrawal section */}
                  {address && (
                    <div className="mt-4 space-y-2">
                      {/* Repurchase recipient input */}
                      <div>
                        <label className="text-xs text-muted-foreground">{isZh ? '回购接收账户' : 'Repurchase Recipient'}</label>
                        <Input
                          className="mt-1 h-8 text-xs font-mono"
                          placeholder={isZh ? '输入接收回购金额的地址（可选）' : 'Enter address to receive repurchase amount (optional)'}
                          value={repurchaseAccount}
                          onChange={(e) => {
                            setRepurchaseAccount(e.target.value);
                            setAddressError(false);
                          }}
                        />
                        {addressError && (
                          <p className="mt-0.5 text-xs text-destructive">{t('invalidAddress')}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{isZh ? '留空则回购金额转入购物余额' : 'Leave empty to credit shopping balance'}</p>
                      </div>

                      {/* Withdraw button */}
                      <Button
                        className="w-full gap-1.5 text-sm font-bold"
                        variant="default"
                        disabled={withdrawBusy || overview?.withdrawalPaused || BigInt(pending || '0') <= BigInt(0)}
                        onClick={handleWithdraw}
                      >
                        {withdrawBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowDownToLine className="h-4 w-4" />
                        )}
                        {t('withdrawBtn')} ({formatBalance(pending, 12, 4)} NEX)
                      </Button>
                    </div>
                  )}

                  {/* Withdraw tx status */}
                  {withdraw.txState.status === 'finalized' && (
                    <p className="mt-2 text-xs text-success">{t('withdrawSuccess')}</p>
                  )}
                  {withdraw.txState.status === 'error' && (
                    <p className="mt-2 text-xs text-destructive">{withdraw.txState.error}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Entity Fund Overview */}
          {!isLoading && commissionActive && overview && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('entityFundOverview')}</CardTitle>
                  {overview.withdrawalPaused && (
                    <Badge variant="destructive" className="text-[10px]">
                      <AlertTriangle className="mr-1 h-3 w-3" />{t('withdrawalPausedLabel')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-0.5">{t('pendingTotalNex')} <HelpTip helpKey="earnings.pendingTotalNex" iconSize={10} /></p>
                    <p className="font-medium">{formatBalance(overview.pendingTotalNex, 12, 4)} NEX</p>
                  </div>
                  {BigInt(overview.pendingTotalToken || '0') > BigInt(0) && (
                    <div>
                      <p className="text-muted-foreground">{t('pendingTotalToken')}</p>
                      <p className="font-medium">{formatBalance(overview.pendingTotalToken, 12, 4)} Token</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground flex items-center gap-0.5">{t('unallocatedPoolNex')} <HelpTip helpKey="earnings.unallocatedPoolNex" iconSize={10} /></p>
                    <p className="font-medium">{formatBalance(overview.unallocatedPoolNex, 12, 4)} NEX</p>
                  </div>
                  {BigInt(overview.shoppingTotalNex || '0') > BigInt(0) && (
                    <div>
                      <p className="text-muted-foreground flex items-center gap-0.5">{t('shoppingTotalNex')} <HelpTip helpKey="earnings.shoppingTotalNex" iconSize={10} /></p>
                      <p className="font-medium">{formatBalance(overview.shoppingTotalNex, 12, 4)} NEX</p>
                    </div>
                  )}
                  {BigInt(overview.shoppingTotalToken || '0') > BigInt(0) && (
                    <div>
                      <p className="text-muted-foreground">{t('shoppingTotalToken')}</p>
                      <p className="font-medium">{formatBalance(overview.shoppingTotalToken, 12, 4)} Token</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
            <div>
              <h2 className="mb-2 text-sm font-semibold">{t('enabledPlugins')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {plugins.map((plugin) => {
                  const inner = (
                    <Card className="group h-full transition-colors hover:border-primary/50">
                      <CardContent className="flex flex-col gap-2 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                            <plugin.icon className="h-5 w-5" />
                          </div>
                          {statusBadge(plugin.status)}
                        </div>
                        <div className="min-h-[2.5rem]">
                          <p className="text-sm font-medium">{plugin.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{plugin.description}</p>
                          {plugin.stat && (
                            <p className="mt-0.5 text-xs font-semibold text-success truncate">{plugin.stat}</p>
                          )}
                          {plugin.stat2 && (
                            <p className="mt-0.5 text-xs font-semibold text-amber-500 truncate">{plugin.stat2}</p>
                          )}
                        </div>
                        {plugin.href && (
                          <ArrowRight className="h-4 w-4 self-end text-muted-foreground" />
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
            </div>
          ) : null}

          {/* Commission Preview link */}
          {!isLoading && commissionActive && (
            <Link href="/earnings/commission-preview">
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('commissionPreviewLink')}</p>
                    <p className="text-xs text-muted-foreground">{t('commissionPreviewDesc')}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Withdrawal summary */}
          {!isLoading && commissionActive && address && (BigInt(pending || '0') > BigInt(0) || BigInt(withdrawn || '0') > BigInt(0)) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('withdrawalSummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('pendingAmount')}</p>
                    <p className="font-semibold">{formatBalance(pending, 12, 4)} NEX</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('withdrawnAmount')}</p>
                    <p className="font-semibold">{formatBalance(withdrawn, 12, 4)} NEX</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Withdrawal History */}
          {!isLoading && commissionActive && address && currentEntityId != null && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">{isZh ? '提现记录' : 'Withdrawal History'}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* Chain total withdrawn */}
                {BigInt(withdrawn || '0') > BigInt(0) && (
                  <div className="mb-3 rounded-lg bg-success/10 p-3">
                    <p className="text-xs text-muted-foreground">{isZh ? '链上累计提现' : 'Total Withdrawn (on-chain)'}</p>
                    <p className="text-lg font-bold text-success">{formatBalance(withdrawn, 12, 4)} NEX</p>
                  </div>
                )}
                {/* Chain withdrawal records */}
                {!withdrawalRecords || withdrawalRecords.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    {isZh ? '暂无提现明细记录' : 'No withdrawal records yet'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {[...withdrawalRecords].reverse().map((record, i) => (
                      <div
                        key={`wr-${record.blockNumber}-${i}`}
                        className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                      >
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-success">
                              +{formatBalance(record.withdrawn, 12, 4)} NEX
                            </span>
                          </div>
                          {BigInt(record.repurchased || '0') > BigInt(0) && (
                            <p className="text-[10px] text-muted-foreground">
                              {isZh ? '回购' : 'Repurchased'}: {formatBalance(record.repurchased, 12, 4)} NEX
                            </p>
                          )}
                          {BigInt(record.bonus || '0') > BigInt(0) && (
                            <p className="text-[10px] text-amber-500">
                              {isZh ? '奖励' : 'Bonus'}: +{formatBalance(record.bonus, 12, 4)} NEX
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">
                            #{record.blockNumber}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatBalance(record.totalAmount, 12, 4)} NEX
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
