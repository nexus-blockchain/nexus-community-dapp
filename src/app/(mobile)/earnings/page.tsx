'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight, UserPlus, Layers, Trophy,
  Users2, ArrowUpDown, TrendingDown, Wallet,
  CheckCircle2, XCircle, AlertTriangle, Eye,
} from 'lucide-react';
import { useEntityStore, useWalletStore } from '@/stores';
import { useCommissionDashboard, useEntityCommissionOverview } from '@/hooks/use-commission-dashboard';
import { useMemberCommissionStats } from '@/hooks/use-commission-core';
import { formatBalance, bpsToPercent } from '@/lib/utils/chain-helpers';
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
}

export default function EarningsPage() {
  const t = useTranslations('earnings');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();

  const { data: dashboard, isLoading: dashLoading } = useCommissionDashboard(currentEntityId, address);
  const { data: memberStats, isLoading: statsLoading } = useMemberCommissionStats(currentEntityId, address);
  const { data: overview, isLoading: overviewLoading } = useEntityCommissionOverview(currentEntityId);

  const isLoading = dashLoading || statsLoading || overviewLoading;

  // is_enabled = true 才是佣金系统真正激活
  // overview 永远有值（unwrap_or_default），但 is_enabled=false 时 enabled_modes 是假数据
  const commissionActive = overview?.isEnabled === true;
  const modes = commissionActive ? (overview?.enabledModes ?? 0) : 0;
  const commissionRate = overview?.commissionRate ?? 0;

  const totalEarned = dashboard?.nexStats.totalEarned ?? '0';
  const pending = memberStats?.pending ?? dashboard?.nexStats.pending ?? '0';
  const withdrawn = memberStats?.withdrawn ?? dashboard?.nexStats.withdrawn ?? '0';
  const repurchased = memberStats?.repurchased ?? dashboard?.nexStats.repurchased ?? '0';
  const orderCount = memberStats?.orderCount ?? dashboard?.nexStats.orderCount ?? 0;

  // Build plugin list — only plugins whose mode bit is ON (implicitly requires commissionActive)
  const plugins: PluginSummary[] = [];

  // 1. Direct Referral (4 sub-modes)
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

  // 2. Multi-Level
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

  // 3. Team Performance
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

  // 4. Level Diff
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

  // 5. Single-Line (Upline + Downline)
  const slUpline = (modes & MODES.SINGLE_LINE_UPLINE) > 0;
  const slDownline = (modes & MODES.SINGLE_LINE_DOWNLINE) > 0;
  if (slUpline || slDownline) {
    const slRunning = overview?.singleLineEnabled ?? false;
    plugins.push({
      key: 'singleLine',
      label: t('singleLine'),
      icon: ArrowUpDown,
      href: '/earnings/single-line',
      status: slRunning ? 'enabled' : 'paused',
      description: dashboard?.singleLine?.position != null
        ? t('position', { pos: dashboard.singleLine.position })
        : t('singleLineDesc'),
    });
  }

  // 6. Pool Reward
  if ((modes & MODES.POOL_REWARD) > 0) {
    const prPaused = overview?.poolRewardPaused ?? false;
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
    });
  }

  // 7. Creator Reward
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
                  <p className="text-3xl font-bold text-success">
                    {formatBalance(totalEarned)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">NEX</span>
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {t('commissionRateLabel')}: <span className="font-medium text-foreground">{bpsToPercent(commissionRate)}</span>
                      {' '}<HelpTip helpKey="earnings.commissionRate" iconSize={12} />
                    </span>
                    {orderCount > 0 && (
                      <span className="text-muted-foreground">
                        {t('commissionOrders', { count: orderCount })}
                      </span>
                    )}
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Entity Fund Overview — entity-level aggregated commission data */}
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
                    <p className="font-medium">{formatBalance(overview.pendingTotalNex)} NEX</p>
                  </div>
                  {BigInt(overview.pendingTotalToken || '0') > BigInt(0) && (
                    <div>
                      <p className="text-muted-foreground">{t('pendingTotalToken')}</p>
                      <p className="font-medium">{formatBalance(overview.pendingTotalToken)} Token</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground flex items-center gap-0.5">{t('unallocatedPoolNex')} <HelpTip helpKey="earnings.unallocatedPoolNex" iconSize={10} /></p>
                    <p className="font-medium">{formatBalance(overview.unallocatedPoolNex)} NEX</p>
                  </div>
                  {BigInt(overview.shoppingTotalNex || '0') > BigInt(0) && (
                    <div>
                      <p className="text-muted-foreground flex items-center gap-0.5">{t('shoppingTotalNex')} <HelpTip helpKey="earnings.shoppingTotalNex" iconSize={10} /></p>
                      <p className="font-medium">{formatBalance(overview.shoppingTotalNex)} NEX</p>
                    </div>
                  )}
                  {BigInt(overview.shoppingTotalToken || '0') > BigInt(0) && (
                    <div>
                      <p className="text-muted-foreground">{t('shoppingTotalToken')}</p>
                      <p className="font-medium">{formatBalance(overview.shoppingTotalToken)} Token</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plugin cards — only shown when commission is active and has enabled modes */}
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

          {/* Withdrawal summary — only when commission active & has data */}
          {!isLoading && commissionActive && address && (BigInt(pending || '0') > BigInt(0) || BigInt(withdrawn || '0') > BigInt(0)) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('withdrawalSummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('pendingAmount')}</p>
                    <p className="font-semibold">{formatBalance(pending)} NEX</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('withdrawnAmount')}</p>
                    <p className="font-semibold">{formatBalance(withdrawn)} NEX</p>
                  </div>
                </div>
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
