'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import type { TradeOrder, TradeRecord, MarketStats } from '@/lib/types';

function parseTradeOrder(data: any): TradeOrder {
  return {
    orderId: data.orderId ?? data.order_id ?? 0,
    entityId: data.entityId ?? data.entity_id ?? 0,
    maker: data.maker ?? '',
    side: data.side ?? 'Buy',
    orderType: data.orderType ?? data.order_type ?? 'Limit',
    tokenAmount: String(data.tokenAmount ?? data.token_amount ?? '0'),
    filledAmount: String(data.filledAmount ?? data.filled_amount ?? '0'),
    price: String(data.price ?? '0'),
    status: data.status ?? 'Open',
    createdAt: data.createdAt ?? data.created_at ?? 0,
    expiresAt: data.expiresAt ?? data.expires_at ?? 0,
    depositWaived: Boolean(data.depositWaived ?? data.deposit_waived ?? false),
  };
}

/** Query order book (sell orders) for entity */
export function useEntitySellOrders(entityId: number | null) {
  return useEntityQuery<TradeOrder[]>(
    ['entitySellOrders', entityId],
    async (api) => {
      if (entityId == null) return [];
      const idsRaw = await (api.query as any).nexMarket.entitySellOrders(entityId);
      const ids: number[] = idsRaw.toJSON() ?? [];
      const orders: TradeOrder[] = [];
      for (const id of ids) {
        const raw = await (api.query as any).nexMarket.orders(id);
        if (raw.isNone) continue;
        orders.push(parseTradeOrder(raw.unwrap().toJSON()));
      }
      return orders.sort((a, b) => Number(BigInt(a.price) - BigInt(b.price)));
    },
    { staleTime: STALE_TIMES.orderBook, enabled: entityId != null },
  );
}

/** Query order book (buy orders) for entity */
export function useEntityBuyOrders(entityId: number | null) {
  return useEntityQuery<TradeOrder[]>(
    ['entityBuyOrders', entityId],
    async (api) => {
      if (entityId == null) return [];
      const idsRaw = await (api.query as any).nexMarket.entityBuyOrders(entityId);
      const ids: number[] = idsRaw.toJSON() ?? [];
      const orders: TradeOrder[] = [];
      for (const id of ids) {
        const raw = await (api.query as any).nexMarket.orders(id);
        if (raw.isNone) continue;
        orders.push(parseTradeOrder(raw.unwrap().toJSON()));
      }
      return orders.sort((a, b) => Number(BigInt(b.price) - BigInt(a.price)));
    },
    { staleTime: STALE_TIMES.orderBook, enabled: entityId != null },
  );
}

/** Query user's market orders */
export function useUserMarketOrders(address: string | null) {
  return useEntityQuery<TradeOrder[]>(
    ['userMarketOrders', address],
    async (api) => {
      if (!address) return [];
      const idsRaw = await (api.query as any).nexMarket.userOrders(address);
      const ids: number[] = idsRaw.toJSON() ?? [];
      const orders: TradeOrder[] = [];
      for (const id of ids) {
        const raw = await (api.query as any).nexMarket.orders(id);
        if (raw.isNone) continue;
        orders.push(parseTradeOrder(raw.unwrap().toJSON()));
      }
      return orders.sort((a, b) => b.createdAt - a.createdAt);
    },
    { staleTime: STALE_TIMES.orderBook, enabled: !!address },
  );
}

/** Query market stats for entity */
export function useMarketStats(entityId: number | null) {
  return useEntityQuery<MarketStats>(
    ['marketStats', entityId],
    async (api) => {
      if (entityId == null) return { totalOrders: 0, totalTrades: 0, totalVolumeNex: '0' };
      const raw = await (api.query as any).nexMarket.marketStatsStorage(entityId);
      const data = raw.toJSON();
      return {
        totalOrders: data?.totalOrders ?? data?.total_orders ?? 0,
        totalTrades: data?.totalTrades ?? data?.total_trades ?? 0,
        totalVolumeNex: String(data?.totalVolumeNex ?? data?.total_volume_nex ?? '0'),
      };
    },
    { staleTime: STALE_TIMES.orderBook, enabled: entityId != null },
  );
}

/** Query last trade price */
export function useLastTradePrice(entityId: number | null) {
  return useEntityQuery<string>(
    ['lastTradePrice', entityId],
    async (api) => {
      if (entityId == null) return '0';
      const raw = await (api.query as any).nexMarket.lastTradePrice(entityId);
      if (raw.isNone) return '0';
      return String(raw.unwrap().toJSON());
    },
    { staleTime: STALE_TIMES.orderBook, enabled: entityId != null },
  );
}

/** Query best ask/bid */
export function useBestPrices(entityId: number | null) {
  return useEntityQuery<{ bestAsk: string | null; bestBid: string | null }>(
    ['bestPrices', entityId],
    async (api) => {
      if (entityId == null) return { bestAsk: null, bestBid: null };
      const [askRaw, bidRaw] = await Promise.all([
        (api.query as any).nexMarket.bestAsk(entityId),
        (api.query as any).nexMarket.bestBid(entityId),
      ]);
      return {
        bestAsk: askRaw.isNone ? null : String(askRaw.unwrap().toJSON()),
        bestBid: bidRaw.isNone ? null : String(bidRaw.unwrap().toJSON()),
      };
    },
    { staleTime: STALE_TIMES.orderBook, enabled: entityId != null },
  );
}

/** Query trade history for entity */
export function useEntityTradeHistory(entityId: number | null) {
  return useEntityQuery<TradeRecord[]>(
    ['entityTradeHistory', entityId],
    async (api) => {
      if (entityId == null) return [];
      const idsRaw = await (api.query as any).nexMarket.entityTradeHistory(entityId);
      const ids: number[] = idsRaw.toJSON() ?? [];
      const trades: TradeRecord[] = [];
      for (const id of ids.slice(-50)) {
        const raw = await (api.query as any).nexMarket.tradeRecords(id);
        if (raw.isNone) continue;
        const data = raw.unwrap().toJSON();
        trades.push({
          tradeId: data.tradeId ?? data.trade_id ?? 0,
          orderId: data.orderId ?? data.order_id ?? 0,
          entityId: data.entityId ?? data.entity_id ?? 0,
          maker: data.maker ?? '',
          taker: data.taker ?? '',
          side: data.side ?? 'Buy',
          tokenAmount: String(data.tokenAmount ?? data.token_amount ?? '0'),
          price: String(data.price ?? '0'),
          nexAmount: String(data.nexAmount ?? data.nex_amount ?? '0'),
          blockNumber: data.blockNumber ?? data.block_number ?? 0,
        });
      }
      return trades.reverse();
    },
    { staleTime: STALE_TIMES.orderBook, enabled: entityId != null },
  );
}

/** Aggregate order book into price levels with cumulative depth */
export function useOrderBookDepth(entityId: number | null) {
  const { data: sells, isLoading: sellsLoading } = useEntitySellOrders(entityId);
  const { data: buys, isLoading: buysLoading } = useEntityBuyOrders(entityId);

  const asks = (sells ?? []).reduce<{ price: string; totalAmount: bigint; orderCount: number; hasSeedOrder: boolean }[]>((acc, o) => {
    const remaining = BigInt(o.tokenAmount) - BigInt(o.filledAmount);
    if (remaining <= BigInt(0)) return acc;
    const existing = acc.find((l) => l.price === o.price);
    if (existing) {
      existing.totalAmount += remaining;
      existing.orderCount++;
      if (o.depositWaived) existing.hasSeedOrder = true;
    } else {
      acc.push({ price: o.price, totalAmount: remaining, orderCount: 1, hasSeedOrder: o.depositWaived });
    }
    return acc;
  }, []).sort((a, b) => Number(BigInt(a.price) - BigInt(b.price)));

  const bids = (buys ?? []).reduce<{ price: string; totalAmount: bigint; orderCount: number; hasSeedOrder: boolean }[]>((acc, o) => {
    const remaining = BigInt(o.tokenAmount) - BigInt(o.filledAmount);
    if (remaining <= BigInt(0)) return acc;
    const existing = acc.find((l) => l.price === o.price);
    if (existing) {
      existing.totalAmount += remaining;
      existing.orderCount++;
      if (o.depositWaived) existing.hasSeedOrder = true;
    } else {
      acc.push({ price: o.price, totalAmount: remaining, orderCount: 1, hasSeedOrder: o.depositWaived });
    }
    return acc;
  }, []).sort((a, b) => Number(BigInt(b.price) - BigInt(a.price)));

  // Compute cumulative depths
  let askCum = BigInt(0);
  const asksWithDepth = asks.map((l) => {
    askCum += l.totalAmount;
    return { ...l, cumulative: askCum };
  });
  // Reverse for display: highest price at top
  asksWithDepth.reverse();

  let bidCum = BigInt(0);
  const bidsWithDepth = bids.map((l) => {
    bidCum += l.totalAmount;
    return { ...l, cumulative: bidCum };
  });

  const maxDepth = askCum > bidCum ? askCum : bidCum;

  return {
    asks: asksWithDepth,
    bids: bidsWithDepth,
    maxDepth,
    isLoading: sellsLoading || buysLoading,
  };
}

// Market mutations
export function usePlaceSellOrder() {
  return useEntityMutation('nexMarket', 'placeSellOrder', {
    invalidateKeys: [['entitySellOrders'], ['userMarketOrders'], ['marketStats'], ['bestPrices']],
  });
}

export function usePlaceBuyOrder() {
  return useEntityMutation('nexMarket', 'placeBuyOrder', {
    invalidateKeys: [['entityBuyOrders'], ['userMarketOrders'], ['marketStats'], ['bestPrices']],
  });
}

export function useTakeOrder() {
  return useEntityMutation('nexMarket', 'takeOrder', {
    invalidateKeys: [['entitySellOrders'], ['entityBuyOrders'], ['userMarketOrders'], ['marketStats'], ['lastTradePrice'], ['bestPrices'], ['entityTradeHistory']],
  });
}

export function useCancelMarketOrder() {
  return useEntityMutation('nexMarket', 'cancelOrder', {
    invalidateKeys: [['entitySellOrders'], ['entityBuyOrders'], ['userMarketOrders'], ['marketStats'], ['bestPrices']],
  });
}

export function useMarketBuy() {
  return useEntityMutation('nexMarket', 'marketBuy', {
    invalidateKeys: [['entitySellOrders'], ['entityBuyOrders'], ['userMarketOrders'], ['marketStats'], ['lastTradePrice'], ['bestPrices'], ['entityTradeHistory']],
  });
}

export function useMarketSell() {
  return useEntityMutation('nexMarket', 'marketSell', {
    invalidateKeys: [['entitySellOrders'], ['entityBuyOrders'], ['userMarketOrders'], ['marketStats'], ['lastTradePrice'], ['bestPrices'], ['entityTradeHistory']],
  });
}
