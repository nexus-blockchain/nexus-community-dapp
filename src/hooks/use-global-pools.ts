'use client';

import { useEntityQuery } from './use-entity-query';
import { STALE_TIMES } from '@/lib/chain/constants';
import { MODL_PREFIX } from '@/lib/utils/chain-helpers';
import { encodeAddress } from '@polkadot/util-crypto';
import { u8aConcat, stringToU8a } from '@polkadot/util';

// ─────────────────────────────────────────────
// PalletId → AccountId32 derivation
// Substrate formula: b"modl" ++ pallet_id(8) → zero-pad to 32 bytes
// ─────────────────────────────────────────────

function derivePalletAccount(palletId: string): string {
  const palletBytes = stringToU8a(palletId);
  const raw = u8aConcat(MODL_PREFIX, palletBytes);
  const accountBytes = new Uint8Array(32);
  accountBytes.set(raw.subarray(0, Math.min(raw.length, 32)));
  return encodeAddress(accountBytes, 273);
}

// ─────────────────────────────────────────────
// Pool definitions
// ─────────────────────────────────────────────

export type PoolGroup = 'core' | 'market' | 'infra';

export interface PoolDefinition {
  /** i18n key suffix for pool name */
  nameKey: string;
  /** Raw PalletId string (8 bytes) */
  palletId: string;
  /** Which group this pool belongs to */
  group: PoolGroup;
}

const POOL_DEFS: PoolDefinition[] = [
  // Core system accounts
  { nameKey: 'treasury',       palletId: 'py/trsry', group: 'core' },
  { nameKey: 'burn',           palletId: 'py/burn!', group: 'core' },
  { nameKey: 'rewardPool',     palletId: 'py/rwdpl', group: 'core' },
  // NEX Market accounts
  { nameKey: 'marketTreasury', palletId: 'nxm/trsy', group: 'market' },
  { nameKey: 'marketSeed',     palletId: 'nxm/seed', group: 'market' },
  { nameKey: 'marketRewards',  palletId: 'nxm/rwds', group: 'market' },
  // Shared infrastructure
  { nameKey: 'escrow',         palletId: 'py/escro', group: 'infra' },
  { nameKey: 'storage',        palletId: 'py/storg', group: 'infra' },
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PoolInfo {
  nameKey: string;
  palletId: string;
  group: PoolGroup;
  address: string;
  free: bigint;
  reserved: bigint;
}

export interface GlobalPoolsData {
  core: PoolInfo[];
  market: PoolInfo[];
  infra: PoolInfo[];
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useGlobalPools() {
  return useEntityQuery<GlobalPoolsData>(
    ['globalPools'],
    async (api) => {
      const pools = await Promise.all(
        POOL_DEFS.map(async (def) => {
          const address = derivePalletAccount(def.palletId);
          const raw = await (api.query as any).system.account(address);
          const data = raw?.data ?? raw;
          return {
            nameKey: def.nameKey,
            palletId: def.palletId,
            group: def.group,
            address,
            free: BigInt(String(data?.free ?? 0)),
            reserved: BigInt(String(data?.reserved ?? 0)),
          } satisfies PoolInfo;
        }),
      );

      return {
        core: pools.filter((p) => p.group === 'core'),
        market: pools.filter((p) => p.group === 'market'),
        infra: pools.filter((p) => p.group === 'infra'),
      };
    },
    { staleTime: STALE_TIMES.entity, refetchInterval: 60_000 },
  );
}
