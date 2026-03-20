'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Minus, Plus, ShoppingCart, FileText, Loader2 } from 'lucide-react';
import { ProductImage } from '@/components/ui/product-image';
import { useProduct } from '@/hooks/use-product';
import { useIpfsContent } from '@/hooks/use-ipfs-content';
import { useNexPrice } from '@/hooks/use-nex-price';
import { formatBalance, formatUsdt } from '@/lib/utils/chain-helpers';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const t = useTranslations('product');
  const router = useRouter();
  const productId = Number(params.id);
  const { data: product, isLoading } = useProduct(productId);
  const { data: productName } = useIpfsContent(product?.nameCid);
  const { data: productDetail, isLoading: isDetailLoading } = useIpfsContent(product?.detailCid);
  const { toNex } = useNexPrice();
  const [quantity, setQuantity] = useState(1);

  const categoryLabels: Record<string, string> = {
    Physical: t('categoryPhysical'),
    Digital: t('categoryDigital'),
    Service: t('categoryService'),
    Subscription: t('categorySubscription'),
    Bundle: t('categoryBundle'),
  };

  const visibilityLabels: Record<string, string> = {
    Public: t('visibilityPublic'),
    MembersOnly: t('visibilityMembers'),
    LevelGated: t('visibilityLevel'),
  };

  const minQty = product?.minOrderQuantity || 1;
  const maxQty = product?.maxOrderQuantity || 999;
  const stockLimit = product?.stock === 0 ? maxQty : Math.min(product?.stock ?? 1, maxQty);

  const dynNex = product ? toNex(product.usdtPrice) : null;

  const handleBuy = () => {
    router.push(`/order/create?product=${productId}&quantity=${quantity}`);
  };

  return (
    <>
      <MobileHeader title={t('title', { id: params.id })} showBack />
      <PageContainer>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !product ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('notFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Product image */}
            <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-xl bg-secondary">
              <ProductImage cid={product.imagesCid} iconSize="h-16 w-16" />
            </div>

            {/* Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {productName || t('title', { id: product.id })}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline">{categoryLabels[product.category] ?? product.category}</Badge>
                      <Badge variant="secondary">{visibilityLabels[product.visibility] ?? product.visibility}</Badge>
                    </div>
                  </div>
                  <Badge variant={product.status === 'OnSale' ? 'success' : 'secondary'}>
                    {product.status === 'OnSale' ? t('onSale') : product.status}
                  </Badge>
                </div>

                {/* Price section — USDT primary, dynamic NEX secondary */}
                <div className="mt-4">
                  {product.usdtPrice > 0 && (
                    <p className="text-2xl font-bold text-primary">
                      ${formatUsdt(product.usdtPrice)} USDT
                    </p>
                  )}
                  {dynNex ? (
                    <p className="text-sm text-muted-foreground">
                      ≈ {formatBalance(dynNex)} NEX
                    </p>
                  ) : product.usdtPrice <= 0 ? (
                    <p className="text-2xl font-bold text-primary">
                      {formatBalance(product.price, 12, 0)} NEX
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('noMarketPrice')}
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('stock')}</p>
                    <p className="font-medium">{product.stock === 0 ? t('stockUnlimited') : product.stock - product.soldCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('sold')}</p>
                    <p className="font-medium">{product.soldCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quantity selector + Buy */}
            {product.status === 'OnSale' && (
              <Card>
                <CardContent className="p-4">
                  <p className="mb-3 text-sm font-medium">{t('quantity')}</p>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => Math.max(minQty, q - 1))}
                      disabled={quantity <= minQty}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[3rem] text-center text-lg font-semibold">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => Math.min(stockLimit, q + 1))}
                      disabled={quantity >= stockLimit}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {(product.minOrderQuantity > 0 || product.maxOrderQuantity > 0) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {product.minOrderQuantity > 0 && t('minQty', { count: product.minOrderQuantity })}
                      {product.minOrderQuantity > 0 && product.maxOrderQuantity > 0 && ' / '}
                      {product.maxOrderQuantity > 0 && t('maxQty', { count: product.maxOrderQuantity })}
                    </p>
                  )}

                  <Button className="mt-4 w-full" size="lg" onClick={handleBuy}>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {t('buyNow')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Product detail (from IPFS) */}
            {product.detailCid && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{t('detail')}</p>
                  </div>
                  {isDetailLoading ? (
                    <div className="flex items-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{t('loadingDetail')}</span>
                    </div>
                  ) : productDetail ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {productDetail}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('detailLoadFailed')}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}
