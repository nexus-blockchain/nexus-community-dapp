'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/lib/chain';

/**
 * Subscribe to the current block number.
 * Returns the latest finalized block number or null if not connected.
 */
export function useCurrentBlock(): number | null {
  const { api, isReady } = useApi();
  const [blockNumber, setBlockNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!api || !isReady) return;

    let cancelled = false;
    let unsub: (() => void) | undefined;

    api.rpc.chain.subscribeNewHeads((header) => {
      if (!cancelled) setBlockNumber(header.number.toNumber());
    }).then((u) => {
      unsub = u;
      if (cancelled) u();
    }).catch(() => {
      // Subscription failed — try polling fallback
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [api, isReady]);

  return blockNumber;
}
