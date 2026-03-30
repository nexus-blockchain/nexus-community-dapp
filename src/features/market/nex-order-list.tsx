'use client';

import { useTranslations } from 'next-intl';
import { HandCoins, ArrowRightLeft, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNexPrice, formatBalance } from '@/lib/utils/chain-helpers';
import type { NexMarketOrder } from '@/lib/types';

function getActiveOrders(orders: NexMarketOrder[]) {
  return orders.filter((o) => {
    const remaining = BigInt(o.amount) - BigInt(o.filled);
    return remaining > BigInt(0);
  });
}

interface NexOrderListProps {
  buyOrders: NexMarketOrder[];
  sellOrders: NexMarketOrder[];
  isLoading: boolean;
  onBuyAction?: (order: NexMarketOrder) => void;
  onSellAction?: (order: NexMarketOrder) => void;
}

export function NexOrderList({ buyOrders, sellOrders, isLoading, onBuyAction, onSellAction }: NexOrderListProps) {
  const t = useTranslations('market');
  const tn = useTranslations('market.nexMarket');

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full rounded-xl" />;
  }

  const activeBuys = getActiveOrders(buyOrders);
  const activeSells = getActiveOrders(sellOrders);

  return (
    <Card>
      <CardHeader className="pb-0">
        <Tabs defaultValue="sell">
          <TabsList className="w-full">
            <TabsTrigger value="buy" className="flex-1 gap-1.5">
              {tn('allBuyOrders')}
              {activeBuys.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{activeBuys.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex-1 gap-1.5">
              {tn('allSellOrders')}
              {activeSells.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{activeSells.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="mt-2">
            <CardContent className="px-0 pb-0">
              <OrderSideContent
                side="Buy"
                orders={activeBuys}
                emptyText={t('noBids')}
                onAction={onBuyAction}
              />
            </CardContent>
          </TabsContent>

          <TabsContent value="sell" className="mt-2">
            <CardContent className="px-0 pb-0">
              <OrderSideContent
                side="Sell"
                orders={activeSells}
                emptyText={t('noAsks')}
                onAction={onSellAction}
              />
            </CardContent>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}

function OrderSideContent({ side, orders, emptyText, onAction }: {
  side: 'Buy' | 'Sell';
  orders: NexMarketOrder[];
  emptyText: string;
  onAction?: (order: NexMarketOrder) => void;
}) {
  const tn = useTranslations('market.nexMarket');
  const priceColor = side === 'Buy' ? 'text-success' : 'text-destructive';
  const ActionIcon = side === 'Buy' ? HandCoins : ArrowRightLeft;

  if (orders.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">{emptyText}</p>;
  }

  return (
    <>
      <div className="mb-1 grid grid-cols-[40px_1fr_1fr_1fr_44px] gap-1 text-[10px] text-muted-foreground">
        <span>ID</span>
        <span>{tn('usdtPrice')}</span>
        <span>{tn('nexAmount')}</span>
        <span>{side === 'Sell' ? tn('lockedNex') : tn('deposit')}</span>
        <span />
      </div>
      <div className="space-y-px">
        {orders.map((order) => {
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
                className="h-8 w-full px-1 text-[10px]"
                onClick={() => onAction?.(order)}
              >
                <ActionIcon className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}
