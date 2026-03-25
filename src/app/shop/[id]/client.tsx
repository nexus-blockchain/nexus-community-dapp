'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Package, ShoppingCart, Banknote, Store } from 'lucide-react';
import { ProductImage } from '@/components/ui/product-image';
import { ProductCard } from '@/components/ui/product-card';
import { useShop } from '@/hooks/use-shop';
import { useShopProducts } from '@/hooks/use-product';
import { useIpfsContents, useIpfsContent } from '@/hooks/use-ipfs-content';
import { useNexPrice } from '@/hooks/use-nex-price';
import { formatBalance, formatUsdt, formatRating, formatNexPrice } from '@/lib/utils/chain-helpers';

export default function ShopDetailClient({ params }: { params: { id: string } }) {
  const t = useTranslations('shop');
  const pathname = usePathname();
  // In Capacitor SPA fallback, params.id is statically "0" from build time.
  // Extract the real ID from the URL pathname instead.
  const shopId = Number(pathname.split('/').filter(Boolean)[1] ?? params.id);
  const { data: shop, isLoading: shopLoading } = useShop(shopId);
  const { data: shopDescription } = useIpfsContent(shop?.descriptionCid);
  const { data: products, isLoading: productsLoading } = useShopProducts(shopId);
  const { marketRate, toNex } = useNexPrice();

  const nameCids = useMemo(
    () => (products ?? []).map((p) => p.nameCid),
    [products],
  );
  const { contentMap: nameMap } = useIpfsContents(nameCids);

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
    Active: { label: t('statusActive'), variant: 'success' },
    Paused: { label: t('statusPaused'), variant: 'warning' },
    Closing: { label: t('statusClosing'), variant: 'warning' },
    Closed: { label: t('statusClosed'), variant: 'secondary' },
    FundDepleted: { label: t('statusFundDepleted'), variant: 'destructive' },
    Banned: { label: t('statusBanned'), variant: 'destructive' },
  };

  const status = statusMap[shop?.status ?? ''] ?? { label: shop?.status ?? '', variant: 'secondary' as const };

  return (
    <>
      <MobileHeader title={shop?.name ?? t('title', { id: shopId })} showBack />
      <PageContainer>
        <div className="space-y-4">
          {shopLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : shop ? (
            <>
              {/* Banner Card */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-background/80 text-primary shadow-sm">
                      <Store className="h-8 w-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold">{shop.name}</h2>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 text-warning" />
                        <span>{formatRating(shop.rating)}</span>
                        <span>({t('reviews', { count: shop.ratingCount })})</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge variant="outline">{shop.shopType}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <Package className="mx-auto h-5 w-5 text-primary" />
                    <p className="mt-1 text-lg font-semibold">{shop.productCount}</p>
                    <p className="text-xs text-muted-foreground">{t('products')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <ShoppingCart className="mx-auto h-5 w-5 text-primary" />
                    <p className="mt-1 text-lg font-semibold">{shop.totalOrders}</p>
                    <p className="text-xs text-muted-foreground">{t('orders')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Banknote className="mx-auto h-5 w-5 text-primary" />
                    <p className="mt-1 text-lg font-semibold">{formatBalance(shop.totalSales)}</p>
                    <p className="text-xs text-muted-foreground">{t('salesVolume')}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Shop description */}
              {shopDescription && (
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-2 text-sm font-medium">{t('description')}</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{shopDescription}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t('notFound')}</p>
              </CardContent>
            </Card>
          )}

          {/* Products Grid */}
          <div>
            <h3 className="mb-3 text-sm font-medium">{t('allProducts')}</h3>
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-xl" />
                ))}
              </div>
            ) : !products || products.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">{t('noProducts')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    name={nameMap.get(product.nameCid)}
                    loadingText={t('productNumber', { id: product.id })}
                    dynNex={toNex(product.usdtPrice)}
                    marketRate={marketRate}
                    stockUnlimitedText={t('stockUnlimited')}
                    stockText={(n) => t('stock', { count: n })}
                    soldText={(n) => t('sold', { count: n })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
