'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString, toJs, parseOption } from '@/lib/utils/chain-helpers';
import type { Shop } from '@/lib/types';

/** Query single shop by ID */
export function useShop(shopId: number | null) {
  return useEntityQuery<Shop | null>(
    ['shop', shopId],
    async (api) => {
      if (shopId == null) return null;
      const raw = await (api.query as any).entityShop.shops(shopId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        id: data.id,
        entityId: data.entityId ?? data.entity_id,
        name: bytesToString(data.name),
        logoCid: data.logoCid ?? data.logo_cid ? bytesToString(data.logoCid ?? data.logo_cid) : null,
        descriptionCid: data.descriptionCid ?? data.description_cid ? bytesToString(data.descriptionCid ?? data.description_cid) : null,
        shopType: data.shopType ?? data.shop_type ?? 'Physical',
        status: data.status ?? 'Active',
        managers: data.managers ?? [],
        productCount: data.productCount ?? data.product_count ?? 0,
        totalSales: String(data.totalSales ?? data.total_sales ?? '0'),
        totalOrders: data.totalOrders ?? data.total_orders ?? 0,
        rating: data.rating ?? 0,
        ratingCount: data.ratingCount ?? data.rating_count ?? 0,
        createdAt: data.createdAt ?? data.created_at ?? 0,
      } as Shop;
    },
    { staleTime: STALE_TIMES.shops, enabled: shopId != null },
  );
}

/** Query all shops for an entity (by iterating ShopProducts or Shops entries) */
export function useEntityShops(entityId: number | null) {
  return useEntityQuery<Shop[]>(
    ['entityShops', entityId],
    async (api) => {
      if (entityId == null) return [];
      const entries = await (api.query as any).entityShop.shops.entries();
      const shops: Shop[] = [];
      for (const [, raw] of entries) {
        if (raw.isNone) continue;
        const data = raw.unwrap().toJSON();
        const eid = data.entityId ?? data.entity_id;
        if (eid !== entityId) continue;
        shops.push({
          id: data.id,
          entityId: eid,
          name: bytesToString(data.name),
          logoCid: data.logoCid ?? data.logo_cid ? bytesToString(data.logoCid ?? data.logo_cid) : null,
          descriptionCid: data.descriptionCid ?? data.description_cid ? bytesToString(data.descriptionCid ?? data.description_cid) : null,
          shopType: data.shopType ?? data.shop_type ?? 'Physical',
          status: data.status ?? 'Active',
          managers: data.managers ?? [],
          productCount: data.productCount ?? data.product_count ?? 0,
          totalSales: String(data.totalSales ?? data.total_sales ?? '0'),
          totalOrders: data.totalOrders ?? data.total_orders ?? 0,
          rating: data.rating ?? 0,
          ratingCount: data.ratingCount ?? data.rating_count ?? 0,
          createdAt: data.createdAt ?? data.created_at ?? 0,
        });
      }
      return shops;
    },
    { staleTime: STALE_TIMES.shops, enabled: entityId != null },
  );
}

/** Mutation hooks for shop operations */
export function useShopFundOperating() {
  return useEntityMutation('entityShop', 'fundOperating', {
    invalidateKeys: [['shop']],
  });
}

export function useShopPause() {
  return useEntityMutation('entityShop', 'pauseShop', {
    invalidateKeys: [['shop'], ['entityShops']],
  });
}

export function useShopResume() {
  return useEntityMutation('entityShop', 'resumeShop', {
    invalidateKeys: [['shop'], ['entityShops']],
  });
}
