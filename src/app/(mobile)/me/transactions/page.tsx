'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart, TrendingUp, Package, Lock, Unlock, ShieldAlert, ShieldOff,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import { useWalletStore, useEntityStore } from '@/stores';
import { useTransferHistoryStore } from '@/stores/transfer-history-store';
import { useBuyerOrders } from '@/hooks/use-order';
import { useEntityTradeHistory } from '@/hooks/use-market';
import { useNexUserTrades } from '@/hooks/use-nex-global-market';
import { formatBalance, shortAddress } from '@/lib/utils/chain-helpers';
import { ORDER_STATUS_VARIANT } from '@/lib/constants/order-status';
import type { Order, TradeRecord, NexMarketTrade } from '@/lib/types';
import type { TransferRecord } from '@/stores/transfer-history-store';

type TabKey = 'orders' | 'market' | 'nex' | 'transfers';

function OrderItem({ order }: { order: Order }) {
  const t = useTranslations('txHistory');
  const variant = ORDER_STATUS_VARIANT[order.status] ?? 'secondary';

  return (
    <Link href={`/order/${order.id}`}>
      <Card className="transition-colors hover:border-primary/30">
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3 min-w-0">
            <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{t('orderNumber', { id: order.id })}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t('shop')} #{order.shopId} · {t('product')} #{order.productId}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <span className="text-sm font-semibold text-primary">{formatBalance(order.totalAmount)}</span>
            <Badge variant={variant} className="text-[10px]">{order.status}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MarketTradeItem({ trade, address }: { trade: TradeRecord; address: string | null }) {
  const t = useTranslations('txHistory');
  const isMaker = address === trade.maker;

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 min-w-0">
          <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              <span className={trade.side === 'Buy' ? 'text-success' : 'text-destructive'}>
                {trade.side === 'Buy' ? t('buy') : t('sell')}
              </span>
              {' '}{t('tradeId', { id: trade.tradeId })}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {t('price')}: {formatBalance(trade.price)} · {isMaker ? 'Maker' : 'Taker'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <span className="text-sm tabular-nums">{formatBalance(trade.tokenAmount)} Token</span>
          <span className="text-xs tabular-nums text-muted-foreground">{formatBalance(trade.nexAmount)} NEX</span>
        </div>
      </CardContent>
    </Card>
  );
}

const DEPOSIT_STATUS_CONFIG: Record<string, { icon: typeof Lock; color: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' }> = {
  Locked:               { icon: Lock,        color: 'text-warning',     variant: 'warning' },
  Released:             { icon: Unlock,       color: 'text-success',     variant: 'success' },
  Forfeited:            { icon: ShieldAlert,  color: 'text-destructive', variant: 'destructive' },
  PartiallyForfeited:   { icon: ShieldOff,    color: 'text-orange-500',  variant: 'warning' },
};

function NexTradeItem({ trade, address }: { trade: NexMarketTrade; address: string | null }) {
  const t = useTranslations('txHistory');
  const isBuyer = address === trade.buyer;
  const hasDeposit = BigInt(trade.buyerDeposit) > BigInt(0);
  const depositCfg = DEPOSIT_STATUS_CONFIG[trade.depositStatus];

  const statusColor =
    trade.status === 'Completed' ? 'success' as const
    : trade.status === 'Refunded' ? 'secondary' as const
    : trade.status === 'Cancelled' ? 'secondary' as const
    : trade.status === 'Disputed' ? 'destructive' as const
    : 'default' as const;

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        {/* Row 1: trade info + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <ShoppingCart className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className={isBuyer ? 'text-success' : 'text-destructive'}>
                  {isBuyer ? t('buy') : t('sell')}
                </span>
                {' '}NEX #{trade.tradeId}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {isBuyer ? shortAddress(trade.seller) : shortAddress(trade.buyer)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <span className="text-sm tabular-nums">{formatBalance(trade.nexAmount)} NEX</span>
            <Badge variant={statusColor} className="text-[10px]">{trade.status}</Badge>
          </div>
        </div>

        {/* Row 2: deposit info (only when deposit > 0) */}
        {hasDeposit && depositCfg && (
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-2.5 py-1.5 text-xs">
            <depositCfg.icon className={`h-3.5 w-3.5 shrink-0 ${depositCfg.color}`} />
            <span className="text-muted-foreground">{t('deposit')}:</span>
            <span className="tabular-nums font-medium">{formatBalance(trade.buyerDeposit)} NEX</span>
            <Badge variant={depositCfg.variant} className="ml-auto text-[10px]">
              {t(`depositStatus.${trade.depositStatus}`)}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TransferItem({ record, address }: { record: TransferRecord; address: string | null }) {
  const t = useTranslations('txHistory');
  const isSent = record.from === address;
  const time = new Date(record.timestamp);
  const timeStr = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 min-w-0">
          {isSent
            ? <ArrowUpRight className="h-4 w-4 shrink-0 text-destructive" />
            : <ArrowDownLeft className="h-4 w-4 shrink-0 text-success" />}
          <div className="min-w-0">
            <p className="text-sm font-medium">
              <span className={isSent ? 'text-destructive' : 'text-success'}>
                {isSent ? t('sent') : t('received')}
              </span>
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {isSent ? t('transferTo') : t('transferFrom')}: {shortAddress(isSent ? record.to : record.from)}
            </p>
            <p className="text-[10px] text-muted-foreground">{timeStr}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <span className={`text-sm font-semibold tabular-nums ${isSent ? 'text-destructive' : 'text-success'}`}>
            {isSent ? '-' : '+'}{formatBalance(record.amount)} NEX
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{shortAddress(record.hash, 4)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function TransactionsPage() {
  const t = useTranslations('txHistory');
  const { address } = useWalletStore();
  const { currentEntityId } = useEntityStore();
  const [tab, setTab] = useState<TabKey>('orders');

  const { data: orders, isLoading: ordersLoading } = useBuyerOrders(address);
  const { data: marketTrades, isLoading: marketLoading } = useEntityTradeHistory(currentEntityId);
  const { data: nexTrades, isLoading: nexLoading } = useNexUserTrades(address);
  const transferVersion = useTransferHistoryStore((s) => s._version);
  const transferRecords = useTransferHistoryStore.getState().getRecords(address ?? '');

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'orders', label: t('tabOrders'), count: orders?.length },
    { key: 'market', label: t('tabMarket'), count: marketTrades?.length },
    { key: 'nex', label: t('tabNex'), count: nexTrades?.length },
    { key: 'transfers', label: t('tabTransfers'), count: transferRecords.length },
  ];

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-2">
            {tabs.map((item) => (
              <Button
                key={item.key}
                variant={tab === item.key ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setTab(item.key)}
              >
                {item.label}
                {item.count != null && item.count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{item.count}</Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Orders tab */}
          {tab === 'orders' && (
            ordersLoading ? <ListSkeleton /> : (
              <div className="space-y-2">
                {(!orders || orders.length === 0) ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">{t('noOrders')}</p>
                ) : (
                  orders.map((order) => <OrderItem key={order.id} order={order} />)
                )}
              </div>
            )
          )}

          {/* Entity market tab */}
          {tab === 'market' && (
            marketLoading ? <ListSkeleton /> : (
              <div className="space-y-2">
                {(!marketTrades || marketTrades.length === 0) ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">{t('noTrades')}</p>
                ) : (
                  marketTrades.map((trade) => (
                    <MarketTradeItem key={trade.tradeId} trade={trade} address={address} />
                  ))
                )}
              </div>
            )
          )}

          {/* NEX P2P tab */}
          {tab === 'nex' && (
            nexLoading ? <ListSkeleton /> : (
              <div className="space-y-2">
                {(!nexTrades || nexTrades.length === 0) ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">{t('noTrades')}</p>
                ) : (
                  nexTrades.map((trade) => (
                    <NexTradeItem key={trade.tradeId} trade={trade} address={address} />
                  ))
                )}
              </div>
            )
          )}

          {/* Transfers tab */}
          {tab === 'transfers' && (
            <div className="space-y-2">
              {transferRecords.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">{t('noTransfers')}</p>
              ) : (
                transferRecords.map((record) => (
                  <TransferItem key={record.id} record={record} address={address} />
                ))
              )}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
