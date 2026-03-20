'use client';

import { useEntityQuery } from './use-entity-query';
import { STALE_TIMES } from '@/lib/chain/constants';

export interface NexBalance {
  free: bigint;
  reserved: bigint;
  frozen: bigint;
}

/**
 * Query user NEX balance via system.account.
 * Uses React Query for automatic caching and refetching.
 */
export function useNexBalance(address: string | null | undefined) {
  return useEntityQuery<NexBalance>(
    ['nexBalance', address],
    async (api) => {
      if (!address) throw new Error('No address');
      const raw = await (api.query as any).system.account(address);
      const data = (raw?.data ?? raw) as Record<string, unknown>;
      return {
        free: BigInt(String(data?.free ?? 0)),
        reserved: BigInt(String(data?.reserved ?? 0)),
        frozen: BigInt(String(data?.frozen ?? data?.miscFrozen ?? 0)),
      };
    },
    { staleTime: STALE_TIMES.entity, enabled: !!address },
  );
}
