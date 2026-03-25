'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Package, Star } from 'lucide-react';
import { ProductImage } from '@/components/ui/product-image';
import { ProductCard } from '@/components/ui/product-card';
import { useEntityShops } from '@/hooks/use-shop';
import { useAllShopsProducts } from '@/hooks/use-product';
import { useIpfsContents } from '@/hooks/use-ipfs-content';
import { useNexPrice } from '@/hooks/use-nex-price';
import { useEntityStore } from '@/stores';
import { formatBalance, formatUsdt, formatRating } from '@/lib/utils/chain-helpers';

export default function MallPage() {
  const t = useTranslations('mall');
  const tShop = useTranslations('shop');
  const tProduct = useTranslations('product');
  const { currentEntityId } = useEntityStore();
  const { data: shops, isLoading: shopsLoading } = useEntityShops(currentEntityId);
  const { toNex } = useNexPrice();

  const activeShops = useMemo(
    () => (shops ?? []).filter((s) => s.status === 'Active'),
    [shops],
  );

  const shopIds = useMemo(() => activeShops.map((s) => s.id), [activeShops]);
  const { data: allProducts, isLoading: productsLoading } = useAllShopsProducts(shopIds);

  // 批量解析所有商品的 nameCid → 人可读的名称
  const nameCids = useMemo(
    () => (allProducts ?? []).map((p) => p.nameCid),
    [allProducts],
  );
  const { contentMap: nameMap } = useIpfsContents(nameCids);

  // 按 shopId 分组产品
  const productsByShop = useMemo(() => {
    const map: Record<number, typeof allProducts> = {};
    if (!allProducts) return map;
    for (const p of allProducts) {
      if (!map[p.shopId]) map[p.shopId] = [];
      map[p.shopId]!.push(p);
    }
    return map;
  }, [allProducts]);

  const defaultTab = activeShops.length > 0 ? String(activeShops[0].id) : '';

  return (
    <>
      <MobileHeader title={t('title')} />
      <PageContainer>
        {shopsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : activeShops.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {currentEntityId ? t('noShops') : t('joinEntityFirst')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={defaultTab} className="pb-4">
            <TabsList className="mb-3 w-full">
              {activeShops.map((shop) => (
                <TabsTrigger key={shop.id} value={String(shop.id)} className="flex-1 gap-1">
                  <Store className="h-3.5 w-3.5" />
                  <span className="truncate">{shop.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {activeShops.map((shop) => (
              <TabsContent key={shop.id} value={String(shop.id)}>
                <div className="space-y-3">
                  {/* 店铺信息卡片 */}
                  <Link href={`/shop/${shop.id}`}>
                    <Card className="transition-colors hover:border-primary/50">
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                          <Store className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-medium">{shop.name}</h3>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 text-warning" />
                              {formatRating(shop.rating)}
                            </span>
                            <span>{shop.productCount} {t('products')}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {shop.shopType}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  {/* 该店铺的商品列表 */}
                  {productsLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-44 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : !productsByShop[shop.id] || productsByShop[shop.id]!.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">{t('noProducts')}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {productsByShop[shop.id]!.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          name={nameMap.get(product.nameCid)}
                          loadingText={t('loading')}
                          dynNex={toNex(product.usdtPrice)}
                          showStatusBadge
                          statusLabels={{
                            Draft: tProduct('draft'),
                            SoldOut: tProduct('soldOut'),
                            OffShelf: tProduct('offShelf'),
                          }}
                          stockUnlimitedText={tShop('stockUnlimited')}
                          stockText={(n) => tShop('stock', { count: n })}
                          soldText={(n) => tShop('sold', { count: n })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </PageContainer>
    </>
  );
}
