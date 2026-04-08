'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { MobileHeader } from '@/components/layout/mobile-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Landmark, Shield, Clock, Users, Vote,
  Lock, Unlock, Pause, Play, AlertTriangle, Settings,
} from 'lucide-react';
import { useEntityStore } from '@/stores';
import {
  useGovernanceOverview,
  useEntityProposals,
  type GovernanceMode,
  type ProposalStatus,
} from '@/hooks/use-governance';
import { shortAddress, formatBalance } from '@/lib/utils/chain-helpers';

// ─────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────

const STATUS_KEY: Record<ProposalStatus, string> = {
  Voting: 'statusVoting',
  Passed: 'statusPassed',
  Failed: 'statusFailed',
  Executed: 'statusExecuted',
  ApprovedOffchain: 'statusApprovedOffchain',
  Cancelled: 'statusCancelled',
  Expired: 'statusExpired',
  ExecutionFailed: 'statusExecutionFailed',
};

const STATUS_VARIANT: Record<ProposalStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Voting: 'default',
  Passed: 'default',
  Failed: 'destructive',
  Executed: 'secondary',
  ApprovedOffchain: 'default',
  Cancelled: 'outline',
  Expired: 'outline',
  ExecutionFailed: 'destructive',
};

const MODE_KEY: Record<GovernanceMode, string> = {
  None: 'modeNone',
  FullDAO: 'modeFullDAO',
  MultiSig: 'modeMultiSig',
  Council: 'modeCouncil',
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function GovernancePage() {
  const t = useTranslations('governance');
  const { currentEntityId } = useEntityStore();
  const { data: overview, isLoading: overviewLoading } = useGovernanceOverview(currentEntityId);
  const { data: proposals, isLoading: proposalsLoading } = useEntityProposals(currentEntityId);

  const isLoading = overviewLoading || proposalsLoading;

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        {/* No entity selected */}
        {!currentEntityId && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">{t('noEntity')}</p>
              <p className="text-sm text-muted-foreground">{t('noEntityDesc')}</p>
              <Link href="/settings" className="mt-2 text-sm text-primary underline">
                <Settings className="mr-1 inline h-3.5 w-3.5" />
                {t('noEntityDesc')}
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {currentEntityId && isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 rounded-xl bg-secondary" />
            <div className="h-24 rounded-xl bg-secondary" />
            <div className="h-48 rounded-xl bg-secondary" />
          </div>
        )}

        {/* Pallet not available */}
        {currentEntityId && !isLoading && overview && !overview.palletAvailable && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Landmark className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">{t('palletNotAvailable')}</p>
              <p className="text-sm text-muted-foreground">{t('palletNotAvailableDesc')}</p>
            </CardContent>
          </Card>
        )}

        {/* Main content */}
        {currentEntityId && !isLoading && overview?.palletAvailable && (
          <div className="space-y-4">
            {/* Governance Config Overview */}
            {overview.config ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Landmark className="h-4 w-4 text-primary" />
                    {t('overview')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Mode badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('mode')}</span>
                    <Badge variant="default">{t(MODE_KEY[overview.config.mode])}</Badge>
                  </div>

                  {/* Status row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
                      {overview.locked
                        ? <Lock className="h-4 w-4 text-amber-500" />
                        : <Unlock className="h-4 w-4 text-green-500" />}
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t('governanceLock')}</p>
                        <p className="text-xs font-medium">{overview.locked ? t('locked') : t('unlocked')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
                      {overview.paused
                        ? <Pause className="h-4 w-4 text-red-500" />
                        : <Play className="h-4 w-4 text-green-500" />}
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t('governancePause')}</p>
                        <p className="text-xs font-medium">{overview.paused ? t('paused') : t('running')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Parameters grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <ParamItem
                      icon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
                      label={t('votingPeriod')}
                      value={overview.config.votingPeriod > 0 ? t('blocks', { count: overview.config.votingPeriod }) : '-'}
                    />
                    <ParamItem
                      icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
                      label={t('executionDelay')}
                      value={overview.config.executionDelay > 0 ? t('blocks', { count: overview.config.executionDelay }) : '-'}
                    />
                    <ParamItem
                      icon={<Users className="h-3.5 w-3.5 text-purple-500" />}
                      label={t('quorumThreshold')}
                      value={overview.config.quorumThreshold > 0 ? t('percent', { value: overview.config.quorumThreshold }) : '-'}
                    />
                    <ParamItem
                      icon={<Vote className="h-3.5 w-3.5 text-green-500" />}
                      label={t('passThreshold')}
                      value={overview.config.passThreshold > 0 ? t('percent', { value: overview.config.passThreshold }) : '-'}
                    />
                    <ParamItem
                      icon={<Shield className="h-3.5 w-3.5 text-red-500" />}
                      label={t('proposalThreshold')}
                      value={overview.config.proposalThreshold > 0 ? t('bps', { value: overview.config.proposalThreshold }) : '-'}
                    />
                    <ParamItem
                      icon={<Shield className="h-3.5 w-3.5 text-orange-500" />}
                      label={t('adminVeto')}
                      value={overview.config.adminVetoEnabled ? t('enabled') : t('disabled')}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <Landmark className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">{t('noConfig')}</p>
                  <p className="text-sm text-muted-foreground">{t('noConfigDesc')}</p>
                </CardContent>
              </Card>
            )}

            {/* Proposals List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Vote className="h-4 w-4 text-primary" />
                    {t('activeProposals')}
                  </span>
                  {proposals && proposals.length > 0 && (
                    <Badge variant="secondary">{proposals.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {proposalsLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : !proposals || proposals.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t('noProposals')}</p>
                ) : (
                  <div className="space-y-2">
                    {proposals.map((p) => (
                      <div key={p.id} className="rounded-lg border p-3 space-y-2">
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{t('proposalId', { id: p.id })}</span>
                          <Badge variant={STATUS_VARIANT[p.status]} className="text-[10px]">
                            {t(STATUS_KEY[p.status])}
                          </Badge>
                        </div>

                        {/* Title */}
                        {p.title && (
                          <p className="text-sm text-muted-foreground truncate">{p.title}</p>
                        )}

                        {/* Proposer */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{t('proposer')}:</span>
                          <span className="font-mono">{shortAddress(p.proposer)}</span>
                        </div>

                        {/* Vote stats */}
                        <div className="grid grid-cols-4 gap-1 text-center">
                          <VoteStat label={t('yesVotes')} value={formatBalance(p.yesVotes)} color="text-green-600" />
                          <VoteStat label={t('noVotes')} value={formatBalance(p.noVotes)} color="text-red-600" />
                          <VoteStat label={t('abstainVotes')} value={formatBalance(p.abstainVotes)} color="text-gray-500" />
                          <VoteStat label={t('voterCount')} value={String(p.voterCount)} color="text-blue-600" />
                        </div>

                        {/* Voting end */}
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{t('votingEnds')}: {t('blockNumber', { block: p.votingEnd })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function ParamItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-xs font-medium">{value}</p>
      </div>
    </div>
  );
}

function VoteStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-xs font-bold ${color}`}>{value}</p>
    </div>
  );
}
