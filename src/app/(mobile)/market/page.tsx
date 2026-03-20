'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useEntityStore, useWalletStore } from '@/stores';
import {
  useMarketStats, useLastTradePrice, useBestPrices,
  useUserMarketOrders, useEntityTradeHistory, useOrderBookDepth,
} from '@/hooks/use-market';
import {
  useNexMarketStats, useNexPriceProtection, useNexMarketConstants,
  useNexOrderBookDepth, useNexOrderBook, useNexUserOrders, useNexCancelOrder,
  useFirstOrderStatus, useNexUserTrades,
} from '@/hooks/use-nex-global-market';
import { formatBalance } from '@/lib/utils/chain-helpers';
import {
  PricePanel, StatsBar, OrderBook, TradeForm,
  PriceChart, MyOrders, TradeHistory,
  NexPricePanel, NexOrderBook, NexTradeForm, NexFirstOrderBanner,
  NexOrderList, NexActiveTrades, NexMyOrders, NexTradeHistory,
} from '@/features/market';
import type { OrderActionPrefill } from '@/features/market';
import type { NexMarketOrder } from '@/lib/types';

export default function MarketPage() {
  const t = useTranslations('market');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();

  // -----------------------------------------------------------------------
  // Entity Token Market data
  // -----------------------------------------------------------------------
  const { data: stats, isLoading: statsLoading } = useMarketStats(currentEntityId);
  const { data: lastPrice } = useLastTradePrice(currentEntityId);
  const { data: bestPrices } = useBestPrices(currentEntityId);
  const { data: myOrders } = useUserMarketOrders(address);
  const { data: trades } = useEntityTradeHistory(currentEntityId);
  const { asks, bids, maxDepth, isLoading: bookLoading } = useOrderBookDepth(currentEntityId);

  const change24h = useMemo(() => {
    if (!trades || trades.length < 2) return null;
    const latest = Number(BigInt(trades[0].price));
    const oldest = Number(BigInt(trades[trades.length - 1].price));
    if (oldest === 0) return null;
    return ((latest - oldest) / oldest) * 100;
  }, [trades]);

  const [prefilledPrice, setPrefilledPrice] = useState('');
  const handlePriceClick = useCallback((rawPrice: string) => {
    setPrefilledPrice(formatBalance(rawPrice));
  }, []);
  const handlePrefilledUsed = useCallback(() => {
    setPrefilledPrice('');
  }, []);

  // -----------------------------------------------------------------------
  // NEX Global Market data
  // -----------------------------------------------------------------------
  const { data: nexStats } = useNexMarketStats();
  const { data: nexProtection } = useNexPriceProtection();
  const { data: nexConstants } = useNexMarketConstants();
  const { asks: nexAsks, bids: nexBids, maxDepth: nexMaxDepth, isLoading: nexBookLoading } = useNexOrderBookDepth();
  const { data: nexOrderBookData } = useNexOrderBook();
  const { data: nexUserOrders } = useNexUserOrders(address);
  const firstOrderStatus = useFirstOrderStatus(address);
  const nexCancelOrder = useNexCancelOrder();
  const { data: nexUserTrades } = useNexUserTrades(address);

  const handleNexCancelOrder = useCallback((orderId: number) => {
    nexCancelOrder.mutate([orderId]);
  }, [nexCancelOrder]);

  const [orderPrefill, setOrderPrefill] = useState<OrderActionPrefill | null>(null);

  const handleAcceptBuyOrder = useCallback((order: NexMarketOrder) => {
    const remaining = BigInt(order.amount) - BigInt(order.filled);
    setOrderPrefill({
      target: 'acceptBuy',
      orderId: String(order.id),
      amount: formatBalance(remaining.toString()),
      tron: '', // seller must enter their own TRON address to receive USDT
    });
  }, []);

  const handleReserveSellOrder = useCallback((order: NexMarketOrder) => {
    const remaining = BigInt(order.amount) - BigInt(order.filled);
    setOrderPrefill({
      target: 'reserveSell',
      orderId: String(order.id),
      amount: formatBalance(remaining.toString()),
      tron: '', // buyer must enter their own TRON address to send USDT from
    });
  }, []);

  const handlePrefillUsed = useCallback(() => {
    setOrderPrefill(null);
  }, []);

  return (
    <>
      <MobileHeader title={t('title')} />
      <PageContainer>
        <Tabs defaultValue="nex" className="pb-4">
          <TabsList className="mb-3 w-full">
            <TabsTrigger value="nex" className="flex-1">{t('nexTab')}</TabsTrigger>
            <TabsTrigger value="entity" className="flex-1">{t('entityTab')}</TabsTrigger>
          </TabsList>

          {/* NEX / USDT Global Market tab */}
          <TabsContent value="nex">
            <div className="space-y-3">
              <NexFirstOrderBanner
                isEligible={firstOrderStatus.isEligible}
                isActive={firstOrderStatus.isActive}
                activeTradeId={firstOrderStatus.activeTradeId ?? null}
              />
              <NexActiveTrades trades={nexUserTrades} address={address} />
              <NexMyOrders
                orders={nexUserOrders}
                onCancelOrder={handleNexCancelOrder}
                cancelLoading={['signing', 'broadcasting', 'inBlock'].includes(nexCancelOrder.txState.status)}
              />
              <NexPricePanel
                stats={nexStats}
                protection={nexProtection}
                seedPricePremiumBps={nexConstants?.seedPricePremiumBps}
              />
              <NexOrderBook
                asks={nexAsks}
                bids={nexBids}
                maxDepth={nexMaxDepth}
                lastPrice={nexStats?.lastPrice}
                isLoading={nexBookLoading}
              />
              <NexOrderList
                side="Buy"
                orders={nexOrderBookData?.buyOrders ?? []}
                isLoading={nexBookLoading}
                onAction={handleAcceptBuyOrder}
              />
              <NexOrderList
                side="Sell"
                orders={nexOrderBookData?.sellOrders ?? []}
                isLoading={nexBookLoading}
                onAction={handleReserveSellOrder}
              />
              <NexTradeForm prefill={orderPrefill} onPrefillUsed={handlePrefillUsed} />
              <NexTradeHistory trades={nexUserTrades} address={address} />
            </div>
          </TabsContent>

          {/* Entity Token Market tab */}
          <TabsContent value="entity">
            <div className="space-y-3">
              <PricePanel
                lastPrice={lastPrice}
                bestAsk={bestPrices?.bestAsk}
                bestBid={bestPrices?.bestBid}
                change24h={change24h}
              />
              <StatsBar stats={stats} isLoading={statsLoading} />
              <PriceChart trades={trades} />
              <OrderBook
                asks={asks}
                bids={bids}
                maxDepth={maxDepth}
                lastPrice={lastPrice}
                isLoading={bookLoading}
                onPriceClick={handlePriceClick}
              />
              <TradeForm
                entityId={currentEntityId}
                prefilledPrice={prefilledPrice}
                onPrefilledPriceUsed={handlePrefilledUsed}
              />
              <MyOrders orders={myOrders} entityId={currentEntityId} />
              <TradeHistory trades={trades} />
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
