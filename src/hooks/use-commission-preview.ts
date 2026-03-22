'use client';

import { useEntityQuery } from './use-entity-query';
import { STALE_TIMES } from '@/lib/chain/constants';
import type {
  CoreCommissionConfig,
  ReferralConfig,
  LevelDiffConfig,
  TeamPerformanceConfig,
} from '@/lib/types';

// ======================== Commission Core Config ========================

export function useCommissionCoreConfig(entityId: number | null) {
  return useEntityQuery<CoreCommissionConfig | null>(
    ['commissionCoreConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionCore.commissionConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      const caps = data.pluginCaps ?? data.plugin_caps ?? {};
      return {
        maxCommissionRate: data.maxCommissionRate ?? data.max_commission_rate ?? 0,
        creatorRewardRate: data.creatorRewardRate ?? data.creator_reward_rate ?? 0,
        pluginCaps: {
          referral: caps.referral ?? 0,
          multiLevel: caps.multiLevel ?? caps.multi_level ?? 0,
          levelDiff: caps.levelDiff ?? caps.level_diff ?? 0,
          singleLine: caps.singleLine ?? caps.single_line ?? 0,
          team: caps.team ?? 0,
        },
        enabledModes: data.enabledModes ?? data.enabled_modes ?? 0,
      } as CoreCommissionConfig;
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}

// ======================== Referral Config ========================

export function useReferralConfig(entityId: number | null) {
  return useEntityQuery<ReferralConfig | null>(
    ['referralConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionReferral.referralConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      const directReward = data.directReward ?? data.direct_reward ?? {};
      const firstOrder = data.firstOrder ?? data.first_order ?? {};
      const repeatPurchase = data.repeatPurchase ?? data.repeat_purchase ?? {};
      const fixedAmount = data.fixedAmount ?? data.fixed_amount ?? {};
      const caps = data.caps ?? {};
      return {
        directRewardRate: directReward.rate ?? 0,
        firstOrderRate: firstOrder.rate ?? 0,
        firstOrderAmount: String(firstOrder.amount ?? '0'),
        repeatPurchaseRate: repeatPurchase.rate ?? 0,
        fixedAmountAmount: String(fixedAmount.amount ?? '0'),
        caps: {
          maxPerOrder: caps.maxPerOrder ?? caps.max_per_order ?? null,
          maxTotal: caps.maxTotal ?? caps.max_total ?? null,
        },
      } as ReferralConfig;
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}

// ======================== Level Diff Config ========================

export function useLevelDiffConfig(entityId: number | null) {
  return useEntityQuery<LevelDiffConfig | null>(
    ['levelDiffConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionLevelDiff.customLevelDiffConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        levelRates: data.levelRates ?? data.level_rates ?? [],
        maxDepth: data.maxDepth ?? data.max_depth ?? 0,
      } as LevelDiffConfig;
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}

// ======================== Team Performance Config ========================

export function useTeamPerformanceConfig(entityId: number | null) {
  return useEntityQuery<TeamPerformanceConfig | null>(
    ['teamPerformanceConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionTeam.teamPerformanceConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        tiers: (data.tiers ?? []).map((t: any) => ({
          salesThreshold: String(t.salesThreshold ?? t.sales_threshold ?? '0'),
          minTeamSize: t.minTeamSize ?? t.min_team_size ?? 0,
          rate: t.rate ?? 0,
        })),
        maxDepth: data.maxDepth ?? data.max_depth ?? 0,
        allowStacking: data.allowStacking ?? data.allow_stacking ?? false,
      } as TeamPerformanceConfig;
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}
