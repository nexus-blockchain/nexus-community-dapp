'use client';

import { useTranslations } from 'next-intl';
import { Gift, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NexFirstOrderBannerProps {
  isEligible: boolean;
  isActive: boolean;
  activeTradeId: number | null;
}

export function NexFirstOrderBanner({ isEligible, isActive, activeTradeId }: NexFirstOrderBannerProps) {
  const t = useTranslations('market.nexMarket.firstOrder');

  if (!isEligible && !isActive) return null;

  return (
    <Card className={isEligible ? 'border-success/50 bg-success/5' : 'border-warning/50 bg-warning/5'}>
      <CardContent className="flex items-center gap-3 p-3">
        {isEligible ? (
          <Gift className="h-5 w-5 shrink-0 text-success" />
        ) : (
          <Clock className="h-5 w-5 shrink-0 text-warning" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              {isEligible ? t('eligible') : t('active')}
            </p>
            <Badge variant={isEligible ? 'success' : 'warning'} className="text-[10px]">
              {t('title')}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isEligible
              ? t('eligibleDesc')
              : t('activeDesc', { id: String(activeTradeId ?? '') })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
