'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString } from '@/lib/utils/chain-helpers';
import type { EntityTokenConfig, EntityTokenMetadata } from '@/lib/types';

// ======================== Queries ========================

export function useTokenConfig(entityId: number | null) {
  return useEntityQuery<EntityTokenConfig | null>(
    ['tokenConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).entityToken.entityTokenConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        enabled: data.enabled ?? false,
        rewardRate: data.rewardRate ?? data.reward_rate ?? 0,
        exchangeRate: data.exchangeRate ?? data.exchange_rate ?? 0,
        minRedeem: String(data.minRedeem ?? data.min_redeem ?? '0'),
        maxRedeemPerOrder: String(data.maxRedeemPerOrder ?? data.max_redeem_per_order ?? '0'),
        transferable: data.transferable ?? false,
        createdAt: data.createdAt ?? data.created_at ?? 0,
        tokenType: String(data.tokenType ?? data.token_type ?? 'Standard'),
        maxSupply: String(data.maxSupply ?? data.max_supply ?? '0'),
        transferRestriction: String(data.transferRestriction ?? data.transfer_restriction ?? 'None'),
        minReceiverKyc: data.minReceiverKyc ?? data.min_receiver_kyc ?? 0,
      };
    },
    { staleTime: STALE_TIMES.token, enabled: entityId != null },
  );
}

export function useTokenMetadata(entityId: number | null) {
  return useEntityQuery<EntityTokenMetadata | null>(
    ['tokenMetadata', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).entityToken.entityTokenMetadata(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap();
      // Metadata is stored as a tuple (name, symbol, decimals)
      const json = data.toJSON();
      if (Array.isArray(json)) {
        return {
          name: bytesToString(json[0]),
          symbol: bytesToString(json[1]),
          decimals: json[2] ?? 0,
        };
      }
      return {
        name: bytesToString(json?.name ?? ''),
        symbol: bytesToString(json?.symbol ?? ''),
        decimals: json?.decimals ?? 0,
      };
    },
    { staleTime: STALE_TIMES.token, enabled: entityId != null },
  );
}

export function useTokenBalance(entityId: number | null, address: string | null) {
  return useEntityQuery<string>(
    ['tokenBalance', entityId, address],
    async (api) => {
      if (entityId == null || !address) return '0';
      const offset = (api.consts as any).entityToken?.shopTokenOffset;
      if (!offset) return '0';
      const assetId = Number(offset.toBigInt()) + entityId;
      const raw = await (api.query as any).assets.account(assetId, address);
      if (raw.isNone) return '0';
      const data = raw.unwrap().toJSON();
      return String(data.balance ?? data?.free ?? '0');
    },
    { staleTime: STALE_TIMES.token, enabled: entityId != null && !!address },
  );
}

export function useTokenApproval(entityId: number | null, owner: string | null, spender: string | null) {
  return useEntityQuery<string>(
    ['tokenApproval', entityId, owner, spender],
    async (api) => {
      if (entityId == null || !owner || !spender) return '0';
      const raw = await (api.query as any).entityToken.tokenApprovals(entityId, owner, spender);
      const val = raw.toJSON();
      return String(val ?? '0');
    },
    { staleTime: STALE_TIMES.token, enabled: entityId != null && !!owner && !!spender },
  );
}

// ======================== Mutations ========================

export function useTransferTokens() {
  return useEntityMutation('entityToken', 'transferTokens', {
    invalidateKeys: [['tokenBalance']],
  });
}

export function useApproveTokens() {
  return useEntityMutation('entityToken', 'approveTokens', {
    invalidateKeys: [['tokenApproval']],
  });
}

export function useTransferFrom() {
  return useEntityMutation('entityToken', 'transferFrom', {
    invalidateKeys: [['tokenBalance'], ['tokenApproval']],
  });
}

export function useBurnTokens() {
  return useEntityMutation('entityToken', 'burnTokens', {
    invalidateKeys: [['tokenBalance']],
  });
}
