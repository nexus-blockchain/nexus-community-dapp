'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString } from '@/lib/utils/chain-helpers';
import type { PointsConfig } from '@/lib/types';

/** Query points config for a shop */
export function usePointsConfig(shopId: number | null) {
  return useEntityQuery<PointsConfig | null>(
    ['pointsConfig', shopId],
    async (api) => {
      if (shopId == null) return null;
      const raw = await (api.query as any).entityLoyalty.shopPointsConfigs(shopId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        name: bytesToString(data.name),
        symbol: bytesToString(data.symbol),
        rewardRate: data.rewardRate ?? data.reward_rate ?? 0,
        exchangeRate: data.exchangeRate ?? data.exchange_rate ?? 0,
        transferable: data.transferable ?? false,
      } as PointsConfig;
    },
    { staleTime: STALE_TIMES.entity, enabled: shopId != null },
  );
}

/** Query points balance for user in a shop */
export function usePointsBalance(shopId: number | null, address: string | null) {
  return useEntityQuery<string>(
    ['pointsBalance', shopId, address],
    async (api) => {
      if (shopId == null || !address) return '0';
      const raw = await (api.query as any).entityLoyalty.shopPointsBalances(shopId, address);
      return String(raw.toJSON() ?? '0');
    },
    { staleTime: STALE_TIMES.entity, enabled: shopId != null && !!address },
  );
}

/** Query NEX shopping balance for member in entity */
export function useShoppingBalance(entityId: number | null, address: string | null) {
  return useEntityQuery<string>(
    ['shoppingBalance', entityId, address],
    async (api) => {
      if (entityId == null || !address) return '0';
      const raw = await (api.query as any).entityLoyalty.memberShoppingBalance(entityId, address);
      return String(raw.toJSON() ?? '0');
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null && !!address },
  );
}

/** Query Token shopping balance for member in entity */
export function useTokenShoppingBalance(entityId: number | null, address: string | null) {
  return useEntityQuery<string>(
    ['tokenShoppingBalance', entityId, address],
    async (api) => {
      if (entityId == null || !address) return '0';
      const raw = await (api.query as any).entityLoyalty.memberTokenShoppingBalance(entityId, address);
      return String(raw.toJSON() ?? '0');
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null && !!address },
  );
}

export function useTransferPoints() {
  return useEntityMutation('entityLoyalty', 'transferPoints', {
    invalidateKeys: [['pointsBalance']],
  });
}

export function useRedeemPoints() {
  return useEntityMutation('entityLoyalty', 'redeemPoints', {
    invalidateKeys: [['pointsBalance'], ['shoppingBalance']],
  });
}
