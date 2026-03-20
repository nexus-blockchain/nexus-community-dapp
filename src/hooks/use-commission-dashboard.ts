'use client';

import { useEntityQuery, hasRuntimeApi } from './use-entity-query';
import { STALE_TIMES } from '@/lib/chain/constants';
import type {
  MemberCommissionDashboard,
  DirectReferralInfo,
  TeamPerformanceInfo,
  EntityCommissionOverview,
  DirectReferralDetails,
} from '@/lib/types';

// ======================== Parsers ========================

function parseCommissionDashboard(data: any): MemberCommissionDashboard {
  const parseStats = (s: any) => ({
    totalEarned: String(s?.totalEarned ?? s?.total_earned ?? '0'),
    pending: String(s?.pending ?? '0'),
    withdrawn: String(s?.withdrawn ?? '0'),
    repurchased: String(s?.repurchased ?? '0'),
    orderCount: s?.orderCount ?? s?.order_count ?? 0,
  });
  return {
    nexStats: parseStats(data.nexStats ?? data.nex_stats),
    tokenStats: parseStats(data.tokenStats ?? data.token_stats),
    nexShoppingBalance: String(data.nexShoppingBalance ?? data.nex_shopping_balance ?? '0'),
    tokenShoppingBalance: String(data.tokenShoppingBalance ?? data.token_shopping_balance ?? '0'),
    multiLevelProgress: (data.multiLevelProgress ?? data.multi_level_progress ?? []).map((p: any) => ({
      level: p.level ?? 0,
      activated: p.activated ?? false,
      directsCurrent: p.directsCurrent ?? p.directs_current ?? 0,
      directsRequired: p.directsRequired ?? p.directs_required ?? 0,
      teamCurrent: p.teamCurrent ?? p.team_current ?? 0,
      teamRequired: p.teamRequired ?? p.team_required ?? 0,
      spentCurrent: String(p.spentCurrent ?? p.spent_current ?? '0'),
      spentRequired: String(p.spentRequired ?? p.spent_required ?? '0'),
    })),
    multiLevelStats: (() => {
      const s = data.multiLevelStats ?? data.multi_level_stats;
      if (!s) return null;
      return {
        totalEarned: String(s.totalEarned ?? s.total_earned ?? '0'),
        totalOrders: s.totalOrders ?? s.total_orders ?? 0,
        lastCommissionBlock: s.lastCommissionBlock ?? s.last_commission_block ?? 0,
      };
    })(),
    teamTier: (() => {
      const t = data.teamTier ?? data.team_tier;
      if (!t) return null;
      return {
        tierIndex: t.tierIndex ?? t.tier_index ?? 0,
        name: t.name ?? '',
        rate: t.rate ?? 0,
        totalEarned: String(t.totalEarned ?? t.total_earned ?? '0'),
      };
    })(),
    singleLine: {
      position: (data.singleLine ?? data.single_line)?.position ?? null,
      uplineLevels: (data.singleLine ?? data.single_line)?.uplineLevels ?? (data.singleLine ?? data.single_line)?.upline_levels ?? null,
      downlineLevels: (data.singleLine ?? data.single_line)?.downlineLevels ?? (data.singleLine ?? data.single_line)?.downline_levels ?? null,
      isEnabled: (data.singleLine ?? data.single_line)?.isEnabled ?? (data.singleLine ?? data.single_line)?.is_enabled ?? false,
      queueLength: (data.singleLine ?? data.single_line)?.queueLength ?? (data.singleLine ?? data.single_line)?.queue_length ?? 0,
    },
    poolReward: {
      claimableNex: String((data.poolReward ?? data.pool_reward)?.claimableNex ?? (data.poolReward ?? data.pool_reward)?.claimable_nex ?? '0'),
      claimableToken: String((data.poolReward ?? data.pool_reward)?.claimableToken ?? (data.poolReward ?? data.pool_reward)?.claimable_token ?? '0'),
      isPaused: (data.poolReward ?? data.pool_reward)?.isPaused ?? (data.poolReward ?? data.pool_reward)?.is_paused ?? false,
      currentRoundId: (data.poolReward ?? data.pool_reward)?.currentRoundId ?? (data.poolReward ?? data.pool_reward)?.current_round_id ?? 0,
    },
    referral: {
      totalEarned: String((data.referral)?.totalEarned ?? (data.referral)?.total_earned ?? '0'),
      capMaxPerOrder: (data.referral)?.capMaxPerOrder ?? (data.referral)?.cap_max_per_order ?? null,
      capMaxTotal: (data.referral)?.capMaxTotal ?? (data.referral)?.cap_max_total ?? null,
    },
  };
}

// ======================== Hooks ========================

export function useCommissionDashboard(entityId: number | null, address: string | null) {
  return useEntityQuery<MemberCommissionDashboard | null>(
    ['commissionDashboard', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'commissionDashboardApi')) return null;
      const raw = await (api.call as any).commissionDashboardApi
        .getMemberCommissionDashboard(entityId, address);
      if (raw.isNone) return null;
      return parseCommissionDashboard(raw.unwrap().toJSON());
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useDirectReferralInfo(entityId: number | null, address: string | null) {
  return useEntityQuery<DirectReferralInfo | null>(
    ['directReferralInfo', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'commissionDashboardApi')) return null;
      const raw = await (api.call as any).commissionDashboardApi
        .getDirectReferralInfo(entityId, address);
      // Runtime API 返回裸结构体（非 Option），直接 toJSON
      const data = raw?.toJSON?.() ?? raw;
      if (!data) return null;
      return {
        referralTotalEarned: String(data.referralTotalEarned ?? data.referral_total_earned ?? '0'),
        capMaxPerOrder: data.capMaxPerOrder ?? data.cap_max_per_order ?? null,
        capMaxTotal: data.capMaxTotal ?? data.cap_max_total ?? null,
        capRemaining: data.capRemaining ?? data.cap_remaining ?? null,
      };
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useTeamPerformanceInfo(entityId: number | null, address: string | null) {
  return useEntityQuery<TeamPerformanceInfo | null>(
    ['teamPerformanceInfo', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'commissionDashboardApi')) return null;
      const raw = await (api.call as any).commissionDashboardApi
        .getTeamPerformanceInfo(entityId, address);
      // Runtime API 返回裸结构体（非 Option），直接 toJSON
      const data = raw?.toJSON?.() ?? raw;
      if (!data) return null;
      const tier = data.currentTier ?? data.current_tier;
      return {
        teamSize: data.teamSize ?? data.team_size ?? 0,
        directReferrals: data.directReferrals ?? data.direct_referrals ?? 0,
        totalSpent: String(data.totalSpent ?? data.total_spent ?? '0'),
        currentTier: tier ? {
          tierIndex: tier.tierIndex ?? tier.tier_index ?? 0,
          name: tier.name ?? '',
          rate: tier.rate ?? 0,
          totalEarned: String(tier.totalEarned ?? tier.total_earned ?? '0'),
        } : null,
        isEnabled: data.isEnabled ?? data.is_enabled ?? false,
        configExists: data.configExists ?? data.config_exists ?? false,
      };
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useEntityCommissionOverview(entityId: number | null) {
  return useEntityQuery<EntityCommissionOverview | null>(
    ['entityCommissionOverview', entityId],
    async (api) => {
      if (entityId == null) return null;
      if (!hasRuntimeApi(api, 'commissionDashboardApi')) return null;
      const raw = await (api.call as any).commissionDashboardApi
        .getEntityCommissionOverview(entityId);
      // Runtime API 返回裸结构体（非 Option），直接 toJSON
      const data = raw?.toJSON?.() ?? raw;
      if (!data) return null;
      return {
        enabledModes: data.enabledModes ?? data.enabled_modes ?? 0,
        commissionRate: data.commissionRate ?? data.commission_rate ?? 0,
        isEnabled: data.isEnabled ?? data.is_enabled ?? false,
        pendingTotalNex: String(data.pendingTotalNex ?? data.pending_total_nex ?? '0'),
        pendingTotalToken: String(data.pendingTotalToken ?? data.pending_total_token ?? '0'),
        unallocatedPoolNex: String(data.unallocatedPoolNex ?? data.unallocated_pool_nex ?? '0'),
        unallocatedPoolToken: String(data.unallocatedPoolToken ?? data.unallocated_pool_token ?? '0'),
        shoppingTotalNex: String(data.shoppingTotalNex ?? data.shopping_total_nex ?? '0'),
        shoppingTotalToken: String(data.shoppingTotalToken ?? data.shopping_total_token ?? '0'),
        multiLevelPaused: data.multiLevelPaused ?? data.multi_level_paused ?? false,
        singleLineEnabled: data.singleLineEnabled ?? data.single_line_enabled ?? false,
        teamStatus: data.teamStatus ?? data.team_status ?? [false, false],
        poolRewardPaused: data.poolRewardPaused ?? data.pool_reward_paused ?? false,
        withdrawalPaused: data.withdrawalPaused ?? data.withdrawal_paused ?? false,
      };
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null },
  );
}

export function useDirectReferralDetails(entityId: number | null, address: string | null) {
  return useEntityQuery<DirectReferralDetails | null>(
    ['directReferralDetails', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'commissionDashboardApi')) return null;
      const raw = await (api.call as any).commissionDashboardApi
        .getDirectReferralDetails(entityId, address);
      // Runtime API 返回裸结构体（非 Option），直接 toJSON
      const data = raw?.toJSON?.() ?? raw;
      if (!data) return null;
      return {
        referrals: (data.referrals ?? []).map((r: any) => ({
          account: r.account ?? '',
          levelId: r.levelId ?? r.level_id ?? 0,
          totalSpent: String(r.totalSpent ?? r.total_spent ?? '0'),
          orderCount: r.orderCount ?? r.order_count ?? 0,
          joinedAt: r.joinedAt ?? r.joined_at ?? 0,
          lastActiveAt: r.lastActiveAt ?? r.last_active_at ?? 0,
          isActive: r.isActive ?? r.is_active ?? false,
          teamSize: r.teamSize ?? r.team_size ?? 0,
          directReferrals: r.directReferrals ?? r.direct_referrals ?? 0,
          commissionContributed: String(r.commissionContributed ?? r.commission_contributed ?? '0'),
        })),
        totalCount: data.totalCount ?? data.total_count ?? 0,
        totalCommissionEarned: String(data.totalCommissionEarned ?? data.total_commission_earned ?? '0'),
        capMaxTotal: data.capMaxTotal ?? data.cap_max_total ?? null,
        capRemaining: data.capRemaining ?? data.cap_remaining ?? null,
      };
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}
