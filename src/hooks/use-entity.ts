'use client';

import { useEntityQuery } from './use-entity-query';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString } from '@/lib/utils/chain-helpers';
import type { EntityInfo } from '@/lib/types';

/** Query all active entities from the chain */
export function useAllEntities() {
  return useEntityQuery<EntityInfo[]>(
    ['allEntities'],
    async (api) => {
      const entries = await (api.query as any).entityRegistry.entities.entries();
      const entities: EntityInfo[] = [];
      for (const [, raw] of entries) {
        if (raw.isNone) continue;
        const data = raw.unwrap().toJSON();
        const status = data.status ?? 'Active';
        if (status !== 'Active') continue;
        const name = bytesToString(data.name);
        entities.push({
          id: data.id,
          owner: data.owner ?? '',
          name,
          entityType: parseEntityType(data.entityType ?? data.entity_type),
          status,
          verified: data.verified ?? false,
          primaryShopId: data.primaryShopId ?? data.primary_shop_id ?? 0,
          createdAt: data.createdAt ?? data.created_at ?? 0,
        });
      }
      return entities;
    },
    { staleTime: STALE_TIMES.entity },
  );
}

/** Query a single entity by ID */
export function useEntity(entityId: number | null) {
  return useEntityQuery<EntityInfo | null>(
    ['entity', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).entityRegistry.entities(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      const name = bytesToString(data.name);
      return {
        id: data.id,
        owner: data.owner ?? '',
        name,
        entityType: parseEntityType(data.entityType ?? data.entity_type),
        status: data.status ?? 'Active',
        verified: data.verified ?? false,
        primaryShopId: data.primaryShopId ?? data.primary_shop_id ?? 0,
        createdAt: data.createdAt ?? data.created_at ?? 0,
      } as EntityInfo;
    },
    { staleTime: STALE_TIMES.entity, enabled: entityId != null },
  );
}

/** Parse entityType from chain — may be a string or an enum object like { merchant: null } */
function parseEntityType(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const key = Object.keys(raw)[0];
    if (key) return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return 'Merchant';
}
