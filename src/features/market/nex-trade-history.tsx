'use client';

import { useTranslations } from 'next-intl';
import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBalance, formatNexPrice } from '@/lib/utils/chain-helpers';
import type { NexMarketTrade } from '@/lib/types';

interface NexTradeHistoryProps {
  trades: NexMarketTrade[] | undefined;
  address: string | null;
}

export function NexTradeHistory({ trades, address }: NexTradeHistoryProps) {
  const tn = useTranslations('market.nexMarket');
  const ts = useTranslations('market.nexMarket.status');

  const completedTrades = (trades ?? []).filter((t) =>
    t.status === 'Completed'
    || t.status === 'Refunded'
    || t.status === 'Cancelled'
    || t.status === 'Disputed',
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5">
            <History className="h-4 w-4" />
            {tn('tradeHistory')}
          </span>
          {completedTrades.length > 0 && (
            <Badge variant="secondary" className="text-xs">{completedTrades.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {completedTrades.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{tn('noTrades')}</p>
        ) : (
          <>
        {/* Header row */}
        <div className="mb-1 grid grid-cols-[36px_1fr_1fr_70px] gap-1 text-[10px] text-muted-foreground">
          <span>ID</span>
          <span>NEX</span>
          <span>USDT</span>
          <span className="text-right">{tn('statusLabel')}</span>
        </div>
        <div className="space-y-px">
          {completedTrades.map((trade) => {
            const isBuyer = address === trade.buyer;

            const statusColor =
              trade.status === 'Completed' ? 'success' as const
              : trade.status === 'Refunded' ? 'secondary' as const
              : 'destructive' as const;

            const statusText =
              trade.status === 'Completed' ? ts('completed')
              : trade.status === 'Refunded' ? ts('refunded')
              : trade.status === 'Cancelled' ? ts('cancelled')
              : ts('disputed');

            return (
              <div
                key={trade.tradeId}
                className="grid grid-cols-[36px_1fr_1fr_70px] items-center gap-1 rounded px-1 py-1 text-xs hover:bg-secondary/50"
              >
                <span className="tabular-nums text-muted-foreground">#{trade.tradeId}</span>
                <span className={`tabular-nums ${isBuyer ? 'text-success' : 'text-destructive'}`}>
                  {isBuyer ? '+' : '-'}{formatBalance(trade.nexAmount)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  ${formatNexPrice(trade.usdtAmount)}
                </span>
                <div className="text-right">
                  <Badge variant={statusColor} className="text-[10px]">
                    {statusText}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
