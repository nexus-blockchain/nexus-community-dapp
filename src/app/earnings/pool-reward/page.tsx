'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Loader2, Check, AlertCircle, Clock, BarChart3, Wallet, Gift } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import {
  usePoolRewardConfig, useCurrentRound, useLastClaimedRound,
  useClaimRecords, usePoolRewardPaused, useDistributionStats,
  useUnallocatedPool, useClaimPoolReward,
} from '@/hooks/use-commission';
import { useLevelSystem } from '@/hooks/use-member';
import { useCurrentBlock } from '@/hooks/use-current-block';
import { formatBalance, bpsToPercent } from '@/lib/utils/chain-helpers';
import type { LevelSnapshot } from '@/lib/types';

export default function PoolRewardPage() {
  const t = useTranslations('poolReward');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();
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

  const canClaim = round && lastClaimed != null && round.roundId > lastClaimed && !paused;
  const alreadyClaimed = round && lastClaimed != null && round.roundId <= lastClaimed;
  const isBusy = ['signing', 'broadcasting', 'inBlock'].includes(claim.txState.status);

  // Calculate end block and remaining
  const endBlock = round && config ? round.startBlock + config.roundDuration : 0;
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
            {config?.tokenPoolEnabled && (
              <Badge variant="outline">{t('tokenPoolEnabled')}</Badge>
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
                      <p className="text-lg font-semibold">{lastClaimed ?? '-'}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{t('claimableNex')}</p>
                      <p className="text-lg font-semibold text-success">
                        {round && round.levelSnapshots.length > 0
                          ? `${formatBalance(round.levelSnapshots[0]?.perMemberReward ?? '0')} NEX`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Claim button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('claimReward')}</p>
                      <p className="text-xs text-muted-foreground">
                        {!canClaim && address && (
                          paused
                            ? t('paused')
                            : alreadyClaimed
                              ? t('alreadyClaimed')
                              : !round
                                ? t('noActiveRound')
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
                  {records && records.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('claimHistory')}</p>
                      {records.slice().reverse().map((r, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-secondary p-2 text-sm">
                          <div>
                            <span>{t('roundLabel', { id: r.roundId })}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              LV.{r.levelId}
                              {levelNameById[r.levelId] ? ` ${levelNameById[r.levelId]}` : ''}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-success">{formatBalance(r.amount)} NEX</p>
                            {r.tokenAmount !== '0' && (
                              <p className="text-xs text-muted-foreground">+ {formatBalance(r.tokenAmount)} Token</p>
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
                  <MetricCell label={t('roundId')} value={round?.roundId ?? '-'} helpKey="poolReward.roundId" />
                  <MetricCell label={t('startBlock')} value={round ? `#${round.startBlock}` : '-'} helpKey="poolReward.startBlock" />
                  <MetricCell label={t('endBlock')} value={endBlock ? `#${endBlock}` : '-'} helpKey="poolReward.endBlock" />
                  <MetricCell
                    label={t('remainingBlocks')}
                    value={round ? String(remaining) : '-'}
                    highlight={remaining > 0 && remaining < 100}
                    helpKey="poolReward.remainingBlocks"
                  />
                  <MetricCell
                    label={t('poolSnapshot')}
                    value={round ? `${formatBalance(round.poolSnapshot)} NEX` : '-'}
                    helpKey="poolReward.poolSnapshot"
                  />
                  <MetricCell label={t('lastRoundId')} value={distStats?.totalRoundsCompleted ?? 0} />
                </div>

                {/* Sediment pool balance */}
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">{t('sedimentPoolBalance')} <HelpTip helpKey="poolReward.sedimentPoolBalance" iconSize={12} /></p>
                  <p className="text-xl font-bold">{formatBalance(poolBalance ?? '0')} NEX</p>
                </div>

                {/* Token pool snapshot */}
                {round?.tokenPoolSnapshot && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">{t('tokenPoolSnapshot')} <HelpTip helpKey="poolReward.tokenPoolSnapshot" iconSize={12} /></p>
                    <p className="text-xl font-bold">{formatBalance(round.tokenPoolSnapshot)} Token</p>
                  </div>
                )}

                {/* NEX Level snapshots table */}
                {round && round.levelSnapshots.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold">{t('levelDistribution')}</p>
                    <LevelSnapshotTable
                      snapshots={round.levelSnapshots}
                      unit="NEX"
                      levelNameById={levelNameById}
                      t={t}
                    />
                  </div>
                )}

                {/* Token Level snapshots table */}
                {round?.tokenLevelSnapshots && round.tokenLevelSnapshots.length > 0 && (
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
                    <Badge variant={paused ? 'warning' : 'success'}>
                      {paused ? t('paused') : t('enabled')}
                    </Badge>
                  </div>

                  {/* Level ratios */}
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground flex items-center gap-1">{t('levelRatios')} <HelpTip helpKey="poolReward.levelRatios" iconSize={12} /></p>
                    <div className="space-y-1">
                      {config.levelRatios.map(([levelId, ratio]) => (
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
