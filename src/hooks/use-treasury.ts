'use client';

import { useEntityQuery, hasPallet } from './use-entity-query';
import { useEntity } from './use-entity';
import { STALE_TIMES } from '@/lib/chain/constants';
import { MODL_PREFIX } from '@/lib/utils/chain-helpers';
import { useWalletStore, useEntityStore } from '@/stores';
import { encodeAddress } from '@polkadot/util-crypto';
import { u8aConcat, stringToU8a, bnToU8a } from '@polkadot/util';
import { BN } from '@polkadot/util';

// ─────────────────────────────────────────────
// Entity treasury account derivation
// Substrate PalletId::into_sub_account_truncating
// = b"modl" ++ pallet_id(8) ++ sub_seed ++ zero-pad → 32 bytes
// ─────────────────────────────────────────────

const ENTITY_PALLET_ID = stringToU8a('et/enty/');

function deriveEntityTreasuryAccount(entityId: number): string {
  const entityIdBytes = bnToU8a(new BN(entityId), { bitLength: 64, isLe: true });
  const raw = u8aConcat(MODL_PREFIX, ENTITY_PALLET_ID, entityIdBytes);
  // Pad to 32 bytes (AccountId32)
  const accountBytes = new Uint8Array(32);
  accountBytes.set(raw.subarray(0, Math.min(raw.length, 32)));
  return encodeAddress(accountBytes, 273);
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface FundProtectionConfig {
  minTreasuryThreshold: string;
  maxSingleSpend: string;
  maxDailySpend: string;
}

export interface DailySpend {
  dayNumber: number;
  accumulated: string;
}

export interface TreasuryInfo {
  balance: bigint;
  treasuryAddress: string;
  fundProtection: FundProtectionConfig | null;
  dailySpend: DailySpend | null;
}

// ─────────────────────────────────────────────
// Hook: query entity treasury data
// ─────────────────────────────────────────────

export function useTreasury(entityId: number | null) {
  return useEntityQuery<TreasuryInfo | null>(
    ['treasury', entityId],
    async (api) => {
      if (entityId == null) return null;

      const treasuryAddress = deriveEntityTreasuryAccount(entityId);

      // 1. Treasury free balance
      const raw = await (api.query as any).system.account(treasuryAddress);
      const data = (raw?.data ?? raw) as Record<string, unknown>;
      const balance = BigInt(String(data?.free ?? 0));

      // 2. FundProtectionConfig (optional — governance pallet may not exist)
      let fundProtection: FundProtectionConfig | null = null;
      if (hasPallet(api, 'entityGovernance')) {
        try {
          const fpRaw = await (api.query as any).entityGovernance.fundProtectionConfigs(entityId);
          if (fpRaw && !fpRaw.isNone) {
            const fp = fpRaw.unwrap().toJSON();
            fundProtection = {
              minTreasuryThreshold: String(fp.min_treasury_threshold ?? fp.minTreasuryThreshold ?? '0'),
              maxSingleSpend: String(fp.max_single_spend ?? fp.maxSingleSpend ?? '0'),
              maxDailySpend: String(fp.max_daily_spend ?? fp.maxDailySpend ?? '0'),
            };
          }
        } catch { /* governance pallet not available */ }
      }

      // 3. DailySpendTracker (optional)
      let dailySpend: DailySpend | null = null;
      if (hasPallet(api, 'entityGovernance')) {
        try {
          const dsRaw = await (api.query as any).entityGovernance.dailySpendTracker(entityId);
          if (dsRaw && !dsRaw.isNone) {
            const ds = dsRaw.unwrap().toJSON() as [number, number | string];
            dailySpend = {
              dayNumber: ds[0],
              accumulated: String(ds[1]),
            };
          }
        } catch { /* governance pallet not available */ }
      }

      return { balance, treasuryAddress, fundProtection, dailySpend };
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

// ─────────────────────────────────────────────
// Hook: check if current user is the entity owner
// ─────────────────────────────────────────────

export function useIsEntityOwner(): boolean {
  const { address } = useWalletStore();
  const { currentEntityId } = useEntityStore();
  const { data: entity } = useEntity(currentEntityId);
  if (!address || !entity) return false;
  return entity.owner === address;
}
