'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy, Loader2, Check, AlertCircle, Clock, BarChart3,
  Wallet, Gift, History, ChevronDown, ChevronUp, Coins, ArrowDownToLine,
} from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import {
  usePoolRewardConfig, useCurrentRound, useLastClaimedRound,
  useClaimRecords, usePoolRewardPaused, useDistributionStats,
  useUnallocatedPool, useClaimPoolReward, useRoundHistory,
  usePoolFundingRecords, usePoolRewardMemberView, useCurrentRoundFunding,
} from '@/hooks/use-commission';
import { useLevelSystem } from '@/hooks/use-member';
import { useCurrentBlock } from '@/hooks/use-current-block';
import { formatBalance, bpsToPercent, isTxBusy } from '@/lib/utils/chain-helpers';
import type { LevelSnapshot, CompletedRoundSummary, PoolFundingRecord, LevelProgressInfo } from '@/lib/types';

export default function PoolRewardPage() {
  const t = useTranslations('poolReward');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();

  // Core data
  const { data: config, isLoading } = usePoolRewardConfig(currentEntityId);
  const { data: round } = useCurrentRound(currentEntityId);
  const { data: lastClaimed } = useLastClaimedRound(currentEntityId, address);
  const { data: records } = useClaimRecords(currentEntityId, address);
  const { data: paused } = usePoolRewardPaused(currentEntityId);
  const { data: distStats } = useDistributionStats(currentEntityId);
  const { data: poolBalance } = useUnallocatedPool(currentEntityId);
  const { data: levelSystem } = useLevelSystem(currentEntityId);
  const currentBlock = useCurrentBlock();
  const claim = useClaimPoolReward();

  // New data sources
  const { data: roundHistory } = useRoundHistory(currentEntityId);
  const { data: fundingRecords } = usePoolFundingRecords(currentEntityId);
  const { data: memberView } = usePoolRewardMemberView(currentEntityId, address);
  const { data: currentFunding } = useCurrentRoundFunding(currentEntityId);

  // Use memberView for accurate claimable amounts when available
  const claimableNex = memberView?.claimableNex ?? '0';
  const claimableToken = memberView?.claimableToken ?? '0';
  const effectiveLevel = memberView?.effectiveLevel;
  const alreadyClaimed = memberView
    ? memberView.alreadyClaimed
    : (round && lastClaimed != null && round.roundId <= lastClaimed);
  const effectivePaused = memberView?.isPaused ?? paused;
  const activeRound = memberView ? {
    roundId: memberView.currentRoundId,
    startBlock: memberView.roundStartBlock,
    endBlock: memberView.roundEndBlock,
    poolSnapshot: memberView.poolSnapshot,
    tokenPoolSnapshot: memberView.tokenPoolSnapshot,
    levelProgress: memberView.levelProgress,
    tokenLevelProgress: memberView.tokenLevelProgress,
  } : null;
  const canClaim = memberView
    ? (!memberView.alreadyClaimed && !memberView.isPaused && memberView.currentRoundId > 0 && BigInt(claimableNex) > BigInt(0))
    : (round && lastClaimed != null && round.roundId > lastClaimed && !effectivePaused);
  const isExactLevelIneligible = !!memberView
    && !memberView.isPaused
    && !memberView.alreadyClaimed
    && !memberView.roundExpired
    && memberView.currentRoundId > 0
    && BigInt(claimableNex) === BigInt(0);
  const isBusy = isTxBusy(claim.txState);

  // Calculate end block and remaining
  const endBlock = activeRound?.endBlock ?? (round && config ? round.startBlock + config.roundDuration : 0);
  const remaining = endBlock && currentBlock ? Math.max(0, endBlock - currentBlock) : 0;

  // Level name lookup
  const levelNameById = useMemo(() => {
    const map: Record<number, string> = {};
    if (levelSystem?.levels) {
      for (const level of levelSystem.levels) {
        map[level.id] = level.name;
      }
    }
    return map;
  }, [levelSystem]);

  // Sorted round history (newest first)
  const sortedHistory = useMemo(() => {
    if (!roundHistory?.length) return [];
    return [...roundHistory].reverse();
  }, [roundHistory]);

  // Sorted funding records (newest first)
  const sortedFunding = useMemo(() => {
    if (!fundingRecords?.length) return [];
    return [...fundingRecords].reverse();
  }, [fundingRecords]);

  // Use memberView claim history (from runtime API) if available, else fallback to storage records
  const claimHistory = useMemo(() => {
    if (memberView?.claimHistory?.length) {
      return [...memberView.claimHistory].reverse();
    }
    if (records?.length) {
      return [...records].reverse();
    }
    return [];
  }, [memberView, records]);

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={effectivePaused ? 'warning' : 'success'}>
              {effectivePaused ? t('paused') : t('running')}
            </Badge>
            {config?.tokenPoolEnabled && (
              <Badge variant="outline">{t('tokenPoolEnabled')}</Badge>
            )}
            {memberView?.hasPendingConfig && (
              <Badge variant="secondary">{t('hasPendingConfig')}</Badge>
            )}
          </div>

          {/* ═══ My Participation ═══ */}
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" />
                {t('myParticipation')}
              </CardTitle>
              <CardDescription>{t('myParticipationDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!address ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('connectWallet')}</p>
              ) : (
                <div className="space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{t('lastClaimedRound')}</p>
                      <p className="text-lg font-semibold">
                        {memberView ? memberView.lastClaimedRound : (lastClaimed ?? '-')}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{t('claimableNex')}</p>
                      <p className="text-lg font-semibold text-success">
                        {BigInt(claimableNex) > BigInt(0) ? `${formatBalance(claimableNex)} NEX` : '-'}
                      </p>
                    </div>
                    {effectiveLevel != null && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">{t('effectiveLevel')}</p>
                        <p className="text-lg font-semibold">
                          Lv.{effectiveLevel}
                          {levelNameById[effectiveLevel] ? ` ${levelNameById[effectiveLevel]}` : ''}
                        </p>
                      </div>
                    )}
                    {config?.tokenPoolEnabled && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">{t('claimableToken')}</p>
                        <p className="text-lg font-semibold text-success">
                          {BigInt(claimableToken) > BigInt(0) ? `${formatBalance(claimableToken)} USDT` : '-'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Claim button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('claimReward')}</p>
                      <p className="text-xs text-muted-foreground">
                        {!canClaim && address && (
                          effectivePaused
                            ? t('paused')
                            : alreadyClaimed
                              ? t('alreadyClaimed')
                              : memberView?.roundExpired
                                ? t('roundExpired')
                                : !(activeRound || round)
                                  ? t('noActiveRound')
                                  : isExactLevelIneligible
                                    ? t('levelNotEligible')
                                    : t('noClaim')
                        )}
                        {canClaim && (
                          <span className="font-medium text-success">{t('claimAvailable')}</span>
                        )}
                      </p>
                    </div>
                    <Button
                      disabled={!canClaim || isBusy}
                      onClick={() => claim.mutate([currentEntityId])}
                    >
                      {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isBusy ? t('claiming') : canClaim ? t('claim') : t('noClaim')}
                    </Button>
                  </div>
                  {isExactLevelIneligible && (
                    <p className="text-xs text-muted-foreground">{t('eligibilityHint')}</p>
                  )}
                  {claim.txState.status === 'finalized' && (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <Check className="h-4 w-4" /> {t('claimSuccess')}
                    </div>
                  )}
                  {claim.txState.status === 'error' && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" /> {claim.txState.error}
                    </div>
                  )}

                  {/* Claim history */}
                  {claimHistory.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('claimHistory')}</p>
                      {claimHistory.map((r, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-secondary p-2 text-sm">
                          <div>
                            <span>{t('roundLabel', { id: r.roundId })}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              Lv.{r.levelId}
                              {levelNameById[r.levelId] ? ` ${levelNameById[r.levelId]}` : ''}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              #{r.claimedAt}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-success">{formatBalance(r.amount)} NEX</p>
                            {r.tokenAmount !== '0' && (
                              <p className="text-xs text-muted-foreground">+ {formatBalance(r.tokenAmount)} USDT</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('noClaimHistory')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ Current Round Info ═══ */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                {t('currentRoundInfo')}
              </CardTitle>
              <CardDescription>{t('currentRoundInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Metric grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricCell label={t('roundId')} value={activeRound?.roundId ?? round?.roundId ?? '-'} helpKey="poolReward.roundId" />
                  <MetricCell label={t('startBlock')} value={(activeRound?.startBlock ?? round?.startBlock) ? `#${activeRound?.startBlock ?? round?.startBlock}` : '-'} helpKey="poolReward.startBlock" />
                  <MetricCell label={t('endBlock')} value={endBlock ? `#${endBlock}` : '-'} helpKey="poolReward.endBlock" />
                  <MetricCell
                    label={t('remainingBlocks')}
                    value={activeRound || round ? String(remaining) : '-'}
                    highlight={remaining > 0 && remaining < 100}
                    helpKey="poolReward.remainingBlocks"
                  />
                  <MetricCell
                    label={t('poolSnapshot')}
                    value={activeRound ? `${formatBalance(activeRound.poolSnapshot)} NEX` : round ? `${formatBalance(round.poolSnapshot)} NEX` : '-'}
                    helpKey="poolReward.poolSnapshot"
                  />
                  <MetricCell label={t('lastRoundId')} value={activeRound?.roundId ?? distStats?.totalRoundsCompleted ?? 0} />
                </div>

                {/* Sediment pool balance */}
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">{t('sedimentPoolBalance')} <HelpTip helpKey="poolReward.sedimentPoolBalance" iconSize={12} /></p>
                  <p className="text-xl font-bold">{formatBalance(poolBalance ?? '0')} NEX</p>
                </div>

                {/* Token pool snapshot */}
                {activeRound?.tokenPoolSnapshot ? (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">{t('tokenPoolSnapshot')} <HelpTip helpKey="poolReward.tokenPoolSnapshot" iconSize={12} /></p>
                    <p className="text-xl font-bold">{formatBalance(activeRound.tokenPoolSnapshot)} Token</p>
                  </div>
                ) : round?.tokenPoolSnapshot && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">{t('tokenPoolSnapshot')} <HelpTip helpKey="poolReward.tokenPoolSnapshot" iconSize={12} /></p>
                    <p className="text-xl font-bold">{formatBalance(round.tokenPoolSnapshot)} Token</p>
                  </div>
                )}

                {/* Current round funding summary */}
                {currentFunding && currentFunding.totalFundingCount > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{t('currentRoundFunding')}</p>
                    <FundingSummaryGrid
                      nex={currentFunding.nexCommissionRemainder}
                      tokenPlatform={currentFunding.tokenPlatformFeeRetention}
                      tokenComm={currentFunding.tokenCommissionRemainder}
                      cancel={currentFunding.nexCancelReturn}
                      count={currentFunding.totalFundingCount}
                      t={t}
                    />
                  </div>
                )}

                {/* Level snapshots — use runtime API levelProgress if available */}
                {memberView?.levelProgress && memberView.levelProgress.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold">{t('levelDistribution')}</p>
                    <LevelProgressTable
                      progress={memberView.levelProgress}
                      unit="NEX"
                      levelNameById={levelNameById}
                      t={t}
                    />
                  </div>
                ) : round && round.levelSnapshots.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold">{t('levelDistribution')}</p>
                    <LevelSnapshotTable
                      snapshots={round.levelSnapshots}
                      unit="NEX"
                      levelNameById={levelNameById}
                      t={t}
                    />
                  </div>
                ) : null}

                {/* Token Level snapshots table */}
                {activeRound?.tokenLevelProgress && activeRound.tokenLevelProgress.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold">{t('tokenLevelSnapshots')}</p>
                    <LevelProgressTable
                      progress={activeRound.tokenLevelProgress}
                      unit="Token"
                      levelNameById={levelNameById}
                      t={t}
                    />
                  </div>
                ) : round?.tokenLevelSnapshots && round.tokenLevelSnapshots.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold">{t('tokenLevelSnapshots')}</p>
                    <LevelSnapshotTable
                      snapshots={round.tokenLevelSnapshots}
                      unit="Token"
                      levelNameById={levelNameById}
                      t={t}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ═══ Distribution Stats ═══ */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                {t('distributionStats')}
              </CardTitle>
              <CardDescription>{t('distributionStatsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground flex items-center gap-1">{t('nexDistributed')} <HelpTip helpKey="poolReward.nexDistributed" iconSize={12} /></p>
                  <p className="text-lg font-semibold">{formatBalance(distStats?.totalNexDistributed ?? '0')} NEX</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground flex items-center gap-1">{t('tokenDistributed')} <HelpTip helpKey="poolReward.tokenDistributed" iconSize={12} /></p>
                  <p className="text-lg font-semibold">{formatBalance(distStats?.totalTokenDistributed ?? '0')} Token</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground flex items-center gap-1">{t('roundsCompleted')} <HelpTip helpKey="poolReward.roundsCompleted" iconSize={12} /></p>
                  <p className="text-lg font-semibold">{distStats?.totalRoundsCompleted ?? 0}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground flex items-center gap-1">{t('totalClaims')} <HelpTip helpKey="poolReward.totalClaims" iconSize={12} /></p>
                  <p className="text-lg font-semibold">{distStats?.totalClaims ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══ Round History ═══ */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                {t('roundHistory')}
                {sortedHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {sortedHistory.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{t('roundHistoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedHistory.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('noRoundHistory')}</p>
              ) : (
                <div className="space-y-2">
                  {sortedHistory.map((r) => (
                    <RoundHistoryItem
                      key={r.roundId}
                      round={r}
                      levelNameById={levelNameById}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ Funding Records ═══ */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-4 w-4" />
                {t('fundingRecords')}
                {sortedFunding.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {sortedFunding.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{t('fundingRecordsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedFunding.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('noFundingRecords')}</p>
              ) : (
                <div className="space-y-2">
                  {sortedFunding.map((r, i) => (
                    <FundingRecordItem key={i} record={r} t={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ Basic Config ═══ */}
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !config ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t('noConfig')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gift className="h-4 w-4" />
                  {t('config')}
                </CardTitle>
                <CardDescription>{t('configDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Enabled status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('enabledLabel')}</span>
                    <Badge variant={effectivePaused ? 'warning' : 'success'}>
                      {effectivePaused ? t('paused') : t('enabled')}
                    </Badge>
                  </div>

                  {/* Level ratios */}
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground flex items-center gap-1">{t('levelRatios')} <HelpTip helpKey="poolReward.levelRatios" iconSize={12} /></p>
                    <div className="space-y-1">
                      {config.levelRules.map(([levelId, ratio]) => (
                        <div key={levelId} className="flex items-center justify-between rounded-lg bg-secondary p-2 text-sm">
                          <span>
                            Lv{levelId}
                            {levelNameById[levelId] ? ` ${levelNameById[levelId]}` : ''}
                          </span>
                          <Badge variant="outline">{bpsToPercent(ratio)}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Round duration */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">{t('roundDuration')} <HelpTip helpKey="poolReward.roundDuration" iconSize={12} /></span>
                    <span className="font-medium">{t('roundDurationValue', { blocks: config.roundDuration })}</span>
                  </div>

                  {/* Token pool */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">{t('tokenPool')} <HelpTip helpKey="poolReward.tokenPool" iconSize={12} /></span>
                    <span className="font-medium">
                      {config.tokenPoolEnabled ? t('tokenPoolEnabledYes') : t('tokenPoolEnabledNo')}
                    </span>
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

// ─── Sub Components ──────────────────────────────────────────

function MetricCell({
  label,
  value,
  highlight,
  helpKey,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  helpKey?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {helpKey && <HelpTip helpKey={helpKey} iconSize={12} />}
      </p>
      <p className={`text-lg font-semibold ${highlight ? 'text-orange-500' : ''}`}>
        {String(value)}
      </p>
    </div>
  );
}

function LevelSnapshotTable({
  snapshots,
  unit,
  levelNameById,
  t,
}: {
  snapshots: LevelSnapshot[];
  unit: string;
  levelNameById: Record<number, string>;
  t: (key: string) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-3 py-2 text-left font-medium">{t('levelId')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('memberCount')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('perMemberReward')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('claimProgress')}</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snap) => {
            const pct = snap.memberCount > 0
              ? Math.round((snap.claimedCount / snap.memberCount) * 100)
              : 0;
            return (
              <tr key={snap.levelId} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <Badge variant="outline">
                    Lv{snap.levelId}
                    {levelNameById[snap.levelId] ? ` ${levelNameById[snap.levelId]}` : ''}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right font-mono">{snap.memberCount}</td>
                <td className="px-3 py-2 text-right font-mono font-medium">
                  {formatBalance(snap.perMemberReward)} {unit}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs">
                      {snap.claimedCount}/{snap.memberCount}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Level progress table (from runtime API — includes ratio_bps) */
function LevelProgressTable({
  progress,
  unit,
  levelNameById,
  t,
}: {
  progress: LevelProgressInfo[];
  unit: string;
  levelNameById: Record<number, string>;
  t: (key: string) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-3 py-2 text-left font-medium">{t('levelId')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('levelRatios')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('memberCount')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('perMemberReward')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('claimProgress')}</th>
          </tr>
        </thead>
        <tbody>
          {progress.map((p) => {
            const pct = p.memberCount > 0
              ? Math.round((p.claimedCount / p.memberCount) * 100)
              : 0;
            return (
              <tr key={p.levelId} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <Badge variant="outline">
                    Lv{p.levelId}
                    {levelNameById[p.levelId] ? ` ${levelNameById[p.levelId]}` : ''}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {bpsToPercent(p.ratioBps)}
                </td>
                <td className="px-3 py-2 text-right font-mono">{p.memberCount}</td>
                <td className="px-3 py-2 text-right font-mono font-medium">
                  {formatBalance(p.perMemberReward)} {unit}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs">
                      {p.claimedCount}/{p.memberCount}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Expandable round history item */
function RoundHistoryItem({
  round,
  levelNameById,
  t,
}: {
  round: CompletedRoundSummary;
  levelNameById: Record<number, string>;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalClaimed = round.claimedCount;
  const totalMembers = round.eligibleCount || round.levelSnapshots.reduce((sum, s) => sum + s.memberCount, 0);
  const claimPct = totalMembers > 0 ? Math.round((totalClaimed / totalMembers) * 100) : 0;

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between p-3 text-left text-sm"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{t('roundSummary', { id: round.roundId })}</span>
            <span className="text-xs text-muted-foreground">
              {t('roundBlocks', { start: round.startBlock, end: round.endBlock })}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{t('totalPooled')}: {formatBalance(round.poolSnapshot)} NEX</span>
            <span>{t('claimRate')}: {claimPct}% ({totalClaimed}/{totalMembers})</span>
            <span>{t('perMemberReward')}: {formatBalance(round.perMemberReward)} NEX</span>
            <span>{t('memberCount')}: {round.eligibleCount}</span>
            {round.tokenPerMemberReward && BigInt(round.tokenPerMemberReward) > BigInt(0) && (
              <span>{t('tokenPerMemberReward')}: {formatBalance(round.tokenPerMemberReward)} Token</span>
            )}
            {round.tokenClaimedCount > 0 && (
              <span>{t('tokenClaims')}: {round.tokenClaimedCount}</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-3">
          {/* Level snapshots */}
          <LevelSnapshotTable
            snapshots={round.levelSnapshots}
            unit="NEX"
            levelNameById={levelNameById}
            t={t}
          />

          {/* Token level snapshots */}
          {round.tokenLevelSnapshots && round.tokenLevelSnapshots.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground">{t('tokenLevelSnapshots')}</p>
              <LevelSnapshotTable
                snapshots={round.tokenLevelSnapshots}
                unit="Token"
                levelNameById={levelNameById}
                t={t}
              />
            </>
          )}

          {/* Funding summary */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t('fundingSummary')} · {t('fundingCount', { count: round.fundingSummary.totalFundingCount })}
            </p>
            <FundingSummaryGrid
              nex={round.fundingSummary.nexCommissionRemainder}
              tokenPlatform={round.fundingSummary.tokenPlatformFeeRetention}
              tokenComm={round.fundingSummary.tokenCommissionRemainder}
              cancel={round.fundingSummary.nexCancelReturn}
              count={round.fundingSummary.totalFundingCount}
              t={t}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Funding summary grid (reused in round history items and current round) */
function FundingSummaryGrid({
  nex,
  tokenPlatform,
  tokenComm,
  cancel,
  count: _count,
  t,
}: {
  nex: string;
  tokenPlatform: string;
  tokenComm: string;
  cancel: string;
  count: number;
  t: (key: string) => string;
}) {
  const items = [
    { label: t('nexCommissionRemainder'), value: nex, unit: 'NEX' },
    { label: t('tokenPlatformFee'), value: tokenPlatform, unit: 'Token' },
    { label: t('tokenCommissionRemainder'), value: tokenComm, unit: 'Token' },
    { label: t('nexCancelReturn'), value: cancel, unit: 'NEX' },
  ].filter((item) => BigInt(item.value) > BigInt(0));

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded bg-muted/50 px-2 py-1.5 text-xs">
          <p className="text-muted-foreground">{item.label}</p>
          <p className="font-mono font-medium">{formatBalance(item.value)} {item.unit}</p>
        </div>
      ))}
    </div>
  );
}

/** Individual funding record item */
function FundingRecordItem({
  record,
  t,
}: {
  record: PoolFundingRecord;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const sourceLabel: Record<string, string> = {
    OrderCommissionRemainder: t('sourceOrderCommission'),
    TokenPlatformFeeRetention: t('sourceTokenPlatformFee'),
    TokenCommissionRemainder: t('sourceTokenCommission'),
    CancelReturn: t('sourceCancelReturn'),
  };

  const sourceColors: Record<string, string> = {
    OrderCommissionRemainder: 'bg-blue-500/10 text-blue-600',
    TokenPlatformFeeRetention: 'bg-purple-500/10 text-purple-600',
    TokenCommissionRemainder: 'bg-indigo-500/10 text-indigo-600',
    CancelReturn: 'bg-orange-500/10 text-orange-600',
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <ArrowDownToLine className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${sourceColors[record.source] ?? ''}`}>
            {sourceLabel[record.source] ?? record.source}
          </Badge>
          {record.orderId > 0 && (
            <span className="text-xs text-muted-foreground">{t('orderIdLabel', { id: record.orderId })}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('blockLabel', { block: record.blockNumber })}
        </p>
      </div>
      <div className="text-right shrink-0">
        {BigInt(record.nexAmount) > BigInt(0) && (
          <p className="font-mono font-semibold text-success">{formatBalance(record.nexAmount)} NEX</p>
        )}
        {BigInt(record.tokenAmount) > BigInt(0) && (
          <p className="font-mono text-xs text-muted-foreground">{formatBalance(record.tokenAmount)} Token</p>
        )}
      </div>
    </div>
  );
}
