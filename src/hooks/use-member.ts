'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString } from '@/lib/utils/chain-helpers';
import type { EntityMember, EntityLevelSystem } from '@/lib/types';

/** Query member info for account in entity */
export function useMember(entityId: number | null, address: string | null) {
  return useEntityQuery<EntityMember | null>(
    ['member', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      const raw = await (api.query as any).entityMember.entityMembers(entityId, address);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        referrer: data.referrer ?? null,
        directReferrals: data.directReferrals ?? data.direct_referrals ?? 0,
        qualifiedReferrals: data.qualifiedReferrals ?? data.qualified_referrals ?? 0,
        indirectReferrals: data.indirectReferrals ?? data.indirect_referrals ?? 0,
        teamSize: data.teamSize ?? data.team_size ?? 0,
        totalSpent: data.totalSpent ?? data.total_spent ?? 0,
        customLevelId: data.customLevelId ?? data.custom_level_id ?? 0,
        joinedAt: data.joinedAt ?? data.joined_at ?? 0,
        lastActiveAt: data.lastActiveAt ?? data.last_active_at ?? 0,
        activated: data.activated ?? false,
        bannedAt: data.bannedAt ?? data.banned_at ?? null,
      } as EntityMember;
    },
    { staleTime: STALE_TIMES.members, enabled: entityId != null && !!address },
  );
}

/** Query entity level system */
export function useLevelSystem(entityId: number | null) {
  return useEntityQuery<EntityLevelSystem | null>(
    ['levelSystem', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).entityMember.entityLevelSystems(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        levels: (data.levels ?? []).map((l: any) => ({
          id: l.id,
          name: bytesToString(l.name) || '',
          threshold: l.threshold ?? 0,
          discountRate: l.discountRate ?? l.discount_rate ?? 0,
          commissionBonus: l.commissionBonus ?? l.commission_bonus ?? 0,
        })),
        useCustom: data.useCustom ?? data.use_custom ?? false,
        upgradeMode: data.upgradeMode ?? data.upgrade_mode ?? 'AutoUpgrade',
      } as EntityLevelSystem;
    },
    { staleTime: STALE_TIMES.members, enabled: entityId != null },
  );
}

/** Query direct referrals for an account */
export function useDirectReferrals(entityId: number | null, address: string | null) {
  return useEntityQuery<string[]>(
    ['directReferrals', entityId, address],
    async (api) => {
      if (entityId == null || !address) return [];
      const raw = await (api.query as any).entityMember.directReferrals(entityId, address);
      return raw.toJSON() ?? [];
    },
    { staleTime: STALE_TIMES.members, enabled: entityId != null && !!address },
  );
}

/** Query member count for entity */
export function useMemberCount(entityId: number | null) {
  return useEntityQuery<number>(
    ['memberCount', entityId],
    async (api) => {
      if (entityId == null) return 0;
      const raw = await (api.query as any).entityMember.memberCount(entityId);
      return raw.toJSON() ?? 0;
    },
    { staleTime: STALE_TIMES.members, enabled: entityId != null },
  );
}

/** Check which entity IDs the current account is a member of */
export function useMyMemberships(entityIds: number[], address: string | null) {
  return useEntityQuery<number[]>(
    ['myMemberships', entityIds, address],
    async (api) => {
      if (!address || entityIds.length === 0) return [];
      const results = await Promise.all(
        entityIds.map(async (id) => {
          const raw = await (api.query as any).entityMember.entityMembers(id, address);
          return raw.isNone ? null : id;
        }),
      );
      const memberEntityIds = new Set(results.filter((id): id is number => id !== null));
      return Array.from(memberEntityIds);
    },
    {
      staleTime: STALE_TIMES.members,
      enabled: entityIds.length > 0 && !!address,
    },
  );
}

export function useRegisterMember() {
  return useEntityMutation('entityMember', 'registerMember', {
    invalidateKeys: [['member'], ['memberCount']],
  });
}

export function useBindReferrer() {
  return useEntityMutation('entityMember', 'bindReferrer', {
    invalidateKeys: [['member']],
  });
}

export function useLeaveMember() {
  return useEntityMutation('entityMember', 'leaveEntity', {
    invalidateKeys: [['member'], ['memberCount']],
    confirmDialog: {
      title: '确认离开',
      description: '离开实体后将失去会员身份和相关权益',
    },
  });
}
