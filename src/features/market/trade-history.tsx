'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBalance } from '@/lib/utils/chain-helpers';
import type { TradeRecord } from '@/lib/types';

interface TradeHistoryProps {
  trades: TradeRecord[] | undefined;
}

const MAX_DISPLAY = 15;

export function TradeHistory({ trades }: TradeHistoryProps) {
  const t = useTranslations('market');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('recentTrades')}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {(!trades || trades.length === 0) ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t('noTrades')}</p>
        ) : (
          <>
            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>{t('price')}</span>
              <span>{t('amount')}</span>
              <span>{t('total')}</span>
            </div>
            <div className="space-y-px">
              {trades.slice(0, MAX_DISPLAY).map((tr) => (
                <div key={tr.tradeId} className="flex items-center justify-between py-0.5 text-xs">
                  <span className={`tabular-nums ${tr.side === 'Buy' ? 'text-success' : 'text-destructive'}`}>
                    {formatBalance(tr.price)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatBalance(tr.tokenAmount)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatBalance(tr.nexAmount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
