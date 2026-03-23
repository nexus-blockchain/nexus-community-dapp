'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Loader2, Sprout } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCancelMarketOrder } from '@/hooks/use-market';
import { formatBalance } from '@/lib/utils/chain-helpers';
import type { TradeOrder } from '@/lib/types';

interface MyOrdersProps {
  orders: TradeOrder[] | undefined;
  entityId: number | null;
}

export function MyOrders({ orders, entityId }: MyOrdersProps) {
  const t = useTranslations('market');
  const cancelOrder = useCancelMarketOrder();
  const cancelling = ['signing', 'broadcasting', 'inBlock'].includes(cancelOrder.txState.status);

  const activeOrders = (orders ?? []).filter(
    (o) => (o.entityId === entityId) && (o.status === 'Open' || o.status === 'PartiallyFilled'),
  );

  if (activeOrders.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{t('myOrders')}</span>
          <Badge variant="secondary" className="text-xs">{activeOrders.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {activeOrders.map((order) => (
          <div
            key={order.orderId}
            className="flex items-center justify-between rounded-lg bg-secondary px-2.5 py-2"
          >
            <div className="flex items-center gap-2 text-sm">
              {order.side === 'Buy' ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={order.side === 'Buy' ? 'text-success' : 'text-destructive'}>
                {order.side === 'Buy' ? t('buy') : t('sell')}
              </span>
              <span className="font-mono text-xs tabular-nums">{formatBalance(order.price)}</span>
              <span className="text-xs text-muted-foreground">
                x{formatBalance(order.tokenAmount)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {order.depositWaived && (
                <Badge variant="outline" className="border-warning/50 text-[10px] text-warning">
                  <Sprout className="mr-0.5 h-3 w-3" />
                  {t('seedOrder')}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {order.status === 'PartiallyFilled' ? t('partiallyFilled') : t('pending')}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                disabled={cancelling}
                onClick={() => cancelOrder.mutate([order.orderId])}
              >
                {cancelling ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : null}
                {t('cancelOrder')}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
