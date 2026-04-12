'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/ui/product-card';
import { Button } from '@/components/ui/button';
import {
  Package,
} from 'lucide-react';
import { useWalletStore, useEntityStore } from '@/stores';
import { useMember } from '@/hooks/use-member';
import { useBuyerOrders } from '@/hooks/use-order';
import { useEntityShops } from '@/hooks/use-shop';
import { useAllShopsProducts } from '@/hooks/use-product';
import { useNexPrice } from '@/hooks/use-nex-price';
import { useIpfsContents } from '@/hooks/use-ipfs-content';
import { useLocaleStore } from '@/stores';
import { locales } from '@/i18n/config';
import { LOCALE_LABELS } from '@/i18n/locale-labels';

export default function CommunityHomePage() {
  const t = useTranslations();
  const tMall = useTranslations('mall');
  const { address } = useWalletStore();
  const { currentEntityId, entityName } = useEntityStore();
  const { data: member } = useMember(currentEntityId, address);
  const { data: orders } = useBuyerOrders(address);

  // Fetch products for homepage recommendation
  const { data: shops } = useEntityShops(currentEntityId);
  const { toNex } = useNexPrice();
  const activeShopIds = useMemo(
    () => (shops ?? []).filter((s) => s.status === 'Active').map((s) => s.id),
    [shops],
  );
  const { data: allProducts } = useAllShopsProducts(activeShopIds);
  const recommendedProducts = useMemo(
    () => (allProducts ?? []).filter((p) => p.status === 'OnSale').slice(0, 8),
    [allProducts],
  );
  const productNameCids = useMemo(
    () => recommendedProducts.map((p) => p.nameCid),
    [recommendedProducts],
  );
  const [showAllProducts, setShowAllProducts] = useState(false);
  const allOnSaleProducts = useMemo(
    () => (allProducts ?? []).filter((p) => p.status === 'OnSale'),
    [allProducts],
  );
  const displayProducts = showAllProducts ? allOnSaleProducts : recommendedProducts;
  const allProductNameCids = useMemo(
    () => allOnSaleProducts.map((p) => p.nameCid),
    [allOnSaleProducts],
  );
  const { contentMap: allProductNameMap } = useIpfsContents(showAllProducts ? allProductNameCids : productNameCids);

  const { locale, setLocale } = useLocaleStore();

  const activeOrders = (orders ?? []).filter((o) => !['Completed', 'Refunded', 'Cancelled'].includes(o.status));

  return (
    <>
      <PageContainer>
        <div className="space-y-4">
          {/* Welcome */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold">
                <span className="text-muted-foreground">{t('home.welcomePrefix')}</span>{' '}
                <span className="text-primary">{entityName || t('home.welcomeDefaultName')}</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('home.subtitle')}
              </p>
              {member && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="default">LV.{member.customLevelId}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('home.directReferrals', { count: member.directReferrals })} | {t('home.teamSize', { count: member.teamSize })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active orders */}
          {activeOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{t('home.activeOrders')}</span>
                  <Badge variant="secondary">{activeOrders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeOrders.slice(0, 3).map((order) => (
                  <Link key={order.id} href={`/order/${order.id}`}>
                    <div className="flex items-center justify-between rounded-lg bg-secondary p-2 text-sm">
                      <span>{t('home.orderNumber', { id: order.id })}</span>
                      <Badge variant="outline" className="text-xs">
                        {order.status === 'Paid' ? t('status.paid') :
                         order.status === 'Shipped' ? t('status.shipped') :
                         order.status === 'Disputed' ? t('status.disputed') : order.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Language selector */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-5 gap-1">
                  {locales.map((loc) => (
                    <Button
                      key={loc}
                      variant={locale === loc ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-0 h-auto flex-col whitespace-normal px-1 py-2 text-[11px] leading-tight"
                      onClick={() => setLocale(loc)}
                    >
                      <span className="block w-full break-words text-center">{LOCALE_LABELS[loc]}</span>
                    </Button>
                  ))}
                </div>
            </CardContent>
          </Card>

          {/* Vision */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-primary mb-2">{t('home.visionTitle')}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {t('home.visionText')}
              </p>
            </CardContent>
          </Card>

          {/* Recommended Products */}
          {recommendedProducts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t('home.recommendedProducts')}
                  </span>
                  {allOnSaleProducts.length > 8 && (
                    <button
                      onClick={() => setShowAllProducts(!showAllProducts)}
                      className="text-xs font-normal text-primary"
                    >
                      {showAllProducts ? t('home.collapse') : t('home.viewAll')}
                    </button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {displayProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      name={allProductNameMap.get(product.nameCid)}
                      loadingText={tMall('loading')}
                      dynNex={toNex(product.usdtPrice)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}
