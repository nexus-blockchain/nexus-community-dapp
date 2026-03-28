'use client';

import { useEntityQuery, hasRuntimeApi } from './use-entity-query';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString } from '@/lib/utils/chain-helpers';
import type {
  MemberDashboardInfo,
  TeamMemberInfo,
  EntityMemberOverview,
  PaginatedMembersResult,
  UplineChainResult,
  ReferralTreeNode,
  PaginatedGenerationResult,
} from '@/lib/types';

// ======================== Parsers ========================

function parseTeamMember(m: any): TeamMemberInfo {
  return {
    account: m.account ?? '',
    levelId: m.levelId ?? m.level_id ?? 0,
    totalSpent: String(m.totalSpent ?? m.total_spent ?? '0'),
    directReferrals: m.directReferrals ?? m.direct_referrals ?? 0,
    teamSize: m.teamSize ?? m.team_size ?? 0,
    joinedAt: m.joinedAt ?? m.joined_at ?? 0,
    lastActiveAt: m.lastActiveAt ?? m.last_active_at ?? 0,
    isBanned: m.isBanned ?? m.is_banned ?? false,
    children: (m.children ?? []).map(parseTeamMember),
  };
}

function parseTreeNode(n: any): ReferralTreeNode {
  return {
    account: n.account ?? '',
    levelId: n.levelId ?? n.level_id ?? 0,
    directReferrals: n.directReferrals ?? n.direct_referrals ?? 0,
    teamSize: n.teamSize ?? n.team_size ?? 0,
    totalSpent: String(n.totalSpent ?? n.total_spent ?? '0'),
    joinedAt: n.joinedAt ?? n.joined_at ?? 0,
    isBanned: n.isBanned ?? n.is_banned ?? false,
    children: (n.children ?? []).map(parseTreeNode),
    hasMoreChildren: n.hasMoreChildren ?? n.has_more_children ?? false,
  };
}

// ======================== Hooks ========================

export function useMemberDashboard(entityId: number | null, address: string | null) {
  return useEntityQuery<MemberDashboardInfo | null>(
    ['memberDashboard', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'memberTeamApi')) return null;
      const raw = await (api.call as any).memberTeamApi.getMemberInfo(entityId, address);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        referrer: data.referrer ?? null,
        customLevelId: data.customLevelId ?? data.custom_level_id ?? 0,
        effectiveLevelId: data.effectiveLevelId ?? data.effective_level_id ?? 0,
        totalSpent: String(data.totalSpent ?? data.total_spent ?? '0'),
        directReferrals: data.directReferrals ?? data.direct_referrals ?? 0,
        indirectReferrals: data.indirectReferrals ?? data.indirect_referrals ?? 0,
        teamSize: data.teamSize ?? data.team_size ?? 0,
        orderCount: data.orderCount ?? data.order_count ?? 0,
        joinedAt: data.joinedAt ?? data.joined_at ?? 0,
        lastActiveAt: data.lastActiveAt ?? data.last_active_at ?? 0,
        activated: data.activated ?? false,
        isBanned: data.isBanned ?? data.is_banned ?? false,
        bannedAt: data.bannedAt ?? data.banned_at ?? null,
        banReason: (data.banReason ?? data.ban_reason) ? bytesToString(data.banReason ?? data.ban_reason) : null,
        levelExpiresAt: data.levelExpiresAt ?? data.level_expires_at ?? null,
        upgradeHistory: (data.upgradeHistory ?? data.upgrade_history ?? []).map((r: any) => ({
          ruleId: r.ruleId ?? r.rule_id ?? 0,
          fromLevelId: r.fromLevelId ?? r.from_level_id ?? 0,
          toLevelId: r.toLevelId ?? r.to_level_id ?? 0,
          upgradedAt: r.upgradedAt ?? r.upgraded_at ?? 0,
          expiresAt: r.expiresAt ?? r.expires_at ?? null,
        })),
      };
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useReferralTeam(entityId: number | null, address: string | null, depth?: number) {
  return useEntityQuery<TeamMemberInfo[]>(
    ['referralTeam', entityId, address, depth],
    async (api) => {
      if (entityId == null || !address) return [];
      if (!hasRuntimeApi(api, 'memberTeamApi')) return [];
      const raw = await (api.call as any).memberTeamApi
        .getReferralTeam(entityId, address, depth ?? 3);
      const data = raw.toJSON();
      return Array.isArray(data) ? data.map(parseTeamMember) : [];
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useEntityMemberOverview(entityId: number | null) {
  return useEntityQuery<EntityMemberOverview | null>(
    ['entityMemberOverview', entityId],
    async (api) => {
      if (entityId == null) return null;
      if (!hasRuntimeApi(api, 'memberTeamApi')) return null;
      const raw = await (api.call as any).memberTeamApi.getEntityMemberOverview(entityId);
      const data = raw.toJSON();
      return {
        totalMembers: data.totalMembers ?? data.total_members ?? 0,
        levelDistribution: data.levelDistribution ?? data.level_distribution ?? [],
        pendingCount: data.pendingCount ?? data.pending_count ?? 0,
        bannedCount: data.bannedCount ?? data.banned_count ?? 0,
      };
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null },
  );
}

export function useMembersPaginated(entityId: number | null, pageSize: number, pageIndex: number) {
  return useEntityQuery<PaginatedMembersResult | null>(
    ['membersPaginated', entityId, pageSize, pageIndex],
    async (api) => {
      if (entityId == null) return null;
      if (!hasRuntimeApi(api, 'memberTeamApi')) return null;
      const raw = await (api.call as any).memberTeamApi
        .getMembersPaginated(entityId, pageSize, pageIndex);
      const data = raw.toJSON();
      return {
        members: (data.members ?? []).map((m: any) => ({
          account: m.account ?? '',
          levelId: m.levelId ?? m.level_id ?? 0,
          totalSpent: String(m.totalSpent ?? m.total_spent ?? '0'),
          directReferrals: m.directReferrals ?? m.direct_referrals ?? 0,
          teamSize: m.teamSize ?? m.team_size ?? 0,
          joinedAt: m.joinedAt ?? m.joined_at ?? 0,
          isBanned: m.isBanned ?? m.is_banned ?? false,
          banReason: (m.banReason ?? m.ban_reason) ? bytesToString(m.banReason ?? m.ban_reason) : null,
        })),
        total: data.total ?? 0,
        hasMore: data.hasMore ?? data.has_more ?? false,
      };
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null },
  );
}

export function useUplineChain(entityId: number | null, address: string | null, maxDepth?: number) {
  return useEntityQuery<UplineChainResult | null>(
    ['uplineChain', entityId, address, maxDepth],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'memberTeamApi')) return null;
      const raw = await (api.call as any).memberTeamApi
        .getUplineChain(entityId, address, maxDepth ?? 10);
      const data = raw.toJSON();
      return {
        chain: (data.chain ?? []).map((n: any) => ({
          account: n.account ?? '',
          levelId: n.levelId ?? n.level_id ?? 0,
          teamSize: n.teamSize ?? n.team_size ?? 0,
          joinedAt: n.joinedAt ?? n.joined_at ?? 0,
        })),
        truncated: data.truncated ?? false,
        depth: data.depth ?? 0,
      };
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useReferralTree(entityId: number | null, address: string | null, depth?: number) {
  return useEntityQuery<ReferralTreeNode | null>(
    ['referralTree', entityId, address, depth],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'memberTeamApi')) return null;
      const raw = await (api.call as any).memberTeamApi
        .getReferralTree(entityId, address, depth ?? 3);
      return parseTreeNode(raw.toJSON());
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useReferralsByGeneration(
  entityId: number | null,
  address: string | null,
  generation: number,
  pageSize: number,
  pageIndex: number,
) {
  return useEntityQuery<PaginatedGenerationResult | null>(
    ['referralsByGeneration', entityId, address, generation, pageSize, pageIndex],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'memberTeamApi')) return null;
      const raw = await (api.call as any).memberTeamApi
        .getReferralsByGeneration(entityId, address, generation, pageSize, pageIndex);
      const data = raw.toJSON();
      return {
        generation: data.generation ?? generation,
        members: (data.members ?? []).map((m: any) => ({
          account: m.account ?? '',
          levelId: m.levelId ?? m.level_id ?? 0,
          directReferrals: m.directReferrals ?? m.direct_referrals ?? 0,
          teamSize: m.teamSize ?? m.team_size ?? 0,
          totalSpent: String(m.totalSpent ?? m.total_spent ?? '0'),
          joinedAt: m.joinedAt ?? m.joined_at ?? 0,
          isBanned: m.isBanned ?? m.is_banned ?? false,
          referrer: m.referrer ?? '',
        })),
        totalCount: data.totalCount ?? data.total_count ?? 0,
        pageSize: data.pageSize ?? data.page_size ?? pageSize,
        pageIndex: data.pageIndex ?? data.page_index ?? pageIndex,
        hasMore: data.hasMore ?? data.has_more ?? false,
      };
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}
