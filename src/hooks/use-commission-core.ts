'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import type {
  NexCommissionMemberStats,
  TokenCommissionMemberStats,
  WithdrawalConfig,
} from '@/lib/types';

// ======================== Queries ========================

export function useMemberCommissionStats(entityId: number | null, address: string | null) {
  return useEntityQuery<NexCommissionMemberStats | null>(
    ['memberCommissionStats', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      const raw = await (api.query as any).commissionCore.memberCommissionStats(entityId, address);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        totalEarned: String(data.totalEarned ?? data.total_earned ?? '0'),
        pending: String(data.pending ?? '0'),
        withdrawn: String(data.withdrawn ?? '0'),
        repurchased: String(data.repurchased ?? '0'),
        orderCount: data.orderCount ?? data.order_count ?? 0,
      };
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null && !!address },
  );
}

export function useMemberTokenCommissionStats(entityId: number | null, address: string | null) {
  return useEntityQuery<TokenCommissionMemberStats | null>(
    ['memberTokenCommissionStats', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      const raw = await (api.query as any).commissionCore.memberTokenCommissionStats(entityId, address);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        totalEarned: String(data.totalEarned ?? data.total_earned ?? '0'),
        pending: String(data.pending ?? '0'),
        withdrawn: String(data.withdrawn ?? '0'),
        repurchased: String(data.repurchased ?? '0'),
        orderCount: data.orderCount ?? data.order_count ?? 0,
      };
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null && !!address },
  );
}

export function useWithdrawalConfig(entityId: number | null) {
  return useEntityQuery<WithdrawalConfig | null>(
    ['withdrawalConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionCore.withdrawalConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      const parseTier = (t: any) => ({
        minAmount: String(t.minAmount ?? t.min_amount ?? '0'),
        maxAmount: String(t.maxAmount ?? t.max_amount ?? '0'),
        cooldownBlocks: t.cooldownBlocks ?? t.cooldown_blocks ?? 0,
        feeRate: t.feeRate ?? t.fee_rate ?? 0,
      });
      return {
        mode: String(data.mode ?? 'Free'),
        defaultTier: parseTier(data.defaultTier ?? data.default_tier ?? {}),
        levelOverrides: (data.levelOverrides ?? data.level_overrides ?? []).map((o: any) => [o[0], parseTier(o[1])]),
        voluntaryBonusRate: data.voluntaryBonusRate ?? data.voluntary_bonus_rate ?? 0,
        enabled: data.enabled ?? true,
      };
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}

export function useWithdrawalPaused(entityId: number | null) {
  return useEntityQuery<boolean>(
    ['withdrawalPaused', entityId],
    async (api) => {
      if (entityId == null) return false;
      const raw = await (api.query as any).commissionCore.withdrawalPaused(entityId);
      return raw.toJSON() ?? false;
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}

// ======================== Mutations ========================

export function useWithdrawCommission() {
  return useEntityMutation('commissionCore', 'withdrawCommission', {
    invalidateKeys: [['memberCommissionStats'], ['shoppingBalance']],
  });
}

export function useWithdrawTokenCommission() {
  return useEntityMutation('commissionCore', 'withdrawTokenCommission', {
    invalidateKeys: [['memberTokenCommissionStats'], ['tokenShoppingBalance']],
  });
}
