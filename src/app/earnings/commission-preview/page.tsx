'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronDown, ChevronRight,
  UserPlus, Layers, TrendingDown, ArrowUpDown, Users2,
} from 'lucide-react';
import { useEntityStore } from '@/stores';
import { useEntityCommissionOverview } from '@/hooks/use-commission-dashboard';
import { useCommissionCoreConfig, useReferralConfig, useLevelDiffConfig, useTeamPerformanceConfig } from '@/hooks/use-commission-preview';
import { useMultiLevelConfig, useSingleLineConfig } from '@/hooks/use-commission';
import { bpsToPercent, formatUsdt } from '@/lib/utils/chain-helpers';
import type { LucideIcon } from 'lucide-react';

// CommissionModes bitmask (mirrored from earnings page)
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

// ─── Accordion Item ───
function AccordionSection({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="flex-1 text-sm font-medium">{title}</span>
        {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="border-t pt-3">{children}</CardContent>}
    </Card>
  );
}

// ─── Mini table ───
function MiniTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="space-y-1 text-xs">
      {rows.map(([label, value], i) => (
        <div key={i} className="flex justify-between">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Budget bar ───
function BudgetBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {items.map((item, i) => {
          const pct = (item.value / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={i}
              className={`${item.color} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${item.label}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
        {items.filter(i => i.value > 0).map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${item.color}`} />
            {item.label} ({((item.value / total) * 100).toFixed(1)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CommissionPreviewPage() {
  const t = useTranslations('commissionPreview');
  const { currentEntityId } = useEntityStore();

  const [orderAmount, setOrderAmount] = useState(10000);

  // Data queries
  const { data: overview, isLoading: overviewLoading } = useEntityCommissionOverview(currentEntityId);
  const { data: coreConfig, isLoading: coreLoading } = useCommissionCoreConfig(currentEntityId);
  const { data: referralConfig } = useReferralConfig(currentEntityId);
  const { data: multiLevelConfig } = useMultiLevelConfig(currentEntityId);
  const { data: levelDiffConfig } = useLevelDiffConfig(currentEntityId);
  const { data: singleLineConfig } = useSingleLineConfig(currentEntityId);
  const { data: teamConfig } = useTeamPerformanceConfig(currentEntityId);

  const isLoading = overviewLoading || coreLoading;
  const commissionActive = overview?.isEnabled === true;
  const modes = commissionActive ? (overview?.enabledModes ?? 0) : 0;
  const effectiveRate = coreConfig?.maxCommissionRate ?? overview?.commissionRate ?? 0;

  // ─── Calculations ───
  const calc = useMemo(() => {
    // orderAmount is in USDT (integer, no decimals — e.g. 10000 = $10,000)
    // all rates are in bps (10000 = 100%)
    const amountRaw = orderAmount * 1_000_000; // convert to raw USDT (6 decimals)
    const poolB = (amountRaw * effectiveRate) / 10000;
    const creatorRate = coreConfig?.creatorRewardRate ?? 0;
    const creatorReward = (poolB * creatorRate) / 10000;
    const remaining = poolB - creatorReward;
    const caps = coreConfig?.pluginCaps;

    const pluginBudget = (pluginName: keyof NonNullable<typeof caps>) => {
      const capBps = caps?.[pluginName] ?? 0;
      if (capBps > 0) {
        return Math.min(remaining, (amountRaw * capBps) / 10000);
      }
      return remaining; // no cap → gets full remaining
    };

    return {
      poolB,
      creatorReward,
      remaining,
      referralBudget: pluginBudget('referral'),
      multiLevelBudget: pluginBudget('multiLevel'),
      levelDiffBudget: pluginBudget('levelDiff'),
      singleLineBudget: pluginBudget('singleLine'),
      teamBudget: pluginBudget('team'),
    };
  }, [orderAmount, effectiveRate, coreConfig]);

  // Determine which plugins are enabled
  const hasReferral = (modes & (MODES.DIRECT_REWARD | MODES.FIXED_AMOUNT | MODES.FIRST_ORDER | MODES.REPEAT_PURCHASE)) > 0;
  const hasMultiLevel = (modes & MODES.MULTI_LEVEL) > 0;
  const hasLevelDiff = (modes & MODES.LEVEL_DIFF) > 0;
  const hasSingleLine = (modes & (MODES.SINGLE_LINE_UPLINE | MODES.SINGLE_LINE_DOWNLINE)) > 0;
  const hasTeam = (modes & MODES.TEAM_PERFORMANCE) > 0;
  const hasCreator = (modes & MODES.CREATOR_REWARD) > 0;

  // Budget distribution data
  const budgetItems = [
    ...(hasCreator ? [{ label: t('creatorReward'), value: calc.creatorReward, color: 'bg-amber-500' }] : []),
    ...(hasReferral ? [{ label: t('referral'), value: calc.referralBudget, color: 'bg-blue-500' }] : []),
    ...(hasMultiLevel ? [{ label: t('multiLevel'), value: calc.multiLevelBudget, color: 'bg-green-500' }] : []),
    ...(hasLevelDiff ? [{ label: t('levelDiff'), value: calc.levelDiffBudget, color: 'bg-purple-500' }] : []),
    ...(hasSingleLine ? [{ label: t('singleLine'), value: calc.singleLineBudget, color: 'bg-pink-500' }] : []),
    ...(hasTeam ? [{ label: t('teamPerformance'), value: calc.teamBudget, color: 'bg-orange-500' }] : []),
  ];

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Description */}
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>

          {/* Entity guard */}
          {currentEntityId == null ? (
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{t('noEntityHint')}</p></CardContent></Card>
          ) : isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !commissionActive ? (
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{t('notEnabled')}</p></CardContent></Card>
          ) : (
            <>
              {/* ─── Input Area ─── */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-xs font-medium text-muted-foreground">{t('orderAmount')}</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(Math.max(1, Number(e.target.value) || 1))}
                      className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">{t('orderAmountUnit')}</span>
                  </div>
                </CardContent>
              </Card>

              {/* ─── Overview Card ─── */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('overview')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">{t('effectiveRate')}</p>
                      <p className="text-lg font-bold">{bpsToPercent(effectiveRate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('poolBTotal')}</p>
                      <p className="text-lg font-bold">${formatUsdt(calc.poolB)}</p>
                    </div>
                    {hasCreator && (
                      <div>
                        <p className="text-muted-foreground">{t('creatorReward')}</p>
                        <p className="font-semibold">${formatUsdt(calc.creatorReward)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">{t('pluginAllocatable')}</p>
                      <p className="font-semibold">${formatUsdt(calc.remaining)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ─── Budget Distribution ─── */}
              {budgetItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('budgetDistribution')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BudgetBar items={budgetItems} />
                  </CardContent>
                </Card>
              )}

              {/* ─── Plugin Details (Accordion) ─── */}
              <h2 className="text-sm font-semibold">{t('pluginDetails')}</h2>

              {/* Referral */}
              {hasReferral && (
                <AccordionSection
                  icon={UserPlus}
                  title={t('referral')}
                  badge={`$${formatUsdt(calc.referralBudget)}`}
                >
                  {referralConfig ? (
                    <MiniTable rows={[
                      [t('directRewardRate'), bpsToPercent(referralConfig.directRewardRate)],
                      [t('firstOrderRate'), bpsToPercent(referralConfig.firstOrderRate)],
                      [t('firstOrderAmount'), referralConfig.firstOrderAmount !== '0' ? formatUsdt(referralConfig.firstOrderAmount) + ' USDT' : '-'],
                      [t('repeatPurchaseRate'), bpsToPercent(referralConfig.repeatPurchaseRate)],
                      [t('fixedAmount'), referralConfig.fixedAmountAmount !== '0' ? formatUsdt(referralConfig.fixedAmountAmount) + ' USDT' : '-'],
                      [t('capPerOrder'), referralConfig.caps.maxPerOrder ? formatUsdt(referralConfig.caps.maxPerOrder) + ' USDT' : t('noCap')],
                      [t('capTotal'), referralConfig.caps.maxTotal ? formatUsdt(referralConfig.caps.maxTotal) + ' USDT' : t('noCap')],
                      [t('budgetCapBps'), coreConfig?.pluginCaps.referral ? bpsToPercent(coreConfig.pluginCaps.referral) : t('noCap')],
                    ]} />
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('noConfig')}</p>
                  )}
                </AccordionSection>
              )}

              {/* Multi-Level */}
              {hasMultiLevel && (
                <AccordionSection
                  icon={Layers}
                  title={t('multiLevel')}
                  badge={`$${formatUsdt(calc.multiLevelBudget)}`}
                >
                  {multiLevelConfig ? (
                    <div className="space-y-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="pb-1 text-left font-medium">{t('level', { n: '' })}</th>
                              <th className="pb-1 text-right font-medium">{t('rate')}</th>
                              <th className="pb-1 text-right font-medium">{t('directRequired')}</th>
                              <th className="pb-1 text-right font-medium">{t('teamRequired')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {multiLevelConfig.levels.map((tier, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-1">{t('level', { n: i + 1 })}</td>
                                <td className="py-1 text-right font-medium">{bpsToPercent(tier.rate)}</td>
                                <td className="py-1 text-right">{tier.requiredDirects}</td>
                                <td className="py-1 text-right">{tier.requiredTeamSize}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <MiniTable rows={[
                        [t('maxTotalRate'), bpsToPercent(multiLevelConfig.maxTotalRate)],
                        [t('budgetCapBps'), coreConfig?.pluginCaps.multiLevel ? bpsToPercent(coreConfig.pluginCaps.multiLevel) : t('noCap')],
                      ]} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('noConfig')}</p>
                  )}
                </AccordionSection>
              )}

              {/* Level Diff */}
              {hasLevelDiff && (
                <AccordionSection
                  icon={TrendingDown}
                  title={t('levelDiff')}
                  badge={`$${formatUsdt(calc.levelDiffBudget)}`}
                >
                  {levelDiffConfig ? (
                    <div className="space-y-2">
                      <div className="space-y-1 text-xs">
                        {levelDiffConfig.levelRates.map((rate, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-muted-foreground">{t('levelRate', { n: i + 1 })}</span>
                            <span className="font-medium">{bpsToPercent(rate)}</span>
                          </div>
                        ))}
                      </div>
                      <MiniTable rows={[
                        [t('maxDepth'), String(levelDiffConfig.maxDepth)],
                        [t('budgetCapBps'), coreConfig?.pluginCaps.levelDiff ? bpsToPercent(coreConfig.pluginCaps.levelDiff) : t('noCap')],
                      ]} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('noConfig')}</p>
                  )}
                </AccordionSection>
              )}

              {/* Single-Line */}
              {hasSingleLine && (
                <AccordionSection
                  icon={ArrowUpDown}
                  title={t('singleLine')}
                  badge={`$${formatUsdt(calc.singleLineBudget)}`}
                >
                  {singleLineConfig ? (
                    <MiniTable rows={[
                      [t('uplineRate'), bpsToPercent(singleLineConfig.uplineRate)],
                      [t('downlineRate'), bpsToPercent(singleLineConfig.downlineRate)],
                      [t('uplineLevels'), `${singleLineConfig.baseUplineLevels} ~ ${singleLineConfig.maxUplineLevels}`],
                      [t('downlineLevels'), `${singleLineConfig.baseDownlineLevels} ~ ${singleLineConfig.maxDownlineLevels}`],
                      [t('budgetCapBps'), coreConfig?.pluginCaps.singleLine ? bpsToPercent(coreConfig.pluginCaps.singleLine) : t('noCap')],
                    ]} />
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('noConfig')}</p>
                  )}
                </AccordionSection>
              )}

              {/* Team Performance */}
              {hasTeam && (
                <AccordionSection
                  icon={Users2}
                  title={t('teamPerformance')}
                  badge={`$${formatUsdt(calc.teamBudget)}`}
                >
                  {teamConfig ? (
                    <div className="space-y-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="pb-1 text-left font-medium">{t('tier', { n: '' })}</th>
                              <th className="pb-1 text-right font-medium">{t('rate')}</th>
                              <th className="pb-1 text-right font-medium">{t('salesThreshold')}</th>
                              <th className="pb-1 text-right font-medium">{t('minTeamSize')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamConfig.tiers.map((tier, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-1">{t('tier', { n: i + 1 })}</td>
                                <td className="py-1 text-right font-medium">{bpsToPercent(tier.rate)}</td>
                                <td className="py-1 text-right">{formatUsdt(tier.salesThreshold)}</td>
                                <td className="py-1 text-right">{tier.minTeamSize}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <MiniTable rows={[
                        [t('maxDepth'), String(teamConfig.maxDepth)],
                        [t('allowStacking'), teamConfig.allowStacking ? t('yes') : t('no')],
                        [t('budgetCapBps'), coreConfig?.pluginCaps.team ? bpsToPercent(coreConfig.pluginCaps.team) : t('noCap')],
                      ]} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('noConfig')}</p>
                  )}
                </AccordionSection>
              )}
            </>
          )}
        </div>
      </PageContainer>
    </>
  );
}
