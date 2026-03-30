'use client';

import { useEntityQuery, hasRuntimeApi } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import type {
  NexCommissionMemberStats,
  TokenCommissionMemberStats,
  WithdrawalConfig,
  WithdrawalRecordView,
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

// ======================== Queries (Runtime API) ========================

export function useWithdrawalRecords(entityId: number | null, address: string | null) {
  return useEntityQuery<WithdrawalRecordView[]>(
    ['withdrawalRecords', entityId, address],
    async (api) => {
      if (entityId == null || !address) return [];
      if (!hasRuntimeApi(api, 'commissionDashboardApi')) {
        // Fallback: direct storage query
        const raw = await (api.query as any).commissionCore.memberWithdrawalHistory(entityId, address);
        const data: any[] = raw.toJSON() ?? [];
        return data.map((r: any) => ({
          totalAmount: String(r.totalAmount ?? r.total_amount ?? '0'),
          withdrawn: String(r.withdrawn ?? '0'),
          repurchased: String(r.repurchased ?? '0'),
          bonus: String(r.bonus ?? '0'),
          blockNumber: r.blockNumber ?? r.block_number ?? 0,
        }));
      }
      const raw = await (api.call as any).commissionDashboardApi
        .getMemberWithdrawalRecords(entityId, address);
      const data: any[] = raw?.toJSON?.() ?? raw ?? [];
      return data.map((r: any) => ({
        totalAmount: String(r.totalAmount ?? r.total_amount ?? '0'),
        withdrawn: String(r.withdrawn ?? '0'),
        repurchased: String(r.repurchased ?? '0'),
        bonus: String(r.bonus ?? '0'),
        blockNumber: r.blockNumber ?? r.block_number ?? 0,
      }));
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null && !!address },
  );
}

// ======================== Mutations ========================

export function useWithdrawCommission() {
  return useEntityMutation('commissionCore', 'withdrawCommission', {
    invalidateKeys: [['memberCommissionStats'], ['shoppingBalance'], ['nexBalance'], ['withdrawalRecords']],
  });
}

export function useWithdrawTokenCommission() {
  return useEntityMutation('commissionCore', 'withdrawTokenCommission', {
    invalidateKeys: [['memberTokenCommissionStats'], ['tokenShoppingBalance']],
  });
}

// ======================== RepurchaseConfig ========================

export interface RepurchaseConfigData {
  minPackageUsdt: number;
  enforced: boolean;
  autoOrder: boolean;
  defaultProductId: number;
  shoppingBalanceTtlBlocks: number;
  /** 购物余额超过此 USDT 阈值时阻止领奖（raw USDT with 10^6 precision，0=不限制） */
  maxShoppingBalanceUsdt: string;
}

export function useRepurchaseConfig(entityId: number | null) {
  return useEntityQuery<RepurchaseConfigData | null>(
    ['repurchaseConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const fn = (api.query as any).commissionCore?.repurchaseConfigs;
      if (!fn) return null;
      const raw = await fn(entityId);
      if (!raw || raw.isNone) return null;
      const obj = raw.unwrap().toJSON();
      return {
        minPackageUsdt: Number(obj.minPackageUsdt ?? obj.min_package_usdt ?? 0),
        enforced: Boolean(obj.enforced),
        autoOrder: Boolean(obj.autoOrder ?? obj.auto_order),
        defaultProductId: Number(obj.defaultProductId ?? obj.default_product_id ?? 0),
        shoppingBalanceTtlBlocks: Number(obj.shoppingBalanceTtlBlocks ?? obj.shopping_balance_ttl_blocks ?? 0),
        maxShoppingBalanceUsdt: String(BigInt(obj.maxShoppingBalanceUsdt ?? obj.max_shopping_balance_usdt ?? 0) * BigInt(1e6)),
      };
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}

/** 查询当前用户的购物余额到期状态 */
export interface ShoppingBalanceExpiryStatus {
  /** 最后一次 credit 的区块号（null = 从未 credited） */
  lastCredited: number | null;
  /** 到期区块号（null = TTL 未设置） */
  expireAtBlock: number | null;
  /** 距离到期的剩余区块数（负数 = 已过期，null = 未设置 TTL） */
  blocksLeft: number | null;
  status: 'no_ttl' | 'not_credited' | 'active' | 'expiring_soon' | 'expired';
}

export function useMyShoppingBalanceExpiry(
  entityId: number | null,
  address: string | null,
) {
  const configQuery = useRepurchaseConfig(entityId);

  return useEntityQuery<ShoppingBalanceExpiryStatus>(
    ['shoppingBalanceExpiry', entityId, address],
    async (api) => {
      const config = configQuery.data;

      if (!config || config.shoppingBalanceTtlBlocks === 0) {
        return { lastCredited: null, expireAtBlock: null, blocksLeft: null, status: 'no_ttl' };
      }

      if (entityId == null || !address) {
        return { lastCredited: null, expireAtBlock: null, blocksLeft: null, status: 'no_ttl' };
      }

      const fn = (api.query as any).commissionCore?.memberShoppingBalanceLastCredited;
      if (!fn) {
        return { lastCredited: null, expireAtBlock: null, blocksLeft: null, status: 'no_ttl' };
      }

      const [raw, blockRaw] = await Promise.all([
        fn(entityId, address),
        (api.query as any).system.number(),
      ]);

      if (!raw || raw.isNone) {
        return { lastCredited: null, expireAtBlock: null, blocksLeft: null, status: 'not_credited' };
      }

      const lastCredited = Number(raw.unwrap().toJSON?.() ?? raw.unwrap());
      const currentBlock = Number(blockRaw.toJSON?.() ?? blockRaw);
      const ttl = config.shoppingBalanceTtlBlocks;
      const expireAtBlock = lastCredited + ttl;
      const blocksLeft = expireAtBlock - currentBlock;
      // 1天 ≈ 14400 blocks
      const status: ShoppingBalanceExpiryStatus['status'] =
        blocksLeft <= 0 ? 'expired'
        : blocksLeft <= 14400 ? 'expiring_soon'
        : 'active';

      return { lastCredited, expireAtBlock, blocksLeft, status };
    },
    {
      staleTime: STALE_TIMES.commission,
      enabled: entityId != null && !!address && (configQuery.data?.shoppingBalanceTtlBlocks ?? 0) > 0,
    },
  );
}
