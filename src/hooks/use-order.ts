'use client';

import { useEntityQuery } from './use-entity-query';
import { useEntityMutation } from './use-entity-mutation';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString } from '@/lib/utils/chain-helpers';
import type { Order } from '@/lib/types';

function parseOrder(data: any): Order {
  return {
    id: data.id,
    entityId: data.entityId ?? data.entity_id,
    shopId: data.shopId ?? data.shop_id,
    productId: data.productId ?? data.product_id,
    buyer: data.buyer ?? '',
    seller: data.seller ?? '',
    payer: data.payer ?? null,
    quantity: data.quantity ?? 1,
    unitPrice: String(data.unitPrice ?? data.unit_price ?? '0'),
    totalAmount: String(data.totalAmount ?? data.total_amount ?? '0'),
    platformFee: String(data.platformFee ?? data.platform_fee ?? '0'),
    productCategory: data.productCategory ?? data.product_category ?? 'Physical',
    shippingCid: data.shippingCid ?? data.shipping_cid ? bytesToString(data.shippingCid ?? data.shipping_cid) : null,
    trackingCid: data.trackingCid ?? data.tracking_cid ? bytesToString(data.trackingCid ?? data.tracking_cid) : null,
    status: data.status ?? 'Paid',
    createdAt: data.createdAt ?? data.created_at ?? 0,
    shippedAt: data.shippedAt ?? data.shipped_at ?? null,
    completedAt: data.completedAt ?? data.completed_at ?? null,
    paymentAsset: data.paymentAsset ?? data.payment_asset ?? 'Native',
    tokenPaymentAmount: String(data.tokenPaymentAmount ?? data.token_payment_amount ?? '0'),
    confirmExtended: data.confirmExtended ?? data.confirm_extended ?? false,
    disputeRejected: data.disputeRejected ?? data.dispute_rejected ?? false,
    disputeDeadline: data.disputeDeadline ?? data.dispute_deadline ?? null,
    noteCid: data.noteCid ?? data.note_cid ? bytesToString(data.noteCid ?? data.note_cid) : null,
    refundReasonCid: data.refundReasonCid ?? data.refund_reason_cid ? bytesToString(data.refundReasonCid ?? data.refund_reason_cid) : null,
  };
}

/** Query single order by ID */
export function useOrder(orderId: number | null) {
  return useEntityQuery<Order | null>(
    ['order', orderId],
    async (api) => {
      if (orderId == null) return null;
      const raw = await (api.query as any).entityTransaction.orders(orderId);
      if (raw.isNone) return null;
      return parseOrder(raw.unwrap().toJSON());
    },
    { staleTime: STALE_TIMES.orders, enabled: orderId != null },
  );
}

/** Query orders for current buyer */
export function useBuyerOrders(buyer: string | null) {
  return useEntityQuery<Order[]>(
    ['buyerOrders', buyer],
    async (api) => {
      if (!buyer) return [];
      const idsRaw = await (api.query as any).entityTransaction.buyerOrders(buyer);
      const ids: number[] = idsRaw.toJSON() ?? [];
      const orders: Order[] = [];
      for (const id of ids) {
        const raw = await (api.query as any).entityTransaction.orders(id);
        if (raw.isNone) continue;
        orders.push(parseOrder(raw.unwrap().toJSON()));
      }
      return orders.sort((a, b) => b.createdAt - a.createdAt);
    },
    { staleTime: STALE_TIMES.orders, enabled: !!buyer },
  );
}

/** Query orders for a shop */
export function useShopOrders(shopId: number | null) {
  return useEntityQuery<Order[]>(
    ['shopOrders', shopId],
    async (api) => {
      if (shopId == null) return [];
      const idsRaw = await (api.query as any).entityTransaction.shopOrders(shopId);
      const ids: number[] = idsRaw.toJSON() ?? [];
      const orders: Order[] = [];
      for (const id of ids) {
        const raw = await (api.query as any).entityTransaction.orders(id);
        if (raw.isNone) continue;
        orders.push(parseOrder(raw.unwrap().toJSON()));
      }
      return orders.sort((a, b) => b.createdAt - a.createdAt);
    },
    { staleTime: STALE_TIMES.orders, enabled: shopId != null },
  );
}

// Order mutations
export function useCancelOrder() {
  return useEntityMutation('entityTransaction', 'cancelOrder', {
    invalidateKeys: [['order'], ['buyerOrders'], ['shopOrders']],
  });
}

export function useShipOrder() {
  return useEntityMutation('entityTransaction', 'shipOrder', {
    invalidateKeys: [['order'], ['shopOrders']],
  });
}

export function useConfirmReceipt() {
  return useEntityMutation('entityTransaction', 'confirmReceipt', {
    invalidateKeys: [['order'], ['buyerOrders'], ['shopOrders']],
  });
}

export function useRequestRefund() {
  return useEntityMutation('entityTransaction', 'requestRefund', {
    invalidateKeys: [['order'], ['buyerOrders']],
  });
}

export function useApproveRefund() {
  return useEntityMutation('entityTransaction', 'approveRefund', {
    invalidateKeys: [['order'], ['buyerOrders'], ['shopOrders']],
  });
}

export function useRejectRefund() {
  return useEntityMutation('entityTransaction', 'rejectRefund', {
    invalidateKeys: [['order']],
  });
}

export function useStartService() {
  return useEntityMutation('entityTransaction', 'startService', {
    invalidateKeys: [['order'], ['shopOrders']],
  });
}

export function useCompleteService() {
  return useEntityMutation('entityTransaction', 'completeService', {
    invalidateKeys: [['order'], ['shopOrders']],
  });
}

export function useConfirmService() {
  return useEntityMutation('entityTransaction', 'confirmService', {
    invalidateKeys: [['order'], ['buyerOrders'], ['shopOrders']],
  });
}

export function useSellerCancelOrder() {
  return useEntityMutation('entityTransaction', 'sellerCancelOrder', {
    invalidateKeys: [['order'], ['buyerOrders'], ['shopOrders']],
  });
}

export function useWithdrawDispute() {
  return useEntityMutation('entityTransaction', 'withdrawDispute', {
    invalidateKeys: [['order'], ['buyerOrders']],
  });
}
