'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package, Clock, Truck, CheckCircle2, XCircle, AlertTriangle,
  ShoppingBag, ChevronRight,
} from 'lucide-react';
import { useWalletStore } from '@/stores';
import { useBuyerOrders } from '@/hooks/use-order';
import { useIpfsContents } from '@/hooks/use-ipfs-content';
import { useEntityQuery } from '@/hooks/use-entity-query';
import { formatBalance, bytesToString } from '@/lib/utils/chain-helpers';
import { STALE_TIMES } from '@/lib/chain/constants';
import type { Order, Product } from '@/lib/types';

// ─────────────────────────────────────────────
// Status filter
// ─────────────────────────────────────────────
type StatusFilter = 'all' | 'active' | 'shipped' | 'completed' | 'disputed' | 'closed';

const STATUS_ICON: Record<string, typeof Clock> = {
  Paid: Clock,
  Shipped: Truck,
  Completed: CheckCircle2,
  Disputed: AlertTriangle,
  Refunded: XCircle,
  Cancelled: XCircle,
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  Paid: 'default',
  Shipped: 'warning',
  Completed: 'success',
  Disputed: 'destructive',
  Refunded: 'secondary',
  Cancelled: 'secondary',
};

function matchFilter(status: string, filter: StatusFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'active': return status === 'Paid';
    case 'shipped': return status === 'Shipped';
    case 'completed': return status === 'Completed';
    case 'disputed': return status === 'Disputed';
    case 'closed': return status === 'Refunded' || status === 'Cancelled';
  }
}

// ─────────────────────────────────────────────
// Batch product query hook
// ─────────────────────────────────────────────
function useProductsBatch(productIds: number[]) {
  const uniqueIds = useMemo(() => Array.from(new Set(productIds)), [productIds]);
  return useEntityQuery<Map<number, Product>>(
    ['productsBatch', ...uniqueIds],
    async (api) => {
      const map = new Map<number, Product>();
      for (const id of uniqueIds) {
        const raw = await (api.query as any).entityProduct.products(id);
        if (raw.isNone) continue;
        const data = raw.unwrap().toJSON();
        map.set(id, {
          id: data.id,
          shopId: data.shopId ?? data.shop_id,
          nameCid: bytesToString(data.nameCid ?? data.name_cid),
          imagesCid: bytesToString(data.imagesCid ?? data.images_cid),
          detailCid: bytesToString(data.detailCid ?? data.detail_cid),
          price: String(data.price ?? '0'),
          usdtPrice: data.usdtPrice ?? data.usdt_price ?? 0,
          stock: data.stock ?? 0,
          soldCount: data.soldCount ?? data.sold_count ?? 0,
          status: typeof data.status === 'string' ? data.status : Object.keys(data.status ?? {})[0] ?? 'Draft',
          category: typeof data.category === 'string' ? data.category : Object.keys(data.category ?? {})[0] ?? 'Physical',
          sortWeight: data.sortWeight ?? data.sort_weight ?? 0,
          minOrderQuantity: data.minOrderQuantity ?? data.min_order_quantity ?? 0,
          maxOrderQuantity: data.maxOrderQuantity ?? data.max_order_quantity ?? 0,
          visibility: typeof data.visibility === 'string' ? data.visibility : Object.keys(data.visibility ?? {})[0] ?? 'Public',
          createdAt: data.createdAt ?? data.created_at ?? 0,
          updatedAt: data.updatedAt ?? data.updated_at ?? 0,
        });
      }
      return map;
    },
    { staleTime: STALE_TIMES.products, enabled: uniqueIds.length > 0 },
  );
}

// ─────────────────────────────────────────────
// Order card
// ─────────────────────────────────────────────
function OrderCard({
  order,
  productName,
}: {
  order: Order;
  productName: string | undefined;
}) {
  const t = useTranslations('myOrders');
  const Icon = STATUS_ICON[order.status] ?? Clock;
  const variant = STATUS_VARIANT[order.status] ?? 'secondary';

  const statusLabel =
    order.status === 'Paid' ? t('statusPaid') :
    order.status === 'Shipped' ? t('statusShipped') :
    order.status === 'Completed' ? t('statusCompleted') :
    order.status === 'Disputed' ? t('statusDisputed') :
    order.status === 'Refunded' ? t('statusRefunded') :
    order.status === 'Cancelled' ? t('statusCancelled') : order.status;

  return (
    <Link href={`/order/${order.id}`}>
      <Card className="transition-colors hover:border-primary/30">
        <CardContent className="p-3">
          {/* Row 1: shop + status */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {t('shop')} #{order.shopId}
            </span>
            <Badge variant={variant} className="text-[10px]">{statusLabel}</Badge>
          </div>

          {/* Row 2: product info + amount */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {productName || `${t('product')} #${order.productId}`}
              </p>
              <p className="text-xs text-muted-foreground">
                x{order.quantity}
                {order.paymentAsset !== 'Native' && (
                  <span className="ml-1.5 text-info">{t('tokenPay')}</span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-primary">{formatBalance(order.totalAmount)}</p>
              <p className="text-[10px] text-muted-foreground">NEX</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────
function OrderListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function MyOrdersPage() {
  const t = useTranslations('myOrders');
  const { address } = useWalletStore();
  const [filter, setFilter] = useState<StatusFilter>('all');

  // Fetch all buyer orders
  const { data: orders, isLoading } = useBuyerOrders(address);

  // Batch-fetch product info for all orders
  const productIds = useMemo(() => (orders ?? []).map((o) => o.productId), [orders]);
  const { data: productsMap } = useProductsBatch(productIds);

  // Batch-resolve product name CIDs
  const nameCids = useMemo(() => {
    if (!productsMap) return [];
    return Array.from(productsMap.values()).map((p) => p.nameCid);
  }, [productsMap]);
  const { contentMap: nameMap } = useIpfsContents(nameCids);

  // Apply filter
  const filtered = useMemo(
    () => (orders ?? []).filter((o) => matchFilter(o.status, filter)),
    [orders, filter],
  );

  // Count per status for badges
  const counts = useMemo(() => {
    const all = orders ?? [];
    return {
      all: all.length,
      active: all.filter((o) => o.status === 'Paid').length,
      shipped: all.filter((o) => o.status === 'Shipped').length,
      completed: all.filter((o) => o.status === 'Completed').length,
      disputed: all.filter((o) => o.status === 'Disputed').length,
      closed: all.filter((o) => o.status === 'Refunded' || o.status === 'Cancelled').length,
    };
  }, [orders]);

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: t('filterAll'), count: counts.all },
    { key: 'active', label: t('filterActive'), count: counts.active },
    { key: 'shipped', label: t('filterShipped'), count: counts.shipped },
    { key: 'completed', label: t('filterCompleted'), count: counts.completed },
    { key: 'disputed', label: t('filterDisputed'), count: counts.disputed },
    { key: 'closed', label: t('filterClosed'), count: counts.closed },
  ];

  // Resolve product name for an order
  const getProductName = (order: Order): string | undefined => {
    const product = productsMap?.get(order.productId);
    if (!product) return undefined;
    return nameMap.get(product.nameCid);
  };

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Filter tabs - horizontally scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant={filter === tab.key ? 'default' : 'outline'}
                size="sm"
                className="shrink-0"
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
                {tab.count > 0 && (
                  <Badge
                    variant={filter === tab.key ? 'secondary' : 'outline'}
                    className="ml-1.5 text-[10px] h-4 px-1"
                  >
                    {tab.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Order list */}
          {isLoading ? (
            <OrderListSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm">{t('noOrders')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  productName={getProductName(order)}
                />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
