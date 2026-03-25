'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString } from '@/lib/utils/chain-helpers';
import type { MallReview, ReviewReply } from '@/lib/types';

// ======================== Queries ========================

export function useReview(orderId: number | null) {
  return useEntityQuery<MallReview | null>(
    ['review', orderId],
    async (api) => {
      if (orderId == null) return null;
      const raw = await (api.query as any).entityReview.reviews(orderId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        orderId: data.orderId ?? data.order_id ?? orderId,
        reviewer: data.reviewer ?? '',
        rating: data.rating ?? 0,
        contentCid: decodeOptionalCid(data.contentCid ?? data.content_cid),
        createdAt: data.createdAt ?? data.created_at ?? 0,
        productId: data.productId ?? data.product_id ?? null,
        edited: data.edited ?? false,
      };
    },
    { staleTime: STALE_TIMES.review, enabled: orderId != null },
  );
}

export function useReviewReply(orderId: number | null) {
  return useEntityQuery<ReviewReply | null>(
    ['reviewReply', orderId],
    async (api) => {
      if (orderId == null) return null;
      const raw = await (api.query as any).entityReview.reviewReplies(orderId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        replier: data.replier ?? '',
        contentCid: bytesToString(data.contentCid ?? data.content_cid ?? ''),
        createdAt: data.createdAt ?? data.created_at ?? 0,
      };
    },
    { staleTime: STALE_TIMES.review, enabled: orderId != null },
  );
}

export function useUserReviews(address: string | null) {
  return useEntityQuery<number[]>(
    ['userReviews', address],
    async (api) => {
      if (!address) return [];
      const raw = await (api.query as any).entityReview.userReviews(address);
      if (raw.isNone) return [];
      const data = raw.unwrap().toJSON();
      return Array.isArray(data) ? data.map(Number) : [];
    },
    { staleTime: STALE_TIMES.review, enabled: !!address },
  );
}

export function useShopReviewCount(shopId: number | null) {
  return useEntityQuery<number>(
    ['shopReviewCount', shopId],
    async (api) => {
      if (shopId == null) return 0;
      const raw = await (api.query as any).entityReview.shopReviewCount(shopId);
      return raw.toJSON() ?? 0;
    },
    { staleTime: STALE_TIMES.review, enabled: shopId != null },
  );
}

export function useProductReviews(productId: number | null) {
  return useEntityQuery<number[]>(
    ['productReviews', productId],
    async (api) => {
      if (productId == null) return [];
      const raw = await (api.query as any).entityReview.productReviews(productId);
      if (raw.isNone) return [];
      const data = raw.unwrap().toJSON();
      return Array.isArray(data) ? data.map(Number) : [];
    },
    { staleTime: STALE_TIMES.review, enabled: productId != null },
  );
}

/** Returns true if reviews are enabled for the entity (storage is inverted: disabled flag) */
export function useReviewEnabled(entityId: number | null) {
  return useEntityQuery<boolean>(
    ['reviewEnabled', entityId],
    async (api) => {
      if (entityId == null) return true;
      const raw = await (api.query as any).entityReview.entityReviewDisabled(entityId);
      // Storage exists (Some) = disabled; not present (None) = enabled
      return raw.isNone;
    },
    { staleTime: STALE_TIMES.review, enabled: entityId != null },
  );
}

// ======================== Mutations ========================

export function useSubmitReview() {
  return useEntityMutation('entityReview', 'submitReview', {
    invalidateKeys: [['review'], ['userReviews'], ['shopReviewCount'], ['productReviews'], ['shop']],
  });
}

export function useEditReview() {
  return useEntityMutation('entityReview', 'editReview', {
    invalidateKeys: [['review'], ['shop']],
  });
}

export function useReplyToReview() {
  return useEntityMutation('entityReview', 'replyToReview', {
    invalidateKeys: [['reviewReply']],
  });
}

// ======================== Helpers ========================

function decodeOptionalCid(val: unknown): string | null {
  if (val == null) return null;
  const decoded = bytesToString(val);
  return decoded || null;
}
