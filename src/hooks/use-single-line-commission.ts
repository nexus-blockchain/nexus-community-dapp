'use client';

import { useEntityQuery, hasRuntimeApi } from './use-entity-query';
import { STALE_TIMES } from '@/lib/chain/constants';
import {
  parseSingleLineMemberView,
  parseSingleLinePosition,
  parseSingleLinePreview,
  parseSingleLineStats,
} from '@/lib/chain/adapters/single-line-parsers';
import type {
  SingleLineMemberViewData,
  SingleLinePosition,
  SingleLinePreviewData,
  SingleLineStats,
} from '@/lib/types';

export function useSingleLineOverview(entityId: number | null) {
  return useEntityQuery<SingleLineStats | null>(
    ['singleLineOverview', entityId],
    async (api) => {
      if (entityId == null) return null;
      if (!hasRuntimeApi(api, 'singleLineQueryApi')) return null;
      const raw = await (api.call as any).singleLineQueryApi.singleLineOverview(entityId);
      return parseSingleLineStats(raw);
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null },
  );
}

export function useSingleLinePosition(entityId: number | null, address: string | null) {
  return useEntityQuery<SingleLinePosition | null>(
    ['singleLinePosition', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'singleLineQueryApi')) return null;
      const raw = await (api.call as any).singleLineQueryApi.singleLineMemberPosition(entityId, address);
      return parseSingleLinePosition(raw);
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useSingleLineMemberView(entityId: number | null, address: string | null) {
  return useEntityQuery<SingleLineMemberViewData | null>(
    ['singleLineMemberView', entityId, address],
    async (api) => {
      if (entityId == null || !address) return null;
      if (!hasRuntimeApi(api, 'singleLineQueryApi')) return null;
      const raw = await (api.call as any).singleLineQueryApi.singleLineMemberView(entityId, address);
      return parseSingleLineMemberView(raw);
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!address },
  );
}

export function useSingleLinePreview(
  entityId: number | null,
  buyer: string | null,
  orderAmount: string | number | null,
) {
  return useEntityQuery<SingleLinePreviewData[]>(
    ['singleLinePreview', entityId, buyer, String(orderAmount ?? '')],
    async (api) => {
      if (entityId == null || !buyer || orderAmount == null) return [];
      if (!hasRuntimeApi(api, 'singleLineQueryApi')) return [];
      const raw = await (api.call as any).singleLineQueryApi.singleLinePreviewCommission(
        entityId,
        buyer,
        orderAmount.toString(),
      );
      return parseSingleLinePreview(raw);
    },
    { staleTime: STALE_TIMES.runtimeApi, enabled: entityId != null && !!buyer && orderAmount != null },
  );
}
