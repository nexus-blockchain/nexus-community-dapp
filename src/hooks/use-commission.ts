'use client';

import { useEntityQuery, hasRuntimeApi } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import {
  parseSingleLineMemberView,
  parseSingleLinePayouts,
  parseSingleLinePosition,
  parseSingleLineStats,
} from '@/lib/chain/adapters/single-line-parsers';
import type {
  SingleLineConfig,
  SingleLinePayoutRecord,
  MemberSingleLineSummary,
  CommissionRecord,
  MultiLevelConfig,
  MultiLevelPayoutRecord,
  MultiLevelSummaryStats,
  PoolRewardConfig,
  RoundInfo,
  ClaimRecord,
  CompletedRoundSummary,
  PoolFundingRecord,
  PoolRewardMemberView,
  LevelSnapshot,
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
      if (!hasRuntimeApi(api, 'singleLineQueryApi')) return null;
      const raw = await (api.call as any).singleLineQueryApi.singleLineMemberPosition(entityId, address);
      const parsed = parseSingleLinePosition(raw);
      return parsed?.position ?? null;
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useSingleLineStats(entityId: number | null) {
  return useEntityQuery<{ totalOrders: number; totalUplinePayouts: number; totalDownlinePayouts: number }>(
    ['singleLineStats', entityId],
    async (api) => {
      const empty = { totalOrders: 0, totalUplinePayouts: 0, totalDownlinePayouts: 0 };
      if (entityId == null) return empty;
      if (!hasRuntimeApi(api, 'singleLineQueryApi')) return empty;
      const raw = await (api.call as any).singleLineQueryApi.singleLineOverview(entityId);
      const parsed = parseSingleLineStats(raw);
      return parsed?.stats ?? empty;
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null },
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

/** Fetch member's single-line payout history (most recent 50) */
export function useSingleLinePayouts(entityId: number | null, address: string | null) {
  return useEntityQuery<SingleLinePayoutRecord[]>(
    ['singleLinePayouts', entityId, address],
    async (api) => {
      if (entityId == null || !address) return [];
      if (!hasRuntimeApi(api, 'singleLineQueryApi')) return [];
      const raw = await (api.call as any).singleLineQueryApi.singleLineMemberPayouts(entityId, address);
      return parseSingleLinePayouts(raw);
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

/** Fetch member's single-line summary stats (upline/downline totals) */
export function useSingleLineMemberStats(entityId: number | null, address: string | null) {
  return useEntityQuery<MemberSingleLineSummary>(
    ['singleLineMemberStats', entityId, address],
    async (api) => {
      const empty: MemberSingleLineSummary = { totalEarnedAsUpline: '0', totalEarnedAsDownline: '0', totalPayoutCount: 0, lastPayoutBlock: 0 };
      if (entityId == null || !address) return empty;
      if (!hasRuntimeApi(api, 'singleLineQueryApi')) return empty;
      const raw = await (api.call as any).singleLineQueryApi.singleLineMemberView(entityId, address);
      const parsed = parseSingleLineMemberView(raw);
      return parsed?.summary ?? empty;
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

/** Fetch all single-line commission records from core module (MemberCommissionOrderIds → OrderCommissionRecords) */
export function useSingleLineCommissionRecords(entityId: number | null, address: string | null) {
  return useEntityQuery<CommissionRecord[]>(
    ['singleLineCommissionRecords', entityId, address],
    async (api) => {
      if (entityId == null || !address) return [];
      // Step 1: Get all order IDs where this member earned commission
      const orderIdsRaw = await (api.query as any).commissionCore.memberCommissionOrderIds(entityId, address);
      const orderIds: number[] = (orderIdsRaw.toJSON() ?? []).map(Number);
      if (orderIds.length === 0) return [];
      // Step 2: Fetch commission records for each order and filter to single-line types
      const records: CommissionRecord[] = [];
      for (const orderId of orderIds) {
        const raw = await (api.query as any).commissionCore.orderCommissionRecords(orderId);
        const items: any[] = raw.toJSON() ?? [];
        for (const r of items) {
          const ct = parseCommissionType(r.commissionType ?? r.commission_type);
          if (ct !== 'SingleLineUpline' && ct !== 'SingleLineDownline') continue;
          const beneficiary = r.beneficiary ?? '';
          // Only include records where this account is the beneficiary
          if (beneficiary.toLowerCase() !== address.toLowerCase()) continue;
          records.push({
            entityId: r.entityId ?? r.entity_id ?? 0,
            shopId: r.shopId ?? r.shop_id ?? 0,
            orderId: r.orderId ?? r.order_id ?? orderId,
            buyer: r.buyer ?? '',
            beneficiary,
            amount: String(r.amount ?? '0'),
            commissionType: ct,
            level: r.level ?? 0,
            status: parseCommissionStatus(r.status),
            createdAt: r.createdAt ?? r.created_at ?? 0,
          });
        }
      }
      // Sort by block number descending (newest first)
      records.sort((a, b) => b.createdAt - a.createdAt);
      return records;
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null && !!address },
  );
}

function parseCommissionType(ct: any): CommissionRecord['commissionType'] {
  if (typeof ct === 'string') {
    // Handle both camelCase and snake_case variants
    const s = ct.replace(/[-_]/g, '').toLowerCase();
    if (s.includes('singlelineupline') || s === 'singlelineupline') return 'SingleLineUpline';
    if (s.includes('singlelinedownline') || s === 'singlelinedownline') return 'SingleLineDownline';
    if (s.includes('directreward')) return 'DirectReward';
    if (s.includes('multilevel')) return 'MultiLevel';
    if (s.includes('teamperformance')) return 'TeamPerformance';
    if (s.includes('leveldiff')) return 'LevelDiff';
    if (s.includes('fixedamount')) return 'FixedAmount';
    if (s.includes('firstorder')) return 'FirstOrder';
    if (s.includes('repeatpurchase')) return 'RepeatPurchase';
    if (s.includes('entityreferral')) return 'EntityReferral';
    if (s.includes('poolreward')) return 'PoolReward';
    if (s.includes('ownerreward')) return 'OwnerReward';
    return ct as CommissionRecord['commissionType'];
  }
  if (ct && typeof ct === 'object') {
    if ('singleLineUpline' in ct || 'SingleLineUpline' in ct) return 'SingleLineUpline';
    if ('singleLineDownline' in ct || 'SingleLineDownline' in ct) return 'SingleLineDownline';
    // Fallback: get first key
    const key = Object.keys(ct)[0] ?? '';
    return (key.charAt(0).toUpperCase() + key.slice(1)) as CommissionRecord['commissionType'];
  }
  return 'SingleLineUpline';
}

function parseCommissionStatus(s: any): CommissionRecord['status'] {
  if (typeof s === 'string') {
    const lower = s.toLowerCase();
    if (lower.includes('settled')) return 'Settled';
    if (lower.includes('cancelled') || lower.includes('canceled')) return 'Cancelled';
    if (lower.includes('distributed')) return 'Distributed';
    return 'Pending';
  }
  if (s && typeof s === 'object') {
    if ('settled' in s || 'Settled' in s) return 'Settled';
    if ('cancelled' in s || 'Cancelled' in s) return 'Cancelled';
    if ('distributed' in s || 'Distributed' in s) return 'Distributed';
    return 'Pending';
  }
  return 'Pending';
}

function parseDirection(d: any): 'Upline' | 'Downline' {
  if (typeof d === 'string') {
    if (d.toLowerCase().includes('downline') || d === 'Downline') return 'Downline';
    return 'Upline';
  }
  if (d && typeof d === 'object') {
    if ('downline' in d || 'Downline' in d) return 'Downline';
    return 'Upline';
  }
  return 'Upline';
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
  return useEntityQuery<{ totalEarned: string; commissionReceiptCount: number; lastCommissionBlock: number }>(
    ['multiLevelMemberStats', entityId, address],
    async (api) => {
      if (entityId == null || !address) return { totalEarned: '0', commissionReceiptCount: 0, lastCommissionBlock: 0 };
      const raw = await (api.query as any).commissionMultiLevel.memberMultiLevelStats(entityId, address);
      const data = raw.toJSON();
      return {
        totalEarned: String(data?.totalEarned ?? data?.total_earned ?? '0'),
        commissionReceiptCount: data?.commissionReceiptCount ?? data?.commission_receipt_count ?? 0,
        lastCommissionBlock: data?.lastCommissionBlock ?? data?.last_commission_block ?? 0,
      };
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null && !!address },
  );
}

export function useMultiLevelEntityStats(entityId: number | null) {
  return useEntityQuery<{ totalDistributed: string; orderCount: number; totalDistributionEntries: number }>(
    ['multiLevelEntityStats', entityId],
    async (api) => {
      if (entityId == null) return { totalDistributed: '0', orderCount: 0, totalDistributionEntries: 0 };
      const raw = await (api.query as any).commissionMultiLevel.entityMultiLevelStats(entityId);
      const data = raw.toJSON();
      return {
        totalDistributed: String(data?.totalDistributed ?? data?.total_distributed ?? '0'),
        orderCount: data?.orderCount ?? data?.order_count ?? 0,
        totalDistributionEntries: data?.totalDistributionEntries ?? data?.total_distribution_entries ?? 0,
      };
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

/** Fetch member's multi-level payout history (FIFO, most recent MaxPayoutRecords) */
export function useMultiLevelPayouts(entityId: number | null, address: string | null) {
  return useEntityQuery<MultiLevelPayoutRecord[]>(
    ['multiLevelPayouts', entityId, address],
    async (api) => {
      if (entityId == null || !address) return [];
      const raw = await (api.query as any).commissionMultiLevel.memberMultiLevelPayouts(entityId, address);
      const data: any[] = raw.toJSON() ?? [];
      return data.map((r) => ({
        buyer: r.buyer ?? '',
        orderId: r.orderId ?? r.order_id ?? 0,
        amount: String(r.amount ?? '0'),
        level: r.level ?? 0,
        blockNumber: r.blockNumber ?? r.block_number ?? 0,
      }));
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null && !!address },
  );
}

/** Fetch member's multi-level summary stats (MemberMultiLevelSummaryStats) */
export function useMultiLevelSummaryStats(entityId: number | null, address: string | null) {
  return useEntityQuery<MultiLevelSummaryStats>(
    ['multiLevelSummaryStats', entityId, address],
    async (api) => {
      const empty: MultiLevelSummaryStats = { totalEarned: '0', totalPayoutCount: 0, lastPayoutBlock: 0 };
      if (entityId == null || !address) return empty;
      const raw = await (api.query as any).commissionMultiLevel.memberMultiLevelSummaryStats(entityId, address);
      const data = raw.toJSON();
      if (!data) return empty;
      return {
        totalEarned: String(data.totalEarned ?? data.total_earned ?? '0'),
        totalPayoutCount: data.totalPayoutCount ?? data.total_payout_count ?? 0,
        lastPayoutBlock: data.lastPayoutBlock ?? data.last_payout_block ?? 0,
      };
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null && !!address },
  );
}

// ======================== Pool Reward ========================

function parsePoolRewardLevelRules(data: any): [number, number][] {
  return (data.levelRules ?? data.level_rules ?? data.levelRatios ?? data.level_ratios ?? []).map((item: any) => [
    Number(item?.[0] ?? 0),
    Number(item?.[1] ?? 0),
  ]);
}

function toOptionalString(value: unknown): string | null {
  return value == null ? null : String(value);
}

function parseLevelSnapshots(
  quotas: any,
  perMemberReward: unknown,
): LevelSnapshot[] {
  const reward = String(perMemberReward ?? '0');
  return (quotas ?? []).map((s: any) => ({
    levelId: s.levelId ?? s.level_id ?? 0,
    memberCount: s.memberCount ?? s.member_count ?? 0,
    perMemberReward: reward,
    claimedCount: s.claimedCount ?? s.claimed_count ?? 0,
  }));
}

export function usePoolRewardConfig(entityId: number | null) {
  return useEntityQuery<PoolRewardConfig | null>(
    ['poolRewardConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionPoolReward.poolRewardConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        levelRules: parsePoolRewardLevelRules(data),
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
      const levelSnapshots = parseLevelSnapshots(
        data.levelQuotas ?? data.level_quotas ?? data.levelSnapshots ?? data.level_snapshots,
        data.perMemberReward ?? data.per_member_reward,
      );
      const tokenLevelSnapshotsRaw = data.tokenLevelQuotas ?? data.token_level_quotas ?? data.tokenLevelSnapshots ?? data.token_level_snapshots;
      return {
        roundId: data.roundId ?? data.round_id ?? 0,
        startBlock: data.startBlock ?? data.start_block ?? 0,
        poolSnapshot: String(data.poolSnapshot ?? data.pool_snapshot ?? '0'),
        eligibleCount: data.eligibleCount ?? data.eligible_count ?? 0,
        perMemberReward: String(data.perMemberReward ?? data.per_member_reward ?? '0'),
        claimedCount: data.claimedCount ?? data.claimed_count ?? 0,
        levelSnapshots,
        tokenPoolSnapshot: toOptionalString(data.tokenPoolSnapshot ?? data.token_pool_snapshot ?? null),
        tokenPerMemberReward: toOptionalString(data.tokenPerMemberReward ?? data.token_per_member_reward ?? null),
        tokenClaimedCount: data.tokenClaimedCount ?? data.token_claimed_count ?? 0,
        tokenLevelSnapshots: tokenLevelSnapshotsRaw
          ? parseLevelSnapshots(tokenLevelSnapshotsRaw, data.tokenPerMemberReward ?? data.token_per_member_reward)
          : null,
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

/** Fetch round history (completed rounds, bounded FIFO) */
export function useRoundHistory(entityId: number | null) {
  return useEntityQuery<CompletedRoundSummary[]>(
    ['roundHistory', entityId],
    async (api) => {
      if (entityId == null) return [];
      const raw = await (api.query as any).commissionPoolReward.roundHistory(entityId);
      const data: any[] = raw.toJSON() ?? [];
      return data.map((r) => {
        const perMemberReward = r.perMemberReward ?? r.per_member_reward ?? '0';
        const tokenPerMemberReward = r.tokenPerMemberReward ?? r.token_per_member_reward ?? null;
        const levelSnapshots = parseLevelSnapshots(
          r.levelQuotas ?? r.level_quotas ?? r.levelSnapshots ?? r.level_snapshots,
          perMemberReward,
        );
        const tokenLevelSnapshotsRaw = r.tokenLevelQuotas ?? r.token_level_quotas ?? r.tokenLevelSnapshots ?? r.token_level_snapshots;
        return {
          roundId: r.roundId ?? r.round_id ?? 0,
          startBlock: r.startBlock ?? r.start_block ?? 0,
          endBlock: r.endBlock ?? r.end_block ?? 0,
          poolSnapshot: String(r.poolSnapshot ?? r.pool_snapshot ?? '0'),
          eligibleCount: r.eligibleCount ?? r.eligible_count ?? 0,
          perMemberReward: String(perMemberReward ?? '0'),
          claimedCount: r.claimedCount ?? r.claimed_count ?? 0,
          tokenPoolSnapshot: toOptionalString(r.tokenPoolSnapshot ?? r.token_pool_snapshot ?? null),
          tokenPerMemberReward: toOptionalString(tokenPerMemberReward),
          tokenClaimedCount: r.tokenClaimedCount ?? r.token_claimed_count ?? 0,
          levelSnapshots,
          tokenLevelSnapshots: tokenLevelSnapshotsRaw
            ? parseLevelSnapshots(tokenLevelSnapshotsRaw, tokenPerMemberReward)
            : null,
          fundingSummary: {
            nexCommissionRemainder: String(
              (r.fundingSummary ?? r.funding_summary)?.nexCommissionRemainder ??
              (r.fundingSummary ?? r.funding_summary)?.nex_commission_remainder ?? '0'
            ),
            tokenPlatformFeeRetention: String(
              (r.fundingSummary ?? r.funding_summary)?.tokenPlatformFeeRetention ??
              (r.fundingSummary ?? r.funding_summary)?.token_platform_fee_retention ?? '0'
            ),
            tokenCommissionRemainder: String(
              (r.fundingSummary ?? r.funding_summary)?.tokenCommissionRemainder ??
              (r.fundingSummary ?? r.funding_summary)?.token_commission_remainder ?? '0'
            ),
            nexCancelReturn: String(
              (r.fundingSummary ?? r.funding_summary)?.nexCancelReturn ??
              (r.fundingSummary ?? r.funding_summary)?.nex_cancel_return ?? '0'
            ),
            totalFundingCount:
              (r.fundingSummary ?? r.funding_summary)?.totalFundingCount ??
              (r.fundingSummary ?? r.funding_summary)?.total_funding_count ?? 0,
          },
        };
      });
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

/** Fetch pool funding records (FIFO detail log, cross-round) */
export function usePoolFundingRecords(entityId: number | null) {
  return useEntityQuery<PoolFundingRecord[]>(
    ['poolFundingRecords', entityId],
    async (api) => {
      if (entityId == null) return [];
      const raw = await (api.query as any).commissionPoolReward.poolFundingRecords(entityId);
      const data: any[] = raw.toJSON() ?? [];
      return data.map((r) => ({
        source: parseFundingSource(r.source),
        nexAmount: String(r.nexAmount ?? r.nex_amount ?? '0'),
        tokenAmount: String(r.tokenAmount ?? r.token_amount ?? '0'),
        orderId: r.orderId ?? r.order_id ?? 0,
        blockNumber: r.blockNumber ?? r.block_number ?? 0,
      }));
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

function parseFundingSource(s: any): PoolFundingRecord['source'] {
  if (typeof s === 'string') {
    const lower = s.replace(/[-_]/g, '').toLowerCase();
    if (lower.includes('ordercommissionremainder')) return 'OrderCommissionRemainder';
    if (lower.includes('tokenplatformfeeretention')) return 'TokenPlatformFeeRetention';
    if (lower.includes('tokencommissionremainder')) return 'TokenCommissionRemainder';
    if (lower.includes('cancelreturn')) return 'CancelReturn';
    return s as PoolFundingRecord['source'];
  }
  if (s && typeof s === 'object') {
    const key = Object.keys(s)[0] ?? '';
    const lower = key.replace(/[-_]/g, '').toLowerCase();
    if (lower.includes('ordercommissionremainder')) return 'OrderCommissionRemainder';
    if (lower.includes('tokenplatformfeeretention')) return 'TokenPlatformFeeRetention';
    if (lower.includes('tokencommissionremainder')) return 'TokenCommissionRemainder';
    if (lower.includes('cancelreturn')) return 'CancelReturn';
    return (key.charAt(0).toUpperCase() + key.slice(1)) as PoolFundingRecord['source'];
  }
  return 'OrderCommissionRemainder';
}

/** Pool Reward member view via runtime API (comprehensive personal dashboard) */
export function usePoolRewardMemberView(entityId: number | null, address: string | null) {
  return useEntityQuery<PoolRewardMemberView | null>(
    ['poolRewardMemberView', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'poolRewardDetailApi')) return null;
      const raw = await (api.call as any).poolRewardDetailApi
        .getPoolRewardMemberView(entityId, address);
      if (raw.isNone) return null;
      const d = raw.unwrap().toJSON();
      const parseCapBehavior = (raw: any) => {
        if (!raw) return { type: 'Fixed' as const };
        if (typeof raw === 'string') {
          return raw.toLowerCase().includes('fixed')
            ? { type: 'Fixed' as const }
            : { type: 'Fixed' as const };
        }
        if (raw.fixed !== undefined || raw.Fixed !== undefined) {
          return { type: 'Fixed' as const };
        }
        const unlock = raw.unlockByTeam ?? raw.unlock_by_team ?? raw.UnlockByTeam;
        if (unlock) {
          return {
            type: 'UnlockByTeam' as const,
            directPerUnlock: unlock.directPerUnlock ?? unlock.direct_per_unlock ?? 0,
            teamPerUnlock: unlock.teamPerUnlock ?? unlock.team_per_unlock ?? 0,
            unlockPercent: unlock.unlockPercent ?? unlock.unlock_percent ?? 0,
          };
        }
        return { type: 'Fixed' as const };
      };

      const parseU128String = (value: any) => String(value ?? '0');
      const cap = d.capInfo ?? d.cap_info ?? {};
      const memberStats = d.memberStats ?? d.member_stats ?? {};
      return {
        roundDuration: d.roundDuration ?? d.round_duration ?? 0,
        tokenPoolEnabled: d.tokenPoolEnabled ?? d.token_pool_enabled ?? false,
        levelRules: parsePoolRewardLevelRules(d),
        levelRuleDetails: (d.levelRuleDetails ?? d.level_rule_details ?? []).map((r: any) => ({
          levelId: r.levelId ?? r.level_id ?? 0,
          baseCapPercent: r.baseCapPercent ?? r.base_cap_percent ?? 0,
          capBehavior: parseCapBehavior(r.capBehavior ?? r.cap_behavior),
        })),
        currentRoundId: d.currentRoundId ?? d.current_round_id ?? 0,
        roundStartBlock: d.roundStartBlock ?? d.round_start_block ?? 0,
        roundEndBlock: d.roundEndBlock ?? d.round_end_block ?? 0,
        poolSnapshot: String(d.poolSnapshot ?? d.pool_snapshot ?? '0'),
        tokenPoolSnapshot: toOptionalString(d.tokenPoolSnapshot ?? d.token_pool_snapshot ?? null),
        effectiveLevel: d.effectiveLevel ?? d.effective_level ?? 0,
        claimableNex: String(d.claimableNex ?? d.claimable_nex ?? '0'),
        claimableToken: String(d.claimableToken ?? d.claimable_token ?? '0'),
        alreadyClaimed: d.alreadyClaimed ?? d.already_claimed ?? false,
        roundExpired: d.roundExpired ?? d.round_expired ?? false,
        lastClaimedRound: d.lastClaimedRound ?? d.last_claimed_round ?? 0,
        memberStats: {
          directCount: memberStats.directCount ?? memberStats.direct_count ?? 0,
          teamCount: memberStats.teamCount ?? memberStats.team_count ?? 0,
          totalSpent: parseU128String(memberStats.totalSpent ?? memberStats.total_spent ?? '0'),
        },
        capInfo: {
          cumulativeClaimedUsdt: parseU128String(cap.cumulativeClaimedUsdt ?? cap.cumulative_claimed_usdt ?? '0'),
          currentCapUsdt: parseU128String(cap.currentCapUsdt ?? cap.current_cap_usdt ?? '0'),
          remainingCapUsdt: parseU128String(cap.remainingCapUsdt ?? cap.remaining_cap_usdt ?? '0'),
          isCapped: cap.isCapped ?? cap.is_capped ?? false,
          quotaNexBeforeCap: String(cap.quotaNexBeforeCap ?? cap.quota_nex_before_cap ?? '0'),
          rateSnapshotUsed: cap.rateSnapshotUsed ?? cap.rate_snapshot_used ?? null,
          baseCapPercent: cap.baseCapPercent ?? cap.base_cap_percent ?? 0,
          baseCapUsdt: parseU128String(cap.baseCapUsdt ?? cap.base_cap_usdt ?? '0'),
          unlockCount: cap.unlockCount ?? cap.unlock_count ?? 0,
          unlockPercent: cap.unlockPercent ?? cap.unlock_percent ?? null,
          unlockAmountPerStepUsdt: cap.unlockAmountPerStepUsdt != null || cap.unlock_amount_per_step_usdt != null
            ? parseU128String(cap.unlockAmountPerStepUsdt ?? cap.unlock_amount_per_step_usdt)
            : null,
          nextDirectGap: cap.nextDirectGap ?? cap.next_direct_gap ?? null,
          nextTeamGap: cap.nextTeamGap ?? cap.next_team_gap ?? null,
          nextUnlockIncreaseUsdt: cap.nextUnlockIncreaseUsdt != null || cap.next_unlock_increase_usdt != null
            ? parseU128String(cap.nextUnlockIncreaseUsdt ?? cap.next_unlock_increase_usdt)
            : null,
        },
        levelProgress: (d.levelProgress ?? d.level_progress ?? []).map((p: any) => ({
          levelId: p.levelId ?? p.level_id ?? 0,
          ratioBps: p.ratioBps ?? p.ratio_bps ?? 0,
          memberCount: p.memberCount ?? p.member_count ?? 0,
          claimedCount: p.claimedCount ?? p.claimed_count ?? 0,
          perMemberReward: String(p.perMemberReward ?? p.per_member_reward ?? '0'),
        })),
        tokenLevelProgress: d.tokenLevelProgress ?? d.token_level_progress
          ? (d.tokenLevelProgress ?? d.token_level_progress).map((p: any) => ({
              levelId: p.levelId ?? p.level_id ?? 0,
              ratioBps: p.ratioBps ?? p.ratio_bps ?? 0,
              memberCount: p.memberCount ?? p.member_count ?? 0,
              claimedCount: p.claimedCount ?? p.claimed_count ?? 0,
              perMemberReward: String(p.perMemberReward ?? p.per_member_reward ?? '0'),
            }))
          : null,
        claimHistory: (d.claimHistory ?? d.claim_history ?? []).map((c: any) => ({
          roundId: c.roundId ?? c.round_id ?? 0,
          amount: String(c.amount ?? '0'),
          tokenAmount: String(c.tokenAmount ?? c.token_amount ?? '0'),
          levelId: c.levelId ?? c.level_id ?? 0,
          claimedAt: c.claimedAt ?? c.claimed_at ?? 0,
        })),
        isPaused: d.isPaused ?? d.is_paused ?? false,
        hasPendingConfig: d.hasPendingConfig ?? d.has_pending_config ?? false,
      } as PoolRewardMemberView;
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

/** Fetch current round funding summary (accumulator for in-progress round) */
export function useCurrentRoundFunding(entityId: number | null) {
  return useEntityQuery<{
    nexCommissionRemainder: string;
    tokenPlatformFeeRetention: string;
    tokenCommissionRemainder: string;
    nexCancelReturn: string;
    totalFundingCount: number;
  }>(
    ['currentRoundFunding', entityId],
    async (api) => {
      const empty = {
        nexCommissionRemainder: '0',
        tokenPlatformFeeRetention: '0',
        tokenCommissionRemainder: '0',
        nexCancelReturn: '0',
        totalFundingCount: 0,
      };
      if (entityId == null) return empty;
      const raw = await (api.query as any).commissionPoolReward.currentRoundFunding(entityId);
      const data = raw.toJSON();
      if (!data) return empty;
      return {
        nexCommissionRemainder: String(data.nexCommissionRemainder ?? data.nex_commission_remainder ?? '0'),
        tokenPlatformFeeRetention: String(data.tokenPlatformFeeRetention ?? data.token_platform_fee_retention ?? '0'),
        tokenCommissionRemainder: String(data.tokenCommissionRemainder ?? data.token_commission_remainder ?? '0'),
        nexCancelReturn: String(data.nexCancelReturn ?? data.nex_cancel_return ?? '0'),
        totalFundingCount: data.totalFundingCount ?? data.total_funding_count ?? 0,
      };
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

// Commission mutations
export function useClaimPoolReward() {
  return useEntityMutation('commissionPoolReward', 'claimPoolReward', {
    invalidateKeys: [['currentRound'], ['lastClaimedRound'], ['claimRecords'], ['distributionStats'], ['poolRewardMemberView']],
  });
}
