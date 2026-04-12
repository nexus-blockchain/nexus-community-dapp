'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, Clock,
  Wallet,
} from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import {
  usePoolRewardConfig, useCurrentRound, useLastClaimedRound,
  useClaimRecords, usePoolRewardPaused,
  useUnallocatedPool, useClaimPoolReward,
  usePoolRewardMemberView, useCurrentRoundFunding,
} from '@/hooks/use-commission';
import { useLevelSystem } from '@/hooks/use-member';
import { useCurrentBlock } from '@/hooks/use-current-block';
import { formatBalance, formatUsdt, formatNexPrice, isTxBusy } from '@/lib/utils/chain-helpers';
import { TxStatusIndicator } from '@/components/ui/tx-status-indicator';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationBar } from '@/components/ui/pagination-bar';
import type { PoolRewardMemberView } from '@/lib/types';

export default function PoolRewardPage() {
  const t = useTranslations('poolReward');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();

  // Core data
  const { data: config } = usePoolRewardConfig(currentEntityId);
  const { data: round } = useCurrentRound(currentEntityId);
  const { data: lastClaimed } = useLastClaimedRound(currentEntityId, address);
  const { data: records } = useClaimRecords(currentEntityId, address);
  const { data: paused } = usePoolRewardPaused(currentEntityId);
  const { data: poolBalance } = useUnallocatedPool(currentEntityId);
  const { data: levelSystem } = useLevelSystem(currentEntityId);
  const currentBlock = useCurrentBlock();
  const claim = useClaimPoolReward();
  const isBusy = isTxBusy(claim.txState);

  // New data sources
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

  // Fine-grained ineligibility diagnosis when claimableNex === 0
  const ineligibleReason = useMemo((): 'noRateSnapshot' | 'quotaFull' | 'levelNotInRound' | 'poolInsufficient' | 'capExhausted' | 'levelNotEligible' | null => {
    if (!isExactLevelIneligible || !memberView || effectiveLevel == null) return null;
    const prog = memberView.levelProgress.find((p) => p.levelId === effectiveLevel);
    // Level not included in this round's snapshots at all
    if (!prog || prog.memberCount === 0) return 'levelNotInRound';
    // Quota fully claimed by others
    if (prog.claimedCount >= prog.memberCount) return 'quotaFull';
    // Rate snapshot missing — chain cannot compute NEX cap
    if (memberView.capInfo.rateSnapshotUsed == null) return 'noRateSnapshot';
    // Cap exhausted
    if (BigInt(memberView.capInfo.remainingCapUsdt) === BigInt(0)) return 'capExhausted';
    // Pool balance insufficient (perMemberReward > 0 but pool < reward)
    return 'levelNotEligible';
  }, [isExactLevelIneligible, memberView, effectiveLevel]);
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

  const claimPagination = usePagination(claimHistory);

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            {effectivePaused && (
              <Badge variant="warning">{t('paused')}</Badge>
            )}
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

                  {/* Cap progress bar */}
                  <CapProgressBar memberView={memberView ?? null} t={t} />

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
                                  : ineligibleReason === 'noRateSnapshot' ? t('ineligible.noRateSnapshot')
                                  : ineligibleReason === 'quotaFull' ? t('ineligible.quotaFull')
                                  : ineligibleReason === 'levelNotInRound' ? t('ineligible.levelNotInRound')
                                  : ineligibleReason === 'poolInsufficient' ? t('ineligible.poolInsufficient')
                                  : ineligibleReason === 'capExhausted' ? t('ineligible.capExhausted')
                                  : ineligibleReason === 'levelNotEligible' ? t('ineligible.levelNotEligible')
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
                  {ineligibleReason && (
                    <p className="text-xs text-muted-foreground">
                      {ineligibleReason === 'noRateSnapshot' ? t('ineligibleHint.noRateSnapshot')
                        : ineligibleReason === 'quotaFull' ? t('ineligibleHint.quotaFull')
                        : ineligibleReason === 'levelNotInRound' ? t('ineligibleHint.levelNotInRound')
                        : ineligibleReason === 'poolInsufficient' ? t('ineligibleHint.poolInsufficient')
                        : ineligibleReason === 'capExhausted' ? t('ineligibleHint.capExhausted')
                        : t('ineligibleHint.levelNotEligible')}
                    </p>
                  )}
                  <TxStatusIndicator txState={claim.txState} successMessage={t('claimSuccess')} />

                  {/* Claim history */}
                  {claimHistory.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('claimHistory')}</p>
                      {claimPagination.pageItems.map((r, i) => (
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
                      <PaginationBar pagination={claimPagination} />
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
                    value={activeRound || round ? `${remaining}` : '-'}
                    subValue={remaining > 0 ? formatBlocksToTime(remaining, t) : undefined}
                    highlight={remaining > 0 && remaining < 100}
                    helpKey="poolReward.remainingBlocks"
                  />
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
                {memberView?.capInfo.rateSnapshotUsed && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{t('rateSnapshot')}</p>
                    <p className="text-lg font-semibold">{formatNexPrice(memberView.capInfo.rateSnapshotUsed)} USDT / NEX</p>
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
              </div>
            </CardContent>
          </Card>

        </div>
      </PageContainer>
    </>
  );
}

// ─── Sub Components ──────────────────────────────────────────

/** Convert remaining blocks to approximate human-readable time (6s per block) */
function formatBlocksToTime(
  blocks: number,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const totalSeconds = blocks * 6;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return t('timeRemaining', { hours, minutes });
  return t('timeRemainingMinutes', { minutes: Math.max(1, minutes) });
}

/** Cap progress bar: cumulative claimed / cap with visual fill */
function CapProgressBar({
  memberView,
  t,
}: {
  memberView: PoolRewardMemberView | null;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const cap = memberView?.capInfo;
  const currentCapRaw = BigInt(cap?.currentCapUsdt ?? '0');
  const claimedRaw = BigInt(cap?.cumulativeClaimedUsdt ?? '0');
  const remainingRaw = BigInt(cap?.remainingCapUsdt ?? '0');
  const pct = currentCapRaw > BigInt(0) ? Number((claimedRaw * BigInt(10000)) / currentCapRaw) / 100 : 0;
  const isCapped = cap?.isCapped ?? false;
  const isUnlockByTeam = cap?.unlockPercent != null && cap.unlockPercent > 0;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('capProgress')}</span>
        <span className="font-mono font-medium">
          {formatUsdt(cap?.cumulativeClaimedUsdt ?? '0')} / {formatUsdt(cap?.currentCapUsdt ?? '0')} USDT
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${isCapped ? 'bg-orange-500' : 'bg-primary'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{pct.toFixed(1)}%</span>
        <span>{t('capRemainingLabel', { amount: formatUsdt(String(remainingRaw)) })}</span>
      </div>
      {/* Capped prompt */}
      {isCapped && (
        <p className="text-xs text-orange-500 font-medium">
          {isUnlockByTeam ? t('capReachedUnlock') : t('capReachedFixed')}
        </p>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  subValue,
  highlight,
  helpKey,
}: {
  label: string;
  value: string | number;
  subValue?: string;
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
      {subValue && (
        <p className="text-xs text-muted-foreground">{subValue}</p>
      )}
    </div>
  );
}

/** Funding summary grid (reused in current round) */
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
