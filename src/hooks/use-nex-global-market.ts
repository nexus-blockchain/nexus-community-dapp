'use client';

import { useMemo } from 'react';
import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString } from '@/lib/utils/chain-helpers';
import type { NexMarketOrder, NexMarketTrade, NexMarketStats, NexPriceProtection } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseNexOrder(id: number, data: any): NexMarketOrder {
  const side = data.side ?? data.orderType;
  return {
    id,
    trader: data.trader ?? data.owner ?? data.maker ?? '',
    side: typeof side === 'string'
      ? (side.includes('Buy') || side === 'Buy' ? 'Buy' : 'Sell')
      : (side?.isBuy ? 'Buy' : 'Sell'),
    price: String(data.price ?? data.usdtPrice ?? data.usdt_price ?? '0'),
    amount: String(data.amount ?? data.nexAmount ?? data.nex_amount ?? data.totalAmount ?? '0'),
    filled: String(data.filled ?? data.filledAmount ?? data.filled_amount ?? '0'),
    minFillAmount: String(data.minFillAmount ?? data.min_fill_amount ?? '0'),
    tronAddress: bytesToString(data.tronAddress ?? data.tron_address) || '',
    createdAt: data.createdAt ?? data.created_at ?? 0,
    depositWaived: Boolean(data.depositWaived ?? data.deposit_waived ?? false),
    deposit: String(data.buyerDeposit ?? data.buyer_deposit ?? '0'),
  };
}

function parseNexTrade(data: any): NexMarketTrade {
  const status = data.status;
  let statusStr = 'AwaitingPayment';
  if (typeof status === 'string') {
    // toJSON() returns camelCase strings like "awaitingPayment", "awaitingVerification", etc.
    const lower = status.toLowerCase();
    if (lower === 'awaitingpayment') statusStr = 'AwaitingPayment';
    else if (lower === 'awaitingverification') statusStr = 'AwaitingVerification';
    else if (lower === 'underpaidpending') statusStr = 'UnderpaidPending';
    else if (lower === 'completed') statusStr = 'Completed';
    else if (lower === 'refunded') statusStr = 'Refunded';
    else if (lower === 'cancelled') statusStr = 'Cancelled';
    else if (lower === 'disputed') statusStr = 'Disputed';
    else statusStr = status;
  } else if (status) {
    if (status.isAwaitingPayment) statusStr = 'AwaitingPayment';
    else if (status.isAwaitingVerification) statusStr = 'AwaitingVerification';
    else if (status.isUnderpaidPending) statusStr = 'UnderpaidPending';
    else if (status.isCompleted) statusStr = 'Completed';
    else if (status.isRefunded) statusStr = 'Refunded';
    else if (status.isCancelled) statusStr = 'Cancelled';
    else if (status.isDisputed) statusStr = 'Disputed';
  }
  const depositStatusRaw = data.depositStatus ?? data.deposit_status ?? 0;
  const DEPOSIT_STATUS_MAP: Record<number, NexMarketTrade['depositStatus']> = {
    0: 'None', 1: 'Locked', 2: 'Released', 3: 'Forfeited', 4: 'PartiallyForfeited',
  };
  const depositStatus: NexMarketTrade['depositStatus'] =
    typeof depositStatusRaw === 'string'
      ? (depositStatusRaw as NexMarketTrade['depositStatus'])
      : DEPOSIT_STATUS_MAP[Number(depositStatusRaw)] ?? 'None';
  return {
    tradeId: data.tradeId ?? data.trade_id ?? 0,
    orderId: data.orderId ?? data.order_id ?? 0,
    buyer: data.buyer ?? '',
    seller: data.seller ?? '',
    nexAmount: String(data.nexAmount ?? data.nex_amount ?? '0'),
    usdtAmount: String(data.usdtAmount ?? data.usdt_amount ?? '0'),
    sellerTronAddress: bytesToString(data.sellerTronAddress ?? data.seller_tron_address) || '',
    buyerTronAddress: bytesToString(data.buyerTronAddress ?? data.buyer_tron_address) || '',
    status: statusStr,
    paymentConfirmed: Boolean(data.paymentConfirmed ?? data.payment_confirmed ?? false),
    createdAt: data.createdAt ?? data.created_at ?? 0,
    buyerDeposit: String(data.buyerDeposit ?? data.buyer_deposit ?? '0'),
    depositStatus,
  };
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Fetch global NEX sell orders + buy orders and resolve each order by ID */
export function useNexOrderBook() {
  return useEntityQuery<{ buyOrders: NexMarketOrder[]; sellOrders: NexMarketOrder[] }>(
    ['nexGlobalOrderBook'],
    async (api) => {
      const q = (api.query as any).nexMarket;
      const [buyIdsRaw, sellIdsRaw] = await Promise.all([
        q.buyOrders(),
        q.sellOrders(),
      ]);
      const buyIds: number[] = buyIdsRaw.toJSON() ?? [];
      const sellIds: number[] = sellIdsRaw.toJSON() ?? [];

      const resolveOrders = async (ids: number[]): Promise<NexMarketOrder[]> => {
        const orders: NexMarketOrder[] = [];
        for (const id of ids) {
          const raw = await q.orders(id);
          if (raw.isNone) continue;
          orders.push(parseNexOrder(id, raw.unwrap().toJSON()));
        }
        return orders;
      };

      const [buyOrders, sellOrders] = await Promise.all([
        resolveOrders(buyIds),
        resolveOrders(sellIds),
      ]);

      // Sort: buy descending by price, sell ascending by price
      buyOrders.sort((a, b) => { const diff = BigInt(b.price) - BigInt(a.price); return diff < BigInt(0) ? -1 : diff > BigInt(0) ? 1 : 0; });
      sellOrders.sort((a, b) => { const diff = BigInt(a.price) - BigInt(b.price); return diff < BigInt(0) ? -1 : diff > BigInt(0) ? 1 : 0; });

      return { buyOrders, sellOrders };
    },
    { staleTime: STALE_TIMES.orderBook },
  );
}

/** Fetch NEX market stats */
export function useNexMarketStats() {
  return useEntityQuery<NexMarketStats>(
    ['nexMarketStats'],
    async (api) => {
      const q = (api.query as any).nexMarket;
      const [statsRaw, twapRaw, lastPriceRaw] = await Promise.all([
        q.marketStatsStore(),
        q.twapAccumulatorStore().catch(() => null),
        q.lastTradePrice().catch(() => null),
      ]);
      const stats = statsRaw.toJSON() ?? {};
      // TwapAccumulator struct fields (camelCase after toJSON):
      //   lastPrice (u64), currentCumulative (u128), currentBlock (u32), ...
      // Note: lastPrice here is the last trade price stored in the accumulator,
      // NOT the computed TWAP value (which requires (cumulative_diff / block_diff)).
      const twapJson = twapRaw?.toJSON?.() ?? null;
      const twapLastPrice = twapJson?.lastPrice ?? twapJson?.last_price ?? null;
      return {
        twapLastPrice: twapLastPrice != null ? String(twapLastPrice) : '0',
        lastPrice: lastPriceRaw?.isNone
          ? '0'
          : String(lastPriceRaw?.unwrap?.()?.toJSON?.() ?? lastPriceRaw?.toJSON?.() ?? '0'),
        totalOrders: stats.totalOrders ?? stats.total_orders ?? 0,
        totalTrades: stats.totalTrades ?? stats.total_trades ?? 0,
        totalVolumeUsdt: String(stats.totalVolumeUsdt ?? stats.total_volume_usdt ?? '0'),
      };
    },
    { staleTime: STALE_TIMES.orderBook },
  );
}

/** Fetch price protection config (circuit breaker) */
export function useNexPriceProtection() {
  return useEntityQuery<NexPriceProtection>(
    ['nexPriceProtection'],
    async (api) => {
      const raw = await (api.query as any).nexMarket.priceProtectionStore();
      const data = raw.toJSON() ?? {};
      return {
        minPrice: String(data.minPrice ?? data.min_price ?? '0'),
        maxPrice: String(data.maxPrice ?? data.max_price ?? '0'),
        circuitBreakerActive: Boolean(data.circuitBreakerActive ?? data.circuit_breaker_active ?? false),
      };
    },
    { staleTime: STALE_TIMES.orderBook },
  );
}

/** Fetch chain constants for NEX market */
export function useNexMarketConstants() {
  return useEntityQuery<{
    buyerDepositRate: number;
    maxFirstOrderAmount: string;
    firstOrderTimeout: number;
    seedOrderUsdtAmount: string;
    seedPricePremiumBps: number;
  }>(
    ['nexMarketConstants'],
    async (api) => {
      const c = (api.consts as any).nexMarket;
      return {
        buyerDepositRate: Number(c.buyerDepositRate?.toJSON?.() ?? c.buyerDepositRate ?? 0),
        maxFirstOrderAmount: String(c.maxFirstOrderAmount?.toJSON?.() ?? c.maxFirstOrderAmount ?? '0'),
        firstOrderTimeout: Number(c.firstOrderTimeout?.toJSON?.() ?? c.firstOrderTimeout ?? 0),
        seedOrderUsdtAmount: String(c.seedOrderUsdtAmount?.toJSON?.() ?? c.seedOrderUsdtAmount ?? '0'),
        seedPricePremiumBps: Number(c.seedPricePremiumBps?.toJSON?.() ?? c.seedPricePremiumBps ?? 0),
      };
    },
    { staleTime: 300_000 }, // constants rarely change
  );
}

/** Check if address is a completed buyer */
export function useIsCompletedBuyer(address: string | null) {
  return useEntityQuery<boolean>(
    ['nexCompletedBuyer', address],
    async (api) => {
      if (!address) return false;
      const raw = await (api.query as any).nexMarket.completedBuyers(address);
      return Boolean(raw.toJSON());
    },
    { staleTime: STALE_TIMES.orderBook, enabled: !!address },
  );
}

/** Check if address has an active waived trade */
export function useActiveWaivedTrade(address: string | null) {
  return useEntityQuery<number | null>(
    ['nexActiveWaivedTrade', address],
    async (api) => {
      if (!address) return null;
      const raw = await (api.query as any).nexMarket.activeWaivedTrades(address);
      // ActiveWaivedTrades is ValueQuery (u32) — returns 0 when no active trade, not None
      const val = Number(raw.toJSON?.() ?? raw);
      return val > 0 ? val : null;
    },
    { staleTime: STALE_TIMES.orderBook, enabled: !!address },
  );
}

/** Get user's active NEX market orders */
export function useNexUserOrders(address: string | null) {
  return useEntityQuery<NexMarketOrder[]>(
    ['nexUserOrders', address],
    async (api) => {
      if (!address) return [];
      const q = (api.query as any).nexMarket;
      const idsRaw = await q.userOrders(address);
      const ids: number[] = idsRaw.toJSON() ?? [];
      const orders: NexMarketOrder[] = [];
      for (const id of ids) {
        const raw = await q.orders(id);
        if (raw.isNone) continue;
        orders.push(parseNexOrder(id, raw.unwrap().toJSON()));
      }
      return orders.sort((a, b) => b.createdAt - a.createdAt);
    },
    { staleTime: STALE_TIMES.orderBook, enabled: !!address },
  );
}

/** Get active trades for user */
export function useNexUserTrades(address: string | null) {
  return useEntityQuery<NexMarketTrade[]>(
    ['nexUserTrades', address],
    async (api) => {
      if (!address) return [];
      const q = (api.query as any).nexMarket;
      const idsRaw = await q.userTrades(address);
      const ids: number[] = idsRaw.toJSON() ?? [];
      const trades: NexMarketTrade[] = [];
      for (const id of ids) {
        const raw = await q.usdtTrades(id);
        if (raw.isNone) continue;
        trades.push(parseNexTrade(raw.unwrap().toJSON()));
      }
      return trades.sort((a, b) => b.createdAt - a.createdAt);
    },
    { staleTime: STALE_TIMES.orderBook, enabled: !!address },
  );
}

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

/** Combined first-order eligibility status */
export function useFirstOrderStatus(address: string | null) {
  const { data: isCompleted } = useIsCompletedBuyer(address);
  const { data: activeWaived } = useActiveWaivedTrade(address);

  return useMemo(() => ({
    isEligible: !!address && !isCompleted && activeWaived == null,
    isActive: activeWaived != null,
    activeTradeId: activeWaived,
    isCompletedBuyer: !!isCompleted,
  }), [address, isCompleted, activeWaived]);
}

// ---------------------------------------------------------------------------
// Aggregated order book depth (for display)
// ---------------------------------------------------------------------------

interface NexDepthLevel {
  price: string;
  totalAmount: bigint;
  orderCount: number;
  cumulative: bigint;
  hasSeedOrder: boolean;
}

export function useNexOrderBookDepth() {
  const { data, isLoading } = useNexOrderBook();

  const sellOrders = data?.sellOrders ?? [];
  const buyOrders = data?.buyOrders ?? [];

  const asks = sellOrders.reduce<NexDepthLevel[]>((acc, o) => {
    const remaining = BigInt(o.amount) - BigInt(o.filled);
    if (remaining <= BigInt(0)) return acc;
    const existing = acc.find((l) => l.price === o.price);
    if (existing) {
      existing.totalAmount += remaining;
      existing.orderCount++;
      if (o.depositWaived) existing.hasSeedOrder = true;
    } else {
      acc.push({ price: o.price, totalAmount: remaining, orderCount: 1, cumulative: BigInt(0), hasSeedOrder: o.depositWaived });
    }
    return acc;
  }, []).sort((a, b) => { const diff = BigInt(a.price) - BigInt(b.price); return diff < BigInt(0) ? -1 : diff > BigInt(0) ? 1 : 0; });

  const bids = buyOrders.reduce<NexDepthLevel[]>((acc, o) => {
    const remaining = BigInt(o.amount) - BigInt(o.filled);
    if (remaining <= BigInt(0)) return acc;
    const existing = acc.find((l) => l.price === o.price);
    if (existing) {
      existing.totalAmount += remaining;
      existing.orderCount++;
      if (o.depositWaived) existing.hasSeedOrder = true;
    } else {
      acc.push({ price: o.price, totalAmount: remaining, orderCount: 1, cumulative: BigInt(0), hasSeedOrder: o.depositWaived });
    }
    return acc;
  }, []).sort((a, b) => { const diff = BigInt(b.price) - BigInt(a.price); return diff < BigInt(0) ? -1 : diff > BigInt(0) ? 1 : 0; });

  // Compute cumulative depths
  let askCum = BigInt(0);
  const asksWithDepth = asks.map((l) => {
    askCum += l.totalAmount;
    return { ...l, cumulative: askCum };
  });
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
    isLoading,
  };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

const NEX_INVALIDATE_KEYS = [
  ['nexGlobalOrderBook'],
  ['nexUserOrders'],
  ['nexMarketStats'],
  ['nexUserTrades'],
  ['nexCompletedBuyer'],
  ['nexActiveWaivedTrade'],
];

export function useNexPlaceSellOrder() {
  return useEntityMutation('nexMarket', 'placeSellOrder', {
    invalidateKeys: NEX_INVALIDATE_KEYS,
  });
}

export function useNexPlaceBuyOrder() {
  return useEntityMutation('nexMarket', 'placeBuyOrder', {
    invalidateKeys: NEX_INVALIDATE_KEYS,
  });
}

export function useNexCancelOrder() {
  return useEntityMutation('nexMarket', 'cancelOrder', {
    invalidateKeys: NEX_INVALIDATE_KEYS,
  });
}

export function useNexAcceptBuyOrder() {
  return useEntityMutation('nexMarket', 'acceptBuyOrder', {
    invalidateKeys: NEX_INVALIDATE_KEYS,
  });
}

export function useNexReserveSellOrder() {
  return useEntityMutation('nexMarket', 'reserveSellOrder', {
    invalidateKeys: NEX_INVALIDATE_KEYS,
  });
}

export function useNexConfirmPayment() {
  return useEntityMutation('nexMarket', 'confirmPayment', {
    invalidateKeys: NEX_INVALIDATE_KEYS,
  });
}

export function useNexSellerConfirmReceived() {
  return useEntityMutation('nexMarket', 'sellerConfirmReceived', {
    invalidateKeys: NEX_INVALIDATE_KEYS,
  });
}

export function useNexProcessTimeout() {
  return useEntityMutation('nexMarket', 'processTimeout', {
    invalidateKeys: NEX_INVALIDATE_KEYS,
  });
}
