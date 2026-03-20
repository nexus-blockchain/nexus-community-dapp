'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import type {
  SingleLineConfig,
  MultiLevelConfig,
  PoolRewardConfig,
  RoundInfo,
  ClaimRecord,
} from '@/lib/types';

// ======================== Single Line ========================

export function useSingleLineConfig(entityId: number | null) {
  return useEntityQuery<SingleLineConfig | null>(
    ['singleLineConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionSingleLine.singleLineConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        uplineRate: data.uplineRate ?? data.upline_rate ?? 0,
        downlineRate: data.downlineRate ?? data.downline_rate ?? 0,
        baseUplineLevels: data.baseUplineLevels ?? data.base_upline_levels ?? 0,
        baseDownlineLevels: data.baseDownlineLevels ?? data.base_downline_levels ?? 0,
        levelIncrementThreshold: String(data.levelIncrementThreshold ?? data.level_increment_threshold ?? '0'),
        maxUplineLevels: data.maxUplineLevels ?? data.max_upline_levels ?? 0,
        maxDownlineLevels: data.maxDownlineLevels ?? data.max_downline_levels ?? 0,
      } as SingleLineConfig;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

export function useSingleLineEnabled(entityId: number | null) {
  return useEntityQuery<boolean>(
    ['singleLineEnabled', entityId],
    async (api) => {
      if (entityId == null) return false;
      const raw = await (api.query as any).commissionSingleLine.singleLineEnabled(entityId);
      return raw.toJSON() ?? true;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

export function useSingleLineIndex(entityId: number | null, address: string | null) {
  return useEntityQuery<number | null>(
    ['singleLineIndex', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      const raw = await (api.query as any).commissionSingleLine.singleLineIndex(entityId, address);
      const val = raw.toJSON();
      return val != null ? Number(val) : null;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null && !!address },
  );
}

export function useSingleLineStats(entityId: number | null) {
  return useEntityQuery<{ totalOrders: number; totalUplinePayouts: number; totalDownlinePayouts: number }>(
    ['singleLineStats', entityId],
    async (api) => {
      if (entityId == null) return { totalOrders: 0, totalUplinePayouts: 0, totalDownlinePayouts: 0 };
      const raw = await (api.query as any).commissionSingleLine.entitySingleLineStats(entityId);
      const data = raw.toJSON();
      return {
        totalOrders: data?.totalOrders ?? data?.total_orders ?? 0,
        totalUplinePayouts: data?.totalUplinePayouts ?? data?.total_upline_payouts ?? 0,
        totalDownlinePayouts: data?.totalDownlinePayouts ?? data?.total_downline_payouts ?? 0,
      };
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

/** Fetch all single-line queue members (ordered by index) */
export function useSingleLineQueue(entityId: number | null) {
  return useEntityQuery<string[]>(
    ['singleLineQueue', entityId],
    async (api) => {
      if (entityId == null) return [];
      const segCountRaw = await (api.query as any).commissionSingleLine.singleLineSegmentCount(entityId);
      const segCount = segCountRaw.toJSON() ?? 0;
      if (segCount === 0) return [];
      const accounts: string[] = [];
      for (let seg = 0; seg < segCount; seg++) {
        const raw = await (api.query as any).commissionSingleLine.singleLineSegments(entityId, seg);
        const arr: string[] = raw.toJSON() ?? [];
        accounts.push(...arr);
      }
      return accounts;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

// ======================== Multi Level ========================

export function useMultiLevelConfig(entityId: number | null) {
  return useEntityQuery<MultiLevelConfig | null>(
    ['multiLevelConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionMultiLevel.multiLevelConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        levels: (data.levels ?? []).map((t: any) => ({
          rate: t.rate ?? 0,
          requiredDirects: t.requiredDirects ?? t.required_directs ?? 0,
          requiredTeamSize: t.requiredTeamSize ?? t.required_team_size ?? 0,
          requiredSpent: String(t.requiredSpent ?? t.required_spent ?? '0'),
          requiredLevelId: t.requiredLevelId ?? t.required_level_id ?? 0,
        })),
        maxTotalRate: data.maxTotalRate ?? data.max_total_rate ?? 1500,
      } as MultiLevelConfig;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

export function useMultiLevelPaused(entityId: number | null) {
  return useEntityQuery<boolean>(
    ['multiLevelPaused', entityId],
    async (api) => {
      if (entityId == null) return false;
      const raw = await (api.query as any).commissionMultiLevel.globalPaused(entityId);
      return raw.toJSON() ?? false;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

export function useMultiLevelMemberStats(entityId: number | null, address: string | null) {
  return useEntityQuery<{ totalEarned: string; totalOrders: number; lastCommissionBlock: number }>(
    ['multiLevelMemberStats', entityId, address],
    async (api) => {
      if (entityId == null || !address) return { totalEarned: '0', totalOrders: 0, lastCommissionBlock: 0 };
      const raw = await (api.query as any).commissionMultiLevel.memberMultiLevelStats(entityId, address);
      const data = raw.toJSON();
      return {
        totalEarned: String(data?.totalEarned ?? data?.total_earned ?? '0'),
        totalOrders: data?.totalOrders ?? data?.total_orders ?? 0,
        lastCommissionBlock: data?.lastCommissionBlock ?? data?.last_commission_block ?? 0,
      };
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null && !!address },
  );
}

export function useMultiLevelEntityStats(entityId: number | null) {
  return useEntityQuery<{ totalDistributed: string; totalOrders: number; totalDistributionEntries: number }>(
    ['multiLevelEntityStats', entityId],
    async (api) => {
      if (entityId == null) return { totalDistributed: '0', totalOrders: 0, totalDistributionEntries: 0 };
      const raw = await (api.query as any).commissionMultiLevel.entityMultiLevelStats(entityId);
      const data = raw.toJSON();
      return {
        totalDistributed: String(data?.totalDistributed ?? data?.total_distributed ?? '0'),
        totalOrders: data?.totalOrders ?? data?.total_orders ?? 0,
        totalDistributionEntries: data?.totalDistributionEntries ?? data?.total_distribution_entries ?? 0,
      };
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

// ======================== Pool Reward ========================

export function usePoolRewardConfig(entityId: number | null) {
  return useEntityQuery<PoolRewardConfig | null>(
    ['poolRewardConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionPoolReward.poolRewardConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        levelRatios: data.levelRatios ?? data.level_ratios ?? [],
        roundDuration: data.roundDuration ?? data.round_duration ?? 0,
        tokenPoolEnabled: data.tokenPoolEnabled ?? data.token_pool_enabled ?? false,
      } as PoolRewardConfig;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

export function useCurrentRound(entityId: number | null) {
  return useEntityQuery<RoundInfo | null>(
    ['currentRound', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionPoolReward.currentRound(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        roundId: data.roundId ?? data.round_id ?? 0,
        startBlock: data.startBlock ?? data.start_block ?? 0,
        poolSnapshot: String(data.poolSnapshot ?? data.pool_snapshot ?? '0'),
        levelSnapshots: (data.levelSnapshots ?? data.level_snapshots ?? []).map((s: any) => ({
          levelId: s.levelId ?? s.level_id ?? 0,
          memberCount: s.memberCount ?? s.member_count ?? 0,
          perMemberReward: String(s.perMemberReward ?? s.per_member_reward ?? '0'),
          claimedCount: s.claimedCount ?? s.claimed_count ?? 0,
        })),
        tokenPoolSnapshot: data.tokenPoolSnapshot ?? data.token_pool_snapshot ?? null,
        tokenLevelSnapshots: data.tokenLevelSnapshots ?? data.token_level_snapshots ?? null,
      } as RoundInfo;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null, refetchInterval: 30000 },
  );
}

export function useLastClaimedRound(entityId: number | null, address: string | null) {
  return useEntityQuery<number>(
    ['lastClaimedRound', entityId, address],
    async (api) => {
      if (entityId == null || !address) return 0;
      const raw = await (api.query as any).commissionPoolReward.lastClaimedRound(entityId, address);
      return raw.toJSON() ?? 0;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null && !!address },
  );
}

export function useClaimRecords(entityId: number | null, address: string | null) {
  return useEntityQuery<ClaimRecord[]>(
    ['claimRecords', entityId, address],
    async (api) => {
      if (entityId == null || !address) return [];
      const raw = await (api.query as any).commissionPoolReward.claimRecords(entityId, address);
      if (raw.isNone) return [];
      const data: any[] = raw.unwrap().toJSON() ?? [];
      return data.map((r) => ({
        roundId: r.roundId ?? r.round_id ?? 0,
        amount: String(r.amount ?? '0'),
        levelId: r.levelId ?? r.level_id ?? 0,
        claimedAt: r.claimedAt ?? r.claimed_at ?? 0,
        tokenAmount: String(r.tokenAmount ?? r.token_amount ?? '0'),
      }));
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null && !!address },
  );
}

export function usePoolRewardPaused(entityId: number | null) {
  return useEntityQuery<boolean>(
    ['poolRewardPaused', entityId],
    async (api) => {
      if (entityId == null) return false;
      const raw = await (api.query as any).commissionPoolReward.poolRewardPaused(entityId);
      return raw.toJSON() ?? false;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

export function useDistributionStats(entityId: number | null) {
  return useEntityQuery<{ totalNexDistributed: string; totalTokenDistributed: string; totalRoundsCompleted: number; totalClaims: number }>(
    ['distributionStats', entityId],
    async (api) => {
      if (entityId == null) return { totalNexDistributed: '0', totalTokenDistributed: '0', totalRoundsCompleted: 0, totalClaims: 0 };
      const raw = await (api.query as any).commissionPoolReward.distributionStatistics(entityId);
      const data = raw.toJSON();
      return {
        totalNexDistributed: String(data?.totalNexDistributed ?? data?.total_nex_distributed ?? '0'),
        totalTokenDistributed: String(data?.totalTokenDistributed ?? data?.total_token_distributed ?? '0'),
        totalRoundsCompleted: data?.totalRoundsCompleted ?? data?.total_rounds_completed ?? 0,
        totalClaims: data?.totalClaims ?? data?.total_claims ?? 0,
      };
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

export function useUnallocatedPool(entityId: number | null) {
  return useEntityQuery<string>(
    ['unallocatedPool', entityId],
    async (api) => {
      if (entityId == null) return '0';
      const raw = await (api.query as any).commissionCore.unallocatedPool(entityId);
      return String(raw.toJSON() ?? '0');
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

// Commission mutations
export function useClaimPoolReward() {
  return useEntityMutation('commissionPoolReward', 'claimPoolReward', {
    invalidateKeys: [['currentRound'], ['lastClaimedRound'], ['claimRecords'], ['distributionStats']],
  });
}
