'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Loader2, Sprout, Lock } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNexPrice, formatBalance, shortAddress } from '@/lib/utils/chain-helpers';
import type { NexMarketOrder } from '@/lib/types';

interface NexMyOrdersProps {
  orders: NexMarketOrder[] | undefined;
  onCancelOrder: (orderId: number) => void;
  cancelLoading: boolean;
}

export function NexMyOrders({ orders, onCancelOrder, cancelLoading }: NexMyOrdersProps) {
  const t = useTranslations('market');
  const tn = useTranslations('market.nexMarket');

  const activeOrders = (orders ?? []).filter((o) => {
    const remaining = BigInt(o.amount) - BigInt(o.filled);
    return remaining > BigInt(0);
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5">{tn('myOrders')} <HelpTip helpKey="nexMarket.myOrders" iconSize={13} /></span>
          {activeOrders.length > 0 && (
            <Badge variant="secondary" className="text-xs">{activeOrders.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {activeOrders.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{tn('noOrders')}</p>
        ) : activeOrders.map((order) => {
          const remaining = BigInt(order.amount) - BigInt(order.filled);
          const isBuy = order.side === 'Buy';
          const hasDeposit = isBuy && BigInt(order.deposit) > BigInt(0);
          const lockedNex = !isBuy && remaining > BigInt(0);
          return (
            <div
              key={order.id}
              className="rounded-lg bg-secondary px-2.5 py-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {isBuy ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={isBuy ? 'font-medium text-success' : 'font-medium text-destructive'}>
                    #{order.id} {isBuy ? t('buy') : t('sell')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {order.depositWaived && (
                    <Badge variant="outline" className="border-warning/50 text-[10px] text-warning">
                      <Sprout className="mr-0.5 h-3 w-3" />
                      {t('seedOrder')}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    disabled={cancelLoading}
                    onClick={() => onCancelOrder(order.id)}
                  >
                    {cancelLoading ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {t('cancelOrder')}
                  </Button>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">${formatNexPrice(order.price)}</span>
                <span className="tabular-nums">{formatBalance(remaining.toString())} NEX</span>
                {order.tronAddress && (
                  <span className="truncate">{shortAddress(order.tronAddress, 8)}</span>
                )}
              </div>
              {(hasDeposit || lockedNex) && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {hasDeposit && (
                    <span className="tabular-nums">{tn('deposit')}: {formatBalance(order.deposit)} NEX</span>
                  )}
                  {lockedNex && (
                    <span className="tabular-nums">{tn('lockedNex')}: {formatBalance(remaining.toString())} NEX</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
