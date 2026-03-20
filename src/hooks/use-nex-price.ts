'use client';

import { useMemo } from 'react';
import { useNexMarketStats } from './use-nex-global-market';
import { usdtToNexDynamic, nexToUsdtDynamic } from '@/lib/utils/chain-helpers';

/**
 * Hook that provides the current NEX/USDT market rate and a converter function.
 *
 * Price priority: lastPrice (most recent trade) → twapLastPrice (TWAP accumulator last price).
 * Returns the raw market rate (6 decimals) and a helper to convert USDT amounts to NEX.
 */
export function useNexPrice() {
  const { data: stats, isLoading } = useNexMarketStats();

  const marketRate = useMemo(() => {
    if (!stats) return null;
    // Prefer lastPrice; fall back to twapLastPrice
    const last = stats.lastPrice && stats.lastPrice !== '0' ? stats.lastPrice : null;
    const twap = stats.twapLastPrice && stats.twapLastPrice !== '0' ? stats.twapLastPrice : null;
    return last ?? twap ?? null;
  }, [stats]);

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
