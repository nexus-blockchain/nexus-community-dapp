'use client';

import { useMemo } from 'react';
import { useNexMarketStats } from './use-nex-global-market';
import { useEntityQuery } from './use-entity-query';
import { usdtToNexDynamic, nexToUsdtDynamic } from '@/lib/utils/chain-helpers';
import { STALE_TIMES } from '@/lib/chain/constants';
import type { TwapAccumulatorData } from '@/lib/types';

/**
 * Compute 1-hour TWAP from accumulator data, mirroring chain logic:
 *   current_cumulative += last_price × (current_block - acc.current_block)
 *   twap = (current_cumulative - hour_snapshot.cumulative_price)
 *        / (current_block - hour_snapshot.block_number)
 *
 * Returns the TWAP price string (raw, 6 decimals) or null if insufficient data.
 */
function computeOneHourTwap(acc: TwapAccumulatorData, currentBlock: number): string | null {
  const blocksSinceUpdate = currentBlock - acc.currentBlock;
  if (blocksSinceUpdate < 0) return null;

  const currentCumulative = BigInt(acc.currentCumulative)
    + BigInt(acc.lastPrice) * BigInt(Math.max(blocksSinceUpdate, 0));

  const blockDiff = currentBlock - acc.hourSnapshot.blockNumber;
  if (blockDiff <= 0) return acc.lastPrice; // same block as snapshot

  const cumulativeDiff = currentCumulative - BigInt(acc.hourSnapshot.cumulativePrice);
  const twap = cumulativeDiff / BigInt(blockDiff);
  return twap > BigInt(0) ? twap.toString() : null;
}

/**
 * Hook that provides the current NEX/USDT market rate and converter functions.
 *
 * Price priority (matches chain TradingPricingProvider):
 *   1. 1-hour TWAP (computed from accumulator + current block)
 *   2. lastPrice (most recent trade)
 *   3. twapLastPrice (accumulator's last_price, fallback)
 */
export function useNexPrice() {
  const { data: stats, isLoading } = useNexMarketStats();

  // Fetch current block number for TWAP calculation
  const { data: currentBlock } = useEntityQuery<number>(
    ['currentBlockNumber'],
    async (api) => {
      const raw = await (api.query as any).system.number();
      return Number(raw.toJSON?.() ?? raw);
    },
    { staleTime: STALE_TIMES.orderBook },
  );

  const marketRate = useMemo(() => {
    if (!stats) return null;

    // Priority 1: Compute 1hr TWAP (matching chain PricingProvider)
    if (stats.twapAccumulator && currentBlock != null && currentBlock > 0) {
      const twap = computeOneHourTwap(stats.twapAccumulator, currentBlock);
      if (twap && twap !== '0') return twap;
    }

    // Priority 2: lastPrice (most recent trade)
    const last = stats.lastPrice && stats.lastPrice !== '0' ? stats.lastPrice : null;
    // Priority 3: twapLastPrice (accumulator's last_price field)
    const twap = stats.twapLastPrice && stats.twapLastPrice !== '0' ? stats.twapLastPrice : null;
    return last ?? twap ?? null;
  }, [stats, currentBlock]);

  /** Convert a product's USDT price (raw, 6 dec) to NEX amount string (raw, 12 dec) */
  const toNex = useMemo(() => {
    if (!marketRate) return (_usdtPrice: number | string) => null;
    return (usdtPrice: number | string) => usdtToNexDynamic(usdtPrice, marketRate);
  }, [marketRate]);

  /** Convert a NEX amount (raw, 12 dec) to USDT amount string (raw, 6 dec) */
  const toUsdt = useMemo(() => {
    if (!marketRate) return (_nexRaw: string | bigint) => null;
    return (nexRaw: string | bigint) => nexToUsdtDynamic(nexRaw, marketRate);
  }, [marketRate]);

  return { marketRate, toNex, toUsdt, isLoading };
}
