'use client';

import { useTranslations } from 'next-intl';
import { HandCoins, ArrowRightLeft, Lock } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNexPrice, formatBalance } from '@/lib/utils/chain-helpers';
import type { NexMarketOrder } from '@/lib/types';

interface NexOrderListProps {
  side: 'Buy' | 'Sell';
  orders: NexMarketOrder[];
  isLoading: boolean;
  onAction?: (order: NexMarketOrder) => void;
}

export function NexOrderList({ side, orders, isLoading, onAction }: NexOrderListProps) {
  const t = useTranslations('market');
  const tn = useTranslations('market.nexMarket');

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full rounded-xl" />;
  }

  const title = side === 'Buy' ? tn('allBuyOrders') : tn('allSellOrders');
  const helpKey = side === 'Buy' ? 'nexMarket.allBuyOrders' : 'nexMarket.allSellOrders';
  const emptyText = side === 'Buy' ? t('noBids') : t('noAsks');
  const priceColor = side === 'Buy' ? 'text-success' : 'text-destructive';
  const ActionIcon = side === 'Buy' ? HandCoins : ArrowRightLeft;

  const activeOrders = orders.filter((o) => {
    const remaining = BigInt(o.amount) - BigInt(o.filled);
    return remaining > BigInt(0);
  });

  if (activeOrders.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">{title} <HelpTip helpKey={helpKey} iconSize={13} /></CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="py-4 text-center text-xs text-muted-foreground">{emptyText}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">{title} <HelpTip helpKey={helpKey} iconSize={13} /></CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {/* Table header */}
        <div className="mb-1 grid grid-cols-[40px_1fr_1fr_1fr_44px] gap-1 text-[10px] text-muted-foreground">
          <span>ID</span>
          <span>{tn('usdtPrice')}</span>
          <span>{tn('nexAmount')}</span>
          <span>{side === 'Sell' ? tn('lockedNex') : tn('deposit')}</span>
          <span />
        </div>

        {/* Order rows */}
        <div className="space-y-px">
          {activeOrders.map((order) => {
            const remaining = BigInt(order.amount) - BigInt(order.filled);
            const depositDisplay = side === 'Sell'
              ? formatBalance(remaining.toString())
              : (BigInt(order.deposit) > BigInt(0) ? formatBalance(order.deposit) : '-');
            return (
              <div
                key={order.id}
                className="grid grid-cols-[40px_1fr_1fr_1fr_44px] items-center gap-1 rounded px-1 py-1 text-xs hover:bg-secondary/50"
              >
                <span className="tabular-nums text-muted-foreground">#{order.id}</span>
                <span className={`tabular-nums ${priceColor}`}>${formatNexPrice(order.price)}</span>
                <span className="tabular-nums">{formatBalance(remaining.toString())}</span>
                <span className="flex items-center gap-0.5 tabular-nums text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" />
                  {depositDisplay}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-full px-1 text-[10px]"
                  onClick={() => onAction?.(order)}
                >
                  <ActionIcon className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
