'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Landmark, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { useTreasury } from '@/hooks/use-treasury';
import { formatBalance } from '@/lib/utils/chain-helpers';

interface TreasuryCardProps {
  entityId: number;
  entityName?: string;
}

type HealthLevel = 'healthy' | 'warning' | 'danger';

function getHealthLevel(
  balance: bigint,
  minThreshold: string | undefined,
): HealthLevel {
  if (!minThreshold || minThreshold === '0') return 'healthy';
  const threshold = BigInt(minThreshold);
  if (threshold === BigInt(0)) return 'healthy';
  if (balance >= threshold * BigInt(2)) return 'healthy';
  if (balance >= threshold) return 'warning';
  return 'danger';
}

const healthConfig: Record<HealthLevel, {
  icon: typeof ShieldCheck;
  dotColor: string;
  label: 'treasuryHealthy' | 'treasuryWarning' | 'treasuryDanger';
  textColor: string;
}> = {
  healthy: { icon: ShieldCheck, dotColor: 'bg-green-500', label: 'treasuryHealthy', textColor: 'text-green-600' },
  warning: { icon: ShieldAlert, dotColor: 'bg-yellow-500', label: 'treasuryWarning', textColor: 'text-yellow-600' },
  danger:  { icon: ShieldX,     dotColor: 'bg-red-500',    label: 'treasuryDanger',  textColor: 'text-red-600' },
};

export function TreasuryCard({ entityId, entityName }: TreasuryCardProps) {
  const t = useTranslations('profile');
  const { data: treasury, isLoading } = useTreasury(entityId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-5 w-28 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!treasury) return null;

  const health = getHealthLevel(
    treasury.balance,
    treasury.fundProtection?.minTreasuryThreshold,
  );
  const cfg = healthConfig[health];
  const HealthIcon = cfg.icon;

  const hasFundProtection = treasury.fundProtection &&
    (treasury.fundProtection.minTreasuryThreshold !== '0' ||
     treasury.fundProtection.maxSingleSpend !== '0' ||
     treasury.fundProtection.maxDailySpend !== '0');

  // Daily spend progress
  const dailySpentRaw = treasury.dailySpend?.accumulated ?? '0';
  const maxDailyRaw = treasury.fundProtection?.maxDailySpend ?? '0';
  const dailySpentBig = BigInt(dailySpentRaw);
  const maxDailyBig = BigInt(maxDailyRaw);
  const dailyPercent = maxDailyBig > BigInt(0)
    ? Number((dailySpentBig * BigInt(100)) / maxDailyBig)
    : 0;

  return (
    <Card className="border-amber-200/50">
      <CardContent className="p-4 space-y-3">
        {/* Row 1: Balance + Health */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Landmark className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{entityName ? `${entityName} ${t('treasuryBalance')}` : t('treasuryBalance')}</p>
            <p className="text-lg font-bold">{formatBalance(treasury.balance.toString())} <span className="text-sm font-normal text-muted-foreground">NEX</span></p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
            <span className={`text-xs font-medium ${cfg.textColor}`}>{t(cfg.label)}</span>
          </div>
        </div>

        {/* Row 2: Fund protection thresholds (compact) */}
        {hasFundProtection && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            {treasury.fundProtection!.minTreasuryThreshold !== '0' && (
              <div className="rounded bg-secondary/50 px-2 py-1.5 text-center">
                <p className="text-muted-foreground">{t('minThreshold')}</p>
                <p className="font-medium mt-0.5">{formatBalance(treasury.fundProtection!.minTreasuryThreshold)}</p>
              </div>
            )}
            {treasury.fundProtection!.maxSingleSpend !== '0' && (
              <div className="rounded bg-secondary/50 px-2 py-1.5 text-center">
                <p className="text-muted-foreground">{t('maxSingleSpend')}</p>
                <p className="font-medium mt-0.5">{formatBalance(treasury.fundProtection!.maxSingleSpend)}</p>
              </div>
            )}
            {treasury.fundProtection!.maxDailySpend !== '0' && (
              <div className="rounded bg-secondary/50 px-2 py-1.5 text-center">
                <p className="text-muted-foreground">{t('maxDailySpend')}</p>
                <p className="font-medium mt-0.5">{formatBalance(treasury.fundProtection!.maxDailySpend)}</p>
              </div>
            )}
          </div>
        )}

        {/* Row 3: Daily spend progress bar */}
        {maxDailyBig > BigInt(0) && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('dailySpent')}</span>
              <span className="font-medium">{formatBalance(dailySpentRaw)} / {formatBalance(maxDailyRaw)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  dailyPercent >= 90 ? 'bg-red-500' :
                  dailyPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(dailyPercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
