'use client';

import { useTranslations } from 'next-intl';
import { ArrowDownUp, Send, CheckCircle, Loader2, Copy, Check, Clock, Lock, TrendingUp, TrendingDown, Sprout } from 'lucide-react';
import { useState, useCallback } from 'react';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { HelpTip } from '@/components/ui/help-tip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBalance, formatNexPrice, shortAddress, isTxBusy } from '@/lib/utils/chain-helpers';
import { useNexConfirmPayment, useNexSellerConfirmReceived, useNexProcessTimeout } from '@/hooks/use-nex-global-market';
import type { NexMarketTrade, NexMarketOrder } from '@/lib/types';

function isBusy(m: { txState: { status: string } }): boolean {
  return isTxBusy(m.txState);
}

interface NexActiveTradesProps {
  trades: NexMarketTrade[] | undefined;
  address: string | null;
  orders: NexMarketOrder[] | undefined;
  onCancelOrder: (orderId: number) => void;
  cancelLoading: boolean;
}

export function NexActiveTrades({ trades, address, orders, onCancelOrder, cancelLoading }: NexActiveTradesProps) {
  const t = useTranslations('market');
  const tn = useTranslations('market.nexMarket');

  const activeTrades = (trades ?? []).filter((t) =>
    t.status === 'AwaitingPayment'
    || t.status === 'AwaitingVerification'
    || t.status === 'UnderpaidPending',
  );

  const activeOrders = (orders ?? []).filter((o) => {
    const remaining = BigInt(o.amount) - BigInt(o.filled);
    return remaining > BigInt(0);
  });

  return (
    <Card>
      <CardHeader className="pb-0">
        <Tabs defaultValue="trades">
          <TabsList className="w-full">
            <TabsTrigger value="trades" className="flex-1 gap-1.5">
              {tn('myTrades')}
              {activeTrades.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{activeTrades.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 gap-1.5">
              {tn('myOrders')}
              {activeOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{activeOrders.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="mt-2">
            <CardContent className="space-y-2 px-0 pb-0">
              {activeTrades.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">{tn('noTrades')}</p>
              ) : activeTrades.map((trade) => (
                <ActiveTradeCard key={trade.tradeId} trade={trade} address={address} />
              ))}
            </CardContent>
          </TabsContent>

          <TabsContent value="orders" className="mt-2">
            <CardContent className="space-y-1.5 px-0 pb-0">
              {activeOrders.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">{tn('noOrders')}</p>
              ) : activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} onCancelOrder={onCancelOrder} cancelLoading={cancelLoading} />
              ))}
            </CardContent>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}

function ActiveTradeCard({ trade, address }: { trade: NexMarketTrade; address: string | null }) {
  const tn = useTranslations('market.nexMarket');
  const ts = useTranslations('market.nexMarket.status');

  const confirmPayment = useNexConfirmPayment();
  const sellerConfirm = useNexSellerConfirmReceived();
  const processTimeout = useNexProcessTimeout();
  const [copied, setCopied] = useState(false);

  const isBuyer = address === trade.buyer;
  const isSeller = address === trade.seller;

  const statusVariant =
    trade.status === 'AwaitingPayment' ? 'secondary' as const
    : trade.status === 'AwaitingVerification' ? 'warning' as const
    : 'warning' as const;

  const statusLabel =
    trade.status === 'AwaitingPayment' ? ts('awaitingPayment')
    : trade.status === 'AwaitingVerification' ? ts('awaitingVerification')
    : trade.status === 'UnderpaidPending' ? ts('underpaidPending')
    : trade.status;

  // Show the seller's TRON address for the buyer to pay to
  const tronToPay = trade.sellerTronAddress;

  const handleCopy = useCallback(async () => {
    if (!tronToPay) return;
    await copyToClipboard(tronToPay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tronToPay]);

  return (
    <div className="rounded-lg border p-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">#{trade.tradeId}</span>
          <Badge variant="outline" className="text-[10px]">
            {isBuyer ? tn('roleBuyer') : isSeller ? tn('roleSeller') : tn('roleUnknown')}
          </Badge>
        </div>
        <Badge variant={statusVariant} className="text-[10px]">
          {statusLabel}
        </Badge>
      </div>

      {/* Amount details */}
      <div className="mt-2 flex items-center gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">NEX: </span>
          <span className="tabular-nums font-medium">{formatBalance(trade.nexAmount)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">USDT: </span>
          <span className="tabular-nums font-medium">${formatNexPrice(trade.usdtAmount)}</span>
        </div>
        {BigInt(trade.buyerDeposit) > BigInt(0) && (
          <div className="flex items-center gap-0.5">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{tn('deposit')}: </span>
            <span className="tabular-nums font-medium">{formatBalance(trade.buyerDeposit)}</span>
          </div>
        )}
      </div>

      {/* TRON address (buyer needs to see seller's address to pay) */}
      {isBuyer && tronToPay && trade.status === 'AwaitingPayment' && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1.5 text-xs">
          <span className="text-muted-foreground">{tn('payTo')}: </span>
          <span className="flex-1 truncate font-mono tabular-nums">{shortAddress(tronToPay, 10)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-2 flex gap-2">
        {/* Buyer: Confirm Payment */}
        {isBuyer && trade.status === 'AwaitingPayment' && !trade.paymentConfirmed && (
          <Button
            size="sm"
            className="flex-1 gap-1"
            disabled={isBusy(confirmPayment)}
            onClick={() => confirmPayment.mutate([trade.tradeId])}
          >
            {isBusy(confirmPayment) ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            {tn('confirmPayment')}
          </Button>
        )}

        {/* Seller: Confirm Received (chain only allows AwaitingVerification / UnderpaidPending) */}
        {isSeller && (trade.status === 'AwaitingVerification' || trade.status === 'UnderpaidPending') && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            disabled={isBusy(sellerConfirm)}
            onClick={() => sellerConfirm.mutate([trade.tradeId])}
          >
            {isBusy(sellerConfirm) ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle className="h-3 w-3" />
            )}
            {tn('sellerConfirmReceived')}
          </Button>
        )}

        {/* Process Timeout — either party can trigger when trade has expired */}
        {(isBuyer || isSeller) && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-muted-foreground"
            disabled={isBusy(processTimeout)}
            onClick={() => processTimeout.mutate([trade.tradeId])}
          >
            {isBusy(processTimeout) ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {tn('processTimeout')}
          </Button>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onCancelOrder, cancelLoading }: { order: NexMarketOrder; onCancelOrder: (orderId: number) => void; cancelLoading: boolean }) {
  const t = useTranslations('market');
  const tn = useTranslations('market.nexMarket');

  const remaining = BigInt(order.amount) - BigInt(order.filled);
  const isBuy = order.side === 'Buy';
  const hasDeposit = isBuy && BigInt(order.deposit) > BigInt(0);
  const lockedNex = !isBuy && remaining > BigInt(0);

  return (
    <div className="rounded-lg bg-secondary px-2.5 py-2">
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
}
