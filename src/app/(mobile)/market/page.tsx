'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { useWalletStore } from '@/stores';
import {
  useNexMarketStats, useNexPriceProtection, useNexMarketConstants,
  useNexOrderBookDepth, useNexOrderBook, useNexUserOrders, useNexCancelOrder,
  useFirstOrderStatus, useNexUserTrades,
} from '@/hooks/use-nex-global-market';
import { formatBalance, isTxBusy } from '@/lib/utils/chain-helpers';
import {
  NexPricePanel, NexOrderBook, NexTradeForm, NexFirstOrderBanner,
  NexOrderList, NexActiveTrades, NexTradeHistory,
} from '@/features/market';
import type { OrderActionPrefill } from '@/features/market';
import type { NexMarketOrder } from '@/lib/types';

export default function MarketPage() {
  const t = useTranslations('market');
  const { address } = useWalletStore();

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
  const nexCancelOrderRef = useRef(nexCancelOrder);
  nexCancelOrderRef.current = nexCancelOrder;
  const { data: nexUserTrades } = useNexUserTrades(address);

  const handleNexCancelOrder = useCallback((orderId: number) => {
    nexCancelOrderRef.current.mutate([orderId]);
  }, []);

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
        <div className="space-y-3 pb-4">
          <NexFirstOrderBanner
            isEligible={firstOrderStatus.isEligible}
            isActive={firstOrderStatus.isActive}
            activeTradeId={firstOrderStatus.activeTradeId ?? null}
          />
          <NexActiveTrades
            trades={nexUserTrades}
            address={address}
            orders={nexUserOrders}
            onCancelOrder={handleNexCancelOrder}
            cancelLoading={isTxBusy(nexCancelOrder.txState)}
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
            buyOrders={nexOrderBookData?.buyOrders ?? []}
            sellOrders={nexOrderBookData?.sellOrders ?? []}
            isLoading={nexBookLoading}
            onBuyAction={handleAcceptBuyOrder}
            onSellAction={handleReserveSellOrder}
          />
          <NexTradeForm prefill={orderPrefill} onPrefillUsed={handlePrefillUsed} />
          <NexTradeHistory trades={nexUserTrades} address={address} />
        </div>
      </PageContainer>
    </>
  );
}
