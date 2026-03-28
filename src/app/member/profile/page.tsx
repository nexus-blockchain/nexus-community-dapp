'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award, ShoppingCart, Users, Calendar, Activity,
  Shield, Ban, Clock, ArrowUpRight, ChevronRight, Network,
} from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import { useMember, useLevelSystem } from '@/hooks/use-member';
import { useMemberDashboard } from '@/hooks/use-member-team';
import { shortAddress, formatUsdt, bpsToPercent } from '@/lib/utils/chain-helpers';

export default function MemberProfilePage() {
  const t = useTranslations('member');
  const tc = useTranslations('common');
  const tp = useTranslations('profile');
  const te = useTranslations('earnings');
  const { currentEntityId } = useEntityStore();
  const { address, isConnected } = useWalletStore();
  const { data: member } = useMember(currentEntityId, address);
  const { data: dashboard, isLoading } = useMemberDashboard(currentEntityId, address);
  const { data: levelSystem } = useLevelSystem(currentEntityId);

  const levelName = (levelId: number) => {
    if (levelId === 0) return t('regularMember');
    return levelSystem?.levels.find((l) => l.id === levelId)?.name || `LV.${levelId}`;
  };

  if (isLoading) {
    return (
      <>
        <MobileHeader title={t('profileTitle')} showBack />
        <PageContainer>
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </PageContainer>
      </>
    );
  }

  if (!dashboard) {
    // Determine the actual reason for no data
    const reason = !isConnected
      ? te('connectWalletHint')
      : currentEntityId == null
        ? te('noEntityHint')
        : !member
          ? t('joinCommunity')
          : tc('loading');

    return (
      <>
        <MobileHeader title={t('profileTitle')} showBack />
        <PageContainer>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">{reason}</p>
            </CardContent>
          </Card>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <MobileHeader title={t('profileTitle')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Level card */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                  <Award className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t('effectiveLevel')}</p>
                  <p className="text-2xl font-bold">{levelName(dashboard.effectiveLevelId)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {dashboard.activated ? (
                      <Badge variant="default" className="text-xs">{t('activated')}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">{t('notActivated')}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Banned warning */}
          {dashboard.isBanned && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-center gap-3 p-4">
                <Ban className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">{t('banned')}</p>
                  {dashboard.banReason && (
                    <p className="text-xs text-muted-foreground">{t('banReason', { reason: dashboard.banReason })}</p>
                  )}
                  {dashboard.bannedAt && (
                    <p className="text-xs text-muted-foreground">{t('bannedAtBlock', { block: dashboard.bannedAt })}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats grid */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('memberStats')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <ShoppingCart className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">{t('totalSpent', { amount: formatUsdt(dashboard.totalSpent) })}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <ShoppingCart className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">{t('orderCount')}</p>
                  <p className="text-lg font-bold">{dashboard.orderCount}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <Calendar className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">{t('joinedAt')}</p>
                  <p className="text-sm font-medium">{t('blockNumber', { block: dashboard.joinedAt })}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <Activity className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">{t('lastActiveAt')}</p>
                  <p className="text-sm font-medium">{t('blockNumber', { block: dashboard.lastActiveAt })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{t('myReferrals')}</span>
                <Link href="/member/network">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    {t('viewNetwork')} <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-center text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t('directReferrals')}</p>
                  <p className="text-xl font-bold text-primary">{dashboard.directReferrals}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('indirectReferrals')}</p>
                  <p className="text-xl font-bold">{dashboard.indirectReferrals}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('teamSize')}</p>
                  <p className="text-xl font-bold">{dashboard.teamSize}</p>
                </div>
              </div>
              {dashboard.referrer && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary p-2 text-sm">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">{t('myReferrer')}</span>
                  <span className="font-mono text-xs truncate">{shortAddress(dashboard.referrer)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Level expiry */}
          {dashboard.levelExpiresAt && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Clock className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t('levelExpiry')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('levelExpiresAt', { block: dashboard.levelExpiresAt })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upgrade history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpRight className="h-4 w-4" />
                {t('upgradeHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.upgradeHistory.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('noUpgradeHistory')}</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.upgradeHistory.map((record, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3 text-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span>{levelName(record.fromLevelId)}</span>
                          <ArrowUpRight className="h-3 w-3 text-success" />
                          <span className="font-medium">{levelName(record.toLevelId)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{t('upgradeAt', { block: record.upgradedAt })}</span>
                          {record.expiresAt && (
                            <span>| {t('expiresAt', { block: record.expiresAt })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Level system */}
          {levelSystem && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant={levelSystem.useCustom ? 'success' : 'secondary'}>
                  {levelSystem.useCustom ? t('customLevel') : t('defaultLevel')}
                </Badge>
                <Badge variant="outline">
                  {levelSystem.upgradeMode === 'AutoUpgrade' ? t('autoUpgrade') : t('manualUpgrade')}
                </Badge>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('levelList')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {levelSystem.levels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noCustomLevels')}</p>
                  ) : (
                    <div className="space-y-3">
                      {levelSystem.levels.map((level) => {
                        const currentLevel = member?.customLevelId ?? 0;
                        const isCurrent = level.id === currentLevel;
                        const spentThreshold = member?.totalSpent ?? 0;
                        const isReached = spentThreshold >= level.threshold;
                        return (
                          <div
                            key={level.id}
                            className={`rounded-lg border p-3 ${
                              isCurrent
                                ? 'border-primary bg-primary/10'
                                : isReached
                                ? 'border-success/30 bg-success/5'
                                : 'border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Shield className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="font-medium">{level.name || t('levelName', { id: level.id })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isCurrent && <Badge variant="default">{t('current')}</Badge>}
                                {!isCurrent && isReached && <Badge variant="success">{t('reached')}</Badge>}
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                              <div>
                                <p className="flex items-center gap-0.5">{t('spendThreshold')} <HelpTip helpKey="member.spendThreshold" iconSize={10} /></p>
                                <p className="font-medium text-foreground">${formatUsdt(level.threshold)}</p>
                              </div>
                              <div>
                                <p className="flex items-center gap-0.5">{t('discountRate')} <HelpTip helpKey="member.discountRate" iconSize={10} /></p>
                                <p className="font-medium text-foreground">{bpsToPercent(level.discountRate)}</p>
                              </div>
                              <div>
                                <p className="flex items-center gap-0.5">{t('commissionBonus')} <HelpTip helpKey="member.commissionBonus" iconSize={10} /></p>
                                <p className="font-medium text-foreground">{bpsToPercent(level.commissionBonus)}</p>
                              </div>
                            </div>
                            {/* Progress */}
                            {!isReached && member && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{t('progress')}</span>
                                  <span>${formatUsdt(member.totalSpent)} / ${formatUsdt(level.threshold)}</span>
                                </div>
                                <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{
                                      width: `${Math.min(100, (member.totalSpent / level.threshold) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Quick link */}
          <Link href="/member/network">
            <Button variant="outline" className="w-full gap-2 text-sm">
              <Network className="h-4 w-4" /> {t('networkTitle')}
            </Button>
          </Link>
        </div>
      </PageContainer>
    </>
  );
}
