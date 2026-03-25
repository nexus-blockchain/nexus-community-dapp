'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString, parseChainEnum } from '@/lib/utils/chain-helpers';
import type { Product } from '@/lib/types';

function parseProduct(data: any): Product {
  return {
    id: data.id,
    shopId: data.shopId ?? data.shop_id,
    nameCid: bytesToString(data.nameCid ?? data.name_cid),
    imagesCid: bytesToString(data.imagesCid ?? data.images_cid),
    detailCid: bytesToString(data.detailCid ?? data.detail_cid),
    price: String(data.price ?? '0'),
    usdtPrice: data.usdtPrice ?? data.usdt_price ?? 0,
    stock: data.stock ?? 0,
    soldCount: data.soldCount ?? data.sold_count ?? 0,
    status: parseChainEnum(data.status, 'Draft'),
    category: parseChainEnum(data.category, 'Physical'),
    sortWeight: data.sortWeight ?? data.sort_weight ?? 0,
    minOrderQuantity: data.minOrderQuantity ?? data.min_order_quantity ?? 0,
    maxOrderQuantity: data.maxOrderQuantity ?? data.max_order_quantity ?? 0,
    visibility: parseChainEnum(data.visibility, 'Public'),
    createdAt: data.createdAt ?? data.created_at ?? 0,
    updatedAt: data.updatedAt ?? data.updated_at ?? 0,
  } as Product;
}

/** Query single product by ID */
export function useProduct(productId: number | null) {
  return useEntityQuery<Product | null>(
    ['product', productId],
    async (api) => {
      if (productId == null) return null;
      const raw = await (api.query as any).entityProduct.products(productId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return parseProduct(data);
    },
    { staleTime: STALE_TIMES.products, enabled: productId != null },
  );
}

/** Query all products for a shop */
export function useShopProducts(shopId: number | null) {
  return useEntityQuery<Product[]>(
    ['shopProducts', shopId],
    async (api) => {
      if (shopId == null) return [];
      const idsRaw = await (api.query as any).entityProduct.shopProducts(shopId);
      const ids: number[] = idsRaw.toJSON() ?? [];
      const products: Product[] = [];
      for (const id of ids) {
        const raw = await (api.query as any).entityProduct.products(id);
        if (raw.isNone) continue;
        const data = raw.unwrap().toJSON();
        products.push(parseProduct(data));
      }
      return products.sort((a, b) => {
        // OnSale first, then by sortWeight desc
        const statusOrder: Record<string, number> = { OnSale: 0, SoldOut: 1, Draft: 2, OffShelf: 3 };
        const sa = statusOrder[a.status] ?? 9;
        const sb = statusOrder[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        return b.sortWeight - a.sortWeight;
      });
    },
    { staleTime: STALE_TIMES.products, enabled: shopId != null },
  );
}

/** Query all products across multiple shops */
export function useAllShopsProducts(shopIds: number[]) {
  return useEntityQuery<Product[]>(
    ['allShopsProducts', ...shopIds],
    async (api) => {
      const products: Product[] = [];
      for (const shopId of shopIds) {
        const idsRaw = await (api.query as any).entityProduct.shopProducts(shopId);
        const ids: number[] = idsRaw.toJSON() ?? [];
        for (const id of ids) {
          const raw = await (api.query as any).entityProduct.products(id);
          if (raw.isNone) continue;
          const data = raw.unwrap().toJSON();
          products.push(parseProduct(data));
        }
      }
      return products.sort((a, b) => {
        const statusOrder: Record<string, number> = { OnSale: 0, SoldOut: 1, Draft: 2, OffShelf: 3 };
        const sa = statusOrder[a.status] ?? 9;
        const sb = statusOrder[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        return b.sortWeight - a.sortWeight;
      });
    },
    { staleTime: STALE_TIMES.products, enabled: shopIds.length > 0 },
  );
}

export function usePlaceOrder() {
  return useEntityMutation('entityTransaction', 'placeOrder', {
    invalidateKeys: [['orders'], ['product'], ['shopProducts']],
  });
}
